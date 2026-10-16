import { bad, currentPlayer, handle, json } from "@/lib/api";
import { currentStreak, dayNumber, istDate } from "@/lib/daily";
import { getStore } from "@/lib/store";

// The player's profile, streak and recent scores.
export const GET = handle(async (req: Request) => {
  const me = await currentPlayer(req);
  if (!me) return bad("Not signed in.", 401);
  const store = getStore();
  const today = istDate();
  const [results, groups] = await Promise.all([store.resultDays(me.id), store.groupsFor(me.id)]);
  const days = new Set(results.map((r) => r.day));
  const recent = [];
  for (let o = -6; o <= 0; o++) {
    const d = istDate(o);
    recent.push({ day: d, number: dayNumber(d), total: results.find((r) => r.day === d)?.total ?? null });
  }
  return json({
    player: me,
    today: { day: today, number: dayNumber(today), total: results.find((r) => r.day === today)?.total ?? null },
    streak: currentStreak(days, today),
    played: results.length,
    best: results.reduce((m, r) => Math.max(m, r.total), 0),
    recent,
    groups,
  });
});
