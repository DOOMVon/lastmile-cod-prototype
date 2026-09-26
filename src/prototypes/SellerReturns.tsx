import { useEffect, useMemo, useState } from "react";
import { returnCases } from "../mock/data";
import { fetchReturnCase, type NetworkScenario } from "../mock/services";
import { decideCompensation, decideRecovery, shelfLifeCheck } from "../rules";
import type { ReturnCase, ReturnCaseId } from "../types";
import { thb, useAsync } from "../lib/hooks";
import { Alert, Badge, Button, DemoPanel, Segmented, Skeleton, cx } from "../components/ui";
import { CompensationStatus, InspectionResult, MaterialRecovery, ReturnTimeline } from "../components/returns";

const ids = Object.keys(returnCases) as ReturnCaseId[];

export function SellerPrototype() {
  const [net, setNet] = useState<NetworkScenario>("ok");
  const [selected, setSelected] = useState<ReturnCaseId>("auto_claim");
  const detail = useAsync<ReturnCase>();
  const load = () => detail.run(() => fetchReturnCase(selected, net));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected, net]);

  return (
    <div className="space-y-4">
      <DemoPanel title="Interface 5. Seller Center returns and claims">
        <div className="flex flex-wrap items-end gap-6">
          <Segmented label="Return details request" value={net} options={[{ value: "ok", label: "Succeeds" }, { value: "error", label: "Fails" }]} onChange={setNet} />
          <p className="max-w-md text-sm text-ink-muted">Three fictional returns cover the automated claim, a case sent to manual review, and a return with no damage.</p>
        </div>
      </DemoPanel>

      <div className="overflow-hidden rounded-lg border border-line-strong bg-canvas shadow-window">
        <div aria-hidden="true" className="flex h-10 items-center gap-3 border-b border-line bg-[#EDEDED] px-4">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="mx-auto w-full max-w-md truncate rounded-full bg-white px-3 py-1 text-center text-xs text-ink-subtle">seller-center.demo/returns (prototype)</span>
          <span className="w-12" />
        </div>
        <header className="flex h-14 items-center justify-between border-b border-line bg-white px-5">
          <p className="text-md font-medium text-brand">Seller Center <span className="font-normal text-ink-subtle">(prototype)</span></p>
          <p className="text-sm text-ink-muted">Demo Merchant</p>
        </header>

        <div className="grid min-h-[720px] md:grid-cols-[260px_1fr]">
          <nav aria-label="Returns" className="border-b border-line bg-white md:border-b-0 md:border-r">
            <p className="px-4 pb-2 pt-4 text-sm font-medium text-ink">Failed delivery returns</p>
            <ul>
              {ids.map((id) => {
                const rc = returnCases[id];
                const on = id === selected;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-current={on || undefined}
                      onClick={() => setSelected(id)}
                      className={cx("focus-ring w-full border-l-2 px-4 py-3 text-left", on ? "border-brand bg-brand-soft/50" : "border-transparent hover:bg-canvas")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink tabular">{rc.orderId}</span>
                        <Badge tone={id === "auto_claim" ? "brand" : id === "manual_review" ? "warning" : "info"}>{rc.caseLabel}</Badge>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{rc.product.name}, {thb(rc.declaredValue)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <main className="min-w-0 p-5">
            <p className="text-sm text-ink-subtle">Orders / Returns / {returnCases[selected].orderId}</p>
            <h1 className="mt-1 text-xl font-medium text-ink">Return and claim details</h1>
            <div className="mt-4">
              {detail.state.status === "error" ? (
                <Alert tone="danger" role="alert" title={detail.state.message} action={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
                  Your claim status is unchanged.
                </Alert>
              ) : detail.state.status === "success" ? (
                <Detail key={detail.state.data.id} rc={detail.state.data} net={net} />
              ) : (
                <DetailSkeleton />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Detail({ rc, net }: { rc: ReturnCase; net: NetworkScenario }) {
  const shelf = useMemo(() => shelfLifeCheck(rc.product, rc.inspection.transitDays), [rc]);
  const comp = useMemo(() => decideCompensation(rc.declaredValue, rc.inspection, shelf), [rc, shelf]);
  const recovery = useMemo(() => decideRecovery(rc.inspection, shelf, comp), [rc, shelf, comp]);
  return (
    <div className="space-y-4">
      <ReturnTimeline rc={rc} />
      <InspectionResult rc={rc} shelf={shelf} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CompensationStatus status={comp} />
        <MaterialRecovery status={recovery} net={net} />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading return details</span>
      <div className="rounded border border-line bg-white p-4">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 grid grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>
        <Skeleton className="mt-6 h-24" />
      </div>
      <Skeleton className="h-72" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
