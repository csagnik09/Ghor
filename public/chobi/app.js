/* ছবি — streaming client. The library, thumbnails, progress and My List come from the ছবি server. */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

/* ---------- icons ---------- */
const I = {
  play:"M8 5.1v13.8a1 1 0 0 0 1.5.9l10.6-6.9a1 1 0 0 0 0-1.7L9.5 4.2A1 1 0 0 0 8 5.1z",
  pause:"M7 4h3.6v16H7zM13.4 4H17v16h-3.6z",
  next:"M5.5 5.6v12.8a.8.8 0 0 0 1.2.7L15.5 12.7a.8.8 0 0 0 0-1.4L6.7 4.9a.8.8 0 0 0-1.2.7zM16.5 5H19v14h-2.5z",
  b10:"M12 4.5V1.8L7.3 5.6 12 9.4V6.5a6.5 6.5 0 1 1-6.5 6.5h-2A8.5 8.5 0 1 0 12 4.5z",
  f10:"M12 4.5V1.8l4.7 3.8L12 9.4V6.5a6.5 6.5 0 1 0 6.5 6.5h2A8.5 8.5 0 1 1 12 4.5z",
  vol:"M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z",
  mute:"M4 9v6h4l5 4V5L8 9zM19.6 12l2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4z",
  cc:"M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2.5 4A2.5 2.5 0 0 0 5 11.5v1A2.5 2.5 0 0 0 7.5 15H10v-1.5H7.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1H10V9zm7 0A2.5 2.5 0 0 0 12 11.5v1a2.5 2.5 0 0 0 2.5 2.5H17v-1.5h-2.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1H17V9z",
  pip:"M3 5h18v14H3zm2 2v10h14V7zm6 5h7v4h-7z",
  full:"M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z",
  exit:"M8 4h2v6H4V8h4zm6 0h2v4h4v2h-6zM4 14h6v6H8v-4H4zm10 0h6v2h-4v4h-2z",
  folder:"M3 6a2 2 0 0 1 2-2h4.6l2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  home:"M12 3 3 10.2V21h6.5v-6h5v6H21V10.2z",
  tv:"M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v10h14V6zM8 20h8v2H8z",
  film:"M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v2h2V6zm12 0v2h2V6zM5 10v2h2v-2zm12 0v2h2v-2zM5 14v2h2v-2zm12 0v2h2v-2zM9 6v12h6V6z",
  plus:"M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z",
  check:"M9.5 16.2 4.8 11.5l-1.4 1.4 6.1 6.1L21 7.5l-1.4-1.4z",
  bookmark:"M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z",
  info:"M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 8v7h2v-7zm0-3v2h2V7z",
  chevL:"M15.4 4.6 8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2z",
  chevR:"M8.6 4.6 16 12l-7.4 7.4 1.4 1.4 8.8-8.8L10 3.2z",
  list:"M3 5h4v4H3zm6 1h12v2H9zM3 10h4v4H3zm6 1h12v2H9zM3 15h4v4H3zm6 1h12v2H9z",
  restart:"M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z",
  close:"M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z",
  search:"M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  server:"M4 4h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 9h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm2-6.5v2h2v-2zm0 9v2h2v-2z",
  gear:"M19.4 13a7.8 7.8 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.4 7.4 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6c-.6.3-1.2.6-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.8 7.8 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
};
const ic = (n, cls = '') => {
  const t = (n === 'b10' || n === 'f10') ? '<text x="12" y="16.4" font-size="6.6" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">10</text>' : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}><path d="${I[n]}"/>${t}</svg>`;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ---------- server ---------- */
const API = {
  async get(u) { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.json(); },
  post(u, b) { return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}), keepalive: true }).catch(() => {}); }
};
const LS = {
  get(k, d) { try { const v = localStorage.getItem('chobi.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('chobi.' + k, JSON.stringify(v)); } catch (e) {} }
};
const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const S = {
  videos: [], byId: new Map(), folders: new Map(), series: new Map(),
  view: { name: 'home' }, stack: [], tab: 'home', q: '', sort: LS.get('sort', 'added'),
  fav: new Set(), pos: {},
  autoplay: LS.get('autoplay', true), cc: LS.get('cc', true), rate: 1,
  cur: null, queue: []
};
let SV = { name: 'movies', dir: '', ffmpeg: false, encoder: null, scanning: true, pending: 0, version: -1 };
let online = null;

/* ---------- formatting ---------- */
function fmt(s) { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); const h = s / 3600 | 0, m = (s % 3600) / 60 | 0, x = s % 60; return h ? `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}` : `${m}:${String(x).padStart(2,'0')}`; }
function hm(s) { s = Math.round((s || 0) / 60); const h = Math.floor(s / 60), m = s % 60; return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${Math.max(1, m)} min`; }
function size(b) { const u = ['B','KB','MB','GB','TB']; let i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return (i > 2 ? b.toFixed(1) : Math.round(b)) + ' ' + u[i]; }
const qual = h => !h ? '' : h >= 2000 ? '4K' : h >= 1000 ? 'HD' : h >= 700 ? '720p' : 'SD';
const leaf = d => (d || '').split('/').pop();
const parentOf = d => d && d.includes('/') ? d.slice(0, d.lastIndexOf('/')) : '';
const epc = v => `S${v.se} E${v.ep}`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const MODE = { direct: 'Plays as it is', remux: 'Repackaged while you watch, no quality loss', audio: 'Sound converted to AAC while you watch', video: 'Converted to H.264 while you watch' };
const CODEC = { h264: 'H.264', hevc: 'HEVC (H.265)', av1: 'AV1', vp9: 'VP9', vp8: 'VP8', mpeg4: 'MPEG-4', mpeg2video: 'MPEG-2', aac: 'AAC', ac3: 'Dolby Digital (AC3)', eac3: 'Dolby Digital Plus', dts: 'DTS', truehd: 'Dolby TrueHD', mp3: 'MP3', opus: 'Opus', flac: 'FLAC', vorbis: 'Vorbis' };

