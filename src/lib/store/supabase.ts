// Supabase (Postgres) store. Uses the service role key, so it must only run on the server.
// Row level security is on with no policies, which keeps the tables closed to the public API keys.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BoardRow, Group, Player, StateRow, Store } from "./types.ts";

type Joined = { player_id: string; total: number; points: number[]; players: { nickname: string; state: string } };

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };
  const toPlayer = (r: { id: string; nickname: string; state: string }): Player => ({ id: r.id, nickname: r.nickname, state: r.state });

  return {
    async createPlayer(tokenHash, nickname, state) {
      const { data, error } = await db.from("players").insert({ token_hash: tokenHash, nickname, state }).select("id,nickname,state").single();
      fail("create player", error);
      return toPlayer(data!);
    },
    async playerByTokenHash(tokenHash) {
      const { data, error } = await db.from("players").select("id,nickname,state").eq("token_hash", tokenHash).maybeSingle();
      fail("find player", error);
      return data ? toPlayer(data) : null;
    },
    async updatePlayer(id, patch) {
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const { data, error } = await db.from("players").update(clean).eq("id", id).select("id,nickname,state").single();
      fail("update player", error);
      return toPlayer(data!);
    },
    async guessesFor(playerId, day) {
      const { data, error } = await db.from("guesses").select("idx,points,km,lat,lon").eq("player_id", playerId).eq("day", day).order("idx");
      fail("read guesses", error);
      return (data ?? []).map((g) => ({ playerId, day, idx: g.idx, points: g.points, km: g.km, lat: g.lat, lon: g.lon }));
    },
    async insertGuess(g) {
      const { error } = await db.from("guesses").insert({ player_id: g.playerId, day: g.day, idx: g.idx, points: g.points, km: g.km, lat: g.lat, lon: g.lon });
      if (error?.code === "23505") return false; // already answered
      fail("save guess", error);
      return true;
    },
    async saveResult(r) {
      const { error } = await db.from("results").upsert({ player_id: r.playerId, day: r.day, total: r.total, points: r.points });
      fail("save result", error);
    },
    async resultDays(playerId) {
      const { data, error } = await db.from("results").select("day,total,points").eq("player_id", playerId).order("day", { ascending: false }).limit(400);
      fail("read results", error);
      return (data ?? []).map((r) => ({ playerId, day: r.day, total: r.total, points: r.points }));
    },
    async resultFor(playerId, day) {
      const { data, error } = await db.from("results").select("day,total,points").eq("player_id", playerId).eq("day", day).maybeSingle();
      fail("read result", error);
      return data ? { playerId, day: data.day, total: data.total, points: data.points } : null;
    },
    async board(day, { limit, playerIds, state }) {
      let q = db.from("results").select("player_id,total,points,players!inner(nickname,state)").eq("day", day);
      if (playerIds) q = q.in("player_id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);
      if (state) q = q.eq("players.state", state);
      const { data, error } = await q.order("total", { ascending: false }).limit(limit);
      fail("read leaderboard", error);
      return ((data ?? []) as unknown as Joined[]).map(
        (r): BoardRow => ({ playerId: r.player_id, nickname: r.players.nickname, state: r.players.state, total: r.total, points: r.points }),
      );
    },
    async stateBoard(day) {
      const { data, error } = await db.rpc("state_board", { d: day });
      fail("read state board", error);
      return ((data ?? []) as { state: string; players: number; average: number }[]).map(
        (r): StateRow => ({ state: r.state, players: Number(r.players), average: Math.round(Number(r.average)) }),
      );
    },
    async createGroup(ownerId, name, code) {
      const { data, error } = await db.from("groups").insert({ owner_id: ownerId, name, code }).select("id,code,name").single();
      fail("create group", error);
      const { error: e2 } = await db.from("group_members").insert({ group_id: data!.id, player_id: ownerId });
      fail("join group", e2);
      return { ...(data as Group), members: 1 };
    },
    async groupByCode(code) {
      const { data, error } = await db.from("groups").select("id,code,name,group_members(count)").eq("code", code).maybeSingle();
      fail("find group", error);
      if (!data) return null;
      const count = (data.group_members as unknown as { count: number }[])[0]?.count ?? 0;
      return { id: data.id, code: data.code, name: data.name, members: count };
    },
    async joinGroup(groupId, playerId) {
      const { error } = await db.from("group_members").upsert({ group_id: groupId, player_id: playerId }, { ignoreDuplicates: true });
      fail("join group", error);
    },
    async leaveGroup(groupId, playerId) {
      const { error } = await db.from("group_members").delete().eq("group_id", groupId).eq("player_id", playerId);
      fail("leave group", error);
    },
    async groupsFor(playerId) {
      const { data, error } = await db.from("group_members").select("groups(id,code,name,group_members(count))").eq("player_id", playerId);
      fail("read groups", error);
      type G = { id: string; code: string; name: string; group_members: { count: number }[] };
      return ((data ?? []) as unknown as { groups: G }[])
        .map((r) => r.groups)
        .filter(Boolean)
        .map((g) => ({ id: g.id, code: g.code, name: g.name, members: g.group_members[0]?.count ?? 0 }));
    },
    async groupMemberIds(groupId) {
      const { data, error } = await db.from("group_members").select("player_id").eq("group_id", groupId).limit(1000);
      fail("read group members", error);
      return (data ?? []).map((r) => r.player_id as string);
    },
  };
}
