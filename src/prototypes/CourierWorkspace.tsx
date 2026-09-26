// Courier workspace: one doorstep COD delivery from task to completion.
// Reuses the shared design system, timer, checklist and evidence components.
import { useEffect, useState, type ReactNode } from "react";
import { checklistItems, courierOrders, courierReference } from "../mock/data";
import { recordCollection, sendReceipt, type NetworkScenario } from "../mock/services";
import { RULES } from "../rules";
import type { ChecklistItemId, CourierDeliveryState, CourierOrder, EvidencePhoto, InspectionStatus } from "../types";
import { mmss, thb, useStopwatch } from "../lib/hooks";
import { Alert, Badge, Button, DemoPanel, DeviceFrame, Icon, Modal, Note, Segmented, cx, type Tone } from "../components/ui";
import { InspectionTimer, inspectionTimerState } from "../components/timers";
import { EvidenceCapture, InspectionChecklist, type ChecklistValue } from "../components/inspection";

// ---------- State helpers ----------

const statusBadge: Record<CourierDeliveryState, { label: string; tone: Tone }> = {
  assigned: { label: "Ready for Delivery", tone: "info" },
  arrived: { label: "At customer", tone: "info" },
  inspecting: { label: "Inspecting", tone: "info" },
  "inspection-complete": { label: "Inspection complete", tone: "success" },
  "payment-pending": { label: "Payment pending", tone: "warning" },
  "payment-received": { label: "Payment received", tone: "success" },
  "receipt-sent": { label: "Receipt sent", tone: "success" },
  completed: { label: "Delivered", tone: "success" },
  "payment-not-received": { label: "Payment not received", tone: "danger" },
};

const steps = ["Task", "Inspect", "Payment", "Receipt", "Done"] as const;
const stepIndex: Record<CourierDeliveryState, number> = {
  assigned: 0,
  arrived: 0,
  inspecting: 1,
  "inspection-complete": 1,
  "payment-pending": 2,
  "payment-not-received": 2,
  "payment-received": 3,
  "receipt-sent": 3,
  completed: 5, // all steps done
};

type EvidenceKey = ChecklistItemId | "general";
type EvidenceMap = Record<EvidenceKey, EvidencePhoto[]>;
const emptyEvidence = (): EvidenceMap => ({ carton: [], awb_match: [], leakage: [], general: [] });

const statusOf = (v: ChecklistValue, id: ChecklistItemId): InspectionStatus => v[id]?.result ?? "pending";

// ---------- Page ----------

export function CourierWorkspace() {
  const [orderIdx, setOrderIdx] = useState(0);
  const [runId, setRunId] = useState(0);
  const [net, setNet] = useState<NetworkScenario>("ok");
  const [skip, setSkip] = useState({ n: 0, sec: 0 });

  return (
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <DeviceFrame label="Courier app, doorstep COD delivery (prototype)">
        <CourierApp
          key={`${orderIdx}-${runId}`}
          order={courierOrders[orderIdx]}
          net={net}
          skip={skip}
          hasNext={courierOrders.length > 1}
          onNext={() => setOrderIdx((i) => (i + 1) % courierOrders.length)}
          onRestart={() => setRunId((r) => r + 1)}
        />
      </DeviceFrame>
      <DemoPanel title="Courier workspace">
        <p className="text-sm text-ink-muted">
          One doorstep COD delivery, from assigned task to completion. Designed to support the proposed Dee-Delivery compliance workflow. Not an existing SPX application and not legally certified.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="neutral" onClick={() => setSkip((s) => ({ n: s.n + 1, sec: 60 }))}>Advance timer 60 s</Button>
          <Button size="sm" variant="neutral" onClick={() => setRunId((r) => r + 1)}>Reset delivery</Button>
        </div>
        <Segmented label="Payment and receipt requests" value={net} options={[{ value: "ok", label: "Succeed" }, { value: "error", label: "Fail" }]} onChange={setNet} />
        <p className="text-sm text-ink-muted">
          Only doorstep COD orders enter this queue: Tier 1 orders and Tier 2 orders confirmed on LINE. Self-collection orders go to pickup points and never reach this flow.
        </p>
        <Note src="case">3-minute target and THB 3.50 allowance. Both are proposed mechanisms, not OCPB requirements.</Note>
        <Note src="proposed">Photo evidence is recommended, not required. Exceeding 3:00 never blocks the delivery.</Note>
      </DemoPanel>
    </div>
  );
}

// ---------- App ----------

