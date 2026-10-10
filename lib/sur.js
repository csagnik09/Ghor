/*
  সুর (music) — mounted by server.js under /sur/
  - Scans the music folder (recursively) for audio files and reads their tags + cover art.
  - GET api/library   -> JSON list of every track (ids are stable, no file paths leak)
  - GET media/:id     -> audio stream with HTTP Range support (seeking works)
  - GET api/art/:id   -> cover image
  - Everything else is served from public/sur
  Listeners can only listen. There is no upload endpoint; to add music, put files in the music folder.
*/
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { readTags } from "./tags.js";

const AUDIO = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".aac": "audio/aac",
  ".flac": "audio/flac", ".wav": "audio/wav", ".ogg": "audio/ogg", ".oga": "audio/ogg",
  ".opus": "audio/ogg", ".weba": "audio/webm", ".webm": "audio/webm" };
const IMAGE = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
const STATIC = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ...IMAGE };

const sha = (s, n = 12) => crypto.createHash("sha1").update(s).digest("hex").slice(0, n);
const sniffExt = b => (b[0] === 0x89 ? ".png" : b[0] === 0x47 ? ".gif" : b[0] === 0x52 ? ".webp" : ".jpg");

/* filename fallback, e.g. "03 - Artist - Title.mp3" */
function fromName(name) {
  let n = name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim(), a = "Unknown artist", trk = null;
  const m = n.match(/^(.+?)\s+-\s+(.+)$/);
  if (m) { a = m[1]; n = m[2]; }
  if (/^\d{1,3}$/.test(a)) { trk = +a; a = "Unknown artist"; }
  else { const k = n.match(/^(\d{1,3})[.\s)-]+(.+)$/); if (k) { trk = +k[1]; n = k[2]; } }
  return { title: n, artist: a, trk };
}

const send = (res, code, body, headers = {}) => { res.writeHead(code, { "X-Content-Type-Options": "nosniff", ...headers }); res.end(body); };

export function serveFile(req, res, abs, type, extra = {}) {
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found");
    const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const base = { "Content-Type": type, "Accept-Ranges": "bytes", ETag: etag, "Last-Modified": st.mtime.toUTCString(), ...extra };
    if (req.headers["if-none-match"] === etag) return send(res, 304, "", base);
    const range = req.headers.range;
    let start = 0, end = st.size - 1, code = 200;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m || (m[1] === "" && m[2] === "")) return send(res, 416, "", { "Content-Range": `bytes */${st.size}` });
      if (m[1] === "") { start = Math.max(0, st.size - +m[2]); }
      else { start = +m[1]; if (m[2] !== "") end = Math.min(end, +m[2]); }
      if (start > end || start >= st.size) return send(res, 416, "", { "Content-Range": `bytes */${st.size}` });
      code = 206; base["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
    }
    base["Content-Length"] = end - start + 1;
    res.writeHead(code, { "X-Content-Type-Options": "nosniff", ...base });
    if (req.method === "HEAD") return res.end();
    const rs = fs.createReadStream(abs, { start, end });
    rs.on("error", () => res.destroy());
    res.on("close", () => rs.destroy());
    rs.pipe(res);
  });
}
export { STATIC };

