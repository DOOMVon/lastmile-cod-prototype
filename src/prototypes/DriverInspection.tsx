import { useEffect, useState } from "react";
import { checklistItems, deliveryTask } from "../mock/data";
import { recordCollection, type NetworkScenario } from "../mock/services";
import { RULES } from "../rules";
import type { EvidencePhoto } from "../types";
import { mmss, thb, useAsync, useStopwatch } from "../lib/hooks";
import { Alert, Badge, Button, Card, DemoPanel, DeviceFrame, Field, Icon, Modal, Note, Segmented, StatusIndicator, cx, inputClass } from "../components/ui";
import { InspectionTimer, inspectionTimerState } from "../components/timers";
import { EvidenceCapture, InspectionChecklist, type ChecklistValue } from "../components/inspection";

type Step = "inspect" | "decide" | "receipt" | "refused";
const refusalReasons = ["Buyer unable to pay", "Buyer no longer wants the item", "Issue found during inspection", "Other"];

export function DriverPrototype() {
  const [runId, setRunId] = useState(0);
  const [net, setNet] = useState<NetworkScenario>("ok");
  const [skip, setSkip] = useState<{ n: number; sec: number }>({ n: 0, sec: 0 });
  return (
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <DeviceFrame label="SPX courier app, delivery task (prototype workflow)">
        <DriverScreen key={runId} net={net} skip={skip} />
      </DeviceFrame>
      <DemoPanel title="Interface 3. Courier doorstep inspection">
        <p className="text-sm text-ink-muted">Designed to support the proposed Dee-Delivery compliance workflow. Not an existing SPX application and not legally certified.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="neutral" onClick={() => setSkip((s) => ({ n: s.n + 1, sec: 60 }))}>Advance timer 60 s</Button>
          <Button size="sm" variant="neutral" onClick={() => setRunId((r) => r + 1)}>Reset task</Button>
        </div>
        <Segmented label="Payment recording request" value={net} options={[{ value: "ok", label: "Succeeds" }, { value: "error", label: "Fails" }]} onChange={setNet} />
        <p className="text-sm text-ink-muted">This delivery continues order {deliveryTask.orderId} from checkout state C, where the buyer paid the {thb(RULES.guaranteeDeposit.value)} deposit.</p>
        <Note src="proposed">Warning state starts at 2:30. Photo required only when an issue is found. Up to 3 photos.</Note>
      </DemoPanel>
    </div>
  );
}

