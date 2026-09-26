import { useEffect, useRef, type ReactNode } from "react";
import type { CheckResult, ChecklistItem, ChecklistItemId, EvidencePhoto } from "../types";
import { Button, Icon, cx, inputClass } from "./ui";

export type ChecklistValue = Partial<Record<ChecklistItemId, { result: CheckResult; note: string }>>;

export function InspectionChecklist({
  items,
  value,
  onChange,
  disabled,
  showErrors,
  noteRequired = true,
  renderIssueExtra,
}: {
  items: ChecklistItem[];
  value: ChecklistValue;
  onChange: (v: ChecklistValue) => void;
  disabled?: boolean;
  showErrors?: boolean;
  /** Courier workspace passes false: the note is optional there. */
  noteRequired?: boolean;
  /** Extra content under an item marked "Issue found" (e.g. item-specific evidence). */
  renderIssueExtra?: (id: ChecklistItemId) => ReactNode;
}) {
  const set = (id: ChecklistItemId, patch: Partial<{ result: CheckResult; note: string }>) =>
    onChange({ ...value, [id]: { result: value[id]?.result ?? "pass", note: value[id]?.note ?? "", ...patch } });

  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const v = value[item.id];
        const missing = showErrors && !v;
        const noteMissing = noteRequired && showErrors && v?.result === "issue" && !v.note.trim();
        const groupId = `chk-${item.id}`;
        return (
          <li key={item.id} className={cx("rounded border bg-white p-3", missing ? "border-danger" : "border-line")}>
            <p id={groupId} className="text-base font-medium text-ink">{i + 1}. {item.label}</p>
            <p className="text-xs text-ink-subtle">{item.hint}</p>
            <div role="radiogroup" aria-labelledby={groupId} className="mt-2 grid grid-cols-2 gap-2">
              {(["pass", "issue"] as const).map((r) => {
                const on = v?.result === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => set(item.id, { result: r })}
                    className={cx(
                      "focus-ring flex h-10 items-center justify-center gap-1.5 rounded-sm border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60",
                      on && r === "pass" && "border-success bg-success-soft text-success",
                      on && r === "issue" && "border-danger bg-danger-soft text-danger",
                      !on && "border-line-strong bg-white text-ink",
                    )}
                  >
                    <Icon name={r === "pass" ? "check" : "alert"} />
                    {r === "pass" ? "Pass" : "Issue found"}
                  </button>
                );
              })}
            </div>
            {missing && <p role="alert" className="mt-1.5 text-xs text-danger">Mark this check as Pass or Issue found.</p>}
            {v?.result === "issue" && (
              <div className="mt-2">
                <label htmlFor={`${groupId}-note`} className="mb-1 block text-sm text-ink">Describe the issue{noteRequired ? "" : " (optional)"}</label>
                <input
                  id={`${groupId}-note`}
                  className={inputClass(noteMissing)}
                  value={v.note}
                  disabled={disabled}
                  maxLength={120}
                  placeholder="For example, corner crushed"
                  aria-invalid={noteMissing || undefined}
                  onChange={(e) => set(item.id, { note: e.target.value })}
                />
                {noteMissing && <p role="alert" className="mt-1 text-xs text-danger">Add a short description of the issue.</p>}
              </div>
            )}
            {v?.result === "issue" && renderIssueExtra && <div className="mt-3">{renderIssueExtra(item.id)}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** A neutral generated image for demoing without a camera. */
function samplePhoto(n: number, caption?: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'><rect width='320' height='240' fill='#D9D2C5'/><rect x='70' y='55' width='180' height='130' fill='#C2A878' stroke='#8F7A55' stroke-width='3'/><line x1='70' y1='120' x2='250' y2='120' stroke='#8F7A55' stroke-width='6'/><text x='12' y='228' font-family='Arial' font-size='14' fill='#5F5F5F'>${caption ? `Sample: ${caption}` : `Sample image ${n}`}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function EvidenceCapture({
  photos,
  onChange,
  max = 3,
  required,
  showErrors,
  disabled,
  addLabel = "Take photo",
  sampleCaption,
  hint,
}: {
  photos: EvidencePhoto[];
  onChange: (p: EvidencePhoto[]) => void;
  max?: number;
  required?: boolean;
  showErrors?: boolean;
  disabled?: boolean;
  addLabel?: string;
  /** Labels the demo sample image so it visibly relates to an inspection item. */
  sampleCaption?: string;
  /** Replaces the default helper line under the buttons. */
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const retakeTarget = useRef<string | null>(null);

  // Revoke object URLs on unmount to avoid leaks.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => p.source === "device" && URL.revokeObjectURL(p.src)), []);

  const now = () => new Date().toLocaleTimeString("en-GB");

  const add = (p: Omit<EvidencePhoto, "id" | "capturedAt">) => {
    const next: EvidencePhoto = { ...p, id: Math.random().toString(36).slice(2), capturedAt: now() };
    const target = retakeTarget.current;
    retakeTarget.current = null;
    if (target) {
      const old = photos.find((x) => x.id === target);
      if (old?.source === "device") URL.revokeObjectURL(old.src);
      onChange(photos.map((x) => (x.id === target ? next : x)));
    } else {
      onChange([...photos, next]);
    }
  };

  const remove = (id: string) => {
    const old = photos.find((x) => x.id === id);
    if (old?.source === "device") URL.revokeObjectURL(old.src);
    onChange(photos.filter((x) => x.id !== id));
  };

  const full = photos.length >= max;
  const missing = showErrors && required && photos.length === 0;

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) add({ src: URL.createObjectURL(f), source: "device" });
          e.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div className={cx("grid h-36 place-items-center rounded border-2 border-dashed bg-canvas text-center", missing ? "border-danger" : "border-line-strong")}>
          <div className="text-ink-subtle">
            <Icon name="camera" className="mx-auto h-6 w-6" />
            <p className="mt-1 text-sm">No photos yet</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded border border-line bg-white">
              <img src={p.src} alt={`Evidence photo captured at ${p.capturedAt}`} className="h-24 w-full object-cover" />
              <div className="flex items-center justify-between px-2 py-1 text-xs text-ink-muted">
                <span className="tabular">{p.capturedAt}</span>
                {p.source === "sample" && <span>Sample</span>}
              </div>
              <div className="flex border-t border-line text-sm">
                <button type="button" disabled={disabled} className="focus-ring flex-1 py-1.5 text-ink hover:bg-canvas disabled:text-disabled-fg" onClick={() => { retakeTarget.current = p.id; fileRef.current?.click(); }}>Retake</button>
                <button type="button" disabled={disabled} className="focus-ring flex-1 border-l border-line py-1.5 text-danger hover:bg-danger-soft disabled:text-disabled-fg" onClick={() => remove(p.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {missing && <p role="alert" className="mt-1.5 text-xs text-danger">Add at least one photo when an issue is found.</p>}

      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" disabled={full || disabled} onClick={() => { retakeTarget.current = null; fileRef.current?.click(); }}>
          <Icon name="camera" /> {addLabel}
        </Button>
        <Button size="sm" variant="tertiary" disabled={full || disabled} onClick={() => { retakeTarget.current = null; add({ src: samplePhoto(photos.length + 1, sampleCaption), source: "sample" }); }}>
          Use sample image
        </Button>
      </div>
      <p className="mt-1 text-xs text-ink-subtle">
        {photos.length}/{max} photos. {hint ?? "Opens the device camera or file picker. Photos stay on this device and are not verified."}
      </p>
    </div>
  );
}
