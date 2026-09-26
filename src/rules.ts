// Business rules for the prototype. Pure functions, no UI.
// Every constant carries its provenance so nothing is silently treated as fact.
import type {
  CheckoutDecision,
  CheckoutScenario,
  CompensationStatus,
  HubInspection,
  PaymentMethodId,
  Product,
  RecoveryStatus,
  RiskTier,
} from "./types";

export type Provenance = "case" | "proposed" | "placeholder";

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  case: "Business-case assumption",
  proposed: "Proposed product decision",
  placeholder: "Prototype placeholder, needs calibration",
};

export const RULES = {
  failedDeliveryLoss: { value: 104, src: "case" },
  wastedShipping: { value: 44, src: "case" },
  lostCommission: { value: 60, src: "case" },
  perishableShelfLifeDays: { value: 14, src: "case" },
  promptPayCoins: { value: 30, src: "case" },
  guaranteeDeposit: { value: 44, src: "case" },
  tier2ConfirmWindowMs: { value: 2 * 60 * 60 * 1000, src: "case" },
  /** What happens when the Tier 2 window closes. Not defined in the case. */
  tier2ExpiryAction: { value: "cancel_before_dispatch" as const, src: "proposed" },
  inspectionTargetSec: { value: 180, src: "case" },
  inspectionWarnAtSec: { value: 150, src: "proposed" },
  inspectionAllowance: { value: 3.5, src: "case" },
  autoCompensationMaxValue: { value: 2000, src: "case" },
  compensationSlaHours: { value: 24, src: "case" },
  reverseFreightSaving: { value: 20, src: "case" },
  escrowDays: { value: 5, src: "case" },
  shelfLifeConsumedRatio: { value: 0.4, src: "proposed" },
  /** Not in the business case. Required to make the demo deterministic. */
  autoApproveMinConfidence: { value: 0.7, src: "placeholder" },
} as const satisfies Record<string, { value: unknown; src: Provenance }>;

// ---------- Checkout ----------

export const isPerishable = (p: Product) =>
  p.shelfLifeDays !== null && p.shelfLifeDays < RULES.perishableShelfLifeDays.value;

