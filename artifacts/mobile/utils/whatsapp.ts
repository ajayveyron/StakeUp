const INDIA_COUNTRY_CODE = "91";

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
