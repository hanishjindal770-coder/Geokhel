import { bad, cleanNickname, currentPlayer, handle, json, readJson } from "@/lib/api";
import { isState } from "@/lib/states";
import { getStore } from "@/lib/store";
import { hashToken, newPlayerToken } from "@/lib/tokens";

// Create a player. No login: the browser keeps the returned token.
export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return bad("Pick a name between 2 and 20 characters.");
  if (!isState(body.state)) return bad("Pick your state from the list.");
  const token = newPlayerToken();
  const player = await getStore().createPlayer(hashToken(token), nickname, body.state);
  return json({ player, token }, 201);
});

// Change name or state.
export const PATCH = handle(async (req: Request) => {
  const me = await currentPlayer(req);
  if (!me) return bad("Sign in again by reloading the page.", 401);
  const body = await readJson(req);
  const patch: { nickname?: string; state?: string } = {};
  if (body.nickname !== undefined) {
    const n = cleanNickname(body.nickname);
    if (!n) return bad("Pick a name between 2 and 20 characters.");
    patch.nickname = n;
  }
  if (body.state !== undefined) {
    if (!isState(body.state)) return bad("Pick your state from the list.");
    patch.state = body.state;
  }
  return json({ player: await getStore().updatePlayer(me.id, patch) });
});
