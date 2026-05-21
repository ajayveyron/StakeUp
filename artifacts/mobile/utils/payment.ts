import { Commitment } from "@/contexts/CommitmentsContext";
import { formatCurrency, formatDate } from "@/utils/commitment";

function adminWhatsAppNumber() {
  return (
    process.env.EXPO_PUBLIC_ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, "") ??
    "917988810502"
  );
}

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
  const encoded = encodeURIComponent(paymentSetupMessage(commitment));
  const phone = adminWhatsAppNumber();
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
