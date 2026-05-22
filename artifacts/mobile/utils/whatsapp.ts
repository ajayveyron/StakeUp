const INDIA_COUNTRY_CODE = "91";
const DEFAULT_ADMIN_WHATSAPP_NUMBER = "917988810502";

export function normalizeWhatsAppNumber(value: string): string | null {
  const compact = value.trim().replace(/[^\d+]/g, "");
  if (!compact) return null;

  const normalized = compact.startsWith("+")
    ? `+${compact.slice(1).replace(/\+/g, "")}`
    : compact;
  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) return null;

  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+${INDIA_COUNTRY_CODE}${digits}`;
  return `+${digits}`;
}

export function whatsappNumberLabel(value?: string) {
  return value?.trim() || "No WhatsApp number recorded";
}

export function adminWhatsAppNumber() {
  return (
    process.env.EXPO_PUBLIC_ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, "") ||
    DEFAULT_ADMIN_WHATSAPP_NUMBER
  );
}

export function adminWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  const phone = adminWhatsAppNumber();
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
