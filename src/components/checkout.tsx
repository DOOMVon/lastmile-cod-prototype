// Checkout building blocks: PaymentOption, PickupOption, RiskIntervention, OrderSummary.
import type { ReactNode } from "react";
import { RULES, type PriceBreakdown } from "../rules";
import type { AsyncState, Order, PaymentMethodId, PickupPoint } from "../types";
import { thb } from "../lib/hooks";
import { Alert, Badge, Button, Icon, Note, Skeleton, cx } from "./ui";

// ---------- PaymentOption ----------
export function PaymentOption({
  id,
  name,
  title,
  description,
  checked,
  disabled,
  unavailableReason,
  badge,
  onSelect,
  children,
}: {
  id: PaymentMethodId;
  name: string;
  title: string;
  description?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  unavailableReason?: string;
  badge?: ReactNode;
  onSelect: (id: PaymentMethodId) => void;
  children?: ReactNode;
}) {
  const inputId = `${name}-${id}`;
  const descId = `${inputId}-desc`;
  return (
    <div className={cx("border-b border-line last:border-b-0", checked && "bg-brand-soft/40")}>
      <label htmlFor={inputId} className={cx("flex items-start gap-3 px-4 py-3", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
        <input
          id={inputId}
          type="radio"
          name={name}
          value={id}
          checked={checked}
          disabled={disabled}
          aria-describedby={descId}
          onChange={() => onSelect(id)}
          className="focus-ring mt-0.5 h-4 w-4 shrink-0 accent-brand disabled:opacity-50"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cx("text-base font-medium", disabled ? "text-disabled-fg" : "text-ink")}>{title}</span>
            {badge}
          </span>
          <span id={descId} className="mt-0.5 block text-sm text-ink-muted">
            {disabled && unavailableReason ? <span className="text-ink-muted">{unavailableReason}</span> : description}
          </span>
        </span>
      </label>
      {checked && children && <div className="px-4 pb-4 pl-11">{children}</div>}
    </div>
  );
}

// ---------- PickupOption ----------
export function PickupOption({
  state,
  selectedId,
  onSelect,
  onRetry,
  error,
}: {
  state: AsyncState<PickupPoint[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  error?: string;
}) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-2">
        <span className="sr-only">Loading pickup points</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded border border-line bg-white p-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Alert tone="danger" role="alert" title="Pickup points could not be loaded." action={<Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}>
        Retry, or choose another payment option.
      </Alert>
    );
  }
  if (state.data.length === 0) {
    return (
      <Alert tone="neutral" title="No pickup points are available near this address.">
        Choose the delivery guarantee deposit or QR PromptPay instead.
      </Alert>
    );
  }
  return (
    <fieldset aria-describedby={error ? "pickup-error" : undefined}>
      <legend className="mb-2 text-sm font-medium text-ink">Choose a pickup point</legend>
      <div className="space-y-2">
        {state.data.map((p) => {
          const sel = p.id === selectedId;
          return (
            <label key={p.id} className={cx("flex cursor-pointer gap-3 rounded border bg-white p-3", sel ? "border-brand" : error ? "border-danger" : "border-line")}>
              <input type="radio" name="pickup" className="focus-ring mt-0.5 h-4 w-4 accent-brand" checked={sel} onChange={() => onSelect(p.id)} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="tabular text-ink-muted">{p.distanceKm.toFixed(1)} km</span>
                </span>
                <span className="mt-0.5 block text-ink-muted">{p.type}. {p.hours}.</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <p id="pickup-error" role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-ink-subtle">Parcels are held for {state.data[0].holdDays} days after arrival.</p>
      <Note src="case">72-hour hold before automatic return, from the Consolidate pillar.</Note>
    </fieldset>
  );
}

// ---------- RiskIntervention ----------
// Buyer-facing copy for Tier 3 alternatives. Never mentions risk or scoring.
export function DepositExplainer({ payOnDelivery }: { payOnDelivery: number }) {
  const d = RULES.guaranteeDeposit.value;
  return (
    <div className="space-y-2 text-sm text-ink-muted">
      <ul className="space-y-1">
        <li>Pay {thb(d)} now via QR PromptPay.</li>
        <li>The deposit is deducted from your cash payment. You pay {thb(payOnDelivery)} on delivery.</li>
        <li>If the parcel is not accepted at delivery, the deposit covers the delivery cost and is not refunded.</li>
      </ul>
      <Note src="proposed">Deposit treatment. The case defines the THB 44 amount, not its refund terms.</Note>
    </div>
  );
}

export function RiskIntervention({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-line">
      <div className="px-4 pt-3">
        <Alert tone="neutral" title="Additional delivery confirmation is required for this order.">
          Cash on Delivery to your door is unavailable. You can still pay in cash with one of the options below.
        </Alert>
        <Note src="proposed">Buyer sees the action only. Internal tier and score are never shown.</Note>
      </div>
      <p className="px-4 pb-1 pt-3 text-sm font-medium text-ink">Cash payment options</p>
      {children}
    </div>
  );
}

// ---------- OrderSummary ----------
const methodLabel: Record<PaymentMethodId, string> = {
  promptpay: "QR PromptPay",
  cod: "Cash on Delivery",
  cod_deposit: "Cash on Delivery with deposit",
  self_collect: "Self-collection, pay at pickup",
};

export function OrderSummary({ order, price, method }: { order: Order; price: PriceBreakdown; method: PaymentMethodId | null }) {
  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className={cx("flex justify-between gap-4", strong ? "text-base font-medium text-ink" : "text-sm text-ink-muted")}>
      <dt>{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
  return (
    <dl className="space-y-1.5">
      <Row k={`Merchandise subtotal (${order.quantity} item${order.quantity > 1 ? "s" : ""})`} v={thb(price.subtotal)} />
      <Row k="Shipping fee" v={thb(price.shipping)} />
      <div className="my-2 border-t border-line" />
      <Row k="Order total" v={thb(price.total)} strong />
      {method && (price.payNow > 0 && price.payLater > 0 ? (
        <>
          <Row k="Pay now, deposit via QR PromptPay" v={thb(price.payNow)} />
          <Row k={price.payLaterLabel ?? "Pay later"} v={thb(price.payLater)} />
        </>
      ) : (
        <Row k="Payment method" v={methodLabel[method]} />
      ))}
      {price.coins > 0 && (
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-ink-muted">Shopee Coins to earn</dt>
          <dd><Badge tone="brand">+{price.coins} Coins</Badge></dd>
        </div>
      )}
    </dl>
  );
}

export function QrPlaceholder({ amount }: { amount: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-line bg-white p-4">
      <div role="img" aria-label="QR code placeholder" className="grid h-32 w-32 place-items-center rounded-sm border-2 border-dashed border-line-strong text-center text-xs text-ink-subtle">
        QR placeholder
      </div>
      <p className="text-base font-medium text-ink tabular">{thb(amount)}</p>
      <p className="text-xs text-ink-subtle">Prototype only. No payment is processed.</p>
    </div>
  );
}

export function ProductRow({ order, tag }: { order: Order; tag?: ReactNode }) {
  const { product, quantity } = order;
  return (
    <div className="flex gap-3">
      <div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-sm border border-line bg-canvas text-ink-subtle">
        <Icon name="store" className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-ink">{product.name}</p>
        <p className="text-sm text-ink-subtle">Variation: {product.variant}</p>
        {tag && <div className="mt-1">{tag}</div>}
        <div className="mt-1 flex justify-between text-sm">
          <span className="tabular text-ink">{thb(product.unitPrice)}</span>
          <span className="tabular text-ink-muted">x{quantity}</span>
        </div>
      </div>
    </div>
  );
}
