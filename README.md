# GeoKhel

Five Indian sports moments a day. Tap where each one happened on the map of India; the closer your pin, the more you score. Inspired by GeoSports, built for India: cricket grounds, hockey, football, kabaddi, chess, traditional sports and more.

## How it plays

- One daily round of 5 questions for everyone, rolling over at midnight IST. Questions get harder, and Q3 is worth ×2, Q4 and Q5 ×3, for a perfect day of 1,000.
- One tap is your guess. Only distance counts, on the GeoSports curve: 500 mi (800 km) off scores 71, 1,000 mi scores 58.
- Practice rounds by sport, which don't count.
- "Beat my score" links: friends play the same 5 questions and see a You vs Friend result. WhatsApp shows a "Can you beat 742?" preview card.
- Leaderboards for everyone, your state, state vs state, and private groups (family, office, college) joined by invite link.
- Streaks, games played and best score.

## Tech

- Next.js 15 (App Router) on Vercel, MapLibre GL globe with map data served from `public/geo` (no tile server).
- Supabase Postgres for players, guesses, results and groups. The server talks to it with the service role key; row level security is on with no policies, so the public keys can read nothing.
- No sign-up: a player gets a random token kept in the browser; the database stores only its hash.
- Answers never reach the browser before a guess. Each round is a signed token, the server scores each tap, and a daily question can only be answered once.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000, uses an in-memory store when Supabase isn't configured
npm test           # scoring, tokens, daily selection and store tests
```

## Deploy

1. Create a free project at [supabase.com](https://supabase.com). In **SQL Editor**, run `supabase/migrations/0001_init.sql`.
2. In **Project Settings > API**, copy the project URL and the `service_role` key.
3. Import this repo at [vercel.com/new](https://vercel.com/new) and add these environment variables:
   - `SUPABASE_URL`: the project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key (server only, never expose it)
   - `ROUND_SECRET`: any long random string, for example from `openssl rand -base64 32`
   - `NEXT_PUBLIC_SITE_URL`: your site's address, e.g. `https://geokhel.vercel.app`
4. Deploy. Changing `ROUND_SECRET` later breaks old challenge links, so set it once.

## Map data

India's state boundaries are from © OpenStreetMap contributors (ODbL) via [vardhan-maps](https://github.com/vardhansystems/vardhan-maps), following the official Government of India depiction. Other countries are from Natural Earth (public domain).

## Adding questions

Questions live in `src/lib/questions.ts` with a clue, answer, coordinates, sport, difficulty (1 to 3) and a fact shown on the reveal. Daily rounds pick one easy, one easy-or-medium, one medium, one medium-or-hard and one hard question.
