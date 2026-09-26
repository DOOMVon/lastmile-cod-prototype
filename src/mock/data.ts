// Fictional demo data only. No real customers, sellers, addresses or tracking numbers.
// Replace these exports with API calls; component props already match these shapes.
import type {
  CheckoutScenario,
  CourierOrder,
  ChecklistItem,
  DeliveryTask,
  Order,
  PickupPoint,
  ReturnCase,
  ReturnCaseId,
} from "../types";

const buyer = {
  recipientMasked: "K. S****",
  destinationSummary: "Demo District, Bangkok 10xxx",
};

export const checkoutOrders: Record<CheckoutScenario, Order> = {
  low: {
    orderId: "TH-DEMO-L01",
    merchant: "Demo Mobile Accessories",
    product: { sku: "DEMO-ACC-01", name: "Phone case", variant: "Clear", unitPrice: 159, shelfLifeDays: null },
    quantity: 2,
    shippingFee: 32,
    ...buyer,
  },
  perishable: {
    orderId: "TH-DEMO-A01",
    merchant: "Demo Fresh Market",
    product: { sku: "DEMO-FRESH-01", name: "Fresh fruit box", variant: "1 kg", unitPrice: 289, shelfLifeDays: 3 },
    quantity: 1,
    shippingFee: 40,
    ...buyer,
  },
  medium: {
    orderId: "TH-DEMO-B01",
    merchant: "Demo Audio Store",
    product: { sku: "DEMO-AUDIO-01", name: "Wireless earbuds", variant: "Black", unitPrice: 690, shelfLifeDays: null },
    quantity: 1,
    shippingFee: 38,
    ...buyer,
  },
  high: {
    orderId: "TH-DEMO-C01",
    merchant: "Demo Home Appliances",
    product: { sku: "DEMO-HOME-01", name: "Air fryer", variant: "4.5 L", unitPrice: 1490, shelfLifeDays: null },
    quantity: 1,
    shippingFee: 55,
    ...buyer,
  },
};

export const pickupPoints: PickupPoint[] = [
  { id: "pp-1", name: "Demo Pickup Point A", type: "Partner store", distanceKm: 0.8, hours: "07:00 to 22:00", holdDays: 3 },
  { id: "pp-2", name: "Demo Pickup Point B", type: "Parcel locker", distanceKm: 1.9, hours: "Open 24 hours", holdDays: 3 },
  { id: "pp-3", name: "Demo Pickup Point C", type: "Partner store", distanceKm: 3.4, hours: "08:00 to 21:00", holdDays: 3 },
];

export const checklistItems: ChecklistItem[] = [
  { id: "carton", label: "External carton condition intact", hint: "No crushed corners, tears or re-taping." },
  { id: "awb_match", label: "Product matches AWB", hint: "Item description and quantity match the airway bill." },
  { id: "leakage", label: "No visible transit leakage", hint: "No stains, moisture or residue on the parcel." },
];

/** Delivery for the Tier 3 deposit order created at checkout (state C). */
export const deliveryTask: DeliveryTask = {
  orderId: "TH-DEMO-C01",
  awb: "DEMO-AWB-0000-0001",
  recipientMasked: buyer.recipientMasked,
  destinationSummary: buyer.destinationSummary,
  itemSummary: "Air fryer, 4.5 L x1",
  paymentLabel: "Cash on delivery, THB 44 deposit paid",
  orderTotal: 1545,
  depositPaid: 44,
  status: "At doorstep",
};

const hub = "Demo Return Hub BKK-02";

