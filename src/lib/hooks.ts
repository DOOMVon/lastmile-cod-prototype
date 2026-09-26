import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncState } from "../types";

export const thb = (n: number) =>
  `THB ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const pct = (r: number) => `${Math.round(r * 100)}%`;

export function mmss(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Counts down to a deadline using the local device clock (prototype only). */
export function useCountdown(deadline: number | null, paused = false) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null || paused) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline, paused]);
  const remainingMs = deadline === null ? 0 : Math.max(0, deadline - now);
  return { remainingSec: Math.ceil(remainingMs / 1000), expired: deadline !== null && remainingMs <= 0 };
}

/** Elapsed-time stopwatch with start / stop / reset. */
export function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [, tick] = useState(0);

  useEffect(() => {
    if (startedAt === null || frozen !== null) return;
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [startedAt, frozen]);

  const elapsedSec =
    frozen ?? (startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000) + offset);

  return {
    elapsedSec,
    running: startedAt !== null && frozen === null,
    started: startedAt !== null,
    start: () => { setFrozen(null); setOffset(0); setStartedAt(Date.now()); },
    stop: () => setFrozen(elapsedSec),
    reset: () => { setStartedAt(null); setFrozen(null); setOffset(0); },
    /** Demo control: jump forward without waiting. */
    skip: (sec: number) => setOffset((o) => o + sec),
  };
}

/** Minimal async runner that exposes loading / success / error states. */
export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });
  const seq = useRef(0);
  const run = useCallback(async (fn: () => Promise<T>) => {
    const id = ++seq.current;
    setState({ status: "loading" });
    try {
      const data = await fn();
      if (id === seq.current) setState({ status: "success", data });
      return data;
    } catch (e) {
      if (id === seq.current) setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." });
      return undefined;
    }
  }, []);
  const reset = useCallback(() => { seq.current++; setState({ status: "idle" }); }, []);
  return { state, run, reset };
}
