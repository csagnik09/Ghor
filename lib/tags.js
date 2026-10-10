/*
  Dependency-free tag + duration reader (mp3/ID3, flac, m4a/mp4, wav).
  Ported from the original browser version of the player, extended with durations.
  readTags(absPath) -> { title?, artist?, album?, trk?, dur?, art?: Buffer }
*/
import fsp from "node:fs/promises";
import path from "node:path";

const dec = (u, l = "utf-8") => new TextDecoder(l).decode(u).replace(/\0+$/, "");
const syncsafe = (b, p) => ((b[p] & 127) << 21) | ((b[p + 1] & 127) << 14) | ((b[p + 2] & 127) << 7) | (b[p + 3] & 127);
const sniffOk = u => u && u.length > 4 && (u[0] === 0x89 || u[0] === 0x47 || u[0] === 0xff || u[0] === 0x52);

async function slice(fh, pos, len) {
  const buf = Buffer.alloc(len);
  const { bytesRead } = await fh.read(buf, 0, len, pos);
  return new Uint8Array(buf.buffer, buf.byteOffset, bytesRead);
}

/* ---------- MP3 ---------- */
const BR = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],   // MPEG1 L1
  2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],      // MPEG1 L2
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],       // MPEG1 L3
  4: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],      // MPEG2 L1
  5: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],           // MPEG2 L2/L3
};
const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

async function mp3Duration(fh, size, start) {
  const head = await slice(fh, start, 8192);
  for (let i = 0; i + 4 < head.length; i++) {
    if (head[i] !== 0xff || (head[i + 1] & 0xe0) !== 0xe0) continue;
    const ver = (head[i + 1] >> 3) & 3, layer = (head[i + 1] >> 1) & 3, bi = head[i + 2] >> 4, si = (head[i + 2] >> 2) & 3;
    if (ver === 1 || layer === 0 || bi === 0 || bi === 15 || si === 3) continue;
    const L = 4 - layer, v1 = ver === 3;
    const kbps = BR[v1 ? L : (L === 1 ? 4 : 5)][bi], sr = SR[ver][si];
    const spf = L === 1 ? 384 : (L === 3 && !v1 ? 576 : 1152);
    const mono = (head[i + 3] >> 6) === 3;
    const xo = i + 4 + (v1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    const tag = dec(head.slice(xo, xo + 4), "latin1");
    if ((tag === "Xing" || tag === "Info") && xo + 12 <= head.length && (head[xo + 7] & 1)) {
      const frames = (head[xo + 8] << 24 | head[xo + 9] << 16 | head[xo + 10] << 8 | head[xo + 11]) >>> 0;
      return frames * spf / sr;
    }
    return (size - start - i) * 8 / (kbps * 1000);   // constant-bitrate estimate
  }
  return null;
}

async function id3(fh, size) {
  const r = {};
  const h = await slice(fh, 0, 10);
  let audioStart = 0;
  if (dec(h.slice(0, 3), "latin1") === "ID3") {
    const ver = h[3], tsize = syncsafe(h, 6);
    audioStart = 10 + tsize;
    const b = await slice(fh, 10, tsize), dv = new DataView(b.buffer, b.byteOffset, b.length);
    let p = 0; if (h[5] & 64) p = ver === 4 ? syncsafe(b, 0) : dv.getUint32(0) + 4;
    const txt = d => dec(d.slice(1), ["latin1", "utf-16", "utf-16be", "utf-8"][d[0]] || "utf-8");
    const M = { TT2: "TIT2", TP1: "TPE1", TAL: "TALB", TRK: "TRCK", PIC: "APIC", TP2: "TPE2" };
    while (p + (ver === 2 ? 6 : 10) <= b.length) {
      let id, fs, d;
      if (ver === 2) { id = M[dec(b.slice(p, p + 3), "latin1")] || ""; fs = (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5]; d = b.slice(p + 6, p + 6 + fs); p += 6 + fs; if (!fs) break; }
      else {
        id = dec(b.slice(p, p + 4), "latin1"); if (!/^[A-Z0-9]{4}$/.test(id)) break;
        fs = ver === 4 ? syncsafe(b, p + 4) : dv.getUint32(p + 4); d = b.slice(p + 10, p + 10 + fs); p += 10 + fs;
      }
      if (id === "TIT2") r.title = txt(d);
      else if (id === "TPE1") r.artist = txt(d);
      else if (id === "TPE2") r.albumArtist = txt(d);
      else if (id === "TALB") r.album = txt(d);
      else if (id === "TRCK") r.trk = parseInt(txt(d)) || null;
      else if (id === "APIC" && !r.art) {
        const enc = d[0]; let i = 1;
        if (ver === 2) i = 5; else { while (i < d.length && d[i]) i++; i += 2; }
        let j = i;
        if (enc === 1 || enc === 2) { while (j + 1 < d.length && (d[j] || d[j + 1])) j += 2; j += 2; } else { while (j < d.length && d[j]) j++; j++; }
        const img = d.slice(j); if (sniffOk(img)) r.art = Buffer.from(img);
      }
    }
  }
  try { r.dur = await mp3Duration(fh, size, audioStart); } catch { /* ignore */ }
  return r;
}

/* ---------- FLAC ---------- */
async function flac(fh, size) {
  const r = {}, b = await slice(fh, 0, Math.min(size, 10 * 1024 * 1024));
  if (dec(b.slice(0, 4), "latin1") !== "fLaC") return r;
  let p = 4;
  while (p + 4 <= b.length) {
    const last = b[p] & 128, t = b[p] & 127, len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]; p += 4;
    if (p + len > b.length) break;
    const d = b.slice(p, p + len), v = new DataView(d.buffer, d.byteOffset, d.length);
    if (t === 0 && len >= 18) {   // STREAMINFO -> duration
      const sr = (d[10] << 12) | (d[11] << 4) | (d[12] >> 4);
      const total = (d[13] & 15) * 2 ** 32 + v.getUint32(14);
      if (sr && total) r.dur = total / sr;
    } else if (t === 4) {
      let q = 4 + v.getUint32(0, true); const n = v.getUint32(q, true); q += 4;
      for (let k = 0; k < n && q < d.length; k++) {
        const l = v.getUint32(q, true); q += 4; const s = dec(d.slice(q, q + l)); q += l;
        const e = s.indexOf("="); if (e < 0) continue;
        const key = s.slice(0, e).toUpperCase(), val = s.slice(e + 1);
        if (key === "TITLE") r.title = val; else if (key === "ARTIST") r.artist = val; else if (key === "ALBUM") r.album = val;
        else if (key === "ALBUMARTIST") r.albumArtist = val; else if (key === "TRACKNUMBER") r.trk = parseInt(val) || null;
      }
    } else if (t === 6 && !r.art) {
      let q = 4; q += 4 + v.getUint32(q); q += 4 + v.getUint32(q); q += 16; const pl = v.getUint32(q); q += 4;
      const img = d.slice(q, q + pl); if (sniffOk(img)) r.art = Buffer.from(img);
    }
    p += len; if (last) break;
  }
  return r;
}

