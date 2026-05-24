import type { Doc } from "../_generated/dataModel";

export const PACT_SLOT_AMOUNT = 249;
export const LEGACY_PLATFORM_FEE_AMOUNT = 0;
export const MIN_PACT_AMOUNT_INR = 500;
export const MAX_PACT_AMOUNT_INR = 3000;
export const PAYMENT_CHECKOUT_PREPARING_MESSAGE =
  "Payment checkout is already being prepared. Please try again in a moment.";
export const PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE =
  "Payment could not start. Please try again.";
export const PAYMENT_PREPARATION_RETRY_MS = 2 * 60 * 1000;

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

export function isLocalRazorpayOrderId(value: string) {
  return value.startsWith("pending:");
}

export function isFreshCheckoutPreparation(
  updatedAt: string,
  now = new Date(),
) {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  return now.getTime() - updatedAtMs < PAYMENT_PREPARATION_RETRY_MS;
}