function DriverScreen({ net, skip }: { net: NetworkScenario; skip: { n: number; sec: number } }) {
  const t = deliveryTask;
  const due = t.orderTotal - t.depositPaid;
  const sw = useStopwatch();
  // Demo control: advance the stopwatch without waiting.
  useEffect(() => {
    if (skip.n > 0 && sw.running) sw.skip(skip.sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip.n]);

  const [step, setStep] = useState<Step>("inspect");
  const [checks, setChecks] = useState<ChecklistValue>({});
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [refuseTouched, setRefuseTouched] = useState(false);
  const [cash, setCash] = useState("");
  const [cashTouched, setCashTouched] = useState(false);
  const collect = useAsync<{ receiptNo: string; at: string }>();

  const timerState = inspectionTimerState(sw.elapsedSec, sw.started, sw.running);
  const anyIssue = Object.values(checks).some((c) => c?.result === "issue");
  const inspecting = step === "inspect";

  const checklistValid =
    checklistItems.every((i) => checks[i.id]) &&
    Object.values(checks).every((c) => c?.result === "pass" || !!c?.note.trim()) &&
    (!anyIssue || photos.length > 0);

  function completeInspection() {
    setShowErrors(true);
    if (!checklistValid) return;
    sw.stop();
    setStep("decide");
  }

  const cashNum = Number(cash);
  const cashError = !cash.trim()
    ? "Enter the cash amount received."
    : !Number.isFinite(cashNum) || cashNum < 0
      ? "Enter a valid amount."
      : cashNum < due
        ? `Amount is less than ${thb(due)}.`
        : undefined;

  async function recordPayment() {
    setCashTouched(true);
    if (cashError) return;
    const r = await collect.run(() => recordCollection(net));
    if (r) setStep("receipt");
  }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3">
        <div className="flex items-center gap-2">
          <Icon name="truck" className="h-5 w-5 text-brand" />
          <h1 className="text-md font-medium text-ink">Delivery task</h1>
        </div>
        <Badge tone={step === "receipt" ? "success" : step === "refused" ? "danger" : "info"}>
          {step === "receipt" ? "Delivered" : step === "refused" ? "Refused" : t.status}
        </Badge>
      </header>

      <Stepper step={step} />

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Card as="div">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-muted">Order</dt><dd className="text-right text-ink tabular">{t.orderId}</dd>
            <dt className="text-ink-muted">AWB</dt><dd className="text-right text-ink tabular">{t.awb}</dd>
            <dt className="text-ink-muted">Recipient</dt><dd className="text-right text-ink">{t.recipientMasked}</dd>
            <dt className="text-ink-muted">Address</dt><dd className="text-right text-ink">{t.destinationSummary}</dd>
            <dt className="text-ink-muted">Item</dt><dd className="text-right text-ink">{t.itemSummary}</dd>
            <dt className="text-ink-muted">Payment</dt><dd className="text-right text-ink">{t.paymentLabel}</dd>
          </dl>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-ink-muted">Cash to collect</span>
            <span className="text-lg font-medium text-ink tabular">{thb(due)}</span>
          </div>
        </Card>

        <div className="rounded border border-line bg-white px-3 py-2.5 text-sm">
          <p className="text-ink">Proposed inspection allowance: <span className="font-medium tabular">{thb(RULES.inspectionAllowance.value)}</span></p>
          <p className="text-xs text-ink-subtle">Proposed operational rule. Not a legal requirement.</p>
        </div>

        {(step === "inspect" || step === "decide") && (
          <>
            <InspectionTimer elapsedSec={sw.elapsedSec} state={timerState} />

            {!sw.started ? (
              <Button block size="lg" onClick={sw.start}>Start inspection</Button>
            ) : (
              <>
                <section aria-labelledby="chk-title">
                  <h2 id="chk-title" className="mb-2 text-base font-medium text-ink">Three-point check</h2>
                  <InspectionChecklist items={checklistItems} value={checks} onChange={setChecks} disabled={!inspecting} showErrors={showErrors} />
                </section>
                <section aria-labelledby="ev-title">
                  <h2 id="ev-title" className="mb-2 text-base font-medium text-ink">Photo evidence {anyIssue ? "(required)" : "(optional)"}</h2>
                  <EvidenceCapture photos={photos} onChange={setPhotos} required={anyIssue} showErrors={showErrors} disabled={!inspecting} />
                </section>
                {inspecting && showErrors && !checklistValid && (
                  <Alert tone="danger" role="alert" title="Inspection is incomplete.">Complete the highlighted items to continue.</Alert>
                )}
                {inspecting && <Button block size="lg" onClick={completeInspection}>Complete inspection</Button>}
              </>
            )}
          </>
        )}

        {step === "decide" && (
          <section aria-labelledby="dec-title" className="space-y-3 rounded border border-line bg-white p-3">
            <h2 id="dec-title" className="text-base font-medium text-ink">Buyer decision</h2>
            {anyIssue && <Alert tone="warning" title="Issue recorded.">The buyer may refuse the parcel. The inspection record stays attached to this order.</Alert>}
            <Field label="Cash received (THB)" htmlFor="cash" error={cashTouched ? cashError : undefined} hint={`Amount due ${thb(due)}`}>
              <input
                id="cash"
                inputMode="decimal"
                className={inputClass(cashTouched && !!cashError)}
                value={cash}
                aria-invalid={(cashTouched && !!cashError) || undefined}
                aria-describedby={cashTouched && cashError ? "cash-error" : undefined}
                onChange={(e) => setCash(e.target.value.replace(/[^0-9.]/g, ""))}
                onBlur={() => setCashTouched(true)}
              />
            </Field>
            <div className="flex gap-2">
              {[due, 1600, 2000].map((v) => (
                <button key={v} type="button" onClick={() => { setCash(String(v)); setCashTouched(true); }} className="focus-ring rounded-sm border border-line-strong px-2.5 py-1 text-sm text-ink tabular hover:border-ink-subtle">
                  {v === due ? "Exact" : thb(v)}
                </button>
              ))}
            </div>
            {!cashError && cashNum > due && <p className="text-sm text-ink">Change to return: <span className="font-medium tabular">{thb(cashNum - due)}</span></p>}
            {collect.state.status === "error" && <Alert tone="danger" role="alert" title={collect.state.message} />}
            <Button block size="lg" loading={collect.state.status === "loading"} onClick={recordPayment}>Record cash payment</Button>
            <Button block variant="danger" disabled={collect.state.status === "loading"} onClick={() => { setRefuseReason(anyIssue ? refusalReasons[2] : ""); setRefuseOpen(true); }}>
              Buyer refuses parcel
            </Button>
          </section>
        )}

        {step === "receipt" && collect.state.status === "success" && (
          <Receipt
            receiptNo={collect.state.data.receiptNo}
            at={collect.state.data.at}
            due={due}
            received={cashNum}
            inspection={`${mmss(sw.elapsedSec)}, ${anyIssue ? "issue recorded" : "all checks passed"}, ${photos.length} photo(s)`}
          />
        )}

        {step === "refused" && (
          <div className="space-y-3" aria-live="polite">
            <Alert tone="neutral" title="Parcel refused. Return to hub started.">
              Reason: {refuseReason}. The inspection record and {photos.length} photo(s) are attached to the return.
            </Alert>
            <p className="text-sm text-ink-muted">The {thb(t.depositPaid)} deposit is retained under the proposed deposit rule shown at checkout.</p>
            <Note src="proposed">Refusal hands off to hub inspection and Seller Center (Interface 4).</Note>
          </div>
        )}
      </div>

      <Modal
        open={refuseOpen}
        title="Record refusal?"
        onClose={() => { setRefuseOpen(false); setRefuseTouched(false); }}
        footer={
          <>
            <Button block variant="danger" onClick={() => { setRefuseTouched(true); if (refuseReason) { setRefuseOpen(false); setStep("refused"); } }}>Record refusal</Button>
            <Button block variant="secondary" onClick={() => { setRefuseOpen(false); setRefuseTouched(false); }}>Back</Button>
          </>
        }
      >
        <p className="mb-3">The parcel will be returned to the hub. This cannot be undone from the courier app.</p>
        <Field label="Refusal reason" htmlFor="refuse-reason" error={refuseTouched && !refuseReason ? "Select a reason." : undefined}>
          <select id="refuse-reason" className={inputClass(refuseTouched && !refuseReason)} value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)}>
            <option value="">Select a reason</option>
            {refusalReasons.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </Modal>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const idx = step === "inspect" ? 0 : step === "decide" ? 1 : step === "receipt" ? 3 : 2;
  const labels = ["Inspect", "Collect payment", step === "refused" ? "Return" : "Receipt"];
  return (
    <ol className="flex shrink-0 border-b border-line bg-white px-3 py-2 text-xs" aria-label="Delivery steps">
      {labels.map((l, i) => (
        <li key={l} aria-current={i === idx ? "step" : undefined} className={cx("flex flex-1 items-center gap-1.5", i <= idx ? "text-ink" : "text-ink-subtle")}>
          <span className={cx("grid h-5 w-5 place-items-center rounded-full border text-[11px]", i < idx ? "border-success bg-success text-white" : i === idx ? "border-brand text-brand" : "border-line-strong")}>
            {i < idx ? <Icon name="check" className="h-3 w-3" /> : i + 1}
          </span>
          {l}
        </li>
      ))}
    </ol>
  );
}

function Receipt({ receiptNo, at, due, received, inspection }: { receiptNo: string; at: string; due: number; received: number; inspection: string }) {
  const t = deliveryTask;
  const rows: [string, string][] = [
    ["Receipt no.", receiptNo],
    ["Date and time", at],
    ["Order", t.orderId],
    ["AWB", t.awb],
    ["Item", t.itemSummary],
    ["Order total", thb(t.orderTotal)],
    ["Deposit paid (PromptPay)", thb(t.depositPaid)],
    ["Cash collected", thb(due)],
    ["Cash received", thb(received)],
    ["Change", thb(received - due)],
    ["Inspection", inspection],
  ];
  return (
    <section aria-labelledby="rcpt" className="rounded border border-line bg-white" aria-live="polite">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 id="rcpt" className="text-base font-medium text-ink">Prototype digital receipt</h2>
        <Badge>Not a legal document</Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-line px-3 py-2.5">
        <StatusIndicator tone="success" label="Delivered" detail="Payment recorded" />
      </div>
    </section>
  );
}
