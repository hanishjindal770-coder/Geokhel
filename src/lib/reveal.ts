import { QUESTIONS } from "./questions.ts";

/** What the player sees after a guess: their score, the distance and the answer. */
export function reveal(id: number, g: { idx: number; points: number; km: number; lat: number; lon: number }) {
  const q = QUESTIONS[id];
  return {
    idx: g.idx,
    points: g.points,
    km: Math.round(g.km * 10) / 10,
    guess: { lat: g.lat, lon: g.lon },
    answer: { name: q.answer, lat: q.lat, lon: q.lon, fact: q.fact },
  };
}
