# Table Tennis Tournament

A one-page tournament site with a small Netlify back-end. Live at https://tabletennis.am (Netlify project `table-tennis-epam`). The tournament starts on 18 November 2026.

Format: 36 players in 8 groups (A, B, C and H have 5 players, D to G have 4), 64 round-robin group matches, then a top-16 knockout bracket with a 3rd-place match.

## Layout

| Path | What it is |
|---|---|
| `public/index.html` | The whole front end: HTML, CSS and plain JS in one file. No framework, no build step. |
| `netlify/functions/api.mjs` | The back-end. One Netlify Function serving `/api/state` and `/api/login`. |
| `server/state.mjs` | Validation for everything that gets stored. Imported by the function. |
| `netlify.toml` | Publish directory is `public`; functions are bundled with esbuild. |
| `package.json` | Only dependency: `@netlify/blobs`. |

## Deploying

Push to the GitHub repository; Netlify builds and deploys automatically. Drag-and-drop deploys do not work because the function has to be bundled.

Each production deploy costs Netlify credits (free plan: 300 per month, hard limit, the site pauses if they run out). Batch changes into few pushes instead of many small ones.

Local run: `npm install`, then `npm run dev` (http://localhost:8888). The script adds `--internal-disable-edge-functions` because on this Windows machine the Deno binary netlify-cli downloads fails with `spawn EBUSY`, which turns every request into "500 Could not proxy request".

## Front end (`public/index.html`)

Everything is inside one IIFE in the `<script>` tag.

- **Setup data** is hard-coded at the top: `GROUPS` (player names per group), `P4` / `P5` (round-robin pairing patterns for 4- and 5-player groups) and `R16` (which group winner meets which runner-up). `PLAYERS`, `GID` and `M` (the 64 matches) are generated from these. A player id is the index in `PLAYERS`; a match id is 1 to 64.
- **State** is one object: `{ scores, ko, names, rank }`.
  - `scores[matchId] = [setsP1, setsP2]` for group matches (each 0 to 9 or `null`).
  - `ko[key] = [setsP1, setsP2]` for knockout matches. Keys: `R1`..`R8`, `Q1`..`Q4`, `S1`, `S2`, `T` (3rd place), `F` (final).
  - `names[playerId] = "New name"` for renamed players.
  - `rank[playerId] = 1 | 2` for a manual group rank override.
- **Calculations:** `table(g)` builds standings (sorted by wins, set difference, sets won, then head-to-head). `quals(g)` returns the group's top two, only once every match in the group has a winner, unless a manual rank is set. `bracket()` resolves the whole knockout tree from `quals` and the `ko` scores.
- **Rendering:** `render()` rebuilds the current view as an HTML string. Views are chosen by the URL hash: `#groups`, `#matches`, `#playoffs`. After an edit, call `rerender()` instead, which restores keyboard focus by element id. Every input therefore needs a stable `id`.
- **Escaping:** all player names go through `esc()` before being put into HTML. Keep it that way; names are user input.
- **Admin mode:** `admin` is true after sign-in. It turns score cells into inputs and shows name fields, rank selects and the Data dialog (copy, load, clear all).
- **Sync:** `pull()` fetches `/api/state` on load, every 60 seconds and when the tab becomes visible. It skips while an input has focus or a save is pending. `push(payload)` sends changes; requests are chained so they never run in parallel. If `/api/state` does not answer with JSON, the page switches to `mode = "local"` and keeps data in `localStorage` only (this is also how it behaves when opened as a plain file).
- **Theme:** colours are CSS variables in `:root`, with a dark palette under both `prefers-color-scheme: dark` and `:root[data-theme="dark"]`. Style through the tokens, not with hard-coded colours. Fonts: Barlow Condensed (headings) and Barlow (body) from Google Fonts.

## Back end

| Route | Who | What |
|---|---|---|
| `GET /api/state` | Everyone | Returns `{ state }`. |
| `POST /api/login` | Everyone | Body `{ username, password }`. Returns `{ token }` or 401. |
| `POST /api/state` | Admin (`Authorization: Bearer <token>`) | Body `{ ops: [{ store, key, value }] }` for small changes (`value: null` deletes), or `{ replace: state }` to overwrite everything. Returns the new `{ state }`. |

- Data lives in Netlify Blobs: store `tournament`, key `state`, read with strong consistency.
- The admin login comes from the `ADMIN_USER` and `ADMIN_PASSWORD` environment variables in Netlify (fallback `admin` / `admin`). The token is an HMAC of the username keyed with the password, so changing the password invalidates old tokens. Never put credentials in the repository or in `public/`.
- `server/state.mjs` whitelists the four stores, restricts keys to 1 to 4 alphanumeric characters and validates every value. If the state shape changes, update `validators` there as well as the front end, or the server will silently drop the new data.

## Things to be careful with

- Player ids and match ids are positions in `GROUPS`. Reordering, adding or removing players after results exist will attach saved scores to the wrong people. Rename players through admin mode (or `names`) instead; if the line-up must change, clear the stored results first.
- Visitors poll once a minute. A shorter interval multiplies function requests and eats credits.
- Saves are read-modify-write on a single blob. This is fine for one admin at a time; two admins editing in the same second can overwrite each other.
- There is no automated test suite. After changing `api.mjs` or `state.mjs`, test login, a score save, an invalid value (should return 400) and a save without a token (should return 401).

## Wish list from the owner

- Make the design a little prettier.
- Add a favicon: crossed table tennis rackets.
- Add some icons to the interface (tabs, section headings, podium).
- Possibly: match times, table numbers, a rules section.
- Two names came from the original spreadsheet looking unfinished and may need correcting: "Tatevik Sargsyan1", "Armen Hovhannisyan2" ("Harut" was corrected to "Harut Khachatryan").
