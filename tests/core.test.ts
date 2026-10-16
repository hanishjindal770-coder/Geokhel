import { test } from "node:test";
import assert from "node:assert/strict";
import { pointsFor, roundTotal, tier, KM_PER_MI } from "../src/lib/scoring.ts";
import { currentStreak, dayNumber, istDate } from "../src/lib/daily.ts";
import { QUESTIONS, dailyQuestionIds, practiceQuestionIds, isValidRound } from "../src/lib/questions.ts";
import { makeChallenge, readChallenge, signRound, verifyRound } from "../src/lib/tokens.ts";
import { createMemoryStore } from "../src/lib/store/memory.ts";

test("scoring follows the GeoSports curve", () => {
  const at = (mi: number) => pointsFor(mi * KM_PER_MI);
  assert.equal(at(0), 100);
  assert.equal(at(500), 71);
  assert.equal(at(1000), 58);
  assert.equal(at(1500), 50);
  assert.equal(at(2000), 44);
  assert.equal(at(2500), 40);
  assert.equal(tier(100).key, "perfect");
  assert.equal(tier(71).key, "ball");
  assert.equal(roundTotal([100, 100, 100, 100, 100]), 1000);
});

test("daily rounds are fixed per day and run easy to hard", () => {
  const a = dailyQuestionIds(dayNumber("2026-10-20"));
  assert.deepEqual(a, dailyQuestionIds(dayNumber("2026-10-20")));
  assert.ok(isValidRound(a));
  assert.equal(QUESTIONS[a[0]].difficulty, 1);
  assert.equal(QUESTIONS[a[4]].difficulty, 3);
  for (const g of ["mixed", "cricket", "football-hockey", "other"]) assert.ok(isValidRound(practiceQuestionIds(g, 42)), g);
  assert.equal(practiceQuestionIds("nope", 1), null);
});

test("IST dates and streaks", () => {
  assert.equal(istDate(0, Date.parse("2026-10-16T19:00:00Z")), "2026-10-17"); // 00:30 IST next day
  assert.equal(dayNumber("2026-10-16"), 1);
  assert.equal(currentStreak(new Set(["2026-10-14", "2026-10-15"]), "2026-10-16"), 2);
  assert.equal(currentStreak(new Set(["2026-10-14", "2026-10-15", "2026-10-16"]), "2026-10-16"), 3);
  assert.equal(currentStreak(new Set(["2026-10-13"]), "2026-10-16"), 0);
});

test("round tokens and challenge codes can't be tampered with", () => {
  const t = signRound({ mode: "daily", ids: [0, 1, 2, 3, 4], date: "2026-10-16" });
  assert.deepEqual(verifyRound(t)?.ids, [0, 1, 2, 3, 4]);
  const [body, sig] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ mode: "daily", ids: [5, 1, 2, 3, 4] })).toString("base64url");
  assert.equal(verifyRound(`${forged}.${sig}`), null);
  assert.equal(verifyRound(body), null);

  const code = makeChallenge([0, 1, 2, 3, 4], [71, 58, 50, 44, 40]);
  assert.deepEqual(readChallenge(code)?.points, [71, 58, 50, 44, 40]);
  const bumped = code.slice(0, 10) + "2s" + code.slice(12); // change first score to 100
  assert.equal(readChallenge(bumped), null);
});

test("memory store: one answer per question, boards and groups", async () => {
  const s = createMemoryStore();
  const a = await s.createPlayer("ha", "Asha", "Kerala");
  const b = await s.createPlayer("hb", "Ravi", "Punjab");
  const day = "2026-10-16";
  assert.equal(await s.insertGuess({ playerId: a.id, day, idx: 0, points: 90, km: 10, lat: 1, lon: 2 }), true);
  assert.equal(await s.insertGuess({ playerId: a.id, day, idx: 0, points: 100, km: 0, lat: 1, lon: 2 }), false);
  await s.saveResult({ playerId: a.id, day, total: 800, points: [90, 90, 90, 90, 90] });
  await s.saveResult({ playerId: b.id, day, total: 600, points: [60, 60, 60, 60, 60] });
  assert.deepEqual((await s.board(day, { limit: 50 })).map((r) => r.nickname), ["Asha", "Ravi"]);
  assert.deepEqual((await s.board(day, { limit: 50, state: "Punjab" })).map((r) => r.nickname), ["Ravi"]);
  assert.equal((await s.stateBoard(day))[0].state, "Kerala");
  const g = await s.createGroup(a.id, "Office", "abc2345");
  await s.joinGroup(g.id, b.id);
  assert.equal((await s.groupByCode("abc2345"))?.members, 2);
  assert.equal((await s.groupsFor(b.id)).length, 1);
  await s.leaveGroup(g.id, b.id);
  assert.equal((await s.groupsFor(b.id)).length, 0);
});
