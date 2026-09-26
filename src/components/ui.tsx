// Design system primitives shared by all four interfaces.
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { PROVENANCE_LABEL, type Provenance } from "../rules";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

// ---------- Icons (one stroke style, 16px default) ----------
const paths = {
  check: "M4 8.5l2.5 2.5L12 5.5",
  x: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  info: "M8 7.2v4M8 4.9v.1M14.5 8a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z",
  alert: "M8 5.5v3.5M8 11v.1M7.1 2.5L1.6 12a1 1 0 00.9 1.5h11a1 1 0 00.9-1.5L8.9 2.5a1 1 0 00-1.8 0z",
  clock: "M8 4.5V8l2.2 1.4M14.5 8a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z",
  camera: "M2 5.5h2.5L5.8 3.5h4.4l1.3 2H14v7.5H2V5.5zM8 11.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",
  pin: "M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 10-9 0C3.5 9.8 8 14 8 14zM8 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  chevron: "M6 3.5L10.5 8 6 12.5",
  back: "M10 3.5L5.5 8l4.5 4.5",
  store: "M2.5 6.5h11M3 6.5l1-3h8l1 3M3.5 6.5V13h9V6.5M6.5 13V9.5h3V13",
  truck: "M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5V11h-5M4 12.5a1 1 0 100-2 1 1 0 000 2zM12 12.5a1 1 0 100-2 1 1 0 000 2z",
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={cx("shrink-0", className)} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

// ---------- Button ----------
type Variant = "primary" | "secondary" | "tertiary" | "danger" | "neutral";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover disabled:bg-disabled-bg disabled:text-disabled-fg",
  secondary: "border border-brand bg-white text-brand hover:bg-brand-soft disabled:border-line disabled:text-disabled-fg disabled:bg-white",
  tertiary: "text-ink-muted underline-offset-2 hover:text-ink hover:underline disabled:text-disabled-fg",
  neutral: "border border-line-strong bg-white text-ink hover:border-ink-subtle disabled:text-disabled-fg",
  danger: "border border-danger bg-white text-danger hover:bg-danger-soft disabled:border-line disabled:text-disabled-fg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; block?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" && "min-h-8 px-3 py-1 text-sm",
        size === "md" && "min-h-10 px-4 py-2 text-base",
        size === "lg" && "min-h-12 px-5 py-2.5 text-md",
        variant === "tertiary" && "min-h-0 px-1 py-1",
        "text-center",
        block && "w-full",
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ---------- Badge / status ----------
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
const toneText: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted border-line",
  brand: "bg-brand-soft text-brand border-brand-line",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium", toneText[tone], className)}>{children}</span>;
}

const dot: Record<Tone, string> = {
  neutral: "bg-ink-subtle", brand: "bg-brand", success: "bg-success", warning: "bg-accent", danger: "bg-danger", info: "bg-info",
};
export function StatusIndicator({ tone, label, detail }: { tone: Tone; label: string; detail?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-base">
      <span className={cx("h-2 w-2 rounded-full", dot[tone])} aria-hidden="true" />
      <span className="font-medium text-ink">{label}</span>
      {detail && <span className="text-ink-subtle">{detail}</span>}
    </span>
  );
}

