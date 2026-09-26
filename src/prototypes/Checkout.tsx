import { useEffect, useMemo, useRef, useState } from "react";
import { checkoutOrders } from "../mock/data";
import { fetchPickupPoints, placeOrder, type NetworkScenario, type PickupScenario } from "../mock/services";
import { COPY, RULES, decideCheckout, priceFor, tierForScenario } from "../rules";
import type { CheckoutScenario, PaymentMethodId, PickupPoint } from "../types";
import { thb, useAsync } from "../lib/hooks";
import { Alert, Badge, Button, DemoPanel, DeviceFrame, Icon, Note, Segmented } from "../components/ui";
import { DepositExplainer, OrderSummary, PaymentOption, PickupOption, ProductRow, QrPlaceholder, RiskIntervention } from "../components/checkout";

const scenarioOptions: { value: CheckoutScenario; label: string }[] = [
  { value: "low", label: "Baseline, low risk" },
  { value: "perishable", label: "A. Perishable" },
  { value: "medium", label: "B. Medium risk" },
  { value: "high", label: "C. High risk" },
];

export function CheckoutPrototype({ onOpenLine, onOpenCourier }: { onOpenLine: () => void; onOpenCourier: () => void }) {
  const [scenario, setScenario] = useState<CheckoutScenario>("high");
  const [pickupScenario, setPickupScenario] = useState<PickupScenario>("available");
  const [net, setNet] = useState<NetworkScenario>("ok");

  // Remount the screen when scenario-level inputs change so state starts clean.
  return (
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <DeviceFrame label="Shopee app, checkout (mobile)">
        <CheckoutScreen key={`${scenario}-${pickupScenario}`} scenario={scenario} pickupScenario={pickupScenario} net={net} onOpenLine={onOpenLine} onOpenCourier={onOpenCourier} />
      </DeviceFrame>
      <DemoPanel title="Interface 1. Risk-aware checkout">
        <Segmented label="Order scenario" value={scenario} options={scenarioOptions} onChange={setScenario} />
        <Segmented
          label="Pickup point data (state C)"
          value={pickupScenario}
          options={[{ value: "available", label: "Available" }, { value: "none", label: "None nearby" }, { value: "error", label: "Load error" }]}
          onChange={setPickupScenario}
        />
        <Segmented label="Place order request" value={net} options={[{ value: "ok", label: "Succeeds" }, { value: "error", label: "Fails" }]} onChange={setNet} />
        <InternalReadout scenario={scenario} />
      </DemoPanel>
    </div>
  );
}

function InternalReadout({ scenario }: { scenario: CheckoutScenario }) {
  const order = checkoutOrders[scenario];
  const tier = tierForScenario(scenario);
  const perishable = order.product.shelfLifeDays !== null && order.product.shelfLifeDays < RULES.perishableShelfLifeDays.value;
  return (
    <div className="rounded border border-line bg-canvas p-3 text-sm">
      <p className="font-medium text-ink">Internal decision (never shown to buyer)</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-muted">
        <dt>Catalog rule</dt>
        <dd>{perishable ? `Shelf life ${order.product.shelfLifeDays} days, below ${RULES.perishableShelfLifeDays.value}. COD blocked.` : "Not perishable"}</dd>
        <dt>Risk tier</dt>
        <dd>{perishable ? "Not evaluated, catalog rule applies first" : `Tier ${tier} (demo input, stands in for model output)`}</dd>
      </dl>
    </div>
  );
}

type Phase = { kind: "form" } | { kind: "placed"; method: PaymentMethodId; pickup?: PickupPoint };

