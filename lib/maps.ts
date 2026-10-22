const GOOGLE_MAPS_SEARCH_BASE = "https://www.google.com/maps/search/?api=1";

export function normalizeJobAddress(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function googleMapsSearchUrl(address: unknown) {
  const normalized = normalizeJobAddress(address);
  if (!normalized) return "https://www.google.com/maps";
  return `${GOOGLE_MAPS_SEARCH_BASE}&query=${encodeURIComponent(normalized)}`;
}

export function googleMapsEmbedUrl(address: unknown) {
  const normalized = normalizeJobAddress(address);
  if (!normalized) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(normalized)}&output=embed`;
}
