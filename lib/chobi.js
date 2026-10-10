/*
 * ছবি (movies & shows) — mounted by server.js under /chobi/
 * ffmpeg + ffprobe on the PATH are optional but recommended: with them, MKV, HEVC and
 * AC3/DTS files are converted while you watch, and thumbnails are made on the server.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
const fsp = fs.promises;

const VEXT = /\.(mp4|m4v|webm|mkv|mov|ogv|avi|ts|m2ts|mts|wmv|flv|mpe?g|3gp)$/i;
const SUBEXT = /\.(srt|vtt)$/i;
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const log = (...a) => console.log(new Date().toLocaleTimeString(), 'ছবি:', ...a);

/* ---------- running ffmpeg ---------- */
function run(cmd, args, { timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    let p;
    try { p = spawn(cmd, args, { windowsHide: true }); } catch (e) { return reject(e); }
    const out = [], err = [];
    p.stdout.on('data', d => out.push(d));
    p.stderr.on('data', d => err.push(d));
    const t = setTimeout(() => p.kill('SIGKILL'), timeout);
    p.on('error', e => { clearTimeout(t); reject(e); });
    p.on('close', code => {
      clearTimeout(t);
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(Buffer.concat(err).toString().trim().split('\n').pop() || 'exit code ' + code));
    });
  });
}
const works = cmd => { try { return spawnSync(cmd, ['-version'], { windowsHide: true, timeout: 10000 }).status === 0; } catch (e) { return false; } };

const ENCODERS = {
  nvenc: { name: 'NVIDIA NVENC', args: ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '23', '-b:v', '0', '-pix_fmt', 'yuv420p'] },
  qsv: { name: 'Intel Quick Sync', args: ['-c:v', 'h264_qsv', '-global_quality', '23', '-pix_fmt', 'nv12'] },
  amf: { name: 'AMD AMF', args: ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'cqp', '-qp_i', '22', '-qp_p', '24', '-pix_fmt', 'yuv420p'] },
  videotoolbox: { name: 'Apple VideoToolbox', args: ['-c:v', 'h264_videotoolbox', '-b:v', '6M', '-pix_fmt', 'yuv420p'] },
  cpu: { name: 'CPU (libx264)', args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p'] }
};

function limiter(n) {
  let active = 0; const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++; const { fn, res, rej } = q.shift();
    Promise.resolve().then(fn).then(res, rej).finally(() => { active--; next(); });
  };
  return fn => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
}

