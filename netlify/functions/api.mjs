// Tournament back-end: one function, two routes.
//   GET  /api/state  -> everyone can read the results
//   POST /api/state  -> admin only, saves changes
//   POST /api/login  -> checks username and password, returns a token
//
// The admin login comes from the ADMIN_USER and ADMIN_PASSWORD environment
// variables in Netlify. If they are not set, it falls back to admin / admin.

import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanState, applyOps } from "../../server/state.mjs";

const env = (name) => globalThis.Netlify?.env?.get(name) ?? process.env[name];
const adminUser = () => env("ADMIN_USER") || "admin";
const adminPass = () => env("ADMIN_PASSWORD") || "admin";
const adminToken = () => createHmac("sha256", adminPass()).update("tt-admin:" + adminUser()).digest("hex");

const same = (a, b) => {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function readBody(req) {
  const text = await req.text();
  if (text.length > 200_000) throw new Error("Too large");
  return JSON.parse(text);
}

export default async (req) => {
  const { pathname } = new URL(req.url);

  try {
    if (pathname === "/api/login") {
      if (req.method !== "POST") return json({ error: "Use POST" }, 405);
      const body = await readBody(req);
      const ok = same(body.username, adminUser()) & same(body.password, adminPass());
      return ok ? json({ token: adminToken() }) : json({ error: "Wrong username or password" }, 401);
    }

    if (pathname === "/api/state") {
      const store = getStore({ name: "tournament", consistency: "strong" });

      if (req.method === "GET") {
        return json({ state: cleanState(await store.get("state", { type: "json" })) });
      }

      if (req.method === "POST") {
        const auth = req.headers.get("authorization") || "";
        if (!same(auth.replace(/^Bearer\s+/i, ""), adminToken())) return json({ error: "Sign in again" }, 401);

        const body = await readBody(req);
        let next;
        if (body.replace) next = cleanState(body.replace);
        else next = applyOps(await store.get("state", { type: "json" }), body.ops);

        await store.setJSON("state", next);
        return json({ state: next });
      }

      return json({ error: "Use GET or POST" }, 405);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    const bad = err instanceof SyntaxError || /^(Bad|Too large)/.test(err?.message || "");
    if (!bad) console.error(err);
    return json({ error: bad ? "Invalid request" : "Server error" }, bad ? 400 : 500);
  }
};

export const config = { path: ["/api/state", "/api/login"] };
