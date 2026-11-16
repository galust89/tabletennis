# Table Tennis Tournament

A one-page tournament site with a small Netlify back-end, so everyone sees the same results.

- `public/index.html` is the whole website.
- `netlify/functions/api.mjs` is the back-end (reads and saves results, checks the admin login).
- `server/state.mjs` validates everything before it is saved.
- Results are stored in Netlify Blobs. There is no database to set up.

## Deploy

Dragging the folder onto Netlify will NOT work for this version, because the back-end has to be built. Use one of these:

### Option A: GitHub (recommended)

1. Create a new repository on GitHub and upload all files from this folder (keep the folder structure).
2. In Netlify: Add new project > Import an existing project > pick the repository.
3. Leave the build command empty. The publish directory (`public`) is already set in `netlify.toml`.
4. Deploy.

### Option B: Netlify CLI

```
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```

## Run locally

You need [Node.js](https://nodejs.org) 18 or newer.

```
npm install
npm run dev
```

(`npm run dev` runs `netlify-cli dev` with edge functions switched off. This site has none, and on some Windows machines the Deno helper they need is blocked, which makes every page answer "500 Could not proxy request".)

Then open http://localhost:8888. This runs the page and the back-end together, so login and saving work just like on the live site. Results are kept in a local test store, not the live data. Sign in with `admin` / `admin` (or whatever `ADMIN_USER` / `ADMIN_PASSWORD` are set to in your shell). Stop it with Ctrl+C.

Quick look without the back-end: open `public/index.html` directly in a browser. The page then says "Results are saved in this browser only" and keeps everything in that browser.

## Admin login

The default is username `admin`, password `admin`.

To change it, go to Project configuration > Environment variables in Netlify, add `ADMIN_USER` and `ADMIN_PASSWORD`, then redeploy. The password is checked on the server and is not in the page code.

## Good to know

- Visitors' pages refresh results once a minute and whenever they return to the tab.
- If the back-end cannot be reached, the page says "Results are saved in this browser only" and nothing is shared.
- Admin > Data lets you copy all results as text for a backup, and load a backup.
