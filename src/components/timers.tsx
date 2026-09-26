import { RULES } from "../rules";
import { mmss } from "../lib/hooks";
import { Icon, cx } from "./ui";

/** Tier 2 confirmation countdown. Driven by the local device clock only. */
export function CountdownTimer({ remainingSec, expired, stopped }: { remainingSec: number; expired: boolean; stopped?: boolean }) {
  const urgent = !expired && remainingSec <= 10 * 60;
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm",
        expired ? "bg-disabled-bg text-ink-muted" : urgent ? "bg-accent-soft text-warning" : "bg-canvas text-ink",
      )}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap font-medium">
        <Icon name="clock" />
        Confirm within 2 hours
      </span>
      <span className="whitespace-nowrap tabular" role="timer" aria-live="off" aria-label={expired ? "Time expired" : `${mmss(remainingSec)} remaining`}>
        {stopped ? "Responded" : expired ? "Expired" : `${mmss(remainingSec)} left`}
      </span>
    </div>
  );
}

export type InspectionTimerState = "idle" | "running" | "warning" | "over" | "completed";

export function inspectionTimerState(elapsed: number, started: boolean, running: boolean): InspectionTimerState {
  if (!started) return "idle";
  if (!running) return "completed";
  if (elapsed >= RULES.inspectionTargetSec.value) return "over";
  if (elapsed >= RULES.inspectionWarnAtSec.value) return "warning";
  return "running";
}

const stateStyle: Record<InspectionTimerState, { box: string; bar: string; label: string }> = {
  idle: { box: "border-line bg-white", bar: "bg-line-strong", label: "Not started" },
  running: { box: "border-line bg-white", bar: "bg-info", label: "In progress" },
  warning: { box: "border-accent bg-accent-soft", bar: "bg-accent", label: "Approaching target" },
  over: { box: "border-danger bg-danger-soft", bar: "bg-danger", label: "Over target" },
  completed: { box: "border-success bg-success-soft", bar: "bg-success", label: "Completed" },
};

export function InspectionTimer({ elapsedSec, state }: { elapsedSec: number; state: InspectionTimerState }) {
  const target = RULES.inspectionTargetSec.value;
  const s = stateStyle[state];
  const ratio = Math.min(1, elapsedSec / target);
  return (
    <div className={cx("rounded border p-3", s.box)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">Inspection time</span>
        <span className="text-xs text-ink-muted">{s.label}</span>
      </div>
      <p className="mt-1 text-xl font-medium text-ink tabular" role="timer" aria-live="off">
        {mmss(elapsedSec)} <span className="text-base font-normal text-ink-muted">/ {mmss(target)}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-white/70" aria-hidden="true">
        <div className={cx("h-full transition-[width] duration-300", s.bar)} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">Proposed operational target of 3 minutes. Not an OCPB legal requirement.</p>
      <p className="sr-only" aria-live="polite">{state === "warning" ? "30 seconds to target" : state === "over" ? "Inspection is over the target time" : ""}</p>
    </div>
  );
}
