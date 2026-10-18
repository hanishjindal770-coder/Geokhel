// Loads the question bank: from a published Google Sheet when QUESTIONS_CSV_URL is set,
// otherwise the built-in questions. Today's round is saved on first use so editing the
// sheet mid-day never changes questions people are already playing.
import { BUILT_IN, PRACTICE_GROUPS, pickRound, questionsFromCsv, scheduledFor, type Question } from "./questions.ts";
import { dayNumber, rng } from "./daily.ts";
import type { Store } from "./store/types.ts";

const CACHE_MS = 5 * 60e3;
let cache: { at: number; bank: Question[] } | null = null;

export async function getBank(): Promise<Question[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.bank;
  const url = process.env.QUESTIONS_CSV_URL;
  let bank = BUILT_IN;
  if (url) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { questions, problems } = questionsFromCsv(await res.text());
      if (problems.length) console.warn(`Question sheet: ${problems.length} rows skipped. ${problems.slice(0, 5).join(" ")}`);
      if (questions.length >= 5) bank = questions;
      else console.error("Question sheet has fewer than 5 usable questions; using the built-in bank.");
    } catch (err) {
      console.error("Couldn't read the question sheet; using the built-in bank.", err);
      if (cache) return cache.bank; // keep the last good sheet rather than switching banks
    }
  }
  cache = { at: Date.now(), bank };
  return bank;
}

export function byId(bank: Question[], id: number): Question | undefined {
  return bank.find((q) => q.id === id);
}

/** Today's 5 question ids: the sheet's scheduled questions, else a seeded pick. Fixed once saved. */
export async function dailyIds(store: Store, day: string): Promise<number[]> {
  const saved = await store.getDaily(day);
  if (saved) return saved;
  const bank = await getBank();
  const ids = scheduledFor(bank, day) ?? pickRound(rng(dayNumber(day) * 7919 + 13), bank.filter((q) => !q.date || q.date < day));
  return store.setDailyOnce(day, ids);
}

export async function practiceIds(group: string): Promise<number[] | null> {
  const filter = PRACTICE_GROUPS[group];
  if (!filter) return null;
  const bank = await getBank();
  // Questions scheduled for today or later stay out of practice, so they aren't spoiled.
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  return pickRound(Math.random, bank.filter((q) => filter(q) && (!q.date || q.date < today)));
}