export function createChobi(opts) {
  const C = {
    movies: path.resolve(opts.moviesDir),
    pub: opts.publicDir,
    cache: opts.cacheDir,
    dataFile: opts.dataFile,
    ffmpeg: process.env.FFMPEG || 'ffmpeg',
    ffprobe: process.env.FFPROBE || 'ffprobe',
    hw: (process.env.HWACCEL || 'auto').toLowerCase(),
    maxH: +process.env.MAX_HEIGHT || 1080,
    directHevc: process.env.DIRECT_HEVC === '1',
    maxJobs: +process.env.MAX_TRANSCODES || 3
  };
  for (const d of ['thumbs', 'subs']) fs.mkdirSync(path.join(C.cache, d), { recursive: true });
  fs.mkdirSync(C.movies, { recursive: true });
  fs.mkdirSync(path.dirname(C.dataFile), { recursive: true });

  const FF = works(C.ffmpeg) && works(C.ffprobe);
  function pickEncoder() {
    if (!FF) return null;
    const order = C.hw === 'auto' ? ['nvenc', 'qsv', 'amf', 'videotoolbox'] : ENCODERS[C.hw] && C.hw !== 'cpu' ? [C.hw] : [];
    for (const k of order) {
      const r = spawnSync(C.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:d=0.3',
        ...ENCODERS[k].args, '-frames:v', '5', '-f', 'null', '-'], { windowsHide: true, timeout: 20000 });
      if (r.status === 0) return { key: k, ...ENCODERS[k] };
    }
    return { key: 'cpu', ...ENCODERS.cpu };
  }
  const ENC = pickEncoder();
  const probeLim = limiter(2), thumbLim = limiter(2);

  /* ---------- saved state: progress and My List ---------- */
  let DATA = { pos: {}, list: [] };
  try { DATA = Object.assign(DATA, JSON.parse(fs.readFileSync(C.dataFile, 'utf8'))); } catch (e) {}
  let dataT;
  function saveData() {
    clearTimeout(dataT);
    dataT = setTimeout(() => { const tmp = C.dataFile + '.tmp'; fs.writeFile(tmp, JSON.stringify(DATA), e => { if (!e) fs.rename(tmp, C.dataFile, () => {}); }); }, 800);
  }
  const PC_FILE = path.join(C.cache, 'library.json');
  let PC = {};
  try { PC = JSON.parse(fs.readFileSync(PC_FILE, 'utf8')); } catch (e) {}
  let pcT;
  function savePC() { clearTimeout(pcT); pcT = setTimeout(() => fs.writeFile(PC_FILE, JSON.stringify(PC), () => {}), 2000); }

  /* ---------- library scan ---------- */
  let LIB = new Map(), scanning = false, again = false, version = 0;
  async function walk(dir, rel, vids, subs) {
    let ents;
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      if (e.name.startsWith('.') || e.name.startsWith('$')) continue;
      const abs = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
      let isDir = e.isDirectory(), isFile = e.isFile();
      if (e.isSymbolicLink()) { try { const st = await fsp.stat(abs); isDir = st.isDirectory(); isFile = st.isFile(); } catch (x) { continue; } }
      if (isDir) await walk(abs, r, vids, subs);
      else if (isFile) { if (VEXT.test(e.name)) vids.push({ abs, rel: r }); else if (SUBEXT.test(e.name)) subs.push({ abs, rel: r }); }
    }
  }
  const noExt = s => s.replace(/\.[^./]+$/, '').toLowerCase();
  const thumbPath = (e, big) => path.join(C.cache, 'thumbs', `${e.id}_${e.tv}${big ? '_big' : ''}.jpg`);

  async function scan() {
    if (scanning) { again = true; return; }
    scanning = true;
    try {
      const vids = [], subs = [];
      await walk(C.movies, '', vids, subs);
      const next = new Map(), byDir = new Map();
      for (const f of vids) {
        let st; try { st = await fsp.stat(f.abs); } catch (e) { continue; }
        const id = sha(f.rel).slice(0, 12), sig = st.size + ':' + Math.round(st.mtimeMs);
        const old = LIB.get(id);
        const e = old && old.sig === sig ? old : { id, rel: f.rel, size: st.size, mtime: st.mtimeMs, sig, tv: sha(sig).slice(0, 8) };
        e.abs = f.abs; e.side = null;
        if (!e.probe && PC[f.rel] && PC[f.rel].sig === sig) { e.probe = PC[f.rel].p; e.hue = PC[f.rel].hue; }
        e.th = fs.existsSync(thumbPath(e, false));
        next.set(id, e);
        const d = path.posix.dirname(f.rel); if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(e);
      }
      for (const s of subs) {
        const b = noExt(path.posix.basename(s.rel));
        for (const e of byDir.get(path.posix.dirname(s.rel)) || []) {
          const vb = noExt(path.posix.basename(e.rel));
          if (!e.side && (b === vb || b.startsWith(vb + '.'))) e.side = s.abs;
        }
      }
      const changed = next.size !== LIB.size || [...next.keys()].some(k => LIB.get(k) !== next.get(k));
      LIB = next;
      if (changed) { version++; log(`${LIB.size} videos in ${C.movies}`); }
    } finally {
      scanning = false;
      if (again) { again = false; setImmediate(scan); } else work();
    }
  }

  /* ---------- probing, modes, thumbnails ---------- */
  function info(j) {
    const st = j.streams || [];
    const v = st.find(s => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
    const as = st.filter(s => s.codec_type === 'audio');
    const a = as.find(s => s.disposition && s.disposition.default) || as[0];
    const ss = st.filter(s => s.codec_type === 'subtitle');
    const ti = ss.findIndex(s => ['subrip', 'ass', 'ssa', 'webvtt', 'mov_text', 'text'].includes(s.codec_name));
    return {
      dur: +(j.format && j.format.duration) || +(v && v.duration) || 0,
      w: v ? v.width : 0, h: v ? v.height : 0,
      vc: v ? v.codec_name : '', pix: v ? v.pix_fmt || '' : '',
      ac: a ? a.codec_name : '', aIndex: a ? as.indexOf(a) : -1, ch: a ? a.channels : 0,
      sub: ti
    };
  }
  async function probe(e) {
    if (e.probe || e.probing) return;
    e.probing = true;
    try {
      const out = await run(C.ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', e.abs], { timeout: 60000 });
      e.probe = info(JSON.parse(out.toString()));
    } catch (err) { e.probe = { dur: 0, bad: String(err.message).slice(0, 200) }; log('Could not read', e.rel, '-', e.probe.bad); }
    e.probing = false;
    PC[e.rel] = { sig: e.sig, p: e.probe, hue: e.hue }; savePC(); version++;
  }
  // direct: the file is sent as it is. remux: the container changes, nothing is re-encoded.
  // audio: only the sound is converted to AAC. video: the picture is re-encoded to H.264.
  function mode(e) {
    const i = e.probe;
    if (!i || i.bad || !FF) return 'direct';
    const ext = path.extname(e.rel).slice(1).toLowerCase();
    const vOK = !i.vc || (['h264', 'vp8', 'vp9', 'av1'].includes(i.vc) && !(i.vc === 'h264' && /10le|12le|422|444/.test(i.pix))) || (C.directHevc && i.vc === 'hevc');
    const aOK = !i.ac || ['aac', 'mp3', 'opus', 'vorbis', 'flac'].includes(i.ac);
    const cOK = ['mp4', 'm4v', 'mov'].includes(ext) || (ext === 'webm' && ['vp8', 'vp9', 'av1', ''].includes(i.vc));
    if (vOK && aOK && cOK) return 'direct';
    if (!vOK) return 'video';
    if (!aOK || !['aac', 'mp3', ''].includes(i.ac)) return 'audio';
    return 'remux';
  }
  function makeThumb(e, big) {
    const k = big ? 'big' : 'small';
    e.tp = e.tp || {};
    if (e.tp[k]) return e.tp[k];
    const out = thumbPath(e, big);
    e.tp[k] = (async () => {
      if (fs.existsSync(out)) return out;
      if (!FF) throw new Error('ffmpeg not available');
      const d = (e.probe && e.probe.dur) || 0, W = big ? 1280 : 480, tmp = out + '.part.jpg';
      const attempt = t => thumbLim(() => run(C.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', t.toFixed(2), '-i', e.abs,
        '-an', '-sn', '-frames:v', '1', '-vf', `thumbnail=30,scale=${W}:-2`, '-q:v', big ? '3' : '5', '-y', tmp], { timeout: 120000 }));
      try { await attempt(d ? Math.min(Math.max(d * .14, 1), 300) : 5); if (!fs.existsSync(tmp)) throw new Error('no frame'); }
      catch (err) { await attempt(0); }
      await fsp.rename(tmp, out);
      if (!big) {
        e.th = true;
        try {
          const b = await run(C.ffmpeg, ['-v', 'error', '-i', out, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { timeout: 10000 });
          if (b.length >= 3) {
            const [R, G, B] = b, m = (R + G + B) / 3, k2 = x => Math.max(0, Math.min(255, Math.round(m + (x - m) * 1.7)));
            e.hue = `rgb(${k2(R)} ${k2(G)} ${k2(B)})`;
            PC[e.rel] = { sig: e.sig, p: e.probe, hue: e.hue }; savePC();
          }
        } catch (x) {}
        version++;
      }
      return out;
    })().catch(err => { e.tp[k] = null; if (!big) e.thFail = (e.thFail || 0) + 1; throw err; });
    return e.tp[k];
  }
  const needsThumb = e => !e.th && !(e.thFail >= 1) && !(e.probe && e.probe.bad);
  let working = false;
  async function work() {
    if (working || !FF) return;
    working = true;
    try {
      await Promise.all([...LIB.values()].filter(e => !e.probe).map(e => probeLim(() => probe(e))));
      await Promise.all([...LIB.values()].filter(needsThumb).map(e => makeThumb(e, false).catch(() => {})));
    } finally { working = false; }
    if ([...LIB.values()].some(e => !e.probe || needsThumb(e))) setTimeout(work, 500);
  }

  /* ---------- subtitles ---------- */
  function decodeText(buf) {
    const s = buf.toString('utf8').replace(/^\uFEFF/, '');
    return s.includes('\uFFFD') ? buf.toString('latin1') : s;
  }
  function toVtt(txt) {
    txt = txt.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (/^WEBVTT/.test(txt)) return txt;
    return 'WEBVTT\n\n' + txt.replace(/(\d{1,2}:\d\d:\d\d)[,.](\d{1,3})/g, (_, a, b) => (a.length === 7 ? '0' + a : a) + '.' + b.padEnd(3, '0'));
  }
  async function subtitles(e) {
    const out = path.join(C.cache, 'subs', `${e.id}_${e.tv}.vtt`);
    if (fs.existsSync(out)) return fsp.readFile(out, 'utf8');
    let txt = null;
    if (e.side) txt = toVtt(decodeText(await fsp.readFile(e.side)));
    else if (FF && e.probe && e.probe.sub >= 0)
      txt = (await run(C.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', e.abs, '-map', `0:s:${e.probe.sub}`, '-f', 'webvtt', 'pipe:1'], { timeout: 180000 })).toString('utf8');
    if (txt != null) await fsp.writeFile(out, txt);
    return txt;
  }

  /* ---------- streaming ---------- */
  const VMIME = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/webm', '.ogv': 'video/ogg' };
  function sendFile(req, res, abs, type, extra = {}) {
    let st; try { st = fs.statSync(abs); } catch (e) { return notFound(res); }
    if (!st.isFile()) return notFound(res);
    const size = st.size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', ...extra };
    if (m) {
      let start = m[1] ? +m[1] : size - +m[2], end = m[1] && m[2] ? +m[2] : size - 1;
      if (!m[1] && !m[2]) { start = 0; end = size - 1; }
      end = Math.min(end, size - 1);
      if (start > end || start < 0 || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return pipeFile(fs.createReadStream(abs, { start, end }), req, res);
    }
    res.writeHead(200, { ...head, 'Content-Length': size });
    if (req.method === 'HEAD') return res.end();
    pipeFile(fs.createReadStream(abs), req, res);
  }
  function pipeFile(rs, req, res) { rs.on('error', () => res.destroy()); req.on('close', () => rs.destroy()); rs.pipe(res); }

  // When the picture is copied rather than re-encoded, a stream can only begin on a keyframe.
  // This finds the keyframe at or before t, so the player knows exactly where the stream starts.
  async function keyframeAt(e, t) {
    if (!FF || t <= 0) return 0;
    for (const back of [12, 60]) {
      try {
        const out = (await run(C.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time,best_effort_timestamp_time',
          '-of', 'csv=p=0', '-read_intervals', `${Math.max(0, t - back).toFixed(3)}%${(t + 0.05).toFixed(3)}`, e.abs], { timeout: 20000 })).toString();
        const ks = out.split(/\s+/).map(l => parseFloat(l.split(',').find(x => x && x !== 'N/A'))).filter(x => isFinite(x) && x <= t + 0.05);
        if (ks.length) return Math.max(...ks);
      } catch (err) {}
    }
    return t;
  }
  const exactSeek = e => mode(e) === 'video';

  const JOBS = new Set();
  function transcode(req, res, e, start, force) {
    if (!FF) { res.writeHead(501, { 'Content-Type': 'text/plain' }); return res.end('ffmpeg is not installed on the server'); }
    let m = force === 'video' ? 'video' : mode(e);
    if (m === 'direct') m = 'remux';
    const i = e.probe || {};
    while (JOBS.size >= C.maxJobs) { const old = JOBS.values().next().value; JOBS.delete(old); old.kill('SIGKILL'); }
    const a = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
    if (start > 0) a.push('-ss', (m === 'video' ? start : start + 0.02).toFixed(3));
    a.push('-i', e.abs, '-map', '0:v:0?', '-map', i.aIndex >= 0 ? `0:a:${i.aIndex}` : '0:a:0?', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1');
    if (m === 'video') a.push(...ENC.args, '-vf', `scale=-2:'min(${C.maxH},ih)'`, '-g', '48', '-keyint_min', '24', '-sc_threshold', '0');
    else { a.push('-c:v', 'copy'); if (i.vc === 'hevc') a.push('-tag:v', 'hvc1'); }
    if (m !== 'video' && m !== 'audio' && ['aac', 'mp3'].includes(i.ac)) a.push('-c:a', 'copy');
    else a.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
    a.push('-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1');
    const p = spawn(C.ffmpeg, a, { windowsHide: true });
    JOBS.add(p);
    log(`▶ ${m === 'video' ? 'Converting' : m === 'audio' ? 'Converting audio of' : 'Repackaging'} ${e.rel}${start ? ' from ' + Math.round(start) + 's' : ''}`);
    let sent = false; const err = [];
    p.stdout.on('data', chunk => {
      if (!sent) { sent = true; res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'X-Start': String(start) }); }
      if (!res.write(chunk)) { p.stdout.pause(); res.once('drain', () => p.stdout.resume()); }
    });
    p.stderr.on('data', d => { err.push(d); if (err.length > 20) err.shift(); });
    p.on('error', x => { JOBS.delete(p); if (!sent) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(String(x.message)); } });
    p.on('close', code => {
      JOBS.delete(p);
      if (!sent) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Conversion failed: ' + Buffer.concat(err).toString().trim().split('\n').pop()); }
      else res.end();
      if (code && code !== 255 && err.length) log('ffmpeg:', Buffer.concat(err).toString().trim().split('\n').pop());
    });
    req.on('close', () => { if (p.exitCode === null) p.kill('SIGKILL'); });
  }

  /* ---------- http (req.url has already had the /chobi prefix removed) ---------- */
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
  function json(res, obj, code = 200) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
  function notFound(res) { if (!res.headersSent) res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
  function body(req) {
    return new Promise(resolve => {
      let s = ''; req.on('data', d => { s += d; if (s.length > 1e5) req.destroy(); });
      req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { resolve({}); } });
    });
  }
  function libraryJSON() {
    const all = [...LIB.values()];
    return {
      name: path.basename(C.movies), dir: C.movies, ffmpeg: FF, encoder: ENC ? ENC.name : null,
      scanning, version, pending: FF ? all.filter(e => !e.probe || needsThumb(e)).length : 0,
      videos: all.map(e => {
        const i = e.probe || {};
        return { id: e.id, rel: e.rel, size: e.size, mtime: Math.round(e.mtime), dur: i.dur || 0, w: i.w || 0, h: i.h || 0,
          vc: i.vc || '', ac: i.ac || '', ch: i.ch || 0, mode: mode(e), th: !!e.th, tv: e.tv, hue: e.hue || '', bad: !!i.bad,
          sub: !!(e.side || (FF && i.sub >= 0)), subName: e.side ? path.basename(e.side) : (FF && i.sub >= 0 ? 'Built into the file' : '') };
      })
    };
  }
  async function route(req, res) {
    const u = new URL(req.url, 'http://local');
    let p; try { p = decodeURIComponent(u.pathname); } catch (e) { return notFound(res); }

    if (p === '/api/library') return json(res, libraryJSON());
    if (p === '/api/state') return json(res, DATA);
    if (req.method === 'POST') {
      const b = await body(req);
      if (p === '/api/pos' && /^[a-f0-9]{12}$/.test(b.id)) {
        DATA.pos[b.id] = { t: Math.max(0, +b.t || 0), d: Math.max(0, +b.d || 0), at: Date.now() }; saveData(); return json(res, { ok: true });
      }
      if (p === '/api/list' && typeof b.key === 'string' && b.key.length < 300) {
        const s = new Set(DATA.list); if (b.on) s.add(b.key); else s.delete(b.key); DATA.list = [...s]; saveData(); return json(res, { ok: true });
      }
      if (p === '/api/history/clear') { DATA.pos = {}; saveData(); return json(res, { ok: true }); }
      if (p === '/api/rescan') { await scan(); return json(res, { ok: true, videos: LIB.size }); }
      return json(res, { error: 'unknown request' }, 400);
    }
    const m = p.match(/^\/api\/video\/([a-f0-9]{12})\/(stream|play|thumb|subs|seek)$/);
    if (m) {
      const e = LIB.get(m[1]); if (!e) return notFound(res);
      if (m[2] === 'stream') return sendFile(req, res, e.abs, VMIME[path.extname(e.rel).toLowerCase()] || 'video/mp4');
      if (m[2] === 'seek') {
        const t = Math.max(0, +u.searchParams.get('t') || 0), force = u.searchParams.get('force') === 'video';
        return json(res, { start: force || exactSeek(e) ? t : await keyframeAt(e, t) });
      }
      if (m[2] === 'play') return transcode(req, res, e, Math.max(0, +u.searchParams.get('start') || 0), u.searchParams.get('force'));
      if (m[2] === 'thumb') {
        try { const f = await makeThumb(e, u.searchParams.get('size') === 'big'); return sendFile(req, res, f, 'image/jpeg', { 'Cache-Control': 'public, max-age=31536000, immutable' }); }
        catch (err) { return notFound(res); }
      }
      if (m[2] === 'subs') {
        try { const t = await subtitles(e); if (t == null) return notFound(res); res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'no-cache' }); return res.end(t); }
        catch (err) { log('Subtitles failed for', e.rel, '-', err.message); return notFound(res); }
      }
    }
    if (p.startsWith('/api/')) return notFound(res);
    // static files from public/chobi
    let f = path.resolve(C.pub, '.' + (p === '/' ? '/index.html' : p));
    if (!f.startsWith(C.pub + path.sep)) return notFound(res);
    try { if ((await fsp.stat(f)).isDirectory()) f = path.join(f, 'index.html'); } catch (e) { return notFound(res); }
    return sendFile(req, res, f, MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
  }
  function handle(req, res) {
    route(req, res).catch(err => { console.error(err); if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Server error'); });
  }

  async function start() {
    let watchT;
    const soon = () => { clearTimeout(watchT); watchT = setTimeout(scan, 2500); };
    try { fs.watch(C.movies, { recursive: true }, soon); }
    catch (e) { try { fs.watch(C.movies, soon); } catch (x) {} }
    setInterval(scan, 5 * 60 * 1000).unref();
    await scan();
  }
  const shutdown = () => JOBS.forEach(p => p.kill('SIGKILL'));
  const status = () => {
    const all = [...LIB.values()];
    return { scanning, videos: LIB.size, ffmpeg: FF, encoder: ENC ? ENC.name : null,
      pending: FF ? all.filter(e => !e.probe || needsThumb(e)).length : 0, dir: C.movies };
  };

  return { start, handle, status, shutdown, dir: C.movies, ffmpeg: FF, encoder: ENC ? ENC.name : null };
}