/** Maps a demo scenario to an internal tier. Real system: model output. */
export function tierForScenario(s: CheckoutScenario): RiskTier {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

export const COPY = {
  perishableCod: "Cash on Delivery is unavailable for fresh or perishable goods.",
  confirmationNotice: "Additional delivery confirmation is required for this order.",
} as const;

export function decideCheckout(product: Product, tier: RiskTier): CheckoutDecision {
  const coins = RULES.promptPayCoins.value;

  // Catalog rule runs before risk tiering.
  if (isPerishable(product)) {
    return {
      options: [
        { id: "promptpay", available: true },
        { id: "cod", available: false, unavailableReason: COPY.perishableCod },
      ],
      defaultMethod: "promptpay",
      promptPayIncentiveCoins: 0,
      requiresLineConfirmation: () => false,
    };
  }

  if (tier === 3) {
    return {
      options: [
        { id: "promptpay", available: true },
        { id: "cod", available: false, unavailableReason: "Unavailable for this order." },
        { id: "cod_deposit", available: true },
        { id: "self_collect", available: true },
      ],
      // No preselection: the buyer picks the alternative that suits them.
      defaultMethod: null,
      promptPayIncentiveCoins: 0,
      confirmationNotice: COPY.confirmationNotice,
      requiresLineConfirmation: () => false,
    };
  }

  if (tier === 2) {
    return {
      options: [
        { id: "cod", available: true },
        { id: "promptpay", available: true },
      ],
      defaultMethod: "cod",
      promptPayIncentiveCoins: coins,
      confirmationNotice: COPY.confirmationNotice,
      requiresLineConfirmation: (m: PaymentMethodId) => m === "cod",
    };
  }

  // Tier 1: unchanged checkout, no notices, no incentive.
  return {
    options: [
      { id: "cod", available: true },
      { id: "promptpay", available: true },
    ],
    defaultMethod: "cod",
    promptPayIncentiveCoins: 0,
    requiresLineConfirmation: () => false,
  };
}

export interface PriceBreakdown {
  subtotal: number;
  shipping: number;
  total: number;
  payNow: number;
  payLater: number;
  payLaterLabel: string | null;
  coins: number;
}

export function priceFor(
  unitPrice: number,
  qty: number,
  shipping: number,
  method: PaymentMethodId | null,
  incentiveCoins: number,
): PriceBreakdown {
  const subtotal = unitPrice * qty;
  const total = subtotal + shipping;
  const deposit = RULES.guaranteeDeposit.value;
  switch (method) {
    case "promptpay":
      return { subtotal, shipping, total, payNow: total, payLater: 0, payLaterLabel: null, coins: incentiveCoins };
    case "cod_deposit":
      return { subtotal, shipping, total, payNow: deposit, payLater: total - deposit, payLaterLabel: "Pay on delivery", coins: 0 };
    case "self_collect":
      return { subtotal, shipping, total, payNow: 0, payLater: total, payLaterLabel: "Pay at pickup point", coins: 0 };
    case "cod":
      return { subtotal, shipping, total, payNow: 0, payLater: total, payLaterLabel: "Pay on delivery", coins: 0 };
    default:
      return { subtotal, shipping, total, payNow: 0, payLater: 0, payLaterLabel: null, coins: 0 };
  }
}

// ---------- Returns and compensation ----------

export interface ShelfLifeCheck {
  declaredDays: number;
  transitDays: number;
  remainingDays: number;
  consumedRatio: number;
  exceedsThreshold: boolean;
}

export function shelfLifeCheck(product: Product, transitDays: number): ShelfLifeCheck | null {
  if (product.shelfLifeDays === null) return null;
  const declared = product.shelfLifeDays;
  const consumedRatio = transitDays / declared;
  return {
    declaredDays: declared,
    transitDays,
    remainingDays: Math.max(0, declared - transitDays),
    consumedRatio,
    exceedsThreshold: consumedRatio > RULES.shelfLifeConsumedRatio.value,
  };
}

const topDetection = (i: HubInspection) =>
  i.detections.reduce<HubInspection["detections"][number] | null>(
    (best, d) => (!best || d.confidence > best.confidence ? d : best),
    null,
  );

/**
 * Deterministic decision layer. The model only contributes a signal;
 * approval requires value, evidence and rule checks to pass together.
 */
export function decideCompensation(
  declaredValue: number,
  inspection: HubInspection,
  shelf: ShelfLifeCheck | null,
): CompensationStatus {
  const top = topDetection(inspection);
  const damageSignal = !!top && top.confidence >= RULES.autoApproveMinConfidence.value;
  const shelfSignal = !!shelf?.exceedsThreshold;

  if (!top && !shelfSignal) {
    return { kind: "not_applicable", reason: "No transit damage was detected at hub inspection." };
  }

  const reasons: string[] = [];
  if (declaredValue >= RULES.autoCompensationMaxValue.value) {
    reasons.push(`Declared value is THB ${declaredValue.toLocaleString("en-US")}, at or above the proposed automated limit of THB ${RULES.autoCompensationMaxValue.value.toLocaleString("en-US")}.`);
  }
  if (top && !damageSignal && !shelfSignal) {
    reasons.push("Detected damage is below the confidence level used for automated decisions.");
  }
  if (reasons.length) return { kind: "manual_review", reasons };

  const ok: string[] = [`Declared value is below THB ${RULES.autoCompensationMaxValue.value.toLocaleString("en-US")}.`];
  if (damageSignal && top) ok.push(`${top.label} detected at hub inspection.`);
  if (shelfSignal) ok.push("Transit consumed more than 40% of declared shelf life.");
  return { kind: "approved_auto", amount: declaredValue, reasons: ok };
}

export function decideRecovery(
  inspection: HubInspection,
  shelf: ShelfLifeCheck | null,
  compensation: CompensationStatus,
): RecoveryStatus {
  // Keep the parcel intact while a person reviews the claim.
  if (compensation.kind === "manual_review") {
    return { kind: "not_applicable", reason: "Parcel is held at the hub until the claim review is complete." };
  }
  const top = topDetection(inspection);
  const reasons: string[] = [];
  if (shelf?.exceedsThreshold) reasons.push(`Remaining shelf life is ${shelf.remainingDays} days.`);
  if (top && top.confidence >= RULES.autoApproveMinConfidence.value) reasons.push(`${top.label} detected.`);
  if (!reasons.length) {
    return { kind: "not_applicable", reason: "Parcel is suitable for return to seller." };
  }
  return { kind: "eligible", estimatedSaving: RULES.reverseFreightSaving.value, reasons };
}
