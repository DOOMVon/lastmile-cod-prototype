# Last-mile COD prototype (Shopee Thailand business case)

A clickable MVP prototype for the business case's four pillars: Predict, Commit, Deliver, Recover.
The data is fictional. Payments, LINE, SPX APIs and computer vision are all simulated.

## Run

```bash
npm install
npm run dev            # local dev server
npm run build          # standard production build
npm run build:single   # one self-contained dist/index.html for static hosting
```

## Structure

```
src/
  types.ts              Domain types (order, tier, payment, pickup, inspection, compensation)
  rules.ts              Business rules as pure functions. Every constant is tagged case | proposed | placeholder
  mock/data.ts          Fictional demo data. Swap for API responses; shapes match component props
  mock/services.ts      Simulated async calls with controllable latency and failure
  lib/hooks.ts          useCountdown, useStopwatch, useAsync, formatters
  components/ui.tsx     Design system primitives (Button, Badge, Alert, Card, Modal, Field, Note...)
  components/checkout.tsx     PaymentOption, RiskIntervention, PickupOption, OrderSummary
  components/timers.tsx       CountdownTimer, InspectionTimer
  components/inspection.tsx   InspectionChecklist, EvidenceCapture
  components/returns.tsx      ReturnTimeline, InspectionResult, CompensationStatus, MaterialRecovery
  prototypes/           The demoable interfaces (CourierWorkspace.tsx is the doorstep COD courier MVP)
  App.tsx               Navigation (hash routes: #checkout #line #courier #courier-app #seller)
```

## Design tokens

All tokens live in `tailwind.config.js`:

- Brand orange `#EE4D2D` is for actions only. Secondary `#F69113` is for warnings. Canvas is `#F5F5F5` and ink is `#222222`.
- Radius is 2px on controls, 4px on cards and 8px on overlays. Shadows are used only on overlays and sticky bars.
- The type scale is 12 / 13 / 14 / 16 / 18 / 22.

## Provenance of numbers and rules

Toggle **Show source labels** in the app to see the provenance tags inline.

| Item | Status |
|---|---|
| THB 104 / 44 / 60 loss, 92.8%, 75% | Business-case assumption |
| 14-day perishability, 30 Coins, THB 44 deposit, 2-hour window | Business-case assumption |
| 3-minute inspection target, THB 3.50 allowance | Business-case assumption. Not an OCPB requirement |
| THB 2,000 auto-claim limit, 24-hour credit, THB 20 saving, 5-day escrow | Business-case assumption |
| Deposit deducted from cash due and kept on refusal | Proposed decision |
| Tier 2 expiry cancels the order before dispatch | Proposed decision |
| Self-collection paid in cash at the pickup point | Proposed decision |
| No preselected method in Tier 3 | Proposed decision |
| >40% shelf-life consumption rule | Proposed decision |
| Warning at 2:30, photo required only when an issue is found | Proposed decision |
| Seller confirms local material recovery before it happens | Proposed decision |
| 70% confidence floor for automated claims | Placeholder, needs calibration |
| Courier workspace: photo evidence recommended, not required | Proposed decision |
| Courier workspace: "Payment not received" exception state | Proposed decision |

Nothing in this prototype is presented as legally certified or connected to Shopee, SPX or LINE production systems.

## Deploy to Vercel

The repo is ready for zero-config deployment. `vercel.json` pins the Vite preset, `npm run build`, and the `dist` output directory. Routing is hash-based (`#checkout`, `#line`, `#courier`, `#seller`), so no rewrite rules are needed.
