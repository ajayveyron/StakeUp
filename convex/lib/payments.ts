import type { Doc } from "../_generated/dataModel";

export const PACT_SLOT_AMOUNT = 249;
export const LEGACY_PLATFORM_FEE_AMOUNT = 0;

export function commitmentPlatformFee(commitment: Doc<"commitments">) {
  return commitment.platformFeeAmount ?? LEGACY_PLATFORM_FEE_AMOUNT;
}

export function commitmentCheckoutAmount(commitment: Doc<"commitments">) {
  return commitment.pactAmount + commitmentPlatformFee(commitment);
}

export function toRazorpayMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export function fromRazorpayMinorUnits(amount: number) {
  return Math.round(amount) / 100;
}