/* ---------- MP4 / M4A ---------- */
async function mp4(fh, size) {
  const r = {};
  // find top-level boxes so we can read `moov` wherever it sits (start or end of the file)
  let pos = 0, moov = null;
  while (pos + 8 <= size) {
    const hd = await slice(fh, pos, 16), dv = new DataView(hd.buffer, hd.byteOffset, hd.length);
    let sz = dv.getUint32(0); const type = dec(hd.slice(4, 8), "latin1");
    if (sz === 1) sz = Number(dv.getBigUint64(8)); else if (sz === 0) sz = size - pos;
    if (sz < 8) break;
    if (type === "moov") { moov = { pos, sz }; break; }
    pos += sz;
  }
  if (!moov || moov.sz > 64 * 1024 * 1024) return r;
  const buf = await slice(fh, moov.pos, moov.sz), b = buf, dv = new DataView(b.buffer, b.byteOffset, b.length);
  const walk = (s, e) => {
    let p = s;
    while (p + 8 <= e) {
      let sz = dv.getUint32(p); const t = dec(b.slice(p + 4, p + 8), "latin1");
      if (sz === 1) sz = Number(dv.getBigUint64(p + 8)); if (sz < 8) break;
      const end = Math.min(p + sz, e);
      if (t === "moov" || t === "udta" || t === "ilst") walk(p + 8, end);
      else if (t === "meta") walk(p + 12, end);
      else if (t === "mvhd") {
        const ver = b[p + 8];
        if (ver === 1) { const ts = dv.getUint32(p + 28), du = Number(dv.getBigUint64(p + 32)); if (ts) r.dur = du / ts; }
        else { const ts = dv.getUint32(p + 20), du = dv.getUint32(p + 24); if (ts) r.dur = du / ts; }
      } else if (["\xa9nam", "\xa9ART", "aART", "\xa9alb", "covr", "trkn"].includes(t)) {
        const d = b.slice(p + 8 + 16, end);
        if (t === "covr") { if (sniffOk(d) && !r.art) r.art = Buffer.from(d); }
        else if (t === "trkn") r.trk = ((d[2] << 8) | d[3]) || null;
        else { const s = dec(d); if (t === "\xa9nam") r.title = s; else if (t === "\xa9ART") r.artist = s; else if (t === "aART") r.albumArtist = s; else r.album = s; }
      }
      p += sz;
    }
  };
  walk(0, b.length);
  return r;
}

/* ---------- WAV ---------- */
async function wav(fh, size) {
  const h = await slice(fh, 0, 64), dv = new DataView(h.buffer, h.byteOffset, h.length);
  if (dec(h.slice(0, 4), "latin1") !== "RIFF" || dec(h.slice(8, 12), "latin1") !== "WAVE") return {};
  let p = 12;
  while (p + 8 <= h.length) {
    const id = dec(h.slice(p, p + 4), "latin1"), sz = dv.getUint32(p + 4, true);
    if (id === "fmt ") { const byteRate = dv.getUint32(p + 16, true); return byteRate ? { dur: (size - 44) / byteRate } : {}; }
    p += 8 + sz;
  }
  return {};
}

export async function readTags(abs) {
  const x = path.extname(abs).toLowerCase();
  const fh = await fsp.open(abs, "r");
  try {
    const size = (await fh.stat()).size;
    if (x === ".mp3") return await id3(fh, size);
    if (x === ".flac") return await flac(fh, size);
    if ([".m4a", ".mp4", ".aac"].includes(x)) return await mp4(fh, size);
    if (x === ".wav") return await wav(fh, size);
    return {};
  } finally { await fh.close(); }
}
