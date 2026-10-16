import { test } from "node:test";
import assert from "node:assert/strict";
import { pointsFor, roundTotal, tier, KM_PER_MI } from "../src/lib/scoring.ts";
import { currentStreak, dayNumber, istDate } from "../src/lib/daily.ts";
import { BUILT_IN, isRoundShape, questionsFromCsv, scheduledFor } from "../src/lib/questions.ts";
import { byId, dailyIds, practiceIds } from "../src/lib/bank.ts";
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

test("daily rounds run easy to hard and stay fixed once saved", async () => {
  const store = createMemoryStore();
  const a = await dailyIds(store, "2026-10-20");
  assert.ok(isRoundShape(a));
  assert.equal(byId(BUILT_IN, a[0])?.difficulty, 1);
  assert.equal(byId(BUILT_IN, a[4])?.difficulty, 3);
  assert.deepEqual(await dailyIds(store, "2026-10-20"), a);
  // Same day on a fresh store picks the same questions (seeded), so restarts don't change rounds.
  assert.deepEqual(await dailyIds(createMemoryStore(), "2026-10-20"), a);
  for (const g of ["mixed", "cricket", "football-hockey", "other"]) assert.ok(isRoundShape(await practiceIds(g)), g);
  assert.equal(await practiceIds("nope"), null);
});

test("questions load from a Google Sheet CSV, skipping bad rows", () => {
  const csv = [
    "id,date,clue,answer,lat,lon,sport,difficulty,fact",
    '1,2026-10-20,"Where did Dhoni hit ""that"" six?",Wankhede,18.94,72.83,Cricket,1,"2011, final"',
    "2,2026-10-20,Q2,A2,28.6,77.2,Hockey,1,f",
    "3,2026-10-20,Q3,A3,22.5,88.3,Football,2,f",
    "4,2026-10-20,Q4,A4,13.0,80.2,Chess,3,f",
    "5,2026-10-20,Q5,A5,12.9,77.5,Cricket,3,f",
    "6,,Paris,Eiffel,48.8,2.3,Other,1,outside India",
    "5,,Dup,Dup,20,80,Other,1,dup id",
  ].join("\r\n");
  const { questions, problems } = questionsFromCsv(csv);
  assert.equal(questions.length, 5);
  assert.equal(questions[0].clue, 'Where did Dhoni hit "that" six?');
  assert.equal(questions[0].fact, "2011, final");
  assert.equal(problems.length, 2);
  assert.deepEqual(scheduledFor(questions, "2026-10-20"), [1, 2, 3, 4, 5]);
  assert.equal(scheduledFor(questions, "2026-10-21"), null);
  assert.match(questionsFromCsv("clue,answer\nx,y").problems[0], /missing/);
});

test("IST dates and streaks", () => {
  assert.equal(istDate(0, Date.parse("2026-10-16T19:00:00Z")), "2026-10-17"); // 00:30 IST next day
  assert.equal(dayNumber("2026-10-16"), 1);
  assert.equal(currentStreak(new Set(["2026-10-14", "2026-10-15"]), "2026-10-16"), 2);
  assert.equal(currentStreak(new Set(["2026-10-14", "2026-10-15", "2026-10-16"]), "2026-10-16"), 3);
  assert.equal(currentStreak(new Set(["2026-10-13"]), "2026-10-16"), 0);
});

test("round tokens and challenge codes can't be tampered with", () => {
  const t = signRound({ mode: "daily", ids: [1, 2, 3, 4, 5], date: "2026-10-16" });
  assert.deepEqual(verifyRound(t)?.ids, [1, 2, 3, 4, 5]);
  const [body, sig] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ mode: "daily", ids: [6, 2, 3, 4, 5] })).toString("base64url");
  assert.equal(verifyRound(`${forged}.${sig}`), null);
  assert.equal(verifyRound(body), null);

  const code = makeChallenge([1, 2, 3, 4, 5000], [71, 58, 50, 44, 40]);
  assert.deepEqual(readChallenge(code), { ids: [1, 2, 3, 4, 5000], points: [71, 58, 50, 44, 40] });
  const bumped = code.slice(0, 15) + "2s" + code.slice(17); // change first score to 100
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
  await s.saveResult({ playerId: b.id, day, total: 1000, points: [100, 100, 100, 100, 100] }); // ignored: already saved
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