function CourierApp({
  order,
  net,
  skip,
  hasNext,
  onNext,
  onRestart,
}: {
  order: CourierOrder;
  net: NetworkScenario;
  skip: { n: number; sec: number };
  hasNext: boolean;
  onNext: () => void;
  onRestart: () => void;
}) {
  const [state, setState] = useState<CourierDeliveryState>("assigned");
  const [checks, setChecks] = useState<ChecklistValue>({});
  const [evidence, setEvidence] = useState<EvidenceMap>(emptyEvidence);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ receiptNo: string; at: string } | null>(null);
  const sw = useStopwatch();

  useEffect(() => {
    if (skip.n > 0 && sw.running) sw.skip(skip.sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip.n]);

  const statuses = checklistItems.map((i) => statusOf(checks, i.id));
  const allAnswered = statuses.every((s) => s !== "pending");
  const issueIds = checklistItems.filter((i) => statusOf(checks, i.id) === "issue").map((i) => i.id);
  const issuesWithoutPhoto = issueIds.filter((id) => evidence[id].length === 0);
  const photoCount = Object.values(evidence).reduce((n, list) => n + list.length, 0);
  const timerState = inspectionTimerState(sw.elapsedSec, sw.started, sw.running);

  const go = (next: CourierDeliveryState) => { setError(null); setState(next); };

  async function confirmPayment() {
    setBusy(true);
    setError(null);
    try {
      const r = await recordCollection(net);
      setReceipt(r);
      setConfirmOpen(false);
      setState("payment-received");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function onSendReceipt() {
    setBusy(true);
    setError(null);
    try {
      await sendReceipt(net);
      setState("receipt-sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Receipt was not sent.");
    } finally {
      setBusy(false);
    }
  }

  const badge = statusBadge[state];

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3">
        <div className="flex items-center gap-2">
          <Icon name="truck" className="h-5 w-5 text-brand" />
          <h1 className="text-md font-medium text-ink">Courier</h1>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </header>
      <ProgressSteps current={stepIndex[state]} />

      <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        {/* SCREEN 1: DELIVERY TASK */}
        {state === "assigned" && <OrderDetails order={order} />}

        {/* SCREEN 2: ARRIVAL */}
        {state === "arrived" && (
          <>
            <Alert tone="success" title="Customer has been reached">
              Start the inspection with the customer present. The inspection timer starts when you begin.
            </Alert>
            <OrderDetails order={order} compact />
          </>
        )}

        {/* SCREEN 3: INSPECTION */}
        {(state === "inspecting" || state === "inspection-complete") && (
          <>
            <InspectionTimer elapsedSec={sw.elapsedSec} state={timerState} />
            {timerState === "over" && (
              <p className="text-sm text-ink-muted">Past the 3:00 target. You can still finish the inspection normally.</p>
            )}
            <AllowanceStatus logged={state === "inspection-complete"} />

            {state === "inspecting" ? (
              <>
                <section aria-labelledby="chk-title">
                  <h2 id="chk-title" className="mb-2 text-base font-medium text-ink">3-point inspection</h2>
                  <InspectionChecklist
                    items={checklistItems}
                    value={checks}
                    onChange={setChecks}
                    noteRequired={false}
                    renderIssueExtra={(id) => {
                      const item = checklistItems.find((i) => i.id === id)!;
                      return (
                        <div className="space-y-2 border-t border-line pt-3">
                          <Alert tone="warning" title="Photo evidence is recommended for this issue." />
                          <EvidenceCapture
                            photos={evidence[id]}
                            onChange={(p) => setEvidence((e) => ({ ...e, [id]: p }))}
                            max={2}
                            addLabel="Add Photo"
                            sampleCaption={item.label}
                            hint="Local prototype only. Photos are not uploaded or verified."
                          />
                        </div>
                      );
                    }}
                  />
                </section>

                <section aria-labelledby="ev-title">
                  <h2 id="ev-title" className="mb-2 text-base font-medium text-ink">Add Photo Evidence <span className="font-normal text-ink-subtle">(optional)</span></h2>
                  <EvidenceCapture
                    photos={evidence.general}
                    onChange={(p) => setEvidence((e) => ({ ...e, general: p }))}
                    addLabel="Add Photo"
                    sampleCaption="Parcel overview"
                    hint="Local prototype only. Photos are not uploaded or verified."
                  />
                </section>

                {issuesWithoutPhoto.length > 0 && (
                  <Alert tone="warning" title="Consider adding photo evidence before continuing.">
                    {issuesWithoutPhoto.length === 1 ? "1 issue has" : `${issuesWithoutPhoto.length} issues have`} no photo yet. You can still continue.
                  </Alert>
                )}
              </>
            ) : (
              <InspectionSummary checks={checks} photoCount={photoCount} elapsedSec={sw.elapsedSec} />
            )}
          </>
        )}

        {/* SCREEN 4: PAYMENT COLLECTION */}
        {state === "payment-pending" && (
          <>
            <div className="rounded border border-line bg-white p-4 text-center">
              <p className="text-sm text-ink-muted">Amount to collect</p>
              <p className="mt-1 text-xl font-medium text-ink tabular">{thb(order.amountToCollect)}</p>
              <p className="mt-1 text-sm text-ink">{order.paymentMethod}</p>
            </div>
            <InspectionSummary checks={checks} photoCount={photoCount} elapsedSec={sw.elapsedSec} compact />
          </>
        )}

        {state === "payment-not-received" && (
          <>
            <Alert tone="danger" title="Payment not received">
              Do not hand over the parcel. It stays with you. Follow-up handling is outside this prototype.
            </Alert>
            <p className="text-sm text-ink-muted">The inspection record and {photoCount} photo(s) remain attached to {order.orderId}.</p>
          </>
        )}

        {/* SCREEN 5: DIGITAL RECEIPT */}
        {(state === "payment-received" || state === "receipt-sent") && receipt && (
          <>
            <Alert tone="success" title="Payment Received">{thb(order.amountToCollect)} collected in cash.</Alert>
            <DigitalReceipt order={order} receipt={receipt} />
            {state === "receipt-sent" && <Alert tone="success" title="Receipt sent via SMS / LINE">Simulated. No message was actually sent.</Alert>}
          </>
        )}

        {/* SCREEN 6: COMPLETED */}
        {state === "completed" && (
          <CompletedSummary order={order} photoCount={photoCount} elapsedSec={sw.elapsedSec} issues={issueIds.length} />
        )}

        {error && state !== "payment-pending" && <Alert tone="danger" role="alert" title={error} />}
      </div>

      {/* One primary action per screen */}
      <ActionBar>
        {state === "assigned" && <Button block size="lg" onClick={() => go("arrived")}>Arrived at Customer</Button>}
        {state === "arrived" && <Button block size="lg" onClick={() => { sw.start(); go("inspecting"); }}>Start Inspection</Button>}
        {state === "inspecting" && (
          <>
            {!allAnswered && <p className="mb-2 text-center text-xs text-ink-muted">Mark all 3 checks to continue ({statuses.filter((s) => s !== "pending").length}/3 done).</p>}
            <Button block size="lg" disabled={!allAnswered} onClick={() => { sw.stop(); go("inspection-complete"); }}>Complete Inspection</Button>
          </>
        )}
        {state === "inspection-complete" && <Button block size="lg" onClick={() => go("payment-pending")}>Continue to Payment</Button>}
        {state === "payment-pending" && (
          <div className="space-y-2">
            <Button block size="lg" onClick={() => { setError(null); setConfirmOpen(true); }}>Collect Payment</Button>
            <Button block variant="secondary" onClick={() => go("payment-not-received")}>Payment Not Received</Button>
          </div>
        )}
        {state === "payment-not-received" && (
          <div className="space-y-2">
            <Button block size="lg" onClick={() => go("payment-pending")}>Retry Payment</Button>
            <Button block variant="secondary" onClick={onRestart}>Back to Delivery Task</Button>
          </div>
        )}
        {state === "payment-received" && <Button block size="lg" loading={busy} onClick={onSendReceipt}>{error ? "Retry Send Receipt" : "Send Receipt"}</Button>}
        {state === "receipt-sent" && <Button block size="lg" onClick={() => go("completed")}>Complete Delivery</Button>}
        {state === "completed" && (
          <Button block size="lg" onClick={hasNext ? onNext : onRestart}>{hasNext ? "View Next Delivery" : "Back to Delivery Task"}</Button>
        )}
      </ActionBar>

      <Modal
        open={confirmOpen}
        title="Confirm cash received"
        onClose={() => !busy && setConfirmOpen(false)}
        footer={
          <>
            <Button block size="lg" loading={busy} onClick={confirmPayment}>{error ? "Retry" : "Payment Received"}</Button>
            <Button block variant="secondary" disabled={busy} onClick={() => setConfirmOpen(false)}>Back</Button>
          </>
        }
      >
        <p>Confirm that you received <span className="font-medium text-ink tabular">{thb(order.amountToCollect)}</span> in cash from the customer.</p>
        {error && <div className="mt-3"><Alert tone="danger" role="alert" title={error} /></div>}
      </Modal>
    </>
  );
}

// ---------- Pieces ----------

function ProgressSteps({ current }: { current: number }) {
  return (
    <ol className="flex shrink-0 border-b border-line bg-white px-2 py-2 text-xs" aria-label="Delivery progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className={cx("flex flex-1 flex-col items-center gap-1", done || active ? "text-ink" : "text-ink-subtle")}>
            <span
              className={cx(
                "grid h-5 w-5 place-items-center rounded-full border text-[11px]",
                done ? "border-success bg-success text-white" : active ? "border-brand text-brand" : "border-line-strong",
              )}
            >
              {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className="shrink-0 border-t border-line bg-white px-3 py-3 shadow-bar">{children}</div>;
}

function OrderDetails({ order, compact = false }: { order: CourierOrder; compact?: boolean }) {
  const rows: [string, string][] = [
    ["Order ID", order.orderId],
    ...(compact ? ([["Recipient", order.recipient]] as [string, string][]) : []),
    ["Package", order.packageDescription],
    ["Delivery type", order.paymentMethod],
  ];
  return (
    <section aria-label="Delivery details" className="rounded border border-line bg-white">
      {!compact && (
        <div className="flex items-start gap-2 border-b border-line px-4 py-3">
          <Icon name="pin" className="mt-0.5 h-4 w-4 text-brand" />
          <div>
            <p className="text-base font-medium text-ink">{order.recipient}</p>
            <p className="text-sm text-ink-muted">{order.deliveryAddress}</p>
          </div>
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <span className="text-sm text-ink-muted">Amount to collect</span>
        <span className="text-lg font-medium text-ink tabular">{thb(order.amountToCollect)}</span>
      </div>
    </section>
  );
}

function AllowanceStatus({ logged }: { logged: boolean }) {
  const amount = thb(RULES.inspectionAllowance.value);
  return logged ? (
    <div className="flex items-center gap-2 rounded border border-success bg-success-soft px-3 py-2.5 text-sm">
      <Icon name="check" className="h-4 w-4 text-success" />
      <span className="font-medium text-ink">{amount} Inspection Allowance Logged</span>
      <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-ink-muted">Prototype</span>
    </div>
  ) : (
    <div className="rounded border border-line bg-white px-3 py-2.5 text-sm">
      <p className="text-ink">Proposed Inspection Allowance: <span className="font-medium tabular">{amount}</span></p>
      <p className="text-xs text-ink-subtle">Proposed business-case mechanism. Logged when the inspection is completed.</p>
    </div>
  );
}

function InspectionSummary({ checks, photoCount, elapsedSec, compact = false }: { checks: ChecklistValue; photoCount: number; elapsedSec: number; compact?: boolean }) {
  return (
    <section aria-label="Inspection summary" className="rounded border border-line bg-white p-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">Inspection {compact ? "summary" : "complete"}</h2>
        <span className="text-ink-muted tabular">{mmss(elapsedSec)}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {checklistItems.map((i) => {
          const s = statusOf(checks, i.id);
          return (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="text-ink">{i.label}</span>
              <Badge tone={s === "pass" ? "success" : s === "issue" ? "danger" : "neutral"}>{s === "pass" ? "Pass" : s === "issue" ? "Issue found" : "Pending"}</Badge>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-ink-muted">{photoCount === 0 ? "No photo evidence captured." : `${photoCount} photo(s) captured.`}</p>
    </section>
  );
}

function DigitalReceipt({ order, receipt }: { order: CourierOrder; receipt: { receiptNo: string; at: string } }) {
  const rows: [string, string][] = [
    ["Receipt no.", receipt.receiptNo],
    ["Order ID", order.orderId],
    ["Amount", thb(order.amountToCollect)],
    ["Payment method", order.paymentMethod],
    ["Date and time", receipt.at],
    ["Courier reference", courierReference],
    ["Delivery status", "Delivered, payment received"],
  ];
  return (
    <section aria-labelledby="rcpt-title" className="rounded border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 id="rcpt-title" className="text-base font-medium text-ink">Digital Receipt</h2>
        <Badge>Prototype receipt flow</Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-3 py-2 text-xs text-ink-subtle">Not a legally certified receipt.</p>
    </section>
  );
}

function CompletedSummary({ order, photoCount, elapsedSec, issues }: { order: CourierOrder; photoCount: number; elapsedSec: number; issues: number }) {
  const rows: [string, string][] = [
    ["Order ID", order.orderId],
    ["Payment received", `${thb(order.amountToCollect)}, ${order.paymentMethod}`],
    ["Inspection completed", `${mmss(elapsedSec)}, ${issues === 0 ? "all checks passed" : `${issues} issue(s) recorded`}`],
    ["Evidence captured", photoCount === 0 ? "None" : `${photoCount} photo(s)`],
    ["Inspection allowance logged", thb(RULES.inspectionAllowance.value)],
  ];
  return (
    <div className="space-y-3">
      <div className="rounded border border-success bg-success-soft p-4 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success text-white"><Icon name="check" className="h-5 w-5" /></span>
        <p className="mt-2 text-lg font-medium text-ink">Delivery Completed</p>
      </div>
      <ul className="divide-y divide-line rounded border border-line bg-white text-sm">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-start gap-2 px-3 py-2.5">
            <Icon name="check" className="mt-0.5 h-4 w-4 text-success" />
            <span className="flex-1 text-ink-muted">{k}</span>
            <span className="text-right text-ink tabular">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
