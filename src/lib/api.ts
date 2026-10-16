// Small helpers shared by the API routes.
import { NextResponse } from "next/server";
import { getStore, type Player } from "./store/index.ts";
import { hashToken } from "./tokens.ts";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const bad = (message: string, status = 400) => json({ error: message }, status);

/** The player making the request, from the `Authorization: Bearer <token>` header. */
export async function currentPlayer(req: Request): Promise<Player | null> {
  const m = /^Bearer ([A-Za-z0-9_-]{20,64})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  return getStore().playerByTokenHash(hashToken(m[1]));
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function cleanNickname(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.normalize("NFC").replace(/\s+/g, " ").trim();
  return s.length >= 2 && s.length <= 20 && !/[<>]/.test(s) ? s : null;
}

/** Wraps a handler so unexpected errors become a clean 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(err);
      return bad("Something went wrong on our side. Please try again.", 500);
    }
  };
}