export const returnCases: Record<ReturnCaseId, ReturnCase> = {
  no_damage: {
    id: "no_damage",
    caseLabel: "Return in transit",
    orderId: "TH-DEMO-R101",
    product: { sku: "DEMO-APP-11", name: "Cotton T-shirt", variant: "M, White", unitPrice: 259, shelfLifeDays: null },
    declaredValue: 259,
    currentStatus: "Returning to seller",
    returnLocation: "Your registered pickup address",
    estimatedReturnDate: "25 Sep 2026",
    lastScan: { at: "22 Sep 2026, 18:40", label: "Departed return hub", location: hub },
    timeline: [
      { at: "18 Sep 2026, 10:12", label: "Delivery attempted, parcel not accepted", location: "Demo District, Bangkok" },
      { at: "19 Sep 2026, 08:05", label: "Arrived at return hub", location: hub },
      { at: "19 Sep 2026, 09:30", label: "Hub inspection completed", location: hub },
      { at: "22 Sep 2026, 18:40", label: "Departed return hub", location: hub },
    ],
    inspection: { inspectedAt: "19 Sep 2026, 09:30", hub, detections: [], transitDays: 4 },
  },
  auto_claim: {
    id: "auto_claim",
    caseLabel: "Automated claim",
    orderId: "TH-DEMO-R102",
    product: { sku: "DEMO-FOOD-07", name: "Cookie gift box", variant: "Set of 3", unitPrice: 1250, shelfLifeDays: 21 },
    declaredValue: 1250,
    currentStatus: "Held at return hub",
    returnLocation: hub,
    estimatedReturnDate: null,
    lastScan: { at: "21 Sep 2026, 11:15", label: "Hub inspection completed", location: hub },
    timeline: [
      { at: "11 Sep 2026, 14:20", label: "Delivery attempted, parcel not accepted", location: "Demo Province, Upcountry" },
      { at: "14 Sep 2026, 09:00", label: "Second delivery attempt, parcel not accepted", location: "Demo Province, Upcountry" },
      { at: "20 Sep 2026, 16:45", label: "Arrived at return hub", location: hub },
      { at: "21 Sep 2026, 11:15", label: "Hub inspection completed", location: hub },
    ],
    inspection: {
      inspectedAt: "21 Sep 2026, 11:15",
      hub,
      detections: [{ label: "Structural deformation", confidence: 0.74 }],
      transitDays: 10,
    },
  },
  manual_review: {
    id: "manual_review",
    caseLabel: "Manual review",
    orderId: "TH-DEMO-R103",
    product: { sku: "DEMO-HOME-02", name: "Ceramic dinner set", variant: "16 pieces", unitPrice: 3400, shelfLifeDays: null },
    declaredValue: 3400,
    currentStatus: "Held at return hub",
    returnLocation: hub,
    estimatedReturnDate: null,
    lastScan: { at: "22 Sep 2026, 13:05", label: "Hub inspection completed", location: hub },
    timeline: [
      { at: "17 Sep 2026, 15:30", label: "Delivery attempted, parcel not accepted", location: "Demo District, Bangkok" },
      { at: "21 Sep 2026, 07:50", label: "Arrived at return hub", location: hub },
      { at: "22 Sep 2026, 13:05", label: "Hub inspection completed", location: hub },
    ],
    inspection: {
      inspectedAt: "22 Sep 2026, 13:05",
      hub,
      detections: [{ label: "Carton puncture", confidence: 0.81 }],
      transitDays: 5,
    },
  },
};

/**
 * Courier workspace queue. Doorstep COD orders only.
 * Package is non-perishable on purpose: the checkout rule blocks COD for
 * shelf life under 14 days, so a fresh-food COD parcel could not exist here.
 */
export const courierOrders: CourierOrder[] = [
  {
    orderId: "TH-DEMO-001",
    recipient: "Narin S.",
    deliveryAddress: "Demo Residence, Demo District, Bangkok 10xxx",
    paymentMethod: "Cash on Delivery",
    amountToCollect: 1250,
    packageDescription: "Packaged food bundle",
    deliveryStatus: "Ready for Delivery",
  },
  {
    orderId: "TH-DEMO-002",
    recipient: "Arun T.",
    deliveryAddress: "Demo Condominium, Demo District, Bangkok 10xxx",
    paymentMethod: "Cash on Delivery",
    amountToCollect: 480,
    packageDescription: "Bottled sauce set",
    deliveryStatus: "Ready for Delivery",
  },
];

export const courierReference = "SPX-DEMO-CR-017";
