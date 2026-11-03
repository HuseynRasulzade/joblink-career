// Is the person at the office when they clock in? Only the distance is worked out and kept; the coordinates of the person are not stored.
export type GeoMode = "off" | "warn" | "require";
export type Office = { lat: number; lng: number; radius: number };
export const GEO_MODES: GeoMode[] = ["off", "warn", "require"];

const rad = (d: number) => (d * Math.PI) / 180;
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}
export const validPoint = (lat: unknown, lng: unknown) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 && !(Number(lat) === 0 && Number(lng) === 0);

export type GeoResult = { allowed: boolean; outside: boolean; distance: number | null; note: string; error: string };
// "require" refuses a clock-in away from the office or without a position; "warn" allows it and leaves a note for HR.
export function checkLocation(mode: GeoMode, office: Office | null, pos: { lat: unknown; lng: unknown } | null): GeoResult {
  if (mode === "off" || !office) return { allowed: true, outside: false, distance: null, note: "", error: "" };
  if (!pos || !validPoint(pos.lat, pos.lng)) {
    return mode === "require"
      ? { allowed: false, outside: false, distance: null, note: "", error: "Məkanınız müəyyən edilmədi. Brauzerdə məkan icazəsini verin və yenidən cəhd edin." }
      : { allowed: true, outside: false, distance: null, note: "Məkan yoxlanmadı (icazə verilmədi)", error: "" };
  }
  const distance = distanceMeters(office, { lat: Number(pos.lat), lng: Number(pos.lng) });
  if (distance <= office.radius) return { allowed: true, outside: false, distance, note: "", error: "" };
  return mode === "require"
    ? { allowed: false, outside: true, distance, note: "", error: `Siz ofisdən təxminən ${distance} m aralıdasınız (icazə verilən: ${office.radius} m). Giriş-çıxış yalnız ofisdə qeyd olunur.` }
    : { allowed: true, outside: true, distance, note: `Ofisdən ${distance} m kənarda qeyd olunub`, error: "" };
}
