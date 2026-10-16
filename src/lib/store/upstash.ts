// Upstash Redis store. Leaderboards are sorted sets, so reading the top 50 is one command.
// Every key starts with "gk:". Per-day keys expire after 30 days; the leaderboards show 14.
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { BoardRow, Group, GuessRow, Player, ResultRow, StateRow, Store } from "./types.ts";

const DAY_TTL = 30 * 86400;

const k = {
  token: (hash: string) => `gk:tok:${hash}`,
  player: (id: string) => `gk:p:${id}`,
  guesses: (id: string, day: string) => `gk:g:${id}:${day}`,
  results: (id: string) => `gk:r:${id}`,
  board: (day: string) => `gk:b:${day}`,
  stateBoard: (day: string, state: string) => `gk:bs:${day}:${state}`,
  stateSum: (day: string) => `gk:ss:${day}`,
  stateCount: (day: string) => `gk:sc:${day}`,
  daily: (day: string) => `gk:daily:${day}`,
  group: (id: string) => `gk:grp:${id}`,
  groupCode: (code: string) => `gk:gc:${code}`,
  members: (id: string) => `gk:gm:${id}`,
  playerGroups: (id: string) => `gk:pg:${id}`,
};

export function createUpstashStore(url: string, token: string): Store {
  // Values are stored as JSON strings and parsed here, so turn off the client's own guessing.
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const parse = <T>(v: unknown): T | null => (typeof v === "string" ? (JSON.parse(v) as T) : null);
  // Without automatic deserialization, HGETALL comes back as a flat [field, value, ...] list
  // and HMGET as a list of values. Accept either shape.
  const hash = (v: unknown): Record<string, string> => {
    if (Array.isArray(v)) {
      const o: Record<string, string> = {};
      for (let i = 0; i + 1 < v.length; i += 2) o[String(v[i])] = String(v[i + 1]);
      return o;
    }
    return (v ?? {}) as Record<string, string>;
  };
  const fields = (v: unknown, names: string[]): Record<string, string | null> =>
    Array.isArray(v) ? Object.fromEntries(names.map((n, i) => [n, (v[i] as string | null) ?? null])) : ((v ?? {}) as Record<string, string | null>);

  async function players(ids: string[]): Promise<Map<string, Player>> {
    const out = new Map<string, Player>();
    if (!ids.length) return out;
    const p = redis.pipeline();
    for (const id of ids) p.hmget(k.player(id), "nickname", "state");
    const rows = (await p.exec()) as unknown[];
    ids.forEach((id, i) => {
      const r = fields(rows[i], ["nickname", "state"]);
      if (r?.nickname) out.set(id, { id, nickname: r.nickname, state: r.state ?? "" });
    });
    return out;
  }

  async function withNames(pairs: [string, number][]): Promise<BoardRow[]> {
    const who = await players(pairs.map(([id]) => id));
    return pairs.flatMap(([id, total]) => {
      const p = who.get(id);
      return p ? [{ playerId: id, nickname: p.nickname, state: p.state, total }] : [];
    });
  }

  async function group(id: string): Promise<Group | null> {
    const [raw, members] = await Promise.all([redis.hmget(k.group(id), "code", "name"), redis.scard(k.members(id))]);
    const g = fields(raw, ["code", "name"]);
    return g.code && g.name ? { id, code: g.code, name: g.name, members } : null;
  }

  return {
    async getDaily(day) {
      return parse<number[]>(await redis.get(k.daily(day)));
    },
    async setDailyOnce(day, ids) {
      await redis.set(k.daily(day), JSON.stringify(ids), { nx: true, ex: DAY_TTL });
      return parse<number[]>(await redis.get(k.daily(day))) ?? ids;
    },

    async createPlayer(tokenHash, nickname, state) {
      const id = randomUUID();
      await redis.hset(k.player(id), { nickname, state });
      await redis.set(k.token(tokenHash), id);
      return { id, nickname, state };
    },
    async playerByTokenHash(tokenHash) {
      const id = (await redis.get(k.token(tokenHash))) as string | null;
      return id ? (await players([id])).get(id) ?? null : null;
    },
    async updatePlayer(id, patch) {
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Record<string, string>;
      if (Object.keys(clean).length) await redis.hset(k.player(id), clean);
      const p = (await players([id])).get(id);
      if (!p) throw new Error("player not found");
      return p;
    },

    async guessesFor(playerId, day) {
      const all = hash(await redis.hgetall(k.guesses(playerId, day)));
      return Object.values(all)
        .map((v) => parse<GuessRow>(v)!)
        .sort((a, b) => a.idx - b.idx);
    },
    async insertGuess(g) {
      // HSETNX makes the first answer to each question final.
      const key = k.guesses(g.playerId, g.day);
      const added = await redis.hsetnx(key, String(g.idx), JSON.stringify(g));
      if (added) await redis.expire(key, DAY_TTL);
      return added === 1;
    },

    async saveResult(r) {
      const first = await redis.hsetnx(k.results(r.playerId), r.day, JSON.stringify({ total: r.total, points: r.points }));
      if (!first) return;
      const p = (await players([r.playerId])).get(r.playerId);
      const state = p?.state ?? "Outside India";
      const tx = redis.multi();
      tx.zadd(k.board(r.day), { score: r.total, member: r.playerId });
      tx.zadd(k.stateBoard(r.day, state), { score: r.total, member: r.playerId });
      tx.hincrby(k.stateSum(r.day), state, r.total);
      tx.hincrby(k.stateCount(r.day), state, 1);
      for (const key of [k.board(r.day), k.stateBoard(r.day, state), k.stateSum(r.day), k.stateCount(r.day)]) tx.expire(key, DAY_TTL);
      await tx.exec();
    },
    async resultDays(playerId) {
      const all = hash(await redis.hgetall(k.results(playerId)));
      return Object.entries(all).map(([day, v]) => {
        const r = parse<{ total: number; points: number[] }>(v)!;
        return { playerId, day, total: r.total, points: r.points } satisfies ResultRow;
      });
    },
    async resultFor(playerId, day) {
      const r = parse<{ total: number; points: number[] }>(await redis.hget(k.results(playerId), day));
      return r ? { playerId, day, total: r.total, points: r.points } : null;
    },

    async board(day, { limit, playerIds, state }) {
      if (playerIds) {
        if (!playerIds.length) return [];
        const scores = (await redis.zmscore(k.board(day), playerIds)) as (number | string | null)[] | null;
        const pairs = playerIds
          .map((id, i) => [id, scores?.[i] == null ? null : Number(scores[i])] as const)
          .filter((p): p is readonly [string, number] => p[1] !== null)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit);
        return withNames(pairs.map(([id, t]) => [id, t]));
      }
      const key = state ? k.stateBoard(day, state) : k.board(day);
      const flat = (await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true })) as (string | number)[];
      const pairs: [string, number][] = [];
      for (let i = 0; i < flat.length; i += 2) pairs.push([String(flat[i]), Number(flat[i + 1])]);
      return withNames(pairs);
    },
    async stateBoard(day) {
      const [sums, counts] = (await Promise.all([redis.hgetall(k.stateSum(day)), redis.hgetall(k.stateCount(day))])).map(hash);
      const rows: StateRow[] = Object.entries(counts).map(([state, n]) => ({
        state,
        players: Number(n),
        average: Math.round(Number(sums[state] ?? 0) / Math.max(1, Number(n))),
      }));
      return rows.sort((a, b) => b.average - a.average || b.players - a.players);
    },

    async createGroup(ownerId, name, code) {
      const id = randomUUID();
      const claimed = await redis.set(k.groupCode(code), id, { nx: true });
      if (!claimed) throw new Error("group code collision");
      const tx = redis.multi();
      tx.hset(k.group(id), { code, name, owner: ownerId });
      tx.sadd(k.members(id), ownerId);
      tx.sadd(k.playerGroups(ownerId), id);
      await tx.exec();
      return { id, code, name, members: 1 };
    },
    async groupByCode(code) {
      if (!/^[a-z0-9]{4,12}$/.test(code)) return null;
      const id = (await redis.get(k.groupCode(code))) as string | null;
      return id ? group(id) : null;
    },
    async joinGroup(groupId, playerId) {
      const tx = redis.multi();
      tx.sadd(k.members(groupId), playerId);
      tx.sadd(k.playerGroups(playerId), groupId);
      await tx.exec();
    },
    async leaveGroup(groupId, playerId) {
      const tx = redis.multi();
      tx.srem(k.members(groupId), playerId);
      tx.srem(k.playerGroups(playerId), groupId);
      await tx.exec();
    },
    async groupsFor(playerId) {
      const ids = (await redis.smembers(k.playerGroups(playerId))) as string[];
      const groups = await Promise.all(ids.map(group));
      return groups.filter((g): g is Group => g !== null);
    },
    async groupMemberIds(groupId) {
      return (await redis.smembers(k.members(groupId))) as string[];
    },
  };
}
