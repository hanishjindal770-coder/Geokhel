import type { Question } from "./questions.ts";

/** What the player sees after a guess: their score, the distance and the answer. */
export function reveal(q: Question, g: { idx: number; points: number; km: number; lat: number; lon: number }) {
  return {
    idx: g.idx,
    points: g.points,
    km: Math.round(g.km * 10) / 10,
    guess: { lat: g.lat, lon: g.lon },
    answer: { name: q.answer, lat: q.lat, lon: q.lon, fact: q.fact },
  };
}
