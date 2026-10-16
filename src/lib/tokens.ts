// Signed, stateless tokens: a round token lists the questions a player is answering,
// and a challenge code carries a finished round's scores into a "beat my score" link.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isValidRound } from "./questions.ts";

export type RoundMode = "daily" | "practice" | "challenge";

export interface RoundClaims {
  mode: RoundMode;
  ids: number[];
  /** IST date for daily rounds. */
  date?: string;
}

function secret(): string {
  const s = process.env.ROUND_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("ROUND_SECRET is not set");
  return "geokhel-dev-secret";
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (data: string, len = 22) => createHmac("sha256", secret()).update(data).digest("base64url").slice(0, len);

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signRound(claims: RoundClaims): string {
  const body = b64(JSON.stringify(claims));
  return `${body}.${sign("round:" + body)}`;
}

export function verifyRound(token: unknown): RoundClaims | null {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign("round:" + body))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RoundClaims;
    if (!["daily", "practice", "challenge"].includes(c.mode) || !isValidRound(c.ids)) return null;
    return c;
  } catch {
    return null;
  }
}

// Challenge code: 5 question ids + 5 scores, two base-36 chars each, then an 8-char signature.
const b36 = (n: number) => n.toString(36).padStart(2, "0");

export function makeChallenge(ids: number[], points: number[]): string {
  const body = ids.map(b36).join("") + points.map(b36).join("");
  return body + sign("vs:" + body, 8);
}

export function readChallenge(code: unknown): { ids: number[]; points: number[] } | null {
  if (typeof code !== "string" || !/^[0-9a-z]{20}[A-Za-z0-9_-]{8}$/.test(code)) return null;
  const body = code.slice(0, 20);
  if (!safeEqual(code.slice(20), sign("vs:" + body, 8))) return null;
  const n: number[] = [];
  for (let i = 0; i < 20; i += 2) n.push(parseInt(body.slice(i, i + 2), 36));
  const ids = n.slice(0, 5), points = n.slice(5);
  if (!isValidRound(ids) || points.some((p) => !(p >= 0 && p <= 100))) return null;
  return { ids, points };
}

// Player secrets: the browser keeps the raw token, the database keeps only its hash.
export function newPlayerToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newGroupCode(): string {
  // Unambiguous characters, easy to read out loud.
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = randomBytes(7);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
