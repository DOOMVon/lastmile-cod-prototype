// Simulated service layer. Latency and outcomes are deterministic and controlled
// by demo toggles. No network calls, no real payment, LINE or SPX integration.
import { pickupPoints, returnCases } from "./data";
import type { PickupPoint, ReturnCase, ReturnCaseId } from "../types";

export type PickupScenario = "available" | "none" | "error";
export type NetworkScenario = "ok" | "error";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchPickupPoints(scenario: PickupScenario): Promise<PickupPoint[]> {
  await wait(900);
  if (scenario === "error") throw new Error("Pickup points could not be loaded.");
  return scenario === "none" ? [] : pickupPoints;
}

export async function placeOrder(net: NetworkScenario): Promise<{ ref: string }> {
  await wait(1100);
  if (net === "error") throw new Error("The order could not be placed. Check your connection and try again.");
  return { ref: "TH-DEMO-ORDER" };
}

export async function submitLineAction(net: NetworkScenario): Promise<void> {
  await wait(900);
  if (net === "error") throw new Error("Your response was not sent. Try again.");
}

export async function recordCollection(net: NetworkScenario): Promise<{ receiptNo: string; at: string }> {
  await wait(1000);
  if (net === "error") throw new Error("Payment could not be recorded. Check signal and retry.");
  return { receiptNo: "DEMO-RCPT-0001", at: new Date().toLocaleString("en-GB") };
}

export async function fetchReturnCase(id: ReturnCaseId, net: NetworkScenario): Promise<ReturnCase> {
  await wait(700);
  if (net === "error") throw new Error("Return details could not be loaded.");
  return returnCases[id];
}

export async function submitRecoveryChoice(net: NetworkScenario): Promise<void> {
  await wait(800);
  if (net === "error") throw new Error("Your choice was not saved. Try again.");
}

export async function sendReceipt(net: NetworkScenario): Promise<void> {
  await wait(900);
  if (net === "error") throw new Error("Receipt was not sent. Check signal and retry.");
}
