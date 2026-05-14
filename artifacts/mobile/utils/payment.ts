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
    `Hi, I created a Pact Raven commitment: ${commitment.name}`,
    `Commitment ID: ${commitment.id}`,
    `Amount: ${formatCurrency(commitment.pactAmount, commitment.currency)}`,
    `Schedule: ${formatDate(commitment.startDate)} to ${formatDate(commitment.endDate)}`,
    "Please send me the UPI QR/code so I can complete payment.",
  ].join("\n");
}

export function paymentSetupUrl(commitment: Commitment) {
  const encoded = encodeURIComponent(paymentSetupMessage(commitment));
  const phone = adminWhatsAppNumber();
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
