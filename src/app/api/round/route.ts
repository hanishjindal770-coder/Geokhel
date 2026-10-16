import { bad, currentPlayer, handle, json } from "@/lib/api";
import { dayNumber, istDate } from "@/lib/daily";
import { QUESTIONS, dailyQuestionIds, practiceQuestionIds } from "@/lib/questions";
import { MULTIPLIERS, ROUND_LENGTH, roundTotal } from "@/lib/scoring";
import { reveal } from "@/lib/reveal";
import { getStore } from "@/lib/store";
import { makeChallenge, readChallenge, signRound, type RoundClaims } from "@/lib/tokens";

// Starts a round. Returns the clues but never the answers.
// ?mode=daily | ?mode=practice&group=cricket | ?mode=challenge&code=...
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "daily";
  const today = istDate();
  let claims: RoundClaims;
  let label: string;
  let rival: { points: number[] } | null = null;

  if (mode === "daily") {
    claims = { mode: "daily", ids: dailyQuestionIds(dayNumber(today)), date: today };
    label = `Daily #${dayNumber(today)}`;
  } else if (mode === "practice") {
    const group = url.searchParams.get("group") ?? "mixed";
    const ids = practiceQuestionIds(group, Math.floor(Math.random() * 2 ** 31));
    if (!ids || ids.length < 5) return bad("Unknown practice group.");
    claims = { mode: "practice", ids };
    label = "Practice";
  } else if (mode === "challenge") {
    const ch = readChallenge(url.searchParams.get("code"));
    if (!ch) return bad("This challenge link is broken or was changed.");
    // A challenge on today's daily questions counts as the daily round.
    const daily = dailyQuestionIds(dayNumber(today));
    claims = ch.ids.join() === daily.join() ? { mode: "daily", ids: daily, date: today } : { mode: "challenge", ids: ch.ids };
    label = claims.mode === "daily" ? `Daily #${dayNumber(today)}` : "Friend's challenge";
    rival = { points: ch.points };
  } else {
    return bad("Unknown mode.");
  }

  // Resume a daily round already in progress.
  let answered: ReturnType<typeof reveal>[] = [];
  let finished: { total: number; challenge: string } | null = null;
  if (claims.mode === "daily") {
    const me = await currentPlayer(req);
    if (me) {
      const done = await getStore().guessesFor(me.id, today);
      answered = done.map((g) => reveal(claims.ids[g.idx], g));
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
    questions: claims.ids.map((id, i) => ({ clue: QUESTIONS[id].clue, sport: QUESTIONS[id].sport, multiplier: MULTIPLIERS[i] })),
    answered,
    finished,
    rival,
  });
});

