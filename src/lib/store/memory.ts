// In-memory store for local development and tests. Data is lost on restart.
import { randomUUID } from "node:crypto";
import type { BoardRow, Group, GuessRow, Player, ResultRow, StateRow, Store } from "./types.ts";

export function createMemoryStore(): Store {
  const players = new Map<string, Player & { tokenHash: string }>();
  const guesses = new Map<string, GuessRow>();
  const results = new Map<string, ResultRow>();
  const groups = new Map<string, Group & { ownerId: string }>();
  const members = new Map<string, Set<string>>();

  const key = (...p: (string | number)[]) => p.join("|");
  const pub = (p: Player): Player => ({ id: p.id, nickname: p.nickname, state: p.state });

  return {
    async createPlayer(tokenHash, nickname, state) {
      const p = { id: randomUUID(), tokenHash, nickname, state };
      players.set(p.id, p);
      return pub(p);
    },
    async playerByTokenHash(tokenHash) {
      for (const p of players.values()) if (p.tokenHash === tokenHash) return pub(p);
      return null;
    },
    async updatePlayer(id, patch) {
      const p = players.get(id);
      if (!p) throw new Error("player not found");
      Object.assign(p, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      return pub(p);
    },
    async guessesFor(playerId, day) {
      return [...guesses.values()].filter((g) => g.playerId === playerId && g.day === day).sort((a, b) => a.idx - b.idx);
    },
    async insertGuess(g) {
      const k = key(g.playerId, g.day, g.idx);
      if (guesses.has(k)) return false;
      guesses.set(k, { ...g });
      return true;
    },
    async saveResult(r) {
      results.set(key(r.playerId, r.day), { ...r });
    },
    async resultDays(playerId) {
      return [...results.values()].filter((r) => r.playerId === playerId);
    },
    async resultFor(playerId, day) {
      return results.get(key(playerId, day)) ?? null;
    },
    async board(day, { limit, playerIds, state }) {
      const ids = playerIds ? new Set(playerIds) : null;
      const rows: BoardRow[] = [];
      for (const r of results.values()) {
        if (r.day !== day || (ids && !ids.has(r.playerId))) continue;
        const p = players.get(r.playerId);
        if (!p || (state && p.state !== state)) continue;
        rows.push({ playerId: p.id, nickname: p.nickname, state: p.state, total: r.total, points: r.points });
      }
      return rows.sort((a, b) => b.total - a.total).slice(0, limit);
    },
    async stateBoard(day) {
      const agg = new Map<string, { n: number; sum: number }>();
      for (const r of results.values()) {
        const p = r.day === day ? players.get(r.playerId) : undefined;
        if (!p) continue;
        const a = agg.get(p.state) ?? { n: 0, sum: 0 };
        a.n++;
        a.sum += r.total;
        agg.set(p.state, a);
      }
      const rows: StateRow[] = [...agg].map(([state, a]) => ({ state, players: a.n, average: Math.round(a.sum / a.n) }));
      return rows.sort((a, b) => b.average - a.average || b.players - a.players);
    },
    async createGroup(ownerId, name, code) {
      const g = { id: randomUUID(), code, name, ownerId };
      groups.set(g.id, g);
      members.set(g.id, new Set([ownerId]));
      return { id: g.id, code, name, members: 1 };
    },
    async groupByCode(code) {
      for (const g of groups.values())
        if (g.code === code) return { id: g.id, code: g.code, name: g.name, members: members.get(g.id)?.size ?? 0 };
      return null;
    },
    async joinGroup(groupId, playerId) {
      members.get(groupId)?.add(playerId);
    },
    async leaveGroup(groupId, playerId) {
      members.get(groupId)?.delete(playerId);
    },
    async groupsFor(playerId) {
      const out: Group[] = [];
      for (const g of groups.values())
        if (members.get(g.id)?.has(playerId)) out.push({ id: g.id, code: g.code, name: g.name, members: members.get(g.id)!.size });
      return out;
    },
    async groupMemberIds(groupId) {
      return [...(members.get(groupId) ?? [])];
    },
  };
}
