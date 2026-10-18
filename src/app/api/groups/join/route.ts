import { bad, currentPlayer, handle, json, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const POST = handle(async (req: Request) => {
  const me = await currentPlayer(req);
  if (!me) return bad("Pick a name first.", 401);
  const body = await readJson(req);
  const store = getStore();
  const group = await store.groupByCode(String(body.code ?? ""));
  if (!group) return bad("That invite link doesn't match any group.", 404);
  const mine = await store.groupsFor(me.id);
  if (!mine.some((g) => g.id === group.id)) {
    if (mine.length >= 20) return bad("You can be in up to 20 groups.");
    await store.joinGroup(group.id, me.id);
  }
  return json({ group: await store.groupByCode(group.code) });
});
