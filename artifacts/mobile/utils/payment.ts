import { Commitment } from "@/contexts/CommitmentsContext";
import { formatCurrency, formatDate } from "@/utils/commitment";
import { adminWhatsAppUrl } from "@/utils/whatsapp";

export function paymentSetupMessage(commitment: Commitment) {
  return [
    `Hi, I wrote a Pact Raven pact: ${commitment.name}`,
    `Pact ID: ${commitment.id}`,
    `Refundable deposit: ${formatCurrency(commitment.pactAmount, commitment.currency)}`,
    `Schedule: ${formatDate(commitment.startDate)} to ${formatDate(commitment.endDate)}`,
    "Please help me review the pact rules before I lock the deposit.",
  ].join("\n");
}

export function paymentSetupUrl(commitment: Commitment) {
  return adminWhatsAppUrl(paymentSetupMessage(commitment));
}
