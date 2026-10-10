#!/usr/bin/env node
/*
  ঘর — one server for the home dashboard and its apps.

    /            ঘর   dashboard (clock, weather, apps, switches, calendar, alarms)
    /sur/        সুর   music, from the music folder
    /chobi/      ছবি   movies and shows, from the movies folder
    /api/status  small summary of both libraries, used by the dashboard tiles

  Run:  npm start      (or: node server.js)

  Settings (environment variables):
    PORT=8080  HOST=0.0.0.0
    MUSIC_DIR=./music     SCAN_INTERVAL=30          (সুর)
    MOVIES_DIR=./movies   HWACCEL=auto  MAX_HEIGHT=1080  MAX_TRANSCODES=3  DIRECT_HEVC=1   (ছবি)
*/
import http from "node:http";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createSur, serveFile, STATIC } from "./lib/sur.js";
import { createChobi } from "./lib/chobi.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const PUB = path.join(ROOT, "public");
const CACHE = path.join(ROOT, ".cache");

const sur = createSur({
  musicDir: process.env.MUSIC_DIR || path.join(ROOT, "music"),
  cacheDir: path.join(CACHE, "sur"),
  publicDir: path.join(PUB, "sur"),
  scanSeconds: +process.env.SCAN_INTERVAL || 30
});
const chobi = createChobi({
  moviesDir: process.env.MOVIES_DIR || path.join(ROOT, "movies"),
  cacheDir: path.join(CACHE, "chobi"),
  publicDir: path.join(PUB, "chobi"),
  dataFile: path.join(ROOT, "data", "chobi.json")
});

const APPS = { sur, chobi };
const GHOR = path.join(PUB, "ghor");

function json(res, obj) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const m = /^\/(sur|chobi)(\/.*)?$/.exec(u.pathname);

  if (m) {
    // "/sur" → "/sur/" so the app's relative links (api/…, style.css) resolve under its prefix
    if (!m[2]) { res.writeHead(301, { Location: `/${m[1]}/${u.search}` }); return res.end(); }
    req.url = m[2] + u.search;     // the app sees paths as if it were at the root
    return APPS[m[1]].handle(req, res);
  }

  if (u.pathname === "/api/status") return json(res, { sur: sur.status(), chobi: chobi.status() });

  // the dashboard
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
  let p; try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end("Bad request"); }
  const target = path.resolve(GHOR, "." + (p.endsWith("/") ? p + "index.html" : p));
  if (!target.startsWith(GHOR + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  serveFile(req, res, target, STATIC[path.extname(target).toLowerCase()] || "application/octet-stream", { "Cache-Control": "no-cache" });
});

function bye() { chobi.shutdown(); process.exit(0); }
process.on("SIGINT", bye); process.on("SIGTERM", bye);

server.on("error", e => {
  if (e.code === "EADDRINUSE") console.error(`\nPort ${PORT} is already in use. Start on another port, for example:\n  PORT=8081 npm start   (Windows PowerShell: $env:PORT=8081; npm start)\n`);
  else console.error(e);
  process.exit(1);
});

console.log("\nStarting ঘর…");
await Promise.all([sur.start(), chobi.start()]);

server.listen(PORT, HOST, () => {
  const s = sur.status(), c = chobi.status();
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address)
    .sort((a, b) => (/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(b) - /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a)));
  const local = HOST === "127.0.0.1" || HOST === "localhost";
  console.log(`
  ঘর is running

  Open       http://localhost:${PORT}
${local ? "             (network access is off: HOST is set to localhost)"
  : lan.map(a => `             http://${a}:${PORT}   (phones, TVs and other computers on your Wi-Fi)`).join("\n")}

  সুর  /sur/     ${s.tracks} song${s.tracks === 1 ? "" : "s"} in ${sur.dir}
  ছবি /chobi/   ${c.videos} video${c.videos === 1 ? "" : "s"} in ${chobi.dir}
  Converter  ${chobi.ffmpeg ? "ffmpeg · " + chobi.encoder : "ffmpeg not found. MP4 and WebM will play; MKV, HEVC and AC3/DTS files may not."}

  Add or remove files in either folder; the apps pick up changes on their own.
  Press Ctrl+C to stop.
`);
});
