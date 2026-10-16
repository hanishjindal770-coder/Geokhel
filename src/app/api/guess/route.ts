import { bad, currentPlayer, handle, json, readJson } from "@/lib/api";
import { istDate } from "@/lib/daily";
import { QUESTIONS } from "@/lib/questions";
import { distanceKm, pointsFor, roundTotal, ROUND_LENGTH } from "@/lib/scoring";
import { reveal } from "@/lib/reveal";
import { getStore } from "@/lib/store";
import { makeChallenge, verifyRound } from "@/lib/tokens";

// Scores one tap. The server holds the answers, so a score can't be faked from the browser.
export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  const round = verifyRound(body.token);
  if (!round) return bad("This round has expired. Reload to start again.");
  const idx = Number(body.idx), lat = Number(body.lat), lon = Number(body.lon);
  if (!Number.isInteger(idx) || idx < 0 || idx >= ROUND_LENGTH) return bad("Unknown question.");
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return bad("That tap wasn't on the map.");

  const q = QUESTIONS[round.ids[idx]];
  const km = distanceKm(lat, lon, q.lat, q.lon);
  const points = pointsFor(km);
  const row = { idx, points, km, lat, lon };

  if (round.mode !== "daily") {
    // Practice and challenges aren't stored. The browser sends earlier scores so we can sign the share code.
    const prior = Array.isArray(body.prior) ? body.prior.map(Number) : [];
    const all = [...prior.slice(0, idx), points];
    const done = idx === ROUND_LENGTH - 1 && all.length === ROUND_LENGTH && all.every((p) => p >= 0 && p <= 100);
    return json({ ...reveal(round.ids[idx], row), ...(done ? { total: roundTotal(all), challenge: makeChallenge(round.ids, all) } : {}) });
  }

  // Daily: one answer per question, and only for today's round.
  if (round.date !== istDate()) return bad("That daily round has ended. Reload for today's round.", 409);
  const me = await currentPlayer(req);
  if (!me) return bad("Pick a name first so your score counts.", 401);
  const store = getStore();
  const saved = await store.insertGuess({ playerId: me.id, day: round.date, ...row });
  const guesses = await store.guessesFor(me.id, round.date);
  const mine = guesses.find((g) => g.idx === idx)!;
  if (!saved && !mine) return bad("Could not save that guess. Try again.", 500);

  const out: Record<string, unknown> = { ...reveal(round.ids[idx], mine), repeated: !saved };
  if (guesses.length === ROUND_LENGTH) {
    const pts = guesses.map((g) => g.points);
    const total = roundTotal(pts);
    await store.saveResult({ playerId: me.id, day: round.date, total, points: pts });
    out.total = total;
    out.challenge = makeChallenge(round.ids, pts);
  }
  return json(out);
});
