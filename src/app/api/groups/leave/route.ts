import { bad, currentPlayer, handle, json, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const POST = handle(async (req: Request) => {
  const me = await currentPlayer(req);
  if (!me) return bad("Pick a name first.", 401);
  const body = await readJson(req);
  const store = getStore();
  const group = await store.groupByCode(String(body.code ?? ""));
  if (!group) return bad("That group doesn't exist.", 404);
  await store.leaveGroup(group.id, me.id);
  return json({ ok: true });
});
