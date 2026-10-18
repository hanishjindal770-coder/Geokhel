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
- Upstash Redis for players, guesses, results, leaderboards (sorted sets) and groups. Only the server talks to it.
- Questions come from a Google Sheet published as CSV, so new questions need no code change. Without a sheet, the built-in bank in `src/lib/questions.ts` is used.
- No sign-up: a player gets a random token kept in the browser; the database stores only its hash.
- Answers never reach the browser before a guess. Each round is a signed token, the server scores each tap, and a daily question can only be answered once.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000, uses an in-memory store and built-in questions when Upstash and the sheet aren't configured
npm test           # scoring, tokens, daily selection and store tests
```

## Deploy

1. **Questions sheet.** In Google Sheets, choose File > Import and upload `docs/questions-template.csv` (it has the 48 starter questions). Then File > Share > Publish to web, pick the sheet, choose **Comma-separated values (.csv)** and copy the link.
2. **Vercel.** Import this repo at [vercel.com/new](https://vercel.com/new).
3. **Upstash.** In the Vercel project, open **Storage**, add **Upstash for Redis** (free plan) and connect it to the project. Vercel adds the connection settings for you.
4. **Settings.** In the project's **Settings > Environment Variables**, add:
   - `QUESTIONS_CSV_URL`: the published CSV link from step 1
   - `ROUND_SECRET`: any long random string, for example from `openssl rand -base64 32`. Set it once: changing it breaks old challenge links.
   - `NEXT_PUBLIC_SITE_URL`: your site's address, e.g. `https://geokhel.vercel.app`
5. Redeploy so the settings take effect.

## Map data

India's state boundaries are from © OpenStreetMap contributors (ODbL) via [vardhan-maps](https://github.com/vardhansystems/vardhan-maps), following the official Government of India depiction. Other countries are from Natural Earth (public domain).

## Adding questions

Edit the Google Sheet. Columns:

| Column | What goes in it |
| --- | --- |
| `id` | A unique whole number. Never reuse or change an id, because challenge links refer to it. |
| `date` | Optional, like `2026-10-20`. Give five rows the same date and they become that day's round, in sheet order. Leave empty for the pool. |
| `clue` | The question. |
| `answer` | The place name shown after the guess. |
| `lat`, `lon` | The answer's coordinates, e.g. right-click the spot in Google Maps and copy them. Must be inside India. |
| `sport` | Cricket, Football, Hockey, Kabaddi, and so on. |
| `difficulty` | 1 easy, 2 medium, 3 hard. |
| `fact` | One or two sentences shown on the reveal. |

Changes show up within about 5 minutes. Rows with a problem are skipped and logged, never fatal. On days without five dated rows, the round is picked from the undated pool (one easy, one easy-or-medium, one medium, one medium-or-hard, one hard). Each day's questions are saved the first time anyone plays, so editing the sheet mid-day never changes a round people are playing. Questions dated in the future stay out of practice rounds.
