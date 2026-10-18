import { bad, currentPlayer, handle, json, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { newGroupCode } from "@/lib/tokens";

// Create a group (for a family, office or college WhatsApp group).
export const POST = handle(async (req: Request) => {
  const me = await currentPlayer(req);
  if (!me) return bad("Pick a name first.", 401);
  const body = await readJson(req);
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) return bad("Give the group a name between 2 and 40 characters.");
  const store = getStore();
  if ((await store.groupsFor(me.id)).length >= 20) return bad("You can be in up to 20 groups.");
  // Codes are random; on the rare clash, try a fresh one.
  for (let attempt = 0; ; attempt++) {
    try {
      return json({ group: await store.createGroup(me.id, name, newGroupCode()) }, 201);
    } catch (err) {
      if (attempt >= 2 || !(err instanceof Error && err.message === "group code collision")) throw err;
    }
  }
});

// Look up a group by invite code (to show its name before joining).
export const GET = handle(async (req: Request) => {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const group = await getStore().groupByCode(code);
  return group ? json({ group }) : bad("That invite link doesn't match any group.", 404);
});