// ---------- Alert ----------
const alertIcon: Record<Tone, IconName> = { neutral: "info", brand: "info", info: "info", success: "check", warning: "alert", danger: "alert" };
export function Alert({ tone = "info", title, children, action, role }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; role?: "alert" | "status" }) {
  return (
    <div role={role} className={cx("flex gap-2.5 rounded px-3 py-2.5 text-sm", toneText[tone], "border")}>
      <Icon name={alertIcon[tone]} className="mt-0.5 h-4 w-4" />
      <div className="min-w-0 flex-1 text-ink">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx(title && "mt-0.5", "text-ink-muted")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

// ---------- Card ----------
export function Card({ title, aside, children, className, as: Tag = "section" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  const id = useId();
  return (
    <Tag aria-labelledby={title ? id : undefined} className={cx("rounded border border-line bg-white", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={id} className="text-md font-medium text-ink">{title}</h2>
          {aside}
        </header>
      )}
      <div className="p-4">{children}</div>
    </Tag>
  );
}

// ---------- Loading ----------
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("animate-spin motion-reduce:animate-none", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-sm bg-line motion-reduce:animate-none", className)} />;
}

// ---------- Field ----------
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
export const inputClass = (invalid?: boolean) =>
  cx(
    "focus-ring h-10 w-full rounded-sm border bg-white px-3 text-base text-ink placeholder:text-ink-subtle",
    invalid ? "border-danger" : "border-line-strong",
  );

// ---------- Modal ----------
export function Modal({ open, title, onClose, children, footer, page = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer: ReactNode; page?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("select, input, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const f = el.querySelectorAll<HTMLElement>("button:not([disabled]), select, input, textarea, [tabindex='0']");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={cx(page ? "fixed" : "absolute", "inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center", page && "sm:p-6")} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={cx("w-full rounded-t-lg bg-white shadow-overlay sm:rounded-lg", page ? "max-w-md" : "max-w-sm")}>
        <h2 id={id} className="px-4 pt-4 text-md font-medium text-ink">{title}</h2>
        <div className="px-4 py-3 text-base text-ink-muted">{children}</div>
        <div className="flex flex-col gap-2 border-t border-line p-4">{footer}</div>
      </div>
    </div>
  );
}

// ---------- Prototype annotations ----------
// Presenter-only overlay that labels where each number or rule comes from.
// Hidden by default so buyer-facing screens stay clean.
export const AnnotationsContext = createContext(false);

export function Note({ src, children }: { src: Provenance; children?: ReactNode }) {
  const on = useContext(AnnotationsContext);
  if (!on) return null;
  const tone = src === "case" ? "border-info text-info bg-info-soft" : src === "proposed" ? "border-accent text-warning bg-accent-soft" : "border-danger text-danger bg-danger-soft";
  return (
    <span className={cx("mt-1 inline-block rounded-sm border border-dashed px-1.5 py-0.5 text-xs", tone)}>
      <span className="font-medium">{PROVENANCE_LABEL[src]}</span>
      {children && <span>: {children}</span>}
    </span>
  );
}

// ---------- Demo chrome ----------
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              "focus-ring rounded-sm border px-2.5 py-1.5 text-sm",
              value === o.value ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink-subtle",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DemoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside aria-label="Prototype controls" className="rounded border border-dashed border-line-strong bg-white p-4 text-base">
      <h2 className="text-md font-medium text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-ink-subtle">Prototype controls. Not part of the product UI.</p>
      <div className="mt-4 space-y-4">{children}</div>
    </aside>
  );
}

/**
 * Generic phone frame (not a replica of any specific device).
 * The bezel, status bar and home indicator appear from the sm breakpoint up;
 * on a real phone the screen renders edge to edge without a frame.
 */
export function DeviceFrame({ label, children, statusBar = "light" }: { label: string; children: ReactNode; statusBar?: "light" | "dark" }) {
  const dark = statusBar === "dark";
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <p className="mb-3 text-sm text-white/90">{label}</p>
      <div className="relative sm:rounded-[48px] sm:bg-bezel sm:p-[10px] sm:shadow-device">
        {/* Side buttons */}
        <span aria-hidden="true" className="absolute -left-[3px] top-[120px] hidden h-8 w-[3px] rounded-l-sm bg-bezel sm:block" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[168px] hidden h-14 w-[3px] rounded-l-sm bg-bezel sm:block" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[150px] hidden h-20 w-[3px] rounded-r-sm bg-bezel sm:block" />

        <div className="relative flex flex-col overflow-hidden rounded-lg border border-line-strong bg-canvas sm:rounded-[38px] sm:border-0">
          {/* Status bar */}
          <div aria-hidden="true" className={cx("relative hidden h-9 shrink-0 items-center justify-between px-7 text-xs font-medium sm:flex", dark ? "bg-ink text-white" : "bg-white text-ink")}>
            <span className="tabular">10:24</span>
            <span className="absolute left-1/2 top-2.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-bezel" />
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="0.5" /><rect x="5" y="5.5" width="3" height="6.5" rx="0.5" /><rect x="10" y="3" width="3" height="9" rx="0.5" /><rect x="15" y="0" width="3" height="12" rx="0.5" /></svg>
              <svg viewBox="0 0 16 12" className="h-3 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1.5 4.5a9.5 9.5 0 0113 0M4 7.2a6 6 0 018 0" /><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
              <svg viewBox="0 0 26 12" className="h-3 w-[26px]"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.45" /><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" /><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.45" /></svg>
            </span>
          </div>

          <div className="relative flex h-[760px] flex-col overflow-hidden">{children}</div>

          {/* Home indicator */}
          <div aria-hidden="true" className="hidden h-6 shrink-0 items-center justify-center bg-white sm:flex">
            <span className="h-1 w-28 rounded-full bg-ink/85" />
          </div>
        </div>
      </div>
    </div>
  );
}
