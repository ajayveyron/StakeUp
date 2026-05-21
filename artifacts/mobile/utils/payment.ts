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
    `Money at stake: ${formatCurrency(commitment.pactAmount, commitment.currency)}`,
    `Schedule: ${formatDate(commitment.startDate)} to ${formatDate(commitment.endDate)}`,
    "Please send me the payment link so I can fund the pact and start it.",
  ].join("\n");
}

export function paymentSetupUrl(commitment: Commitment) {
  const encoded = encodeURIComponent(paymentSetupMessage(commitment));
  const phone = adminWhatsAppNumber();
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
