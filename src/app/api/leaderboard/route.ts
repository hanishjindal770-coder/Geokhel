import { bad, currentPlayer, handle, json } from "@/lib/api";
import { dayNumber, istDate, isValidDate } from "@/lib/daily";
import { isState } from "@/lib/states";
import { getStore } from "@/lib/store";

const LIMIT = 50;

// ?scope=all | ?scope=state&state=Kerala | ?scope=states | ?scope=group&code=abc  (&day=YYYY-MM-DD, last 14 days)
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const today = istDate();
  const day = url.searchParams.get("day") ?? today;
  const oldest = istDate(-13);
  if (!isValidDate(day) || day > today || day < oldest) return bad("Leaderboards go back 14 days.");
  const scope = url.searchParams.get("scope") ?? "all";
  const store = getStore();
  const me = await currentPlayer(req);
  const meta = { day, number: dayNumber(day), scope };

  if (scope === "states") {
    return json({ ...meta, states: await store.stateBoard(day), myState: me?.state ?? null });
  }

  let rows;
  let title = "Everyone";
  if (scope === "all") {
    rows = await store.board(day, { limit: LIMIT });
  } else if (scope === "state") {
    const state = url.searchParams.get("state") ?? me?.state;
    if (!isState(state)) return bad("Unknown state.");
    rows = await store.board(day, { limit: LIMIT, state });
    title = state;
  } else if (scope === "group") {
    const group = await store.groupByCode(url.searchParams.get("code") ?? "");
    if (!group) return bad("That group doesn't exist.", 404);
    const ids = await store.groupMemberIds(group.id);
    if (!me || !ids.includes(me.id)) return bad("Join the group to see its scores.", 403);
    rows = await store.board(day, { limit: LIMIT, playerIds: ids });
    title = group.name;
  } else {
    return bad("Unknown leaderboard.");
  }

  // Rank ties together, and pin the player's own row even if they're outside the top 50.
  let rank = 0, prev = -1;
  const ranked = rows.map((r, i) => {
    if (r.total !== prev) { rank = i + 1; prev = r.total; }
    return { rank, nickname: r.nickname, state: r.state, total: r.total, me: r.playerId === me?.id };
  });
  let mine = ranked.find((r) => r.me) ?? null;
  if (!mine && me) {
    const r = await store.resultFor(me.id, day);
    if (r) mine = { rank: 0, nickname: me.nickname, state: me.state, total: r.total, me: true };
  }
  return json({ ...meta, title, rows: ranked, mine });
});