function CheckoutScreen({
  scenario,
  pickupScenario,
  net,
  onOpenLine,
  onOpenCourier,
}: {
  scenario: CheckoutScenario;
  pickupScenario: PickupScenario;
  net: NetworkScenario;
  onOpenLine: () => void;
  onOpenCourier: () => void;
}) {
  const order = checkoutOrders[scenario];
  const decision = useMemo(() => decideCheckout(order.product, tierForScenario(scenario)), [order, scenario]);
  const [method, setMethod] = useState<PaymentMethodId | null>(decision.defaultMethod);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ pickup?: string; method?: string }>({});
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const pickups = useAsync<PickupPoint[]>();
  const choose = (id: PaymentMethodId) => { setMethod(id); setErrors({}); };
  const submit = useAsync<{ ref: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const opt = (id: PaymentMethodId) => decision.options.find((o) => o.id === id);
  const price = priceFor(order.product.unitPrice, order.quantity, order.shippingFee, method, method === "promptpay" ? decision.promptPayIncentiveCoins : 0);
  const loadPickups = () => pickups.run(() => fetchPickupPoints(pickupScenario));

  // Lazy-load pickup points only when the buyer chooses self-collection.
  useEffect(() => {
    if (method === "self_collect" && pickups.state.status === "idle") loadPickups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  const pickupList = pickups.state.status === "success" ? pickups.state.data : [];
  const selfCollectBlocked = method === "self_collect" && (pickups.state.status !== "success" || pickupList.length === 0);

  async function onPlaceOrder() {
    if (!method) {
      setErrors({ method: "Select a payment method to continue." });
      scrollRef.current?.querySelector<HTMLElement>("#pm-title")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (method === "self_collect" && pickupList.length > 0 && !pickupId) {
      setErrors({ pickup: "Select a pickup point to continue." });
      scrollRef.current?.querySelector<HTMLInputElement>("input[name='pickup']")?.focus();
      return;
    }
    setErrors({});
    const res = await submit.run(() => placeOrder(net));
    if (res) setPhase({ kind: "placed", method, pickup: pickupList.find((p) => p.id === pickupId) });
  }

  if (phase.kind === "placed") {
    return <PlacedScreen order={order} phase={phase} price={price} lineRequired={decision.requiresLineConfirmation(phase.method)} onOpenLine={onOpenLine} onOpenCourier={onOpenCourier} />;
  }

  const perishable = !!opt("cod") && !opt("cod")!.available && !opt("cod_deposit");
  const incentive = decision.promptPayIncentiveCoins;

  return (
    <>
      <AppBar title="Checkout" />
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pb-4">
        <section aria-label="Delivery address" className="flex gap-3 bg-white px-4 py-3">
          <Icon name="pin" className="mt-0.5 h-4 w-4 text-brand" />
          <div className="text-sm">
            <p className="font-medium text-ink">{order.recipientMasked}</p>
            <p className="text-ink-muted">{order.destinationSummary}</p>
          </div>
        </section>

        <section aria-label="Items" className="bg-white px-4 py-3">
          <p className="mb-3 text-sm font-medium text-ink">{order.merchant}</p>
          <ProductRow order={order} tag={perishable ? <Badge>Fresh product, shelf life {order.product.shelfLifeDays} days</Badge> : undefined} />
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink">Standard delivery</span>
            <span className="tabular text-ink">{thb(order.shippingFee)}</span>
          </div>
        </section>

        <section aria-labelledby="pm-title" className="bg-white">
          <h2 id="pm-title" className="px-4 pt-3 text-base font-medium text-ink">Payment method</h2>
          {errors.method && <p role="alert" className="px-4 pt-1 text-xs text-danger">{errors.method}</p>}

          {decision.options.some((o) => o.id === "cod_deposit") ? (
            <>
              <div role="radiogroup" aria-labelledby="pm-title" className="mt-1">
                <PaymentOption id="promptpay" name="pm" title="QR PromptPay" description="Pay the full amount now by scanning a QR code." checked={method === "promptpay"} onSelect={choose} />
              </div>
              <RiskIntervention>
                <div role="radiogroup" aria-label="Cash payment options">
                  <PaymentOption id="cod" name="pm" title="Cash on Delivery" checked={false} disabled unavailableReason={opt("cod")?.unavailableReason} onSelect={choose} />
                  <PaymentOption
                    id="cod_deposit"
                    name="pm"
                    title={`Pay a ${thb(RULES.guaranteeDeposit.value)} delivery guarantee deposit via PromptPay`}
                    description="Then pay the rest in cash on delivery."
                    checked={method === "cod_deposit"}
                    onSelect={choose}
                  >
                    <DepositExplainer payOnDelivery={price.total - RULES.guaranteeDeposit.value} />
                  </PaymentOption>
                  <PaymentOption
                    id="self_collect"
                    name="pm"
                    title="Free Self-Collection"
                    description="Collect from a nearby pickup point and pay in cash there. No extra fee."
                    checked={method === "self_collect"}
                    onSelect={choose}
                  >
                    <PickupOption state={pickups.state} selectedId={pickupId} onSelect={(id) => { setPickupId(id); setErrors({}); }} onRetry={loadPickups} error={errors.pickup} />
                    <Note src="proposed">Cash payment at pickup. The case says "pick up at a nearby collection point" without defining payment.</Note>
                  </PaymentOption>
                </div>
              </RiskIntervention>
            </>
          ) : (
            <div role="radiogroup" aria-labelledby="pm-title" className="mt-1">
              {decision.options.map((o) =>
                o.id === "promptpay" ? (
                  <PaymentOption
                    key={o.id}
                    id="promptpay"
                    name="pm"
                    title="QR PromptPay"
                    description={incentive ? `Switch to QR PromptPay and receive ${incentive} Shopee Coins.` : "Pay now by scanning a QR code."}
                    badge={incentive ? <Badge tone="brand">+{incentive} Coins</Badge> : undefined}
                    checked={method === "promptpay"}
                    onSelect={choose}
                  />
                ) : (
                  <PaymentOption
                    key={o.id}
                    id="cod"
                    name="pm"
                    title="Cash on Delivery"
                    description="Pay in cash when your order arrives."
                    checked={method === "cod"}
                    disabled={!o.available}
                    unavailableReason={o.unavailableReason}
                    onSelect={choose}
                  >
                    {decision.requiresLineConfirmation("cod") && (
                      <Alert tone="info" title={COPY.confirmationNotice}>
                        After checkout, confirm the order on LINE within 2 hours so it can be dispatched.
                      </Alert>
                    )}
                  </PaymentOption>
                ),
              )}
              {perishable && <div className="px-4 pb-3"><Note src="case">14-day perishability threshold. Proposed rule, not an existing Shopee policy.</Note></div>}
              {incentive > 0 && <div className="px-4 pb-3"><Note src="case">30 Coins incentive. COD stays the default and remains selectable.</Note></div>}
            </div>
          )}
        </section>

        <section aria-label="Payment details" className="bg-white px-4 py-3">
          <h2 className="mb-2 text-base font-medium text-ink">Payment details</h2>
          <OrderSummary order={order} price={price} method={method} />
        </section>
      </div>

      <div className="border-t border-line bg-white px-4 py-3 shadow-bar">
        {submit.state.status === "error" && (
          <div className="mb-3"><Alert tone="danger" role="alert" title={submit.state.message} /></div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">{price.payNow > 0 ? "Pay now" : "Total payment"}</p>
            <p className="text-lg font-medium text-brand tabular">{thb(price.payNow > 0 ? price.payNow : price.total)}</p>
          </div>
          <Button size="lg" onClick={onPlaceOrder} loading={submit.state.status === "loading"} disabled={selfCollectBlocked}>
            {submit.state.status === "error" ? "Try again" : "Place Order"}
          </Button>
        </div>
      </div>
    </>
  );
}

function PlacedScreen({
  order,
  phase,
  price,
  lineRequired,
  onOpenLine,
  onOpenCourier,
}: {
  order: (typeof checkoutOrders)[CheckoutScenario];
  phase: Extract<Phase, { kind: "placed" }>;
  price: ReturnType<typeof priceFor>;
  lineRequired: boolean;
  onOpenLine: () => void;
  onOpenCourier: () => void;
}) {
  const m = phase.method;
  return (
    <>
      <AppBar title="Order placed" />
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        <Alert tone="success" title="Your order has been placed.">Order {order.orderId}, {order.merchant}.</Alert>

        {m === "promptpay" && (
          <>
            <p className="text-base text-ink">Scan the QR code with your banking app to complete payment.</p>
            <QrPlaceholder amount={price.total} />
            {price.coins > 0 && <p className="text-sm text-ink-muted">{price.coins} Shopee Coins will be credited after payment is confirmed.</p>}
          </>
        )}

        {m === "cod_deposit" && (
          <>
            <p className="text-base text-ink">Pay the {thb(price.payNow)} deposit to confirm delivery to your door.</p>
            <QrPlaceholder amount={price.payNow} />
            <p className="text-sm text-ink-muted">Pay {thb(price.payLater)} in cash on delivery.</p>
            <Button variant="secondary" block onClick={onOpenCourier}>View courier inspection (prototype)</Button>
          </>
        )}

        {m === "self_collect" && phase.pickup && (
          <div className="rounded border border-line bg-white p-3 text-sm">
            <p className="font-medium text-ink">{phase.pickup.name}</p>
            <p className="text-ink-muted">{phase.pickup.type}. {phase.pickup.hours}.</p>
            <p className="mt-2 text-ink">We will notify you when the parcel is ready. Pay {thb(price.total)} in cash when you collect. Parcels are held for {phase.pickup.holdDays} days.</p>
          </div>
        )}

        {m === "cod" && !lineRequired && <p className="text-base text-ink">Pay {thb(price.total)} in cash when your order arrives.</p>}

        {m === "cod" && lineRequired && (
          <>
            <Alert tone="info" title={COPY.confirmationNotice}>
              We sent a confirmation request to your LINE account. Confirm within 2 hours so the order can be dispatched. You can also switch to QR PromptPay there.
            </Alert>
            <Button block onClick={onOpenLine}>Open LINE confirmation (prototype)</Button>
          </>
        )}
      </div>
    </>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-white px-2">
      <span className="grid h-8 w-8 place-items-center text-brand" aria-hidden="true"><Icon name="back" className="h-5 w-5" /></span>
      <h1 className="text-md font-medium text-ink">{title}</h1>
    </header>
  );
}