export function createSur({ musicDir, cacheDir, publicDir, scanSeconds = 30 }) {
  const MUSIC_DIR = path.resolve(musicDir);
  const ART_DIR = path.join(cacheDir, "art");
  const INDEX_FILE = path.join(cacheDir, "index.json");
  const rel = abs => path.relative(MUSIC_DIR, abs).split(path.sep).join("/");

  let files = new Map();          // id -> absolute path
  let library = { version: "0", count: 0, tracks: [] };
  let libraryJson = Buffer.from(JSON.stringify(library));
  let libraryGz = zlib.gzipSync(libraryJson);
  let cache = { files: {}, folderArt: {} }; // persisted between runs so restarts are instant
  let scanning = false, ready = false;

  async function loadCache() {
    try { cache = JSON.parse(await fsp.readFile(INDEX_FILE, "utf8")); cache.files ||= {}; cache.folderArt ||= {}; } catch { /* first run */ }
    await fsp.mkdir(ART_DIR, { recursive: true });
  }
  const saveCache = () => fsp.writeFile(INDEX_FILE, JSON.stringify(cache)).catch(() => {});

  /* store a cover image in the cache; returns "<id>.<ext>" */
  async function storeArt(buf, seed) {
    const ext = sniffExt(buf), id = sha(seed || buf, 16) + ext, dest = path.join(ART_DIR, id);
    try { await fsp.access(dest); } catch { await fsp.writeFile(dest, buf); }
    return id;
  }

  async function readMeta(abs) {
    const fb = fromName(path.basename(abs));
    const meta = { title: fb.title, artist: fb.artist, album: null, trk: fb.trk, dur: null, art: null };
    try {
      const m = await readTags(abs);
      if (m.title) meta.title = m.title;
      if (m.artist || m.albumArtist) meta.artist = m.artist || m.albumArtist;
      if (m.album) meta.album = m.album;
      if (m.trk) meta.trk = m.trk;
      if (m.dur && isFinite(m.dur)) meta.dur = Math.round(m.dur * 10) / 10;
      if (m.art) meta.art = await storeArt(m.art, `${m.art.length}:${m.art.subarray(0, 64).toString("hex")}`);
    } catch (e) { console.warn("  সুর: could not read tags:", rel(abs), "-", e.message); }
    return meta;
  }

  async function walk(dir, out, imgs) {
    let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith(".")) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) await walk(abs, out, imgs);
      else if (e.isFile()) {
        const x = path.extname(e.name).toLowerCase();
        if (AUDIO[x]) out.push(abs);
        else if (IMAGE[x]) (imgs.get(dir) || imgs.set(dir, []).get(dir)).push(abs);
      }
    }
  }
  const pickCover = list => (list.find(f => /cover|folder|front|album|art/i.test(path.basename(f))) || list[0]);

  async function scan() {
    if (scanning) return; scanning = true;
    const t0 = Date.now();
    try {
      const audio = [], imgs = new Map();
      await walk(MUSIC_DIR, audio, imgs);

      const seen = new Set(), todo = [];
      for (const abs of audio) {
        const k = rel(abs); seen.add(k);
        const st = await fsp.stat(abs).catch(() => null); if (!st) continue;
        const c = cache.files[k];
        if (!c || c.size !== st.size || c.mtime !== Math.floor(st.mtimeMs)) todo.push({ abs, k, st });
      }
      let changed = todo.length;
      for (const k of Object.keys(cache.files)) if (!seen.has(k)) { delete cache.files[k]; changed++; }

      // read tags 4 at a time
      for (let i = 0; i < todo.length; i += 4) {
        await Promise.all(todo.slice(i, i + 4).map(async ({ abs, k, st }) => {
          cache.files[k] = { size: st.size, mtime: Math.floor(st.mtimeMs), meta: await readMeta(abs) };
        }));
        if (todo.length > 20) console.log(`  সুর: indexed ${Math.min(i + 4, todo.length)}/${todo.length}`);
      }

      // folder artwork for tracks that have no embedded cover
      const dirArt = new Map();
      for (const [dir, list] of imgs) {
        const img = pickCover(list), st = await fsp.stat(img).catch(() => null); if (!st) continue;
        const key = `${rel(img)}|${st.size}|${Math.floor(st.mtimeMs)}`, hit = cache.folderArt[key];
        if (hit && fs.existsSync(path.join(ART_DIR, hit))) { dirArt.set(dir, hit); continue; }
        try { const id = await storeArt(await fsp.readFile(img), key); cache.folderArt[key] = id; dirArt.set(dir, id); changed++; } catch { /* unreadable image */ }
      }

      const tracks = [], map = new Map();
      for (const abs of audio) {
        const k = rel(abs), c = cache.files[k]; if (!c) continue;
        const id = sha(k), dir = path.dirname(abs), m = c.meta;
        const album = m.album || (dir === MUSIC_DIR ? "Singles" : path.basename(dir));
        const art = m.art || dirArt.get(dir) || null;
        map.set(id, abs);
        // relative URL: the page lives at /sur/, so this resolves to /sur/api/art/…
        tracks.push({ id, title: m.title, artist: m.artist, album, trk: m.trk, dur: m.dur, art: art ? "api/art/" + art : null });
      }
      const version = sha(tracks.map(t => t.id + (t.art || "") + t.title + t.album + t.artist).sort().join("|"), 16);
      if (version !== library.version) {
        files = map; library = { version, count: tracks.length, tracks };
        libraryJson = Buffer.from(JSON.stringify(library)); libraryGz = zlib.gzipSync(libraryJson);
      }
      if (changed) await saveCache();
      if (changed || !ready) console.log(`  সুর: ${tracks.length} tracks (${changed ? changed + " changed, " : ""}${Date.now() - t0} ms)`);
    } catch (e) { console.error("সুর scan failed:", e); }
    finally { scanning = false; ready = true; }
  }

  /* req.url has already had the /sur prefix removed */
  function handle(req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "Bad request"); }

    if (p === "/api/library") {
      const etag = `"${library.version}"`;
      const h = { "Content-Type": "application/json; charset=utf-8", ETag: etag, "Cache-Control": "no-cache" };
      if (req.headers["if-none-match"] === etag) return send(res, 304, "", h);
      const gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
      if (gz) h["Content-Encoding"] = "gzip";
      h.Vary = "Accept-Encoding";
      return send(res, 200, req.method === "HEAD" ? "" : gz ? libraryGz : libraryJson, h);
    }
    let m;
    if ((m = /^\/media\/([a-f0-9]{12})$/.exec(p))) {
      const abs = files.get(m[1]); if (!abs) return send(res, 404, "Not found");
      return serveFile(req, res, abs, AUDIO[path.extname(abs).toLowerCase()] || "application/octet-stream", { "Cache-Control": "private, max-age=3600" });
    }
    if ((m = /^\/api\/art\/([a-f0-9]{16}\.(?:jpg|png|webp|gif))$/.exec(p)))
      return serveFile(req, res, path.join(ART_DIR, m[1]), IMAGE["." + m[1].split(".")[1]] || "image/jpeg", { "Cache-Control": "public, max-age=31536000, immutable" });
    if (p.startsWith("/api/") || p.startsWith("/media/")) return send(res, 404, "Not found");

    // static front end
    const target = path.resolve(publicDir, "." + (p.endsWith("/") ? p + "index.html" : p));
    if (target !== publicDir && !target.startsWith(publicDir + path.sep)) return send(res, 403, "Forbidden");
    serveFile(req, res, target, STATIC[path.extname(target).toLowerCase()] || "application/octet-stream", { "Cache-Control": "no-cache" });
  }

  async function start() {
    await fsp.mkdir(MUSIC_DIR, { recursive: true });
    await loadCache();
    await scan();
    setInterval(scan, scanSeconds * 1000).unref();
  }

  const status = () => ({ ready, scanning, tracks: library.count || 0,
    albums: new Set(library.tracks.map(t => t.album.toLowerCase())).size, dir: MUSIC_DIR });

  return { start, handle, status, dir: MUSIC_DIR, scanSeconds };
}
