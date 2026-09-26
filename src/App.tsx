import { useEffect, useState } from "react";
import { AnnotationsContext, cx } from "./components/ui";
import { PROVENANCE_LABEL } from "./rules";
import { CheckoutPrototype } from "./prototypes/Checkout";
import { LinePrototype } from "./prototypes/LineConfirm";
import { DriverPrototype } from "./prototypes/DriverInspection";
import { SellerPrototype } from "./prototypes/SellerReturns";
import { CourierWorkspace } from "./prototypes/CourierWorkspace";

const tabs = [
  { id: "checkout", label: "Checkout", stage: "Predict" },
  { id: "line", label: "LINE confirmation", stage: "Commit" },
  { id: "courier", label: "Courier inspection", stage: "Deliver" },
  { id: "courier-app", label: "Courier", stage: "Deliver" },
  { id: "seller", label: "Seller returns", stage: "Recover" },
] as const;
type TabId = (typeof tabs)[number]["id"];

const fromHash = (): TabId => {
  const h = window.location.hash.slice(1);
  return (tabs.find((t) => t.id === h)?.id ?? "checkout") as TabId;
};

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash);
  const [notes, setNotes] = useState(false);

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (id: TabId) => { window.location.hash = id; setTab(id); window.scrollTo({ top: 0 }); };

  return (
    <AnnotationsContext.Provider value={notes}>
      <div className="min-h-full">
        <header className="sticky top-0 z-30 border-b border-line bg-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-3">
            <div>
              <p className="text-md font-medium text-ink">Last-mile COD prototype</p>
              <p className="text-xs text-ink-subtle">Business-case prototype for Shopee Thailand. Fictional data. Not connected to Shopee, SPX or LINE systems.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="focus-ring h-4 w-4 accent-brand" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
              Show source labels
            </label>
          </div>
          <nav aria-label="Prototype interfaces" className="mx-auto max-w-6xl overflow-x-auto px-4">
            <ol className="flex min-w-max gap-1">
              {tabs.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={tab === t.id ? "page" : undefined}
                    onClick={() => go(t.id)}
                    className={cx(
                      "focus-ring flex items-center gap-2 border-b-2 px-3 py-3 text-sm",
                      tab === t.id ? "border-brand font-medium text-brand" : "border-transparent text-ink-muted hover:text-ink",
                    )}
                  >
                    <span className="tabular">{i + 1}.</span> {t.label}
                    <span className="text-xs text-ink-subtle">{t.stage}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        {notes && (
          <div className="border-b border-line bg-white">
            <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-2 text-xs text-ink-muted">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-info bg-info-soft align-middle" />{PROVENANCE_LABEL.case}</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-accent bg-accent-soft align-middle" />{PROVENANCE_LABEL.proposed}</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-danger bg-danger-soft align-middle" />{PROVENANCE_LABEL.placeholder}</span>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-6" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
          {tab === "checkout" && <CheckoutPrototype onOpenLine={() => go("line")} onOpenCourier={() => go("courier")} />}
          {tab === "line" && <LinePrototype />}
          {tab === "courier" && <DriverPrototype />}
          {tab === "courier-app" && <CourierWorkspace />}
          {tab === "seller" && <SellerPrototype />}
        </main>
      </div>
    </AnnotationsContext.Provider>
  );
}
