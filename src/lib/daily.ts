// Daily rounds roll over at midnight India Standard Time.

const IST_OFFSET_MS = 5.5 * 3600e3;
const LAUNCH_UTC = Date.UTC(2026, 9, 16);

/** The IST calendar date as YYYY-MM-DD, optionally shifted by whole days. */
export function istDate(offsetDays = 0, now = Date.now()): string {
  return new Date(now + IST_OFFSET_MS + offsetDays * 864e5).toISOString().slice(0, 10);
}

/** GeoKhel #N: day 1 is launch day. */
export function dayNumber(date: string): number {
  return Math.round((Date.parse(date + "T00:00:00Z") - LAUNCH_UTC) / 864e5) + 1;
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + "T00:00:00Z"));
}

/** Seeded PRNG (mulberry32), so every player gets the same daily round. */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Consecutive days played up to today (today may still be unplayed). */
export function currentStreak(daysPlayed: Set<string>, today: string): number {
  let streak = 0;
  const base = Date.parse(today + "T00:00:00Z");
  for (let o = 0; ; o--) {
    const d = new Date(base + o * 864e5).toISOString().slice(0, 10);
    if (daysPlayed.has(d)) streak++;
    else if (o === 0) continue;
    else break;
  }
  return streak;
}
