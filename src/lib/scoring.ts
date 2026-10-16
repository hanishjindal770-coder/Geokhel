// Distance scoring, shared by server and client.
// The curve is fitted to GeoSports' published chart (miles): 0 = 100, 500 = 71,
// 1,000 = 58, 1,500 = 50, 2,000 = 45, 2,500 = 41.

export const KM_PER_MI = 1.609344;
export const MULTIPLIERS = [1, 1, 2, 3, 3] as const;
export const ROUND_LENGTH = MULTIPLIERS.length;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pointsFor(distKm: number): number {
  const mi = distKm / KM_PER_MI;
  return Math.max(0, Math.round(100 / (1 + Math.pow(mi / 1500, 0.816))));
}

export type TierKey = "perfect" | "great" | "ball" | "miles" | "zero";

export function tier(points: number): { key: TierKey; label: string; emoji: string } {
  if (points >= 100) return { key: "perfect", label: "Perfect", emoji: "🟢" };
  if (points >= 90) return { key: "great", label: "Great", emoji: "🟢" };
  if (points >= 50) return { key: "ball", label: "Ballpark", emoji: "🟡" };
  if (points >= 1) return { key: "miles", label: "Miles off", emoji: "🔴" };
  return { key: "zero", label: "Antipodal", emoji: "⚫" };
}

export function roundTotal(points: number[]): number {
  return points.reduce((sum, p, i) => sum + p * (MULTIPLIERS[i] ?? 1), 0);
}

export function formatDistance(km: number): string {
  if (km < 1) return "under 1 km";
  const k = Math.round(km).toLocaleString("en-IN");
  const m = Math.round(km / KM_PER_MI).toLocaleString("en-IN");
  return `${k} km (${m} mi)`;
}
