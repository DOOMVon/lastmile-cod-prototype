import { useState } from "react";
import { RULES, type ShelfLifeCheck } from "../rules";
import type { CompensationStatus as Comp, RecoveryStatus, ReturnCase } from "../types";
import { pct, thb } from "../lib/hooks";
import { submitRecoveryChoice, type NetworkScenario } from "../mock/services";
import { Alert, Badge, Button, Card, Icon, Modal, Note, StatusIndicator, cx } from "./ui";

// ---------- Card 1 ----------
export function ReturnTimeline({ rc }: { rc: ReturnCase }) {
  const events = [...rc.timeline].reverse();
  return (
    <Card title="Return status" aside={<Badge tone={rc.estimatedReturnDate ? "info" : "warning"}>{rc.currentStatus}</Badge>}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        <KV k="Order ID" v={rc.orderId} />
        <KV k="Return location" v={rc.returnLocation} />
        <KV k="Estimated return date" v={rc.estimatedReturnDate ?? "Not scheduled"} />
        <KV k="Last scan" v={`${rc.lastScan.label}, ${rc.lastScan.at}`} />
      </dl>
      {!rc.estimatedReturnDate && (
        <p className="mt-3 text-sm text-ink-muted">The parcel stays at the hub until the claim and handling decisions below are complete.</p>
      )}
      <h3 className="mb-2 mt-5 text-sm font-medium text-ink">Timeline</h3>
      <ol className="relative ml-1.5 border-l border-line">
        {events.map((e, i) => (
          <li key={e.at} className="relative pb-4 pl-5 last:pb-0">
            <span aria-hidden="true" className={cx("absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white", i === 0 ? "bg-brand" : "bg-line-strong")} />
            <p className={cx("text-sm", i === 0 ? "font-medium text-ink" : "text-ink")}>{e.label}</p>
            <p className="text-xs text-ink-subtle">{e.at}. {e.location}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-subtle">Demo data. Not live tracking.</p>
    </Card>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{k}</dt>
      <dd className="mt-0.5 text-ink">{v}</dd>
    </div>
  );
}

// ---------- Card 2 ----------
export function InspectionResult({ rc, shelf }: { rc: ReturnCase; shelf: ShelfLifeCheck | null }) {
  const i = rc.inspection;
  const threshold = RULES.shelfLifeConsumedRatio.value;
  return (
    <Card title="Hub inspection result" aside={<Badge tone="info">AI-assisted inspection</Badge>}>
      <div className="grid gap-5 md:grid-cols-[240px_1fr]">
        <div role="img" aria-label="Inspection image placeholder" className="grid aspect-[4/3] place-items-center rounded border border-dashed border-line-strong bg-canvas text-center text-ink-subtle">
          <div>
            <Icon name="camera" className="mx-auto h-6 w-6" />
            <p className="mt-1 text-xs">Inspection image placeholder</p>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4">
            <KV k="Inspected at" v={i.inspectedAt} />
            <KV k="Hub" v={i.hub} />
            <KV k="Transit duration" v={`${i.transitDays} days`} />
            <KV k="Declared value" v={thb(rc.declaredValue)} />
          </dl>

          <div>
            <h3 className="font-medium text-ink">Detected physical damage</h3>
            {i.detections.length === 0 ? (
              <p className="mt-1 text-ink-muted">No damage detected.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {i.detections.map((d) => (
                  <li key={d.label}>
                    <div className="flex justify-between">
                      <span className="text-ink">{d.label}</span>
                      <span className="tabular text-ink-muted">{pct(d.confidence)} confidence</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-sm bg-canvas" aria-hidden="true">
                      <div className="h-full rounded-sm bg-info" style={{ width: pct(d.confidence) }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-subtle">Model confidence is a review signal and can be wrong. Decisions come from the business rules under Compensation.</p>
            <Note src="placeholder">Automated decisions use detections at or above {pct(RULES.autoApproveMinConfidence.value)}. This threshold is not in the case.</Note>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4 text-sm">
        <h3 className="font-medium text-ink">Shelf-life check</h3>
        {shelf ? (
          <>
            <dl className="mt-2 grid grid-cols-3 gap-4">
              <KV k="Declared shelf life" v={`${shelf.declaredDays} days`} />
              <KV k="Transit duration" v={`${shelf.transitDays} days (${pct(shelf.consumedRatio)})`} />
              <KV k="Remaining shelf life" v={`${shelf.remainingDays} days`} />
            </dl>
            <div className="relative mt-3 h-2 rounded-sm bg-canvas" aria-hidden="true">
              <div className={cx("h-full rounded-sm", shelf.exceedsThreshold ? "bg-accent" : "bg-success")} style={{ width: pct(Math.min(1, shelf.consumedRatio)) }} />
              <div className="absolute -top-1 h-4 w-px bg-ink" style={{ left: pct(threshold) }} />
            </div>
            <p className="mt-2 text-ink">
              Proposed business rule: transit consumed &gt;40% of declared shelf life.{" "}
              <span className={cx("font-medium", shelf.exceedsThreshold ? "text-warning" : "text-success")}>{shelf.exceedsThreshold ? "Met" : "Not met"}</span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-ink-muted">No shelf life declared for this product. The rule does not apply.</p>
        )}
      </div>
    </Card>
  );
}

// ---------- Card 3 ----------
export function CompensationStatus({ status }: { status: Comp }) {
  return (
    <Card title="Compensation" aside={status.kind === "approved_auto" ? <Badge tone="brand">Automated claim</Badge> : status.kind === "manual_review" ? <Badge tone="warning">Manual review</Badge> : undefined}>
      {status.kind === "not_applicable" && (
        <div className="text-sm">
          <StatusIndicator tone="neutral" label="No claim" />
          <p className="mt-2 text-ink-muted">{status.reason}</p>
        </div>
      )}
      {status.kind === "approved_auto" && (
        <div className="text-sm">
          <StatusIndicator tone="success" label="Approved for automated reimbursement" />
          <p className="mt-3 text-xl font-medium text-ink tabular">{thb(status.amount)}</p>
          <p className="text-ink-muted">Expected credit to Seller Balance within {RULES.compensationSlaHours.value} hours</p>
          <p className="mt-4 text-ink">Claim meets the proposed automated compensation criteria.</p>
          <ul className="mt-2 space-y-1">
            {status.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-ink-muted"><Icon name="check" className="mt-0.5 h-4 w-4 text-success" />{r}</li>
            ))}
          </ul>
          <Note src="case">THB 2,000 limit and 24-hour target. Approval also depends on evidence, not value alone.</Note>
        </div>
      )}
      {status.kind === "manual_review" && (
        <div className="text-sm">
          <StatusIndicator tone="warning" label="Under manual review" />
          <p className="mt-2 text-ink-muted">This claim does not meet the automated criteria, so a reviewer will assess it. No automated decision was made.</p>
          <ul className="mt-2 space-y-1">
            {status.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-ink-muted"><Icon name="info" className="mt-0.5 h-4 w-4 text-warning" />{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ---------- Card 4 ----------
type Choice = "recover" | "return";

export function MaterialRecovery({ status, net }: { status: RecoveryStatus; net: NetworkScenario }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      await submitRecoveryChoice(net);
      setSaved(choice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your choice was not saved.");
    } finally {
      setSaving(false);
    }
  }

  if (status.kind === "not_applicable") {
    return (
      <Card title="Parcel handling">
        <StatusIndicator tone="neutral" label="Local material recovery not applicable" />
        <p className="mt-2 text-sm text-ink-muted">{status.reason}</p>
      </Card>
    );
  }

  return (
    <Card title="Parcel handling">
      <div className="text-sm">
        <StatusIndicator tone="info" label="Eligible for local material recovery" />
        <ul className="mt-2 space-y-1 text-ink-muted">
          {status.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <div className="mt-3 rounded border border-line bg-canvas px-3 py-2.5">
          <p className="text-ink">Estimated reverse-freight saving: <span className="font-medium tabular">{thb(status.estimatedSaving)}</span></p>
          <p className="text-xs text-ink-subtle">Business-case estimate, not a quote.</p>
        </div>
        <p className="mt-3 text-ink-muted">Nothing is recovered or disposed of until you choose.</p>

        {saved ? (
          <div className="mt-3" aria-live="polite">
            <Alert tone="success" title="Choice saved.">
              {saved === "recover" ? "The hub will process the parcel for local material recovery." : "The parcel will be returned to your registered pickup address."}
            </Alert>
          </div>
        ) : (
          <fieldset className="mt-3" aria-describedby={touched && !choice ? "rec-err" : undefined}>
            <legend className="mb-1.5 font-medium text-ink">How should this parcel be handled?</legend>
            {([
              ["recover", "Local material recovery at the hub"],
              ["return", "Return the parcel to me"],
            ] as const).map(([v, l]) => (
              <label key={v} className={cx("mb-2 flex cursor-pointer items-center gap-2.5 rounded border px-3 py-2.5", choice === v ? "border-brand" : touched && !choice ? "border-danger" : "border-line")}>
                <input type="radio" name="recovery" className="focus-ring h-4 w-4 accent-brand" checked={choice === v} onChange={() => setChoice(v)} />
                <span className="text-ink">{l}</span>
              </label>
            ))}
            {touched && !choice && <p id="rec-err" role="alert" className="text-xs text-danger">Choose how the parcel should be handled.</p>}
            {error && <div className="mt-2"><Alert tone="danger" role="alert" title={error} /></div>}
            <Button className="mt-2" loading={saving} onClick={() => { setTouched(true); if (choice) setConfirmOpen(true); }}>Save choice</Button>
          </fieldset>
        )}
        <Note src="proposed">Seller confirms handling. The case does not state that damaged parcels are recovered automatically.</Note>
      </div>

      <Modal
        page
        open={confirmOpen}
        title={choice === "return" ? "Return the parcel to you?" : "Proceed with local material recovery?"}
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button block onClick={save}>{choice === "return" ? "Return parcel" : "Proceed with recovery"}</Button>
            <Button block variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Button>
          </>
        }
      >
        {choice === "return"
          ? `The parcel will be sent to your registered pickup address. The estimated ${thb(RULES.reverseFreightSaving.value)} reverse-freight saving will not apply.`
          : "The hub will process the parcel for local material recovery. It will not be returned to you."}
      </Modal>
    </Card>
  );
}
