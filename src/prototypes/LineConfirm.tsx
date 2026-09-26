import { useEffect, useRef, useState, type ReactNode } from "react";
import { checkoutOrders } from "../mock/data";
import { submitLineAction, type NetworkScenario } from "../mock/services";
import { RULES } from "../rules";
import { thb, useCountdown } from "../lib/hooks";
import { Alert, Button, DemoPanel, DeviceFrame, Icon, Note, Segmented, cx } from "../components/ui";
import { CountdownTimer } from "../components/timers";
import { QrPlaceholder } from "../components/checkout";

const order = checkoutOrders.medium;
const itemValue = order.product.unitPrice * order.quantity;
const total = itemValue + order.shippingFee;

type Outcome = "none" | "confirmed" | "promptpay" | "cancel_prompt" | "cancelled" | "expired";
type Action = "confirm" | "promptpay" | "cancel";

const cancelReasons = ["Changed my mind", "Ordered by mistake", "Found a better price", "Other reason"];

export function LinePrototype() {
  const [runId, setRunId] = useState(0);
  const [deadline, setDeadline] = useState(() => Date.now() + RULES.tier2ConfirmWindowMs.value);
  const [net, setNet] = useState<NetworkScenario>("ok");

  const reset = () => { setRunId((r) => r + 1); setDeadline(Date.now() + RULES.tier2ConfirmWindowMs.value); };

  return (
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <DeviceFrame label="LINE Official Account chat (prototype of a Flex Message)" statusBar="dark">
        <LineChat key={runId} deadline={deadline} net={net} />
      </DeviceFrame>
      <DemoPanel title="Interface 2. LINE confirmation (Tier 2)">
        <p className="text-sm text-ink-muted">Not connected to LINE. The timer uses this device's clock and resets on reload.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="neutral" onClick={() => setDeadline(Date.now() + 10 * 60 * 1000)}>Jump to 10 min left</Button>
          <Button size="sm" variant="neutral" onClick={() => setDeadline(Date.now() + 10 * 1000)}>Jump to 10 s left</Button>
          <Button size="sm" variant="neutral" onClick={() => setDeadline(Date.now())}>Expire now</Button>
          <Button size="sm" variant="neutral" onClick={reset}>Reset flow</Button>
        </div>
        <Segmented label="Response request" value={net} options={[{ value: "ok", label: "Succeeds" }, { value: "error", label: "Fails" }]} onChange={setNet} />
        <Note src="proposed">Expiry cancels the order before dispatch. The case does not define what happens after 2 hours.</Note>
        <Note src="proposed">Cancellation is confirmed with a follow-up message, since Flex Messages cannot open native dialogs.</Note>
      </DemoPanel>
    </div>
  );
}