/* ---------- name parsing: movie or episode ---------- */
const TAG = /(?:^|[\s(\[])(?:(?:19|20)\d{2}|2160p|1080p|720p|480p|4k|uhd|hdr10?|x26[45]|h ?26[45]|hevc|av1|web[- ]?(?:dl|rip)|bluray|blu-ray|brrip|bdrip|hdrip|dvdrip|hdtv|amzn|nf|proper|repack|extended|10bit|aac|ac3|dts|ddp?\s?5\s?1|yify|yts|rarbg)(?=$|[\s)\]])/i;
function tidy(t) {
  t = (t || '').replace(/[._]+/g, ' ');
  const c = t.search(TAG); if (c > 1) t = t.slice(0, c);
  return t.replace(/\[[^\]]*\]/g, ' ').replace(/\(\s*\)/g, '').replace(/^[\s\-–:|]+|[\s\-–:|(]+$/g, '').replace(/\s+/g, ' ').trim();
}
function parse(name, dir) {
  const s = name.replace(/\.[^.]+$/, '');
  const year = (s.match(/(?:^|[\s.(\[_-])((?:19|20)\d{2})(?=$|[\s.)\]_-])/) || [])[1] || '';
  const qm = (s.match(/\b(2160p|1080p|720p|480p|4k)\b/i) || [])[1] || '';
  const q = /2160p|4k/i.test(qm) ? '4K' : qm === '1080p' ? 'HD' : qm;
  const folder = leaf(dir), sf = folder.match(/^(?:season|series|s)[\s._-]*(\d{1,2})$/i);
  let m = s.match(/^(.*?)[\s._-]*\bS(\d{1,2})[\s._-]*E(\d{1,3})(?:[\s._-]*E?\d{1,3})?\b(.*)$/i) || s.match(/^(.*?)[\s._-]*\b(\d{1,2})x(\d{2,3})\b(.*)$/);
  let show = '', se = 0, ep = 0, rest = '';
  if (m) { show = tidy(m[1]); se = +m[2]; ep = +m[3]; rest = m[4]; }
  else {
    const m2 = s.match(/^(.*?)[\s._-]*\b(?:ep|episode)[\s._-]?(\d{1,3})\b(.*)$/i) || (sf && s.match(/^()(\d{1,3})\b[\s._-]*(.*)$/));
    if (m2) { show = tidy(m2[1]); se = sf ? +sf[1] : 1; ep = +m2[2]; rest = m2[3]; }
  }
  if (ep) {
    if (!show) show = sf ? (leaf(parentOf(dir)) || folder) : folder;
    show = show.replace(/\s*-\s*$/, '') || 'Untitled show';
    return { kind: 'ep', show, se, ep, title: tidy(rest) || `Episode ${ep}`, year, q };
  }
  return { kind: 'movie', title: tidy(s) || s, year, q };
}
const skey = n => n.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '') || n;
function hashHue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 38% 36%)`; }

/* ---------- library from the server ---------- */
function ensureFolder(path) {
  if (S.folders.has(path)) return S.folders.get(path);
  const p = parentOf(path) || null;
  if (p) ensureFolder(p).kids.add(path);
  const f = { path, name: leaf(path), parent: p, kids: new Set(), vids: [] };
  S.folders.set(path, f); return f;
}
function deep(path) { const f = S.folders.get(path); if (!f) return []; let out = [...f.vids]; f.kids.forEach(k => out = out.concat(deep(k))); return out; }
function commonDir(dirs) { let c = dirs[0] || ''; for (const d of dirs) while (c && d !== c && !d.startsWith(c + '/')) c = parentOf(c); return c || dirs[0]; }
function rebuild() {
  S.folders = new Map();
  for (const v of S.videos) ensureFolder(v.dir).vids.push(v);
  S.folders.forEach(f => f.vids.sort((a, b) => coll.compare(a.name, b.name)));
  S.series = new Map();
  for (const v of S.videos) {
    if (v.kind !== 'ep') continue;
    const k = skey(v.show); v.sk = k;
    let s = S.series.get(k);
    if (!s) { s = { key: k, name: v.show, eps: [], added: 0 }; S.series.set(k, s); }
    s.eps.push(v); s.added = Math.max(s.added, v.added);
  }
  S.series.forEach(s => {
    s.eps.sort((a, b) => a.se - b.se || a.ep - b.ep || coll.compare(a.name, b.name));
    s.seasons = [...new Set(s.eps.map(e => e.se))];
    s.dir = commonDir(s.eps.map(e => e.dir));
  });
}
function apply(list) {
  const old = S.byId, nb = new Map(), patched = [];
  let structural = list.length !== old.size;
  for (const x of list) {
    let v = old.get(x.id);
    const name = x.rel.split('/').pop(), dir = parentOf(x.rel) || SV.name;
    if (!v || v.rel !== x.rel) { v = { id: x.id, key: x.id }; structural = true; }
    const hadTh = v.th;
    Object.assign(v, { rel: x.rel, name, dir, path: x.rel, size: x.size, added: x.mtime, dur: x.dur || v.dur || 0, w: x.w, h: x.h,
      vc: x.vc, ac: x.ac, ch: x.ch, mode: v.forced || x.mode, bad: x.bad, sub: x.sub || !!v.localVtt, subName: v.localName || x.subName,
      ext: ((name.match(/\.([^.]+)$/) || [])[1] || '').toUpperCase(), th: x.th, tv: x.tv }, parse(name, dir));
    if (!v.q && x.h) v.q = qual(x.h);
    v.hue = x.hue || v.hue || hashHue(x.rel);
    if (SV.ffmpeg) { v.thumb = x.th ? `api/video/${x.id}/thumb?v=${x.tv}` : null; v.big = `api/video/${x.id}/thumb?size=big&v=${x.tv}`; }
    if (x.th && !hadTh) patched.push(v);
    nb.set(x.id, v);
  }
  S.byId = nb; S.videos = [...nb.values()];
  if (structural) rebuild();
  return { structural, patched };
}
let pollT;
async function loadLibrary() {
  clearTimeout(pollT);
  let L;
  try { L = await API.get('api/library'); }
  catch (e) { if (online !== false) { online = false; libStatus(); if (!S.videos.length) render(); else toast("Lost connection to the ছবি server. Retrying…"); } pollT = setTimeout(loadLibrary, 5000); return; }
  const wasOffline = online === false; online = true;
  const first = SV.version === -1, changedV = L.version !== SV.version;
  SV = L;
  if (changedV || first) {
    const { structural, patched } = apply(L.videos);
    if (first || structural) { if (!S.cur || P.hidden) render(true); else sideFolders(); }
    else patched.forEach(patch);
    if (!SV.ffmpeg) S.videos.forEach(v => want(v));
  } else if (wasOffline) render(true);
  libStatus();
  pollT = setTimeout(loadLibrary, L.scanning || L.pending ? 2500 : 20000);
}
async function loadState() {
  try { const st = await API.get('api/state'); S.pos = st.pos || {}; S.fav = new Set(st.list || []); } catch (e) {}
}
function libStatus() {
  const el = $('#libst'); if (!el) return;
  if (online === false) { el.innerHTML = `<b>${ic('server')}<span>Server offline</span></b><span class="warn">Start it with <b>npm start</b>, then this page reconnects.</span>`; return; }
  const n = S.videos.length;
  el.innerHTML = `<b title="${esc(SV.dir)}">${ic('folder')}<span>${esc(SV.name)}</span></b><span>${plural(n, 'video')}${S.series.size ? ' · ' + plural(S.series.size, 'show') : ''}</span>
  ${SV.scanning ? '<span class="work"><i></i>Scanning the folder</span>' : SV.pending ? `<span class="work"><i></i>Preparing ${plural(SV.pending, 'video')}</span>` : ''}
  ${!SV.ffmpeg ? '<span class="warn">ffmpeg not found: some files may not play</span>' : ''}`;
}

/* ---------- progress & My List (saved on the server) ---------- */
const pos = v => S.pos[v.key] || {};
const prog = v => { const p = pos(v), d = p.d || v.dur; return d ? Math.min(1, (p.t || 0) / d) : 0; };
const leftOf = v => { const p = pos(v), d = p.d || v.dur; return d ? hm(d - (p.t || 0)) + ' left' : ''; };
const inProg = v => { const p = prog(v); return p > .01 && p < .95; };
const done = v => prog(v) >= .95;
function nextOf(v) { const q = v.kind === 'ep' ? S.series.get(v.sk).eps : S.folders.get(v.dir).vids; const i = q.indexOf(v); return i >= 0 && i < q.length - 1 ? q[i + 1] : null; }
function movieAction(v) { return inProg(v) ? { v, label: 'Resume', res: true } : done(v) ? { v, label: 'Watch again' } : { v, label: 'Play' }; }
function seriesAction(s) {
  let last = null; for (const e of s.eps) if (pos(e).at && (!last || pos(e).at > pos(last).at)) last = e;
  if (!last) return { v: s.eps[0], label: `Play ${epc(s.eps[0])}` };
  if (!done(last)) return { v: last, label: `Resume ${epc(last)}`, res: inProg(last) };
  const i = s.eps.indexOf(last);
  if (i < s.eps.length - 1) return { v: s.eps[i + 1], label: `Play ${epc(s.eps[i + 1])}`, next: true };
  return { v: s.eps[0], label: 'Watch again from E1' };
}
function continueList() {
  const out = [], seen = new Set();
  const list = S.videos.filter(v => pos(v).at).sort((a, b) => pos(b).at - pos(a).at);
  for (const v of list) {
    if (v.kind === 'ep') {
      if (seen.has(v.sk)) continue; seen.add(v.sk);
      if (inProg(v)) out.push({ v, why: 'resume' });
      else if (done(v)) { const n = nextOf(v); if (n && !done(n)) out.push({ v: n, why: 'next' }); }
    } else if (inProg(v)) out.push({ v, why: 'resume' });
  }
  return out.slice(0, 20);
}
let lastSave = 0;
function savePos(force) {
  const v = S.cur, d = total(); if (!v || !d || T.seekT != null) return;
  const n = Date.now(); if (!force && n - lastSave < 5000) return; lastSave = n;
  const t = V.ended ? d : now();
  if (t < 3 && !V.ended && !(S.pos[v.key] && S.pos[v.key].t)) return;
  S.pos[v.key] = { t, d, at: n };
  API.post('api/pos', { id: v.id, t, d });
}

/* ---------- items ---------- */
function itemsOf(vids) {
  const out = [], seen = new Set();
  for (const v of vids) {
    if (v.kind === 'ep') { if (!seen.has(v.sk)) { seen.add(v.sk); out.push({ type: 'series', s: S.series.get(v.sk) }); } }
    else out.push({ type: 'movie', v });
  }
  return out;
}
const recentItems = () => itemsOf([...S.videos].sort((a, b) => b.added - a.added));
const favKey = it => it.type === 'series' ? 's:' + it.s.key : 'm:' + it.v.key;
function sortVids(list) {
  const a = [...list], s = S.sort;
  if (s === 'name') a.sort((x, y) => coll.compare(x.title, y.title));
  else if (s === 'year') a.sort((x, y) => (y.year || 0) - (x.year || 0) || coll.compare(x.title, y.title));
  else if (s === 'dur') a.sort((x, y) => (y.dur || 0) - (x.dur || 0));
  else a.sort((x, y) => y.added - x.added);
  return a;
}

/* ---------- thumbnails: made by the server; in the browser only when the server has no ffmpeg ---------- */
const JQ = []; let busy = false;
const tv = document.createElement('video'); tv.muted = true; tv.preload = 'auto'; tv.playsInline = true;
const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
function want(v, big) {
  if (SV.ffmpeg) return;
  if (big) { if (v.big || v.bigQ || v.bad) return; v.bigQ = 1; JQ.unshift({ v, big: 1 }); }
  else { if (v.thumb || v.thQ) return; v.thQ = 1; JQ.push({ v }); }
  pump();
}
async function pump() {
  if (busy) return; busy = true;
  while (JQ.length) { const j = JQ.shift(); if (!S.byId.has(j.v.id)) continue; await grab(j.v, j.big); patch(j.v, j.big); }
  busy = false;
}
function grab(v, big) {
  return new Promise(res => {
    const W = big ? 1280 : 480, H = big ? 720 : 270;
    let tries = 0, fin_ = false;
    const fin = () => { if (fin_) return; fin_ = true; clearTimeout(to); tv.onloadedmetadata = tv.onseeked = tv.onerror = null; tv.removeAttribute('src'); try { tv.load(); } catch (e) {} res(); };
    const to = setTimeout(fin, 12000);
    tv.onerror = fin;
    tv.onloadedmetadata = () => {
      if (isFinite(tv.duration) && !v.dur) v.dur = tv.duration;
      if (!tv.videoWidth) { fin(); return; }
      tv.currentTime = big && v.thumbAt ? v.thumbAt : (Math.min(Math.max(v.dur * .14, 1), 300) || 0);
    };
    tv.onseeked = () => {
      try {
        cv.width = W; cv.height = H;
        const vw = tv.videoWidth, vh = tv.videoHeight, r = Math.max(W / vw, H / vh), w = vw * r, h = vh * r;
        cx.drawImage(tv, (W - w) / 2, (H - h) / 2, w, h);
        let R = 0, G = 0, B = 0, n = 0;
        if (!big) {
          const d = cx.getImageData(0, 0, W, H).data;
          for (let i = 0; i < d.length; i += 4 * 61) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
          R /= n; G /= n; B /= n;
          if ((R + G + B) / 3 < 18 && tries < 2 && v.dur > 30) { tries++; tv.currentTime = v.dur * (tries === 1 ? .32 : .5); return; }
        }
        const at = tv.currentTime;
        cv.toBlob(b => {
          if (b) { const u = URL.createObjectURL(b); if (big) v.big = u; else { v.thumb = u; v.thumbAt = at; const m = (R + G + B) / 3, k = x => Math.max(0, Math.min(255, m + (x - m) * 1.7)) | 0; v.hue = `rgb(${k(R)} ${k(G)} ${k(B)})`; } }
          fin();
        }, 'image/jpeg', big ? .82 : .74);
        return;
      } catch (e) {}
      fin();
    };
    tv.src = `api/video/${v.id}/stream`;
  });
}
function paint(el, v) { el.style.setProperty('--hue', v.hue); if (v.thumb) { el.style.backgroundImage = `url(${v.thumb})`; el.classList.add('has'); } }
function patch(v, big) {
  $$(`[data-th="${v.id}"]`).forEach(el => paint(el, v));
  $$(`[data-dur="${v.id}"]`).forEach(el => el.textContent = v.dur ? fmt(v.dur) : '');
  $$(`[data-bd="${v.id}"]`).forEach(el => { const b = bgOf(v); if (b) { el.style.backgroundImage = b; el.classList.add('has'); } el.style.setProperty('--hue', v.hue); });
  if (v.sk) $$(`[data-sth="${CSS.escape(v.sk)}"]`).forEach(el => { if (!el.classList.contains('has')) paint(el, v); });
  let p = v.dir; while (p) { $$(`[data-fth="${CSS.escape(p)}"]`).forEach(el => { if (!el.classList.contains('has')) paint(el, v); }); p = S.folders.get(p)?.parent; }
}
// the banner shows the large frame, with the small thumbnail underneath while it loads
const bgOf = v => [v.big ? `url(${v.big})` : '', v.thumb ? `url(${v.thumb})` : ''].filter(Boolean).join(',');
const thAttr = v => `style="--hue:${v.hue}${v.thumb ? `;background-image:url(${v.thumb})` : ''}"`;
const bdAttr = v => { const b = bgOf(v); return `data-bd="${v.id}" style="--hue:${v.hue}${b ? ';background-image:' + b : ''}"`; };
const hasBd = v => !!(v.big || v.thumb);

/* ---------- cards ---------- */
function vcard(v, o = {}) {
  const p = prog(v), isEp = v.kind === 'ep';
  const head = isEp && !o.file ? v.show : v.title;
  let sub;
  if (o.why === 'next') sub = `Next episode · ${epc(v)}`;
  else if (o.why === 'resume') sub = `${isEp ? epc(v) + ' · ' : ''}${leftOf(v)}`;
  else if (isEp) sub = o.file ? `${v.show} · ${epc(v)}` : `${epc(v)} · ${v.title}`;
  else sub = [v.year, v.dur ? hm(v.dur) : '', o.file ? '' : (v.q || '')].filter(Boolean).join(' · ') || leaf(v.dir);
  const open = o.why ? `data-play="${v.id}"` : isEp && !o.file ? `data-open="s:${esc(v.sk)}"` : `data-open="m:${v.id}"`;
  const fk = isEp ? 's:' + v.sk : 'm:' + v.key, on = S.fav.has(fk);
  return `<article class="vc${S.cur === v ? ' cur' : ''}" ${open} tabindex="0" role="button" aria-label="${esc(head)}">
  <div class="th${v.thumb ? ' has' : ''}" data-th="${v.id}" ${thAttr(v)}>${ic('film', 'gl')}
   ${o.why === 'next' ? `<span class="tag">${ic('next')}Next</span>` : done(v) && !o.why ? `<span class="tag dark">${ic('check')}Watched</span>` : ''}
   ${o.why ? '' : `<span class="dur" data-dur="${v.id}">${v.dur ? fmt(v.dur) : ''}</span>`}
   <span class="ov"><button class="pbx" data-play="${v.id}" aria-label="Play">${ic('play')}</button><button class="lbx${on ? ' on' : ''}" data-fav="${esc(fk)}" aria-label="My List" title="${on ? 'Remove from' : 'Add to'} My List">${ic(on ? 'check' : 'plus')}</button></span>
   ${p > .01 && !done(v) ? `<i class="pg"><i style="width:${(p * 100).toFixed(1)}%"></i></i>` : ''}
  </div>
  <div class="ti"><b title="${esc(head)}">${esc(head)}</b><span>${esc(sub)}</span></div></article>`;
}
function scard(s) {
  const t = s.eps.find(e => e.thumb) || s.eps[0], a = seriesAction(s), fk = 's:' + s.key, on = S.fav.has(fk);
  const p = a.res ? prog(a.v) : 0;
  return `<article class="vc" data-open="s:${esc(s.key)}" tabindex="0" role="button" aria-label="${esc(s.name)}">
  <div class="th${t.thumb ? ' has' : ''}" data-sth="${esc(s.key)}" ${thAttr(t)}>${ic('tv', 'gl')}
   <span class="tag">${ic('tv')}Series</span>
   <span class="ov"><button class="pbx" data-play="${a.v.id}" aria-label="${esc(a.label)}">${ic('play')}</button><button class="lbx${on ? ' on' : ''}" data-fav="${esc(fk)}" aria-label="My List">${ic(on ? 'check' : 'plus')}</button></span>
   ${p ? `<i class="pg"><i style="width:${(p * 100).toFixed(1)}%"></i></i>` : ''}
  </div>
  <div class="ti"><b>${esc(s.name)}</b><span>${esc([s.seasons.length > 1 ? plural(s.seasons.length, 'season') : `Season ${s.seasons[0]}`, plural(s.eps.length, 'episode')].join(' · '))}</span></div></article>`;
}
const icard = it => it.type === 'series' ? scard(it.s) : vcard(it.v);
function fcard(f) {
  const all = deep(f.path), t = all.find(v => v.thumb) || all[0];
  const sub = [plural(all.length, 'video'), f.kids.size ? plural(f.kids.size, 'folder') : ''].filter(Boolean).join(' · ');
  return `<article class="vc fc" data-folder="${esc(f.path)}" tabindex="0" role="button" aria-label="Open folder ${esc(f.name)}">
  <div class="fstk"><div class="th${t && t.thumb ? ' has' : ''}" data-fth="${esc(f.path)}" ${t ? thAttr(t) : ''}>${ic('folder', 'gl')}<span class="tag dark">${ic('folder')}${all.length}</span></div></div>
  <div class="ti"><b>${esc(f.name)}</b><span>${esc(sub)}</span></div></article>`;
}
function shelf(title, cards, see, wide) {
  if (!cards.length) return '';
  return `<section class="shelf"><div class="shh"><h2>${esc(title)}<small>${cards.length}</small></h2>${see ? `<button class="see" data-go="${esc(see)}">See all ${ic('chevR')}</button>` : ''}</div>
  <div class="rw"><button class="arr l" aria-label="Scroll left" hidden>${ic('chevL')}</button><div class="rail${wide ? ' wide' : ''}">${cards.join('')}</div><button class="arr r" aria-label="Scroll right">${ic('chevR')}</button></div></section>`;
}
const chips = a => a.filter(Boolean).map((c, i) => (i ? '<span class="dot"></span>' : '') + c).join('');

/* ---------- featured banner ---------- */
let heroT = null, heroI = 0, heroList = [];
function heroItems() {
  const out = [], seen = new Set();
  const add = (it, why) => { const k = favKey(it); if (seen.has(k) || out.length >= 5) return; seen.add(k); out.push({ ...it, why }); };
  continueList().slice(0, 2).forEach(c => add(c.v.kind === 'ep' ? { type: 'series', s: S.series.get(c.v.sk) } : { type: 'movie', v: c.v }, c.why));
  recentItems().forEach(it => add(it, 'new'));
  return out;
}
function heroInner(it) {
  const s = it.type === 'series' ? it.s : null, a = s ? seriesAction(s) : movieAction(it.v), v = a.v;
  const fk = favKey(it), on = S.fav.has(fk);
  const eyebrow = it.why === 'resume' ? 'Continue watching' : it.why === 'next' ? 'Up next' : s ? 'New series' : 'New on ছবি';
  const meta = s ? chips([s.seasons.length > 1 ? plural(s.seasons.length, 'Season') : `Season ${s.seasons[0]}`, plural(s.eps.length, 'Episode'), v.q ? `<span class="chip q">${v.q}</span>` : ''])
                 : chips([v.year, v.dur ? hm(v.dur) : '', v.q ? `<span class="chip q">${v.q}</span>` : '', v.sub ? '<span class="chip">CC</span>' : '']);
  const line = s ? `<b>${esc(epc(v))}</b> · ${esc(v.title)}` : `From <b>${esc(leaf(v.dir))}</b>`;
  const p = a.res ? prog(v) : 0;
  return `<span class="eyebrow">${eyebrow}</span><h1>${esc(s ? s.name : v.title)}</h1><div class="meta">${meta}</div><p class="hline">${line}</p>
  ${p ? `<div class="hprog"><span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>${leftOf(v)}</div>` : ''}
  <div class="hbtns"><button class="btn pri" data-play="${v.id}">${ic('play')}${esc(a.label)}</button>
  <button class="btn sec" data-open="${s ? 's:' + esc(s.key) : 'm:' + v.id}">${ic('info')}More info</button>
  <button class="btn ico${on ? ' on' : ''}" data-fav="${esc(fk)}" aria-label="My List" title="${on ? 'Remove from' : 'Add to'} My List">${ic(on ? 'check' : 'plus')}</button></div>`;
}
const heroVid = it => it.type === 'series' ? seriesAction(it.s).v : it.v;
function heroBlock() {
  heroList = heroItems(); if (!heroList.length) return '';
  heroI = Math.min(heroI, heroList.length - 1);
  const it = heroList[heroI], v = heroVid(it); want(v, true);
  return `<section class="hero" id="hero"><div class="bd${hasBd(v) ? ' has' : ''}" id="hbd" ${bdAttr(v)}></div><div class="hc" id="hc">${heroInner(it)}</div>
  ${heroList.length > 1 ? `<div class="dots">${heroList.map((_, i) => `<button data-hero="${i}" class="${i === heroI ? 'on' : ''}" aria-label="Show featured title ${i + 1}"></button>`).join('')}</div>` : ''}</section>`;
}
function heroShow(i) {
  if (!heroList.length || !$('#hero')) return;
  heroI = (i + heroList.length) % heroList.length;
  const it = heroList[heroI], v = heroVid(it), bd = $('#hbd');
  want(v, true);
  const nx = heroVid(heroList[(heroI + 1) % heroList.length]); want(nx, true);
  if (SV.ffmpeg && nx.big) new Image().src = nx.big;
  bd.dataset.bd = v.id; bd.style.setProperty('--hue', v.hue);
  bd.style.backgroundImage = bgOf(v); bd.classList.toggle('has', hasBd(v));
  $('#hc').outerHTML = `<div class="hc" id="hc">${heroInner(it)}</div>`;
  $$('.dots button').forEach((b, j) => b.classList.toggle('on', j === heroI));
}
function startHero() {
  clearInterval(heroT);
  if (heroList.length > 1 && $('#hero') && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    heroT = setInterval(() => { if (P.hidden && !document.hidden && !$('#hero:hover')) heroShow(heroI + 1); }, 9000);
}

/* ---------- pages ---------- */
function welcome() {
  const hues = ['#1db954', '#2f6bd8', '#c2410c', '#7c3aed', '#0e7490', '#be185d', '#ca8a04', '#15803d', '#4338ca', '#b91c1c'];
  const wall = Array.from({ length: 30 }, (_, i) => `<i style="--h:${hues[(i * 7) % hues.length]}"></i>`).join('');
  const mark = '<svg class="mark" viewBox="0 0 90 90" aria-hidden="true"><rect width="90" height="90" rx="22" fill="#1db954"/><path d="M36 28v34l28-17z" fill="#000" stroke="#000" stroke-width="9" stroke-linejoin="round"/></svg>';
  if (online === false) return `<section class="welcome"><div class="wall" aria-hidden="true">${wall}</div><div class="wc">${mark}
    <h1>Can't reach the ছবি server</h1>
    <p>The page is loaded, but the server that sends the videos isn't answering. On the computer that has your movies, open the ঘর folder in a terminal and run <code class="path">npm start</code>. This page reconnects by itself.</p></div></section>`;
  if (SV.scanning && SV.version <= 0) return `<section class="welcome"><div class="wall" aria-hidden="true">${wall}</div><div class="wc">${mark}<h1>Loading your library…</h1><p>ছবি is reading the library folder.</p></div></section>`;
  return `<section class="welcome"><div class="wall" aria-hidden="true">${wall}</div><div class="wc">${mark}
  <h1>Your library is empty</h1>
  <p>Put movies and shows in this folder on the server computer. ছবি checks the folder and adds new videos by itself.</p>
  <p><code class="path">${esc(SV.dir || 'movies')}</code></p>
  <pre class="tree"><b>${esc(SV.name)}/</b>
├─ Inception (2010).mkv
├─ <b>Pather Panchali (1955)/</b>
│   ├─ Pather Panchali (1955).mp4
│   └─ Pather Panchali (1955).srt
└─ <b>Panchayat/</b>
    ├─ <b>Season 1/</b>
    │   ├─ Panchayat S01E01.mkv
    │   └─ Panchayat S01E02.mkv
    └─ <b>Season 2/</b> …</pre>
  <p class="fmt">Shows are grouped from names like <b>S01E02</b>. Subtitle files (.srt or .vtt) with the same name as a video are picked up, and so are subtitles inside MKV files.</p>
  <div class="hbtns"><button class="btn pri" data-act="rescan">${ic('restart')}Scan the folder now</button></div></div></section>`;
}
function homePage() {
  const rows = [];
  const cont = continueList();
  rows.push(shelf('Continue watching', cont.map(c => vcard(c.v, { why: c.why })), null, true));
  rows.push(shelf('Recently added', recentItems().slice(0, 20).map(icard)));
  const shows = [...S.series.values()].sort((a, b) => coll.compare(a.name, b.name));
  rows.push(shelf('TV shows', shows.map(scard), 'shows'));
  const movies = S.videos.filter(v => v.kind === 'movie');
  rows.push(shelf('Movies', [...movies].sort((a, b) => coll.compare(a.title, b.title)).slice(0, 30).map(v => vcard(v)), 'movies'));
  const quick = movies.filter(v => v.dur && v.dur < 1800);
  if (quick.length >= 3) rows.push(shelf('Under 30 minutes', quick.map(v => vcard(v))));
  const long = movies.filter(v => v.dur >= 7200);
  if (long.length >= 3) rows.push(shelf('Long watches, 2 hours or more', long.map(v => vcard(v))));
  const fourK = itemsOf(S.videos.filter(v => v.h >= 2000));
  if (fourK.length >= 2) rows.push(shelf('In 4K', fourK.map(icard)));
  const unseen = movies.filter(v => !pos(v).at);
  if (unseen.length >= 4 && unseen.length < movies.length) rows.push(shelf('Not watched yet', unseen.slice(0, 30).map(v => vcard(v))));
  [...S.folders.values()].filter(f => !f.parent).sort((a, b) => coll.compare(a.name, b.name)).slice(0, 6).forEach(f => {
    const items = itemsOf(deep(f.path)); if (items.length >= 2) rows.push(shelf(`From ${f.name}`, items.slice(0, 30).map(icard), 'f:' + f.path));
  });
  return heroBlock() + `<div class="shelves">${rows.join('')}</div>`;
}
function sortSel(opts) { return `<select id="sort" aria-label="Sort">${opts.map(([v, l]) => `<option value="${v}"${S.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`; }
function moviesPage() {
  const m = S.videos.filter(v => v.kind === 'movie'), dur = m.reduce((s, v) => s + (v.dur || 0), 0);
  return `<div class="page"><div class="ph"><div><span class="eyebrow">Library</span><h1>Movies</h1><p>${plural(m.length, 'movie')}${dur ? ' · ' + hm(dur) : ''}</p></div>${m.length ? sortSel([['added','Recently added'],['name','Title A–Z'],['year','Release year'],['dur','Longest first']]) : ''}</div>
  ${m.length ? `<div class="grid">${sortVids(m).map(v => vcard(v)).join('')}</div>` : `<div class="empty"><h2>No movies yet</h2>Videos without an episode number, like <b>Inception (2010).mkv</b>, show up here.</div>`}</div>`;
}
function showsPage() {
  const sh = [...S.series.values()].sort((a, b) => S.sort === 'added' ? b.added - a.added : coll.compare(a.name, b.name));
  return `<div class="page"><div class="ph"><div><span class="eyebrow">Library</span><h1>TV Shows</h1><p>${plural(sh.length, 'show')} · ${plural(sh.reduce((n, s) => n + s.eps.length, 0), 'episode')}</p></div>${sh.length ? sortSel([['added','Recently added'],['name','Title A–Z']]) : ''}</div>
  ${sh.length ? `<div class="grid">${sh.map(scard).join('')}</div>` : `<div class="empty"><h2>No shows yet</h2>Files named like <b>Show.S01E02.mkv</b>, or numbered files inside a <b>Season 1</b> folder, are grouped into shows here.</div>`}</div>`;
}
function listPage() {
  const items = [];
  S.series.forEach(s => { if (S.fav.has('s:' + s.key)) items.push(scard(s)); });
  S.videos.forEach(v => { if (v.kind === 'movie' && S.fav.has('m:' + v.key)) items.push(vcard(v)); });
  return `<div class="page"><div class="ph"><div><span class="eyebrow">Saved</span><h1>My List</h1><p>${plural(items.length, 'title')}</p></div></div>
  ${items.length ? `<div class="grid">${items.join('')}</div>` : `<div class="empty"><h2>Nothing saved yet</h2>Press ＋ on any movie or show to keep it here. My List is saved on the server, so it's the same on every device.</div>`}</div>`;
}
function foldersPage() {
  const f = S.view.path && S.folders.get(S.view.path);
  if (!f) {
    const roots = [...S.folders.values()].filter(x => !x.parent).sort((a, b) => coll.compare(a.name, b.name));
    return `<div class="page"><div class="ph"><div><span class="eyebrow">Explorer</span><h1>Folders</h1><p>${plural(roots.length, 'folder')} · ${plural(S.videos.length, 'video')} in <b>${esc(SV.name)}</b></p></div></div>
    <div class="grid">${roots.map(fcard).join('')}</div></div>`;
  }
  const parts = f.path.split('/'); let acc = '';
  const cr = `<div class="crumbs"><button data-crumb="">Folders</button>${parts.slice(0, -1).map(p => { acc += (acc ? '/' : '') + p; return `<i>›</i><button data-crumb="${esc(acc)}">${esc(p)}</button>`; }).join('')}</div>`;
  const kids = [...f.kids].map(k => S.folders.get(k)).sort((a, b) => coll.compare(a.name, b.name));
  const all = deep(f.path), dur = all.reduce((s, v) => s + (v.dur || 0), 0);
  const ser = [...new Set(f.vids.filter(v => v.kind === 'ep').map(v => v.sk))].map(k => S.series.get(k));
  return `<div class="page"><div class="ph"><div>${cr}<h1>${esc(f.name)}</h1><p>${[f.vids.length ? plural(f.vids.length, 'video') + ' here' : '', kids.length ? plural(kids.length, 'subfolder') : '', dur ? hm(dur) : ''].filter(Boolean).join(' · ')}</p></div>
  ${ser.length === 1 ? `<button class="btn sec" data-open="s:${esc(ser[0].key)}">${ic('tv')}Open ${esc(ser[0].name)}</button>` : ''}</div>
  ${kids.length ? `<h2 class="sub2">Folders</h2><div class="grid">${kids.map(fcard).join('')}</div>` : ''}
  ${f.vids.length ? `${kids.length ? '<h2 class="sub2">Videos</h2>' : ''}<div class="grid">${f.vids.map(v => vcard(v, { file: true })).join('')}</div>` : ''}</div>`;
}
function searchPage() {
  const q = S.q.toLowerCase(), hit = t => (t || '').toLowerCase().includes(q);
  const shows = [...S.series.values()].filter(s => hit(s.name));
  const movies = S.videos.filter(v => v.kind === 'movie' && (hit(v.title) || hit(v.name)));
  const eps = S.videos.filter(v => v.kind === 'ep' && !hit(v.show) && (hit(v.title) || hit(v.name)));
  const fol = [...S.folders.values()].filter(f => hit(f.name));
  const n = shows.length + movies.length + eps.length + fol.length;
  let h = `<div class="page"><div class="ph"><div><span class="eyebrow">Search</span><h1>“${esc(S.q)}”</h1><p>${plural(n, 'result')}</p></div></div>`;
  if (shows.length) h += `<h2 class="sub2">Shows</h2><div class="grid">${shows.map(scard).join('')}</div>`;
  if (movies.length) h += `<h2 class="sub2">Movies</h2><div class="grid">${movies.map(v => vcard(v)).join('')}</div>`;
  if (eps.length) h += `<h2 class="sub2">Episodes</h2><div class="grid">${eps.slice(0, 60).map(v => vcard(v, { file: true })).join('')}</div>`;
  if (fol.length) h += `<h2 class="sub2">Folders</h2><div class="grid">${fol.map(fcard).join('')}</div>`;
  if (!n) h += `<div class="empty">Nothing matches that. Search looks at titles, episode names, file names and folder names.</div>`;
  return h + '</div>';
}
function facts(rows) { return `<dl class="facts">${rows.filter(r => r[1]).map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>`; }
const subFact = v => v.sub ? esc(v.subName || 'Available') : `None found · <button data-loadsub="${v.id}">Load .srt or .vtt</button>`;
const codecs = v => [CODEC[v.vc] || (v.vc || '').toUpperCase(), CODEC[v.ac] ? CODEC[v.ac] + (v.ch > 2 ? ` ${v.ch === 6 ? '5.1' : v.ch === 8 ? '7.1' : v.ch + 'ch'}` : '') : (v.ac || '').toUpperCase()].filter(Boolean).join(' · ');
function moviePage(v) {
  const a = movieAction(v), fk = 'm:' + v.key, on = S.fav.has(fk), p = a.res ? prog(v) : 0;
  want(v, true);
  const more = itemsOf(S.folders.get(v.dir).vids.filter(x => x !== v));
  return `<section class="hero det"><div class="bd${hasBd(v) ? ' has' : ''}" ${bdAttr(v)}></div><button class="hback" data-back>${ic('chevL')}Back</button>
  <div class="hc"><span class="eyebrow">Movie</span><h1>${esc(v.title)}</h1>
  <div class="meta">${chips([v.year, v.dur ? hm(v.dur) : '', v.q ? `<span class="chip q">${v.q}</span>` : '', `<span class="chip">${esc(v.ext)}</span>`, v.sub ? `<span class="chip">CC</span>` : ''])}</div>
  <p class="hline">From <b>${esc(leaf(v.dir))}</b> · ${esc(v.name)}</p>
  ${p ? `<div class="hprog"><span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>${leftOf(v)}</div>` : ''}
  <div class="hbtns"><button class="btn pri" data-play="${v.id}">${ic('play')}${a.label}${a.res ? ' from ' + fmt(pos(v).t) : ''}</button>
  ${a.res || done(v) ? `<button class="btn sec" data-play="${v.id}" data-from="0">${ic('restart')}Start over</button>` : ''}
  <button class="btn ico${on ? ' on' : ''}" data-fav="${esc(fk)}" aria-label="My List" title="${on ? 'Remove from' : 'Add to'} My List">${ic(on ? 'check' : 'plus')}</button></div></div></section>
  <div class="page">${facts([['File', esc(v.name)], ['Folder', `<button data-folder="${esc(v.dir)}">${esc(v.dir)}</button>`], ['Size', size(v.size)], ['Resolution', v.h ? `${v.w}×${v.h}` : ''], ['Video and audio', esc(codecs(v))], ['Playback', SV.ffmpeg ? MODE[v.mode] : ''], ['Length', v.dur ? fmt(v.dur) : ''], ['Subtitles', subFact(v)]])}</div>
  ${more.length ? `<div class="shelves" style="margin-top:6px">${shelf('More from ' + leaf(v.dir), more.slice(0, 30).map(icard), 'f:' + v.dir)}</div>` : ''}`;
}
function seriesPage(s) {
  const a = seriesAction(s), fk = 's:' + s.key, on = S.fav.has(fk), v = a.v;
  const se = S.view.season ?? v.se, eps = s.eps.filter(e => e.se === se);
  want(v, true);
  const tot = s.eps.reduce((n, e) => n + (e.dur || 0), 0), seen = s.eps.filter(done).length;
  const p = a.res ? prog(v) : 0;
  return `<section class="hero det"><div class="bd${hasBd(v) ? ' has' : ''}" ${bdAttr(v)}></div><button class="hback" data-back>${ic('chevL')}Back</button>
  <div class="hc"><span class="eyebrow">Series</span><h1>${esc(s.name)}</h1>
  <div class="meta">${chips([s.seasons.length > 1 ? plural(s.seasons.length, 'Season') : `Season ${s.seasons[0]}`, plural(s.eps.length, 'Episode'), tot ? hm(tot) : '', v.q ? `<span class="chip q">${v.q}</span>` : ''])}</div>
  <p class="hline">${seen ? `Watched <b>${seen} of ${s.eps.length}</b> · ` : ''}${a.next ? 'Up next: ' : ''}<b>${esc(epc(v))}</b> · ${esc(v.title)}</p>
  ${p ? `<div class="hprog"><span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>${leftOf(v)}</div>` : ''}
  <div class="hbtns"><button class="btn pri" data-play="${v.id}">${ic('play')}${esc(a.label)}</button>
  ${a.res ? `<button class="btn sec" data-play="${v.id}" data-from="0">${ic('restart')}Start over</button>` : ''}
  <button class="btn ico${on ? ' on' : ''}" data-fav="${esc(fk)}" aria-label="My List" title="${on ? 'Remove from' : 'Add to'} My List">${ic(on ? 'check' : 'plus')}</button></div></div></section>
  <div class="page"><div class="eph"><h2>Episodes</h2>${s.seasons.length > 1 ? `<div class="seg" role="tablist">${s.seasons.map(n => `<button data-season="${n}" class="${n === se ? 'on' : ''}" role="tab" aria-selected="${n === se}">Season ${n}</button>`).join('')}</div>` : `<span class="meta">Season ${se}</span>`}</div>
  <div class="eps">${eps.map(eprow).join('')}</div>
  ${facts([['Folder', `<button data-folder="${esc(s.dir)}">${esc(s.dir)}</button>`], ['Episodes', `${s.eps.length} in ${plural(s.seasons.length, 'season')}`], ['Total length', tot ? hm(tot) : ''], ['Subtitles', `${s.eps.filter(e => e.sub).length} of ${s.eps.length} episodes`]])}</div>`;
}
function eprow(v) {
  const p = prog(v);
  return `<div class="ep${S.cur === v ? ' cur' : ''}" data-play="${v.id}" role="button" tabindex="0" aria-label="Play ${esc(epc(v) + ' ' + v.title)}">
  <span class="n">${v.ep}</span>
  <div class="th${v.thumb ? ' has' : ''}" data-th="${v.id}" ${thAttr(v)}>${ic('film', 'gl')}<span class="ov"><span class="pbx">${ic('play')}</span></span>${p > .01 && !done(v) ? `<i class="pg"><i style="width:${(p * 100).toFixed(1)}%"></i></i>` : ''}</div>
  <div class="ei"><b>${esc(v.title)}</b><p>${esc(v.name)}</p></div>
  <span class="d">${done(v) ? `<span class="st">${ic('check')}Watched</span>` : inProg(v) ? leftOf(v) : `<span data-dur="${v.id}">${v.dur ? fmt(v.dur) : ''}</span>`}</span></div>`;
}

/* ---------- render ---------- */
const VW = $('#view');
function sideFolders() {
  const roots = [...S.folders.values()].filter(f => !f.parent).sort((a, b) => coll.compare(a.name, b.name));
  $('#fl').innerHTML = roots.length ? roots.map(f => `<button class="nav${S.tab === 'folders' && S.view.path && (S.view.path === f.path || S.view.path.startsWith(f.path + '/')) ? ' on' : ''}" data-folder="${esc(f.path)}" title="${esc(f.path)}">${ic('folder')}<span class="pn">${esc(f.name)}</span><span class="cnt">${deep(f.path).length}</span></button>`).join('')
    : `<div class="none">Folders inside the library appear here.</div>`;
  libStatus();
}
function render(keep) {
  clearInterval(heroT);
  const sc = VW.scrollTop;
  $$('#side > .nav').forEach(b => b.classList.toggle('on', b.dataset.v === S.tab && !S.q && !(S.tab === 'folders' && S.view.path)));
  sideFolders();
  let h;
  const vw = S.view;
  if (!S.videos.length) h = welcome();
  else if (S.q) h = searchPage();
  else if (vw.name === 'movie' && S.byId.get(vw.id)) h = moviePage(S.byId.get(vw.id));
  else if (vw.name === 'series' && S.series.get(vw.id)) h = seriesPage(S.series.get(vw.id));
  else if (vw.name === 'folders' && vw.path && !S.folders.get(vw.path)) { S.view = { name: 'folders' }; h = foldersPage(); }
  else h = ({ movies: moviesPage, shows: showsPage, list: listPage, folders: foldersPage }[vw.name] || homePage)();
  VW.innerHTML = h;
  VW.scrollTop = keep ? sc : (vw.scroll || 0);
  wireRails(); startHero(); topSolid();
}
function topSolid() { $('#top').classList.toggle('solid', VW.scrollTop > 30 || !VW.querySelector('.hero,.welcome')); }
VW.addEventListener('scroll', topSolid, { passive: true });
function wireRails() {
  $$('.rw').forEach(rw => {
    const r = rw.querySelector('.rail'), l = rw.querySelector('.arr.l'), rr = rw.querySelector('.arr.r');
    const upd = () => { l.hidden = r.scrollLeft < 8; rr.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 8; };
    r.addEventListener('scroll', upd, { passive: true }); upd();
    l.onclick = () => r.scrollBy({ left: -r.clientWidth * .85, behavior: 'smooth' });
    rr.onclick = () => r.scrollBy({ left: r.clientWidth * .85, behavior: 'smooth' });
  });
}
function go(view, tab) {
  if (tab) { S.stack = []; S.tab = tab; }
  else S.stack.push({ ...S.view, scroll: VW.scrollTop });
  S.view = view; S.q = ''; $('#q').value = ''; render();
}
function back() { S.view = S.stack.pop() || { name: S.tab }; render(); }

function favToggle(k) {
  const on = !S.fav.has(k);
  if (on) S.fav.add(k); else S.fav.delete(k);
  API.post('api/list', { key: k, on });
  $$(`[data-fav="${CSS.escape(k)}"]`).forEach(b => { b.classList.toggle('on', on); b.innerHTML = ic(on ? 'check' : 'plus'); b.title = (on ? 'Remove from' : 'Add to') + ' My List'; });
  toast(on ? 'Added to My List' : 'Removed from My List');
  if (S.view.name === 'list' && !S.q) render(true);
}

/* ---------- player ----------
   "direct" files are streamed as they are, so the browser seeks by itself.
   Other files come through ffmpeg as a live stream that starts at T.off seconds;
   seeking asks the server for a new stream from the new point. */
const P = $('#player'), V = $('#pv'), TR = $('#track');
const T = { off: 0, tc: false, seekT: null, st: null };
let pendingSeek = 0, upnHide = false, upnTimer = null;
V.volume = LS.get('vol', 1);
const total = () => T.tc ? (S.cur?.dur || 0) : (isFinite(V.duration) && V.duration ? V.duration : (S.cur?.dur || 0));
const now = () => T.seekT != null ? T.seekT : T.off + (V.currentTime || 0);
let loadTok = 0;
async function load(v, start, wasPlaying = true) {
  const tok = ++loadTok;
  T.tc = v.mode !== 'direct' && SV.ffmpeg;
  clearTimeout(T.st);
  start = Math.max(0, start || 0);
  if (T.tc) {
    // a repackaged stream can only begin on a keyframe; ask the server where that is
    if (start > 0 && v.mode !== 'video') {
      T.seekT = start; timeUI();
      try { const r = await API.get(`api/video/${v.id}/seek?t=${start.toFixed(2)}${v.forced ? '&force=video' : ''}`); start = r.start; } catch (e) {}
      if (tok !== loadTok) return;
    }
    T.off = start; pendingSeek = 0;
    V.src = `api/video/${v.id}/play?start=${start.toFixed(3)}${v.forced ? '&force=video' : ''}`;
  } else { T.off = 0; pendingSeek = start; V.src = `api/video/${v.id}/stream`; }
  T.seekT = null;
  V.playbackRate = S.rate;
  addSubs(v);
  if (wasPlaying) V.play().catch(() => {});
}
function seekTo(t) {
  if (!S.cur) return;
  const d = total(); t = Math.max(0, d ? Math.min(d - .5, t) : t);
  if (!T.tc) { V.currentTime = t; return; }
  T.seekT = t; timeUI();
  clearTimeout(T.st);
  T.st = setTimeout(() => { const playing = !V.paused || V.readyState < 3; load(S.cur, t, playing); }, 350);
}
function play(v, from) {
  if (!v) return;
  if (S.cur && S.cur !== v) savePos(true);
  cancelCountdown(); upnHide = false; $('#upn').hidden = true; $('#perr').hidden = true; $('#pmenu').hidden = true;
  S.cur = v; S.queue = v.kind === 'ep' ? S.series.get(v.sk).eps : S.folders.get(v.dir).vids;
  const p = pos(v);
  const start = from != null ? from : (p.t > 10 && (!p.d || p.t < p.d - 20) ? p.t : 0);
  P.hidden = false; document.body.classList.add('watching');
  load(v, start);
  if (start) toast('Resuming from ' + fmt(start));
  $('#pTitle').textContent = v.kind === 'ep' ? v.show : v.title;
  $('#pSub').textContent = v.kind === 'ep' ? `${epc(v)} · ${v.title}` : [v.year, leaf(v.dir)].filter(Boolean).join(' · ');
  $('#pNow').innerHTML = v.kind === 'ep' ? `${esc(v.show)} <span>${esc(epc(v))} “${esc(v.title)}”</span>` : esc(v.title);
  const n = nextOf(v);
  $('#bNext').hidden = !n;
  $('#bNext').innerHTML = ic('next') + `<span>${v.kind === 'ep' ? 'Next episode' : 'Next'}</span>`;
  $('#bNext').title = n ? `Next: ${n.kind === 'ep' ? epc(n) + ' · ' : ''}${n.title} (N)` : '';
  $('#bEps').innerHTML = ic('list'); $('#bEps').title = v.kind === 'ep' ? 'Episodes (E)' : 'In this folder (E)';
  if ($('#drawer').classList.contains('on')) drawer(true);
  timeUI(); ccBtn(); poke();
  document.title = v.title + ' · ছবি';
  if ('mediaSession' in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: v.kind === 'ep' ? `${epc(v)} · ${v.title}` : v.title, artist: v.kind === 'ep' ? v.show : leaf(v.dir), artwork: v.thumb ? [{ src: v.thumb, sizes: '480x270', type: 'image/jpeg' }] : [] }); } catch (e) {}
}
function closePlayer() {
  savePos(true); cancelCountdown(); clearTimeout(T.st); T.seekT = null;
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  V.pause(); P.hidden = true; $('#drawer').classList.remove('on'); document.body.classList.remove('watching');
  S.cur = null; V.removeAttribute('src'); V.querySelectorAll('track').forEach(t => t.remove()); V.load();
  document.title = 'ছবি';
  render(true);
}
function next() { const n = S.cur && nextOf(S.cur); if (n) play(n, 0); else toast('That was the last one'); }
function prev() { if (now() > 5) { seekTo(0); return; } const i = S.queue.indexOf(S.cur); if (i > 0) play(S.queue[i - 1], 0); else seekTo(0); }
function toggle() { if (!S.cur) return; if (V.paused) V.play().catch(() => {}); else V.pause(); }
function flash(h) { const f = $('#pflash'); f.innerHTML = h; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function skip(s) { if (!S.cur) return; seekTo(now() + s); flash(ic(s < 0 ? 'b10' : 'f10')); poke(); }
function timeUI() {
  const d = total(), t = now(), p = d ? Math.min(100, t / d * 100) : 0;
  if (!TR.classList.contains('drag')) { TR.querySelector('.fill').style.width = p + '%'; TR.querySelector('.knob').style.left = p + '%'; }
  $('#tCur').textContent = fmt(t); $('#tLeft').textContent = d ? '-' + fmt(d - t) : '';
}

/* subtitles: fetched as WebVTT; for converted streams the cue times are shifted to match */
function shiftVtt(txt, off) {
  if (!off) return txt;
  const re = /((?:\d+:)?\d{1,2}:\d{2}\.\d{3})(\s*-->\s*)((?:\d+:)?\d{1,2}:\d{2}\.\d{3})/;
  const toS = s => s.split(':').reduce((a, x) => a * 60 + +x, 0);
  const fm = s => { s = Math.max(0, s); const h = s / 3600 | 0, m = (s % 3600) / 60 | 0, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
  return txt.split(/\n\n+/).filter(b => { const m = b.match(re); return !m || toS(m[3]) - off > 0; })
    .map(b => b.replace(re, (_, a, mid, c) => fm(toS(a) - off) + mid + fm(toS(c) - off))).join('\n\n');
}
async function vttOf(v) {
  if (v.localVtt) return v.localVtt;
  if (v.vtt != null) return v.vtt;
  try { const r = await fetch(`api/video/${v.id}/subs`); v.vtt = r.ok ? await r.text() : ''; } catch (e) { v.vtt = ''; }
  return v.vtt;
}
async function addSubs(v) {
  V.querySelectorAll('track').forEach(t => { URL.revokeObjectURL(t.src); t.remove(); });
  if (!v.sub) { ccBtn(); return; }
  const off = T.tc ? T.off : 0, txt = await vttOf(v);
  if (S.cur !== v || !txt || (T.tc ? T.off : 0) !== off) { ccBtn(); return; }
  const t = document.createElement('track'); t.kind = 'subtitles'; t.label = 'Subtitles'; t.srclang = 'und';
  t.src = URL.createObjectURL(new Blob([shiftVtt(txt, off)], { type: 'text/vtt' })); V.appendChild(t);
  setTimeout(applyCC, 40);
}
function applyCC() { const t = V.textTracks[0]; if (t) t.mode = S.cc ? 'showing' : 'hidden'; ccBtn(); }
function ccBtn() { const b = $('#bCC'), has = S.cur && S.cur.sub; b.innerHTML = ic('cc'); b.classList.toggle('on', !!(has && S.cc)); b.title = has ? (S.cc ? 'Hide subtitles (C)' : 'Show subtitles (C)') : 'Load subtitles (.srt or .vtt)'; }
let subTarget = null;
function ccClick() { if (!S.cur) return; if (!S.cur.sub) { subTarget = S.cur; $('#fs').click(); return; } S.cc = !S.cc; LS.set('cc', S.cc); applyCC(); toast(S.cc ? 'Subtitles on' : 'Subtitles off'); }
$('#fs').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; const v = subTarget; subTarget = null;
  if (!f || !v) return;
  let txt = await f.text();
  if (!/^\uFEFF?WEBVTT/.test(txt)) txt = 'WEBVTT\n\n' + txt.replace(/^\uFEFF/, '').replace(/\r/g, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
  v.localVtt = txt; v.localName = f.name; v.sub = true; v.subName = f.name; S.cc = true; LS.set('cc', true);
  if (S.cur === v) addSubs(v); else render(true);
  toast('Subtitles added for this session');
};

/* fullscreen, pip, volume, speed */
function full() {
  if (Home.fullscreen.supported) { Home.fullscreen.toggle(); return; }
  if (V.webkitEnterFullscreen) V.webkitEnterFullscreen(); else toast("Fullscreen isn't available here");
}
document.addEventListener('fullscreenchange', () => { $('#bFull').innerHTML = ic(document.fullscreenElement ? 'exit' : 'full'); });
function volUI() { const m = V.muted || V.volume === 0; $('#bMute').innerHTML = ic(m ? 'mute' : 'vol'); const r = $('#vr'); r.value = V.muted ? 0 : V.volume; r.style.setProperty('--p', (V.muted ? 0 : V.volume * 100) + '%'); }
const RATES = [.5, .75, 1, 1.25, 1.5, 1.75, 2];
function rateMenu() {
  const m = $('#pmenu');
  if (!m.hidden) { m.hidden = true; return; }
  m.innerHTML = RATES.map(r => `<button data-r="${r}" class="${r === S.rate ? 'on' : ''}">${r === 1 ? 'Normal speed' : r + '×'}</button>`).join(''); m.hidden = false;
}
function setRate(r) { S.rate = r; V.playbackRate = r; $('#bRate').textContent = (r === 1 ? '1' : r) + '×'; }
$('#pmenu').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; setRate(+b.dataset.r); $('#pmenu').hidden = true; };

/* next-episode card */
function showUpn(n, counting) {
  const u = $('#upn');
  $('#upnL').textContent = n.kind === 'ep' ? 'Next episode' : 'Up next';
  $('#upnT').textContent = n.kind === 'ep' ? `${epc(n)} · ${n.title}` : n.title;
  const th = $('#upnTh'); th.className = 'th' + (n.thumb ? ' has' : ''); th.setAttribute('style', `--hue:${n.hue}${n.thumb ? `;background-image:url(${n.thumb})` : ''}`); th.innerHTML = n.thumb ? '' : ic('film');
  $('#upnPlay').textContent = counting ? 'Play now' : 'Play';
  u.dataset.id = n.id; u.hidden = false;
}
function startCountdown(n) {
  showUpn(n, true);
  const bar = $('#upnBar'); bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth;
  bar.style.transition = 'width 8s linear'; bar.style.width = '100%';
  upnTimer = setTimeout(() => { upnTimer = null; play(n, 0); }, 8000);
}
function cancelCountdown() { clearTimeout(upnTimer); upnTimer = null; const bar = $('#upnBar'); bar.style.transition = 'none'; bar.style.width = '0'; }
$('#upnPlay').onclick = () => { const n = S.byId.get($('#upn').dataset.id); cancelCountdown(); play(n, 0); };
$('#upnX').onclick = () => { cancelCountdown(); upnHide = true; $('#upn').hidden = true; };

/* episodes drawer */
let drawerSe = null;
function drawer(keepSeason) {
  const v = S.cur; if (!v) return;
  if (v.kind === 'ep') {
    const s = S.series.get(v.sk);
    if (!keepSeason || drawerSe == null || !s.seasons.includes(drawerSe)) drawerSe = v.se;
    $('#dTitle').textContent = s.name;
    $('#dSeas').innerHTML = s.seasons.length > 1 ? `<div class="seg">${s.seasons.map(n => `<button data-dse="${n}" class="${n === drawerSe ? 'on' : ''}">Season ${n}</button>`).join('')}</div>` : '';
    $('#dList').innerHTML = s.eps.filter(e => e.se === drawerSe).map(drow).join('');
  } else {
    $('#dTitle').textContent = 'In ' + leaf(v.dir); $('#dSeas').innerHTML = '';
    $('#dList').innerHTML = S.queue.map(drow).join('');
  }
  $('#drawer').classList.add('on');
  const c = $('#dList .dr.cur'); if (c) c.scrollIntoView({ block: 'center' });
}
function drow(v) {
  const p = prog(v);
  return `<button class="dr${S.cur === v ? ' cur' : ''}" data-dplay="${v.id}"><div class="th${v.thumb ? ' has' : ''}" data-th="${v.id}" ${thAttr(v)}>${ic('film', 'gl')}${p > .01 && !done(v) ? `<i class="pg"><i style="width:${(p * 100).toFixed(1)}%"></i></i>` : ''}</div>
  <div><b>${v.kind === 'ep' ? v.ep + '. ' : ''}${esc(v.title)}</b><span>${done(v) ? 'Watched' : inProg(v) ? leftOf(v) : (v.dur ? hm(v.dur) : v.ext)}</span></div></button>`;
}
$('#drawer').onclick = e => {
  const s = e.target.closest('[data-dse]'); if (s) { drawerSe = +s.dataset.dse; drawer(true); return; }
  const b = e.target.closest('[data-dplay]'); if (b) play(S.byId.get(b.dataset.dplay));
};
$('#dX').onclick = () => $('#drawer').classList.remove('on');

/* controls */
$('#bPlay').onclick = $('#mPlay').onclick = toggle;
$('#bBack').onclick = $('#mBack').onclick = () => skip(-10);
$('#bFwd').onclick = $('#mFwd').onclick = () => skip(10);
$('#bNext').onclick = next;
$('#bEps').onclick = () => $('#drawer').classList.contains('on') ? $('#drawer').classList.remove('on') : drawer();
$('#bMute').onclick = () => { V.muted = !V.muted; };
$('#vr').oninput = e => { V.volume = +e.target.value; V.muted = V.volume === 0; LS.set('vol', V.volume); };
$('#bCC').onclick = ccClick;
$('#bRate').onclick = e => { e.stopPropagation(); rateMenu(); };
$('#bFull').onclick = full;
$('#bPip').onclick = () => { if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}); else V.requestPictureInPicture?.().catch(() => toast("Picture in picture isn't available here")); };
if (!document.pictureInPictureEnabled) $('#bPip').hidden = true;
$('#pBack').onclick = closePlayer; $('#perrB').onclick = closePlayer;

V.addEventListener('loadedmetadata', () => {
  const v = S.cur; if (!v) return;
  if (!T.tc && isFinite(V.duration) && !v.dur) v.dur = V.duration;
  if (pendingSeek) V.currentTime = pendingSeek;
  pendingSeek = 0;
});
V.addEventListener('timeupdate', () => {
  timeUI(); savePos(false);
  const d = total(), t = now();
  if (S.cur && S.cur.kind === 'ep' && !upnHide && $('#upn').hidden && d > 120 && d - t <= 25 && !V.paused) { const n = nextOf(S.cur); if (n) showUpn(n); }
});
V.addEventListener('progress', () => {
  const b = V.buffered, d = total(); if (!b.length || !d) return;
  let e = 0; for (let i = 0; i < b.length; i++) if (b.start(i) <= V.currentTime + 1) e = b.end(i);
  TR.querySelector('.buf').style.width = Math.min(100, (T.off + e) / d * 100) + '%';
});
V.addEventListener('play', () => { const i = ic('pause'); $('#bPlay').innerHTML = $('#mPlay').innerHTML = i; P.classList.add('playing'); poke(); });
V.addEventListener('pause', () => { const i = ic('play'); $('#bPlay').innerHTML = $('#mPlay').innerHTML = i; P.classList.remove('playing', 'idle'); if (T.seekT == null) savePos(true); });
V.addEventListener('waiting', () => { $('#pspin').hidden = false; });
V.addEventListener('loadstart', () => { if (S.cur) $('#pspin').hidden = false; });
['playing', 'canplay', 'pause', 'seeked', 'error'].forEach(ev => V.addEventListener(ev, () => { if (ev !== 'pause' || T.seekT == null) $('#pspin').hidden = true; }));
V.addEventListener('volumechange', volUI);
V.addEventListener('ended', () => {
  if (!S.cur || T.seekT != null) return;
  savePos(true);
  const n = nextOf(S.cur);
  if (S.cur.kind === 'ep' && n) { if (S.autoplay && !upnHide) startCountdown(n); else showUpn(n); P.classList.remove('idle'); }
  else { const t = S.cur.title; closePlayer(); toast('Finished ' + t); }
});
V.addEventListener('error', () => {
  const v = S.cur; if (!v || !V.getAttribute('src')) return;
  $('#pspin').hidden = true;
  // a file the server thought would play as it is didn't: let ffmpeg convert it instead
  if (!T.tc && SV.ffmpeg && !v.forced) { v.forced = 'video'; v.mode = 'video'; toast('Converting this video so it can play'); load(v, now()); return; }
  const h264 = !!V.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
  $('#perrT').textContent = SV.ffmpeg && !h264
    ? `This browser can't play H.264 video, which ছবি converts files into. Open ছবি in Chrome, Edge, Safari or Firefox instead.`
    : SV.ffmpeg
    ? `“${v.name}” couldn't be converted. The file may be damaged or still being copied. Check the server window for the ffmpeg message.`
    : `“${v.name}” uses a format this browser can't decode. Install ffmpeg on the server computer and restart ছবি; it will then convert files like this while you watch.`;
  $('#perr').hidden = false;
});

/* seek bar */
const ratio = e => { const r = TR.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
TR.addEventListener('pointermove', e => {
  const x = ratio(e), tip = $('#tip'); tip.textContent = fmt(x * total()); tip.style.left = x * 100 + '%';
  if (TR.classList.contains('drag')) TR.querySelector('.fill').style.width = TR.querySelector('.knob').style.left = x * 100 + '%';
});
TR.addEventListener('pointerdown', e => { if (!total()) return; TR.setPointerCapture(e.pointerId); TR.classList.add('drag'); const x = ratio(e); TR.querySelector('.fill').style.width = TR.querySelector('.knob').style.left = x * 100 + '%'; });
TR.addEventListener('pointerup', e => { if (!TR.classList.contains('drag')) return; TR.classList.remove('drag'); seekTo(ratio(e) * total()); poke(); });
TR.addEventListener('pointercancel', () => TR.classList.remove('drag'));

/* auto-hide controls */
let idleT, lastPT = 'mouse';
function poke(touch) {
  P.classList.remove('idle'); if (touch) P.classList.add('hov');
  clearTimeout(idleT);
  idleT = setTimeout(() => { if (!V.paused && $('#pmenu').hidden && !$('#drawer').classList.contains('on') && !TR.classList.contains('drag')) P.classList.add('idle'); P.classList.remove('hov'); }, 3000);
}
P.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') poke(); });
P.addEventListener('pointerdown', e => { lastPT = e.pointerType; });
let clickT;
P.addEventListener('click', e => {
  if (!$('#pmenu').hidden && !e.target.closest('#pmenu')) { $('#pmenu').hidden = true; return; }
  if (e.target.closest('.ptop,.pbot,.pmid button,#upn,#drawer,#perr,#pmenu')) return;
  if ($('#drawer').classList.contains('on')) { $('#drawer').classList.remove('on'); return; }
  if (lastPT !== 'mouse') { if (P.classList.contains('idle') || !P.classList.contains('hov')) poke(true); else { P.classList.add('idle'); P.classList.remove('hov'); } return; }
  clearTimeout(clickT); clickT = setTimeout(() => { toggle(); flash(ic(V.paused ? 'pause' : 'play')); }, 200);
});
P.addEventListener('dblclick', e => { if (e.target.closest('.ptop,.pbot,#upn,#drawer')) return; clearTimeout(clickT); full(); });
if ('mediaSession' in navigator) { const ms = navigator.mediaSession; try { ms.setActionHandler('nexttrack', next); ms.setActionHandler('previoustrack', prev); ms.setActionHandler('seekbackward', () => skip(-10)); ms.setActionHandler('seekforward', () => skip(10)); } catch (e) {} }

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if (e.target.matches('input[type=search],select')) { if (e.key === 'Escape' && e.target.id === 'q') { e.target.value = ''; S.q = ''; render(); e.target.blur(); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if ($('#set').classList.contains('on')) { if (k === 'Escape') closeSet(); return; }
  if (P.hidden) {
    if (k === '/') { e.preventDefault(); $('#q').focus(); return; }
    if ((k === 'f' || k === 'F') && !e.target.closest('input,select,textarea')) { full(); return; }
    if ((k === 'Enter' || k === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); e.target.click(); }
    if (k === 'Escape' && S.stack.length) back();
    return;
  }
  if (e.target.closest('button') && (k === ' ' || k === 'Enter')) return;
  switch (k) {
    case ' ': case 'k': case 'K': e.preventDefault(); toggle(); flash(ic(V.paused ? 'pause' : 'play')); break;
    case 'ArrowLeft': e.preventDefault(); seekTo(now() - 5); poke(); break;
    case 'ArrowRight': e.preventDefault(); seekTo(now() + 5); poke(); break;
    case 'j': case 'J': skip(-10); break;
    case 'l': case 'L': skip(10); break;
    case 'ArrowUp': e.preventDefault(); V.muted = false; V.volume = Math.min(1, V.volume + .05); LS.set('vol', V.volume); flash(`<b>${Math.round(V.volume * 100)}%</b>`); break;
    case 'ArrowDown': e.preventDefault(); V.volume = Math.max(0, V.volume - .05); LS.set('vol', V.volume); flash(`<b>${Math.round(V.volume * 100)}%</b>`); break;
    case 'm': case 'M': V.muted = !V.muted; break;
    case 'f': case 'F': full(); break;
    case 'c': case 'C': ccClick(); break;
    case 'n': case 'N': next(); break;
    case 'p': case 'P': prev(); break;
    case 'e': case 'E': $('#bEps').click(); break;
    case '>': setRate(RATES[Math.min(RATES.length - 1, RATES.indexOf(S.rate) + 1)]); flash(`<b>${S.rate}×</b>`); break;
    case '<': setRate(RATES[Math.max(0, RATES.indexOf(S.rate) - 1)]); flash(`<b>${S.rate}×</b>`); break;
    case 'Escape': if ($('#drawer').classList.contains('on')) $('#drawer').classList.remove('on'); else if (!document.fullscreenElement) closePlayer(); break;
    default: if (/^[0-9]$/.test(k) && total()) { seekTo(total() * (+k) / 10); poke(); }
  }
});

/* ---------- clicks in the library ---------- */
async function rescan(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Scanning…'; }
  await API.post('api/rescan');
  await loadLibrary();
  if (btn) { btn.disabled = false; btn.textContent = btn.id === 'sScan' ? 'Scan now' : 'Scan the folder now'; }
  toast(`Library has ${plural(S.videos.length, 'video')}`);
  setInfo();
}
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#player,#set')) return;
  if (t.closest('[data-act="rescan"]')) { rescan(t.closest('[data-act]')); return; }
  const fv = t.closest('[data-fav]'); if (fv) { e.stopPropagation(); favToggle(fv.dataset.fav); return; }
  const ls = t.closest('[data-loadsub]'); if (ls) { subTarget = S.byId.get(ls.dataset.loadsub); $('#fs').click(); return; }
  const hd = t.closest('[data-hero]'); if (hd) { heroShow(+hd.dataset.hero); startHero(); return; }
  const pl = t.closest('[data-play]'); if (pl) { play(S.byId.get(pl.dataset.play), pl.dataset.from != null ? +pl.dataset.from : undefined); return; }
  const sn = t.closest('[data-season]'); if (sn) { S.view.season = +sn.dataset.season; render(true); return; }
  const op = t.closest('[data-open]');
  if (op) { const k = op.dataset.open.slice(0, 1), id = op.dataset.open.slice(2); go(k === 's' ? { name: 'series', id } : { name: 'movie', id }); return; }
  const g = t.closest('[data-go]');
  if (g) { const x = g.dataset.go; if (x.startsWith('f:')) go({ name: 'folders', path: x.slice(2) }, 'folders'); else go({ name: x }, x); return; }
  const fo = t.closest('[data-folder]'); if (fo) { go({ name: 'folders', path: fo.dataset.folder }, fo.closest('#side') ? 'folders' : undefined); return; }
  const cr = t.closest('[data-crumb]'); if (cr) { go({ name: 'folders', path: cr.dataset.crumb || null }, 'folders'); return; }
  if (t.closest('[data-back]')) { back(); return; }
  const nv = t.closest('#side > .nav'); if (nv) { go({ name: nv.dataset.v }, nv.dataset.v); return; }
});
document.addEventListener('change', e => { if (e.target.id === 'sort') { S.sort = e.target.value; LS.set('sort', S.sort); render(true); } });
let qT; $('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value.trim(); render(); }, 160); });

/* ---------- settings ---------- */
/* theme and full screen are shared with ঘর and সুর (/shared/home.js) */
function applyTheme() {
  const m = Home.theme.mode();
  const tc = $('meta[name=theme-color]'); if (tc) tc.content = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#12151a';
  $$('#seg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
}
Home.theme.onChange(applyTheme);
$('#seg').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; Home.theme.set(b.dataset.m); };
Home.fullscreen.bind($('#fsBtn'));
function setInfo() {
  $('#sLib').textContent = `${SV.name} · ${plural(S.videos.length, 'video')}`;
  $('#sLibP').textContent = SV.dir || '';
  $('#sConv').textContent = SV.ffmpeg ? `ffmpeg, encoding with ${SV.encoder}. MKV, HEVC and AC3/DTS files are converted while you watch.` : 'ffmpeg was not found on the server. MP4 and WebM files play; install ffmpeg and restart for everything else.';
}
function openSet() { $('#sAuto').checked = S.autoplay; $('#sCC').checked = S.cc; applyTheme(); setInfo(); $('#set').classList.add('on'); $('#setx').focus(); }
function closeSet() { $('#set').classList.remove('on'); $('#sClr').classList.remove('arm'); $('#sClr').textContent = 'Clear'; }
$('#setBtn').onclick = openSet; $('#setx').onclick = closeSet;
$('#set').onclick = e => { if (e.target.id === 'set') closeSet(); };
$('#sAuto').onchange = e => { S.autoplay = e.target.checked; LS.set('autoplay', S.autoplay); };
$('#sCC').onchange = e => { S.cc = e.target.checked; LS.set('cc', S.cc); applyCC(); };
$('#sScan').onclick = e => rescan(e.currentTarget);
$('#sClr').onclick = e => {
  const b = e.currentTarget;
  if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Click again to clear'; setTimeout(() => { b.classList.remove('arm'); b.textContent = 'Clear'; }, 3000); return; }
  S.pos = {}; API.post('api/history/clear'); b.classList.remove('arm'); b.textContent = 'Clear'; toast('Watch history cleared'); render(true);
};

/* ---------- toast ---------- */
let toT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toT); toT = setTimeout(() => t.classList.remove('on'), 2600); }

/* ---------- start ---------- */
const NAV = { home: 'home', movies: 'film', shows: 'tv', folders: 'folder', list: 'bookmark' };
$$('#side > .nav').forEach(b => b.insertAdjacentHTML('afterbegin', ic(NAV[b.dataset.v])));
$('#sw').insertAdjacentHTML('afterbegin', ic('search'));
$('#setBtn').innerHTML = ic('gear');
$('#pBack').innerHTML = ic('chevL'); $('#dX').innerHTML = ic('close');
$('#bPlay').innerHTML = $('#mPlay').innerHTML = ic('play');
$('#bBack').innerHTML = $('#mBack').innerHTML = ic('b10');
$('#bFwd').innerHTML = $('#mFwd').innerHTML = ic('f10');
$('#bPip').innerHTML = ic('pip'); $('#bFull').innerHTML = ic('full');
volUI(); ccBtn(); applyTheme();
window.addEventListener('pagehide', () => savePos(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) savePos(true); else if (online) loadLibrary(); });
render();
loadState().then(loadLibrary);
})();
