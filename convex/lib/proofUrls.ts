export function normalizeContentProofUrl(value: string) {
  const trimmed = value.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Proof URL must be a valid https link");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Proof URL must be a valid https link");
  }

  parsed.hash = "";
  return parsed.toString();
}