function LineChat({ deadline, net }: { deadline: number; net: NetworkScenario }) {
  const [outcome, setOutcome] = useState<Outcome>("none");
  const [pending, setPending] = useState<Action | null>(null);
  const [userReplies, setUserReplies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const responded = outcome === "confirmed" || outcome === "promptpay" || outcome === "cancelled";
  const { remainingSec, expired: timeUp } = useCountdown(deadline, responded);
  const expired = timeUp && !responded;
  const locked = responded || expired;

  // Keep the newest message in view, like a chat client.
  useEffect(() => {
    const el = chatRef.current;
    if (el && (userReplies.length || expired)) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [userReplies.length, outcome, expired]);

  async function act(action: Action, displayText: string, next: Outcome) {
    setPending(action);
    setError(null);
    try {
      await submitLineAction(net);
      setUserReplies((r) => [...r, displayText]);
      setOutcome(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your response was not sent. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 bg-ink px-3 text-white">
        <Icon name="back" className="h-5 w-5" />
        <div className="min-w-0">
          <p className="truncate text-base font-medium">Shopee TH (demo account)</p>
        </div>
      </header>

      <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto bg-chat p-3" aria-live="polite">
        <p className="mx-auto w-fit rounded-full bg-black/10 px-2.5 py-0.5 text-xs text-ink-muted">Today</p>

        <BotBubble>
          <div className="w-[300px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="border-b border-line px-4 py-3">
              <p className="text-xs text-ink-muted">Order {order.orderId}</p>
              <p className="mt-0.5 text-md font-medium text-ink">Please confirm your order</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-4 py-3 text-sm">
              <dt className="text-ink-muted">Shop</dt><dd className="text-right text-ink">{order.merchant}</dd>
              <dt className="text-ink-muted">Item</dt><dd className="text-right text-ink">{order.product.name}, {order.product.variant}</dd>
              <dt className="text-ink-muted">Quantity</dt><dd className="text-right text-ink tabular">{order.quantity}</dd>
              <dt className="text-ink-muted">Declared value</dt><dd className="text-right text-ink tabular">{thb(itemValue)}</dd>
              <dt className="text-ink-muted">Amount due</dt><dd className="text-right text-ink tabular">{thb(total)}</dd>
              <dt className="text-ink-muted">Payment</dt><dd className="text-right text-ink">Cash on Delivery</dd>
              <dt className="text-ink-muted">Deliver to</dt><dd className="text-right text-ink">{order.destinationSummary}</dd>
            </dl>
            <div className="px-4">
              <CountdownTimer remainingSec={remainingSec} expired={expired} stopped={responded} />
            </div>
            <div className="space-y-2 px-4 pb-4 pt-3">
              <Button block disabled={locked || pending !== null} loading={pending === "confirm"} onClick={() => act("confirm", "Confirm Order & Authorize Delivery", "confirmed")}>
                Confirm Order & Authorize Delivery
              </Button>
              <Button block variant="secondary" disabled={locked || pending !== null} loading={pending === "promptpay"} onClick={() => act("promptpay", "Switch to PromptPay", "promptpay")}>
                Switch to PromptPay +{RULES.promptPayCoins.value} Coins
              </Button>
              <div className="text-center">
                <Button variant="tertiary" disabled={locked || pending !== null || outcome === "cancel_prompt"} onClick={() => { setUserReplies((r) => [...r, "Cancel order"]); setOutcome("cancel_prompt"); }}>
                  Cancel Order Without Penalty
                </Button>
              </div>
              {error && outcome !== "cancel_prompt" && <Alert tone="danger" role="alert" title={error} />}
            </div>
          </div>
        </BotBubble>

        {userReplies.map((t, i) => <UserBubble key={i}>{t}</UserBubble>)}

        {outcome === "cancel_prompt" && !expired && (
          <CancelPrompt
            pending={pending === "cancel"}
            error={error ?? undefined}
            onKeep={() => { setUserReplies((r) => [...r, "Keep order"]); setOutcome("none"); setError(null); }}
            onCancel={(reason) => act("cancel", reason, "cancelled")}
          />
        )}

        {outcome === "confirmed" && (
          <BotBubble><TextCard title="Order confirmed.">Your order will be prepared for dispatch. Pay {thb(total)} in cash on delivery.</TextCard></BotBubble>
        )}

        {outcome === "promptpay" && (
          <BotBubble>
            <TextCard title="Payment method changed to QR PromptPay.">
              <p>Scan the QR code to pay. Your order will be dispatched after payment is received, and {RULES.promptPayCoins.value} Shopee Coins will be credited.</p>
              <div className="mt-2"><QrPlaceholder amount={total} /></div>
            </TextCard>
          </BotBubble>
        )}

        {outcome === "cancelled" && (
          <BotBubble><TextCard title="Order cancelled.">The order was not dispatched and no fee was charged.</TextCard></BotBubble>
        )}

        {expired && (
          <BotBubble>
            <TextCard title="Confirmation time has ended.">
              This order was cancelled because it was not confirmed within 2 hours. It was not dispatched and no fee was charged. You can place the order again in the Shopee app.
            </TextCard>
          </BotBubble>
        )}
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2 border-t border-line bg-white px-3 text-sm text-ink-subtle" aria-hidden="true">
        <span className="flex-1 rounded-full bg-canvas px-3 py-1.5">Message input (not used in prototype)</span>
      </div>
    </>
  );
}

function CancelPrompt({ pending, error, onKeep, onCancel }: { pending: boolean; error?: string; onKeep: () => void; onCancel: (reason: string) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  return (
    <BotBubble>
      <div className="w-[300px] rounded-lg border border-line bg-white p-4">
        <p className="text-md font-medium text-ink">Cancel this order?</p>
        <p className="mt-1 text-sm text-ink-muted">The order has not been dispatched. No cancellation fee applies.</p>
        <fieldset className="mt-3">
          <legend className="mb-1.5 text-sm font-medium text-ink">Reason</legend>
          <div className="flex flex-wrap gap-1.5">
            {cancelReasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cx("focus-ring rounded-full border px-2.5 py-1 text-sm", reason === r ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-ink")}
              >
                {r}
              </button>
            ))}
          </div>
          {touched && !reason && <p role="alert" className="mt-1.5 text-xs text-danger">Select a reason to cancel.</p>}
        </fieldset>
        {error && <div className="mt-3"><Alert tone="danger" role="alert" title={error} /></div>}
        <div className="mt-3 space-y-2">
          <Button block variant="danger" loading={pending} onClick={() => { setTouched(true); if (reason) onCancel(reason); }}>Cancel order</Button>
          <Button block variant="secondary" disabled={pending} onClick={onKeep}>Keep order</Button>
        </div>
      </div>
    </BotBubble>
  );
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-medium text-white">S</div>
      {children}
    </div>
  );
}
function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[240px] rounded-lg bg-info-soft px-3 py-2 text-sm text-ink">{children}</p>
    </div>
  );
}
function TextCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-[300px] rounded-lg bg-white px-3 py-2.5 text-sm">
      <p className="font-medium text-ink">{title}</p>
      <div className="mt-0.5 text-ink-muted">{children}</div>
    </div>
  );
}
