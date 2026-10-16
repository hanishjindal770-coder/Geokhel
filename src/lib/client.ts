"use client";
// Browser-side API calls. The player's secret token lives in localStorage.

const KEY = "geokhel:token";

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new ApiError("No connection. Check your internet and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Something went wrong. Please try again.", res.status);
  return data as T;
}

/** Reads the scores out of a challenge code for display. The server checks the signature. */
export function peekChallenge(code: string): number[] | null {
  if (!/^[0-9a-z]{20}[A-Za-z0-9_-]{8}$/.test(code)) return null;
  const pts: number[] = [];
  for (let i = 10; i < 20; i += 2) pts.push(parseInt(code.slice(i, i + 2), 36));
  return pts.every((p) => p >= 0 && p <= 100) ? pts : null;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
}

export interface Reveal {
  idx: number;
  points: number;
  km: number;
  guess: { lat: number; lon: number };
  answer: { name: string; lat: number; lon: number; fact: string };
}

export interface RoundData {
  token: string;
  mode: "daily" | "practice" | "challenge";
  label: string;
  day: number | null;
  questions: { clue: string; sport: string; multiplier: number }[];
  answered: Reveal[];
  finished: { total: number; challenge: string } | null;
  rival: { points: number[] } | null;
}

export interface Group { id: string; code: string; name: string; members?: number }

export interface Me {
  player: { id: string; nickname: string; state: string };
  today: { day: string; number: number; total: number | null };
  streak: number;
  played: number;
  best: number;
  recent: { day: string; number: number; total: number | null }[];
  groups: Group[];
}
