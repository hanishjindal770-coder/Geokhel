import { bad, currentPlayer, handle, json } from "@/lib/api";
import { byId, dailyIds, getBank, practiceIds } from "@/lib/bank";
import { dayNumber, istDate } from "@/lib/daily";
import { reveal } from "@/lib/reveal";
import { MULTIPLIERS, ROUND_LENGTH, roundTotal } from "@/lib/scoring";
import { getStore } from "@/lib/store";
import { makeChallenge, readChallenge, signRound, type RoundClaims } from "@/lib/tokens";

// Starts a round. Returns the clues but never the answers.
// ?mode=daily | ?mode=practice&group=cricket | ?mode=challenge&code=...
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "daily";
  const store = getStore();
  const today = istDate();
  let claims: RoundClaims;
  let label: string;
  let rival: { points: number[] } | null = null;

  if (mode === "daily") {
    claims = { mode: "daily", ids: await dailyIds(store, today), date: today };
    label = `Daily #${dayNumber(today)}`;
  } else if (mode === "practice") {
    const ids = await practiceIds(url.searchParams.get("group") ?? "mixed");
    if (!ids || ids.length < ROUND_LENGTH) return bad("There aren't enough questions for that practice round yet.");
    claims = { mode: "practice", ids };
    label = "Practice";
  } else if (mode === "challenge") {
    const ch = readChallenge(url.searchParams.get("code"));
    if (!ch) return bad("This challenge link is broken or was changed.");
    // A challenge on today's daily questions counts as the daily round.
    const daily = await dailyIds(store, today);
    claims = ch.ids.join() === daily.join() ? { mode: "daily", ids: daily, date: today } : { mode: "challenge", ids: ch.ids };
    label = claims.mode === "daily" ? `Daily #${dayNumber(today)}` : "Friend's challenge";
    rival = { points: ch.points };
  } else {
    return bad("Unknown mode.");
  }

  const bank = await getBank();
  const questions = claims.ids.map((id) => byId(bank, id));
  if (questions.some((q) => !q)) return bad("Some of these questions have been removed. Try today's round instead.", 410);

  // Resume a daily round already in progress.
  let answered: ReturnType<typeof reveal>[] = [];
  let finished: { total: number; challenge: string } | null = null;
  if (claims.mode === "daily") {
    const me = await currentPlayer(req);
    if (me) {
      const done = await store.guessesFor(me.id, today);
      answered = done.map((g) => reveal(questions[g.idx]!, g));
      if (done.length === ROUND_LENGTH) {
        const pts = done.map((g) => g.points);
        finished = { total: roundTotal(pts), challenge: makeChallenge(claims.ids, pts) };
      }
    }
  }

  return json({
    token: signRound(claims),
    mode: claims.mode,
    label,
    day: claims.mode === "daily" ? dayNumber(today) : null,
    questions: questions.map((q, i) => ({ clue: q!.clue, sport: q!.sport, multiplier: MULTIPLIERS[i] })),
    answered,
    finished,
    rival,
  });
});
