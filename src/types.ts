// Domain types. Shapes are designed to be swapped for API responses later.

/** Internal only. Never rendered in buyer-facing UI. */
export type RiskTier = 1 | 2 | 3;

export type Money = number; // THB, integer or 2dp

export interface Product {
  sku: string;
  name: string;
  variant: string;
  unitPrice: Money;
  /** Declared shelf life in days. null = non-perishable / not declared. */
  shelfLifeDays: number | null;
}

export interface Order {
  orderId: string;
  merchant: string;
  product: Product;
  quantity: number;
  shippingFee: Money;
  /** Masked destination, never a full address. */
  destinationSummary: string;
  recipientMasked: string;
}

export type PaymentMethodId = "promptpay" | "cod" | "cod_deposit" | "self_collect";

export type CheckoutScenario = "low" | "perishable" | "medium" | "high";

export interface PaymentOptionState {
  id: PaymentMethodId;
  available: boolean;
  /** Buyer-facing reason when unavailable. */
  unavailableReason?: string;
}

/** Result of the rules engine. Buyer UI only reads the fields it needs. */
export interface CheckoutDecision {
  options: PaymentOptionState[];
  /** null = buyer must choose explicitly. */
  defaultMethod: PaymentMethodId | null;
  promptPayIncentiveCoins: number;
  /** Buyer-facing notice when a method needs extra confirmation. */
  confirmationNotice?: string;
  requiresLineConfirmation: (m: PaymentMethodId) => boolean;
}

export interface PickupPoint {
  id: string;
  name: string;
  type: "Partner store" | "Parcel locker";
  distanceKm: number;
  hours: string;
  holdDays: number;
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

// Driver inspection
export type ChecklistItemId = "carton" | "awb_match" | "leakage";
export type CheckResult = "pass" | "issue";

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  hint: string;
}

export interface EvidencePhoto {
  id: string;
  src: string; // object URL or data URI
  capturedAt: string;
  source: "device" | "sample";
}

export interface DeliveryTask {
  orderId: string;
  awb: string;
  recipientMasked: string;
  destinationSummary: string;
  itemSummary: string;
  paymentLabel: string;
  orderTotal: Money;
  depositPaid: Money;
  status: "Out for delivery" | "At doorstep" | "Delivered" | "Refused";
}

// Seller returns
export type ReturnCaseId = "no_damage" | "auto_claim" | "manual_review";

export interface TimelineEvent {
  at: string;
  label: string;
  location: string;
}

export interface DamageDetection {
  label: string;
  /** 0..1 model confidence. AI-assisted signal, not a decision. */
  confidence: number;
}

export interface HubInspection {
  inspectedAt: string;
  hub: string;
  detections: DamageDetection[];
  transitDays: number;
}

export type CompensationStatus =
  | { kind: "not_applicable"; reason: string }
  | { kind: "approved_auto"; amount: Money; reasons: string[] }
  | { kind: "manual_review"; reasons: string[] };

export type RecoveryStatus =
  | { kind: "not_applicable"; reason: string }
  | { kind: "eligible"; estimatedSaving: Money; reasons: string[] };

export interface ReturnCase {
  id: ReturnCaseId;
  caseLabel: string;
  orderId: string;
  product: Product;
  declaredValue: Money;
  currentStatus: string;
  returnLocation: string;
  estimatedReturnDate: string | null;
  lastScan: TimelineEvent;
  timeline: TimelineEvent[];
  inspection: HubInspection;
}

// Courier workspace (doorstep COD only; PUDO orders never enter this flow)
export type CourierDeliveryState =
  | "assigned"
  | "arrived"
  | "inspecting"
  | "inspection-complete"
  | "payment-pending"
  | "payment-received"
  | "receipt-sent"
  | "completed"
  /** Exception branch. Not in the spec's union; added for "Payment Not Received". */
  | "payment-not-received";

export type InspectionStatus = "pending" | "pass" | "issue";

export interface CourierOrder {
  orderId: string;
  recipient: string;
  deliveryAddress: string;
  paymentMethod: "Cash on Delivery";
  amountToCollect: Money;
  packageDescription: string;
  deliveryStatus: "Ready for Delivery";
}
