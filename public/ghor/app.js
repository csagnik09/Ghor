/* ঘর — home dashboard
   Clock, weather (Open-Meteo, no API key), apps, switches, calendar and alarms.
   Everything is saved in this browser's localStorage. */
(() => {
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* =====================================================================
   Language
   ===================================================================== */
const L = {
  en: {
    home: "Home", calendar: "Calendar", alarms: "Alarms",
    online: "Online", offline: "Offline",
    morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night",
    gMorning: "Good morning", gAfternoon: "Good afternoon", gEvening: "Good evening", gNight: "Good night",
    am: "AM", pm: "PM",
    sunrise: "Sunrise", sunset: "Sunset", daylight: "{h}h {m}m of daylight",
    weather: "Weather", feels: "Feels like", humidity: "Humidity", wind: "Wind", rain: "Rain",
    loading: "Loading…", wFail: "Weather unavailable", retry: "retry", cityNF: "Couldn't find “{c}”", kmh: "km/h", mph: "mph",
    Clear: "Clear", MostlyClear: "Mostly clear", PartlyCloudy: "Partly cloudy", Overcast: "Overcast", Fog: "Fog",
    Drizzle: "Drizzle", Rain: "Rain", HeavyRain: "Heavy rain", Snow: "Snow", Showers: "Showers",
    SnowShowers: "Snow showers", Thunderstorm: "Thunderstorm",
    apps: "Apps", addApp: "＋ Add app", notSet: "Not set up yet · tap to add link",
    songs: "{n} songs", song1: "1 song", albums: "{n} albums", album1: "1 album", videos: "{n} videos", video1: "1 video",
    scanning: "Scanning…", preparing: "Preparing {n}", noFiles: "No files yet", setUp: "Set up", empty: "Empty · add files on the server", unreachable: "Server not reachable",
    switches: "Switches", addSwitch: "＋ Add switch", on: "On", off: "Off", tapToRun: "Tap to trigger",
    noSwitches: "No switches yet. Add one with a link to call when it's pressed.",
    sent: "{n}: sent", turnedOn: "{n} turned on", turnedOff: "{n} turned off", failed: "Couldn't reach {n}",
    noLink: "Add a link for {n} in Settings",
    today: "Today", tomorrow: "Tomorrow", add: "Add", allDay: "All day",
    eventPh: "Event name", noEvents: "No events on this day.", evAdded: "Event added", deleted: "Deleted",
    alarm: "Alarm", labelPh: "Label (optional)", once: "Once", everyday: "Every day", weekdays: "Weekdays", weekends: "Weekends",
    noAlarms: "No alarms yet. Pick a time and days, then press Add.", alarmSet: "Alarm set for {t}",
    soundHint: "Tap anywhere on this screen once so alarms can play sound.",
    snooze: "Snooze 5 min", stop: "Stop", snoozed: "Snoozed until {t}",
    settings: "Settings", theme: "Theme",
    themeAuto: "Auto (light from sunrise to sunset)", themeLight: "Light", themeDark: "Dark",
    themeShort: { auto: "Auto", light: "Light", dark: "Dark" },
    themeNote: "The theme is shared with সুর and ছবি.",
    yourName: "Your name (for the greeting)", city: "Weather city", units: "Units", clock: "Clock",
    h12: "12-hour", h24: "24-hour", appButtons: "App buttons", newTab: "Open apps in a new tab",
    switchNote: "Each switch calls a link. Add an OFF link to make it an on/off toggle, or leave it empty for a one-tap button.",
    namePh: "Name", onPh: "Link to call (ON)", offPh: "OFF link (optional)",
    cancel: "Cancel", save: "Save", saved: "Saved", app: "App", switchN: "Switch"
  }
};
const t = (k, v = {}) => {
  const s = L.en[k] ?? k;
  return typeof s === "string" ? s.replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "") : s;
};
const num = s => String(s);
const loc = () => "en-IN";

/* =====================================================================
   Storage + settings
   ===================================================================== */
const store = {
  get(k, d) { try { const v = localStorage.getItem("ghor." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ghor." + k, JSON.stringify(v)); } catch (e) {} }
};
const DEFAULTS = {
  theme: "auto", name: "", city: "Katwa", units: "c", clock: "12", newTab: false,
  apps: [
    { name: "সুর", sub: "Music", url: "/sur/", icon: "music", color: "#1db954" },
    { name: "ছবি", sub: "Movies & shows", url: "/chobi/", icon: "chobi", color: "#1db954" }
  ],
  switches: []
};
let cfg = Object.assign({}, DEFAULTS, store.get("cfg", {}));
/* settings saved before ঘর served সুর and ছবি itself: point the old tiles at the built-in apps */
(function migrate() {
  let changed = false;
  cfg.apps = (cfg.apps || []).map(a => {
    if (a.icon === "music" && /claude\.ai\/code\/artifact\//.test(a.url || "")) { changed = true; return { ...a, url: "/sur/", sub: "Music" }; }
    if (a.icon === "film" && !a.url && a.name === "Movies") { changed = true; return { ...a, name: "ছবি", url: "/chobi/", sub: "Movies & shows", icon: "chobi", color: "#1db954" }; }
    if (a.icon === "film" && /^\/chobi\/?$/.test(a.url || "")) { changed = true; return { ...a, icon: "chobi", color: "#1db954" }; }
    return a;
  });
  if (changed) store.set("cfg", cfg);
})();
let events = store.get("events", []);   // {id, date:"YYYY-MM-DD", time:"HH:MM"|"", title}
let alarms = store.get("alarms", []);   // {id, time:"HH:MM", label, days:[0-6], on}
const saveCfg = () => store.set("cfg", cfg);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

/* time "HH:MM" or (h, m) → display string in current clock + language */
function fmtHM(h, m, split = false) {
  if (typeof h === "string") [h, m] = h.split(":").map(Number);
  let ap = "";
  if (cfg.clock === "12") { ap = t(h < 12 ? "am" : "pm"); h = h % 12 || 12; }
  const main = num((cfg.clock === "12" ? h : pad(h)) + ":" + pad(m));
  return split ? [main, ap] : (ap ? main + " " + ap : main);
}
const fmtDate = d => fmtHM(d.getHours(), d.getMinutes());

/* =====================================================================
   Icons
   ===================================================================== */
const ICONS = {
  music: '<svg viewBox="0 0 90 90"><path d="M14 45C24 17 36 17 45 45S66 73 76 45" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
  chobi: '<svg viewBox="0 0 90 90"><path d="M36 28v34l28-17z" fill="currentColor" stroke="currentColor" stroke-width="9" stroke-linejoin="round"/></svg>',
  film:  '<svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v2h2V7zm12 0v2h2V7zM5 11v2h2v-2zm12 0v2h2v-2zM5 15v2h2v-2zm12 0v2h2v-2zM10 9v6l5-3z"/></svg>',
  app:   '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M8 5l8 7-8 7z"/></svg>',
  plus:  '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  bulb:  '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zM9 20h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/></svg>',
  bolt:  '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  x:     '<svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>',
  cal:   '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zM5 9v10h14V9z"/></svg>',
  alarm: '<svg viewBox="0 0 24 24"><path d="M12 4a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-1 4v6l5 3 1-1.6-4-2.4V8z"/></svg>'
};
const W = {
  sun:   '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="4" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g></svg>',
  moon:  '<svg viewBox="0 0 64 64"><path d="M44 42A18 18 0 0 1 26 14a18 18 0 1 0 22 22 18 18 0 0 1-4 6z" fill="#c9c6ff"/></svg>',
  partD: '<svg viewBox="0 0 64 64"><circle cx="24" cy="24" r="10" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="3.5" stroke-linecap="round"><path d="M24 6v4M8 24h4M11.3 11.3l3 3M36.7 11.3l-3 3"/></g><path d="M22 50h26a10 10 0 0 0 0-20 13 13 0 0 0-25 4 8 8 0 0 0-1 16z" fill="#dfe2ee"/></svg>',
  partN: '<svg viewBox="0 0 64 64"><path d="M34 26A12 12 0 0 1 22 10a12 12 0 1 0 14 14z" fill="#c9c6ff"/><path d="M22 50h26a10 10 0 0 0 0-20 13 13 0 0 0-25 4 8 8 0 0 0-1 16z" fill="#dfe2ee"/></svg>',
  cloud: '<svg viewBox="0 0 64 64"><path d="M18 48h30a11 11 0 0 0 0-22 15 15 0 0 0-29 4 9 9 0 0 0-1 18z" fill="#c4c8d6"/></svg>',
  fog:   '<svg viewBox="0 0 64 64"><path d="M18 36h30a10 10 0 0 0 0-20 14 14 0 0 0-27 4 8 8 0 0 0-3 16z" fill="#c4c8d6"/><g stroke="#9aa0b4" stroke-width="4" stroke-linecap="round"><path d="M12 44h40M18 52h30"/></g></svg>',
  rain:  '<svg viewBox="0 0 64 64"><path d="M18 38h30a10 10 0 0 0 0-20 14 14 0 0 0-27 4 8 8 0 0 0-3 16z" fill="#c4c8d6"/><g stroke="#4ea8ff" stroke-width="4" stroke-linecap="round"><path d="M22 45l-3 8M33 45l-3 8M44 45l-3 8"/></g></svg>',
  storm: '<svg viewBox="0 0 64 64"><path d="M18 36h30a10 10 0 0 0 0-20 14 14 0 0 0-27 4 8 8 0 0 0-3 16z" fill="#9aa0b4"/><path d="M34 38l-8 12h7l-4 10 11-14h-7l4-8z" fill="#ffc83d"/></svg>',
  snow:  '<svg viewBox="0 0 64 64"><path d="M18 38h30a10 10 0 0 0 0-20 14 14 0 0 0-27 4 8 8 0 0 0-3 16z" fill="#c4c8d6"/><g fill="#e9f3ff"><circle cx="22" cy="48" r="3"/><circle cx="33" cy="53" r="3"/><circle cx="44" cy="48" r="3"/></g></svg>'
};
function wx(code, day = true) { // WMO code → [label key, icon]
  if (code === 0) return ["Clear", day ? W.sun : W.moon];
  if (code <= 2) return [code === 1 ? "MostlyClear" : "PartlyCloudy", day ? W.partD : W.partN];
  if (code === 3) return ["Overcast", W.cloud];
  if (code === 45 || code === 48) return ["Fog", W.fog];
  if (code >= 51 && code <= 57) return ["Drizzle", W.rain];
  if (code >= 61 && code <= 67) return [code >= 65 ? "HeavyRain" : "Rain", W.rain];
  if (code >= 71 && code <= 77) return ["Snow", W.snow];
  if (code >= 80 && code <= 82) return ["Showers", W.rain];
  if (code >= 85 && code <= 86) return ["SnowShowers", W.snow];
  if (code >= 95) return ["Thunderstorm", W.storm];
  return ["Overcast", W.cloud];
}

/* =====================================================================
   Toast, fullscreen, network
   ===================================================================== */
let tt;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2400);
}
Home.fullscreen.bind($("#fs"));
function net() {
  const on = navigator.onLine;
  $("#net").classList.toggle("off", !on);
  $("#net span").textContent = t(on ? "online" : "offline");
}
addEventListener("online", () => { net(); loadWeather(); });
addEventListener("offline", net);

/* =====================================================================
   Theme — shared with সুর and ছবি (see /shared/home.js). Auto follows sunrise/sunset.
   ===================================================================== */
let sun = null; // {rise, set} for today
function applyTheme() {
  Home.theme.apply();
  const want = Home.theme.resolved(), m = Home.theme.mode();
  $('meta[name="theme-color"]').content = want === "light" ? "#e6e5f0" : "#0f1014";
  $("#theme").dataset.m = m;
  $("#theme").title = t("theme") + ": " + t("themeShort")[m];
}
Home.theme.onChange(applyTheme);
$("#theme").onclick = () => {
  Home.theme.set({ auto: "light", light: "dark", dark: "auto" }[Home.theme.mode()] || "auto");
  toast(t("theme") + ": " + t("themeShort")[Home.theme.mode()]);
};

/* =====================================================================
   Views
   ===================================================================== */
function show(v) {
  $("#app").dataset.view = v;
  $$(".nav").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $$(".view").forEach(el => el.hidden = el.id !== "v-" + v);
  if (v === "cal") renderCal();
  if (v === "alarm") { renderAlarms(); soundHint(); }
  scrollTo({ top: 0 });
}
$$(".nav").forEach(b => b.onclick = () => show(b.dataset.v));

/* =====================================================================
   Clock
   ===================================================================== */
let lastMinute = "";
function tick() {
  const d = new Date(), hr = d.getHours();
  const [main, ap] = fmtHM(hr, d.getMinutes(), true);
  $("#hm").textContent = main;
  $("#sec").textContent = num(pad(d.getSeconds()));
  $("#ampm").textContent = ap;

  // 5–12 morning, 12–17 afternoon, 17–22 evening, 22–5 night
  const part = hr >= 5 && hr < 12 ? "morning" : hr >= 12 && hr < 17 ? "afternoon" : hr >= 17 && hr < 22 ? "evening" : "night";
  const hello = t("g" + part[0].toUpperCase() + part.slice(1));
  const greet = cfg.name ? `${hello}, ${cfg.name}` : hello;
  if ($("#greet").textContent !== greet) $("#greet").textContent = greet;
  if ($("#hIcon").dataset.p !== part) { $("#hIcon").dataset.p = part; $("#hIcon").innerHTML = part === "morning" ? W.partD : part === "afternoon" ? W.sun : W.moon; }

  const hue = hr < 5 ? "#1e1b4b" : hr < 8 ? "#b4532a" : hr < 16 ? "#1f5f8b" : hr < 19 ? "#8a3a6b" : hr < 21 ? "#3b2a6b" : "#1e1b4b";
  document.documentElement.style.setProperty("--hue", hue);

  if (sun) {
    const p = Math.min(1, Math.max(0, (d - sun.rise) / (sun.set - sun.rise)));
    $("#sunfill").style.width = p * 100 + "%";
    $("#sundot").style.left = p * 100 + "%";
    $("#sundot").style.opacity = d > sun.set || d < sun.rise ? .35 : 1;
  }

  const minuteKey = iso(d) + " " + pad(hr) + ":" + pad(d.getMinutes());
  if (minuteKey !== lastMinute) {
    const dayChanged = lastMinute.slice(0, 10) !== minuteKey.slice(0, 10);
    lastMinute = minuteKey;
    $("#date").textContent = d.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    applyTheme();
    checkAlarms(d, hr, d.getMinutes());
    renderGlance();
    if (dayChanged && $("#app").dataset.view === "cal") renderCal();
    if (hr === 3 && d.getMinutes() === 0) location.reload(); // nightly refresh for kiosks
  }
  if (snoozeAt && Date.now() >= snoozeAt) { const a = snoozeAlarm; snoozeAt = 0; ring(a); }
}

/* =====================================================================
   Weather
   ===================================================================== */
let place = store.get("place", null);
let lastW = 0, wData = store.get("lastWeather", null);

async function geocode(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const j = await r.json();
  if (!j.results || !j.results.length) throw new Error("NF");
  const g = j.results[0];
  return { city, lat: g.latitude, lon: g.longitude, label: [g.name, g.admin1, g.country_code].filter(Boolean).join(", ") };
}
async function loadWeather() {
  if (!navigator.onLine) return;
  $("#wUpd").textContent = "…";
  try {
    if (!place || place.city.toLowerCase() !== cfg.city.trim().toLowerCase()) {
      place = await geocode(cfg.city.trim() || DEFAULTS.city);
      store.set("place", place);
    }
    const f = cfg.units === "f";
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat + "&longitude=" + place.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max" +
      "&timezone=auto&forecast_days=5" + (f ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "");
    wData = await (await fetch(url)).json();
    wData._at = Date.now();
    store.set("lastWeather", wData);
    lastW = Date.now();
    renderWeather();
  } catch (e) {
    $("#wUpd").textContent = t("retry");
    toast(e.message === "NF" ? t("cityNF", { c: cfg.city }) : t("wFail"));
    if (wData) renderWeather(); else $("#wDesc").textContent = t("wFail");
  }
}
function renderWeather() {
  const j = wData;
  if (!j || !j.current) { $("#wDesc").textContent = t("loading"); return; }
  const c = j.current, d = j.daily, ws = t(cfg.units === "f" ? "mph" : "kmh");
  const [key, icon] = wx(c.weather_code, !!c.is_day);
  $("#wIcon").innerHTML = icon;
  $("#wTemp").textContent = num(Math.round(c.temperature_2m)) + "°";
  $("#wDesc").textContent = t(key);
  $("#wPlace").textContent = place ? place.label : "";
  $("#wFeel").textContent = num(Math.round(c.apparent_temperature)) + "°";
  $("#wHum").textContent = num(c.relative_humidity_2m) + "%";
  $("#wWind").textContent = num(Math.round(c.wind_speed_10m)) + " " + ws;
  $("#wRain").textContent = num(d.precipitation_probability_max?.[0] ?? 0) + "%";
  $("#wUpd").textContent = j._at ? fmtDate(new Date(j._at)) : "—";

  sun = { rise: new Date(d.sunrise[0]), set: new Date(d.sunset[0]) };
  Home.theme.setSun(sun.rise, sun.set);   // so Auto switches at the same moment in সুর and ছবি
  $("#srise").textContent = fmtDate(sun.rise);
  $("#sset").textContent = fmtDate(sun.set);
  const mins = Math.round((sun.set - sun.rise) / 60000);
  $("#daylen").textContent = t("daylight", { h: num(Math.floor(mins / 60)), m: num(mins % 60) });

  $("#wDays").innerHTML = d.time.slice(1, 5).map((day, i) => {
    const k = i + 1, [lb, ic] = wx(d.weather_code[k]);
    const name = new Date(day + "T12:00").toLocaleDateString(loc(), { weekday: "short" });
    return `<div class="day" style="animation-delay:${i * 60}ms" title="${esc(t(lb))}">
      <div class="wi">${ic}</div>
      <div><b>${esc(name)}</b><span>${num(Math.round(d.temperature_2m_max[k]))}° / ${num(Math.round(d.temperature_2m_min[k]))}°</span></div>
    </div>`;
  }).join("");
  applyTheme();
  tick();
}
$("#wRefresh").onclick = loadWeather;
setInterval(loadWeather, 15 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastW > 10 * 60 * 1000) loadWeather();
});

/* =====================================================================
   Apps
   ===================================================================== */
const isBn = s => /[ঀ-৿]/.test(s);
/* tiles for the apps this server runs show live library numbers */
const svcOf = url => { const m = /^\/(sur|chobi)\/?$/.exec(url || ""); return m ? m[1] : ""; };
let svc = null;
const cnt = (n, one, many) => n === 1 ? t(one) : t(many, { n: num(n) });
function svcText(k, sub) {
  if (svc === false) return t("unreachable");
  const s = svc && svc[k]; if (!s) return sub;
  if (k === "sur") {
    if (!s.tracks) return s.scanning ? t("scanning") : t("empty");
    return [sub, cnt(s.tracks, "song1", "songs"), cnt(s.albums, "album1", "albums")].filter(Boolean).join(" · ");
  }
  if (!s.videos) return s.scanning ? t("scanning") : t("empty");
  return [sub, cnt(s.videos, "video1", "videos"), s.pending ? t("preparing", { n: num(s.pending) }) : ""].filter(Boolean).join(" · ");
}
function svcShort(k) {
  const s = svc && svc[k];
  if (svc === false) return t("offline");
  if (!s) return "";
  if (k === "sur") return s.tracks ? cnt(s.tracks, "song1", "songs") : s.scanning ? t("scanning") : t("noFiles");
  return s.videos ? cnt(s.videos, "video1", "videos") : s.scanning ? t("scanning") : t("noFiles");
}
function paintSvc() {
  $$("#tiles [data-svc]").forEach(el => {
    el.textContent = svcShort(el.dataset.svc);
    el.closest(".app").title = el.closest(".app").dataset.name + " · " + svcText(el.dataset.svc, el.dataset.sub);
  });
}
async function loadStatus() {
  try { const r = await fetch("/api/status", { cache: "no-store" }); if (!r.ok) throw 0; svc = await r.json(); }
  catch (e) { svc = false; }
  paintSvc();
}
setInterval(() => { if (!document.hidden) loadStatus(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) loadStatus(); });
function renderApps() {
  $("#tiles").innerHTML = cfg.apps.map((a, i) => {
    const todo = !a.url, tag = todo ? "button" : "a";
    const href = todo ? "" : ` href="${esc(a.url)}"${cfg.newTab ? ' target="_blank" rel="noopener"' : ""}`;
    const k = !todo && svcOf(a.url), full = a.icon === "music" || a.icon === "chobi";
    const tip = todo ? t("notSet") : a.sub ? `${a.name} · ${a.sub}` : `${a.name} · ${a.url}`;
    return `<${tag} class="app${todo ? " todo" : ""}"${href} data-name="${esc(a.name)}" title="${esc(tip)}" style="animation-delay:${i * 40}ms">
      <span class="aicon${full ? " full" : ""}" style="background:${esc(a.color || "#1db954")}">${todo ? ICONS.plus : ICONS[a.icon] || ICONS.app}</span>
      <b${isBn(a.name) ? ' class="bn"' : ""}>${esc(a.name)}</b>
      ${k ? `<small data-svc="${k}" data-sub="${esc(a.sub || "")}">${esc(svcShort(k))}</small>` : todo ? `<small class="set">${esc(t("setUp"))}</small>` : ""}
    </${tag}>`;
  }).join("");
  $$("#tiles .app.todo").forEach(b => b.onclick = () => openSettings());
  paintSvc();
}
$("#addApp").onclick = () => { openSettings(); addAppRow({ name: "", url: "", icon: "app" }, true); };

/* =====================================================================
   Switches — each one calls a link (e.g. an ESP8266 / Tasmota / Shelly URL)
   ===================================================================== */
async function hit(url) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
  try {
    // no-cors: home devices rarely send CORS headers; we only need the request to reach them
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctl.signal });
    return true;
  } catch (e) { return false; } finally { clearTimeout(to); }
}
function renderSwitches() {
  const box = $("#switches");
  if (!cfg.switches.length) { box.innerHTML = `<div class="empty">${esc(t("noSwitches"))}</div>`; return; }
  box.innerHTML = cfg.switches.map((s, i) => {
    const toggle = !!s.off;
    const state = toggle ? (s.state ? t("on") : t("off")) : t("tapToRun");
    return `<button class="tile sw${toggle && s.state ? " is-on" : ""}" data-id="${esc(s.id)}" style="animation-delay:${i * 50}ms" aria-pressed="${toggle ? !!s.state : "false"}">
      <span class="ticon">${toggle ? ICONS.bulb : ICONS.bolt}</span>
      <span class="tt"><b>${esc(s.name)}</b><small>${esc(state)}</small></span>
      ${toggle ? '<span class="toggle"></span>' : `<span class="go">${ICONS.arrow}</span>`}
    </button>`;
  }).join("");
  $$("#switches .sw").forEach(el => el.onclick = () => pressSwitch(el.dataset.id, el));
}
async function pressSwitch(id, el) {
  const s = cfg.switches.find(x => x.id === id);
  if (!s) return;
  if (!s.on && !s.off) { toast(t("noLink", { n: s.name })); openSettings(); return; }
  el.classList.add("busy");
  if (s.off) {
    const next = !s.state;
    const ok = await hit(next ? s.on : s.off);
    if (ok) { s.state = next; saveCfg(); toast(t(next ? "turnedOn" : "turnedOff", { n: s.name })); }
    else toast(t("failed", { n: s.name }));
    renderSwitches();
  } else {
    el.classList.add("is-on");
    const ok = await hit(s.on);
    toast(ok ? t("sent", { n: s.name }) : t("failed", { n: s.name }));
    setTimeout(() => { el.classList.remove("is-on", "busy"); }, 500);
  }
}
$("#addSw").onclick = () => {
  openSettings();
  const row = addSwRow({ id: uid(), name: "", on: "", off: "" }, true);
  row.scrollIntoView({ block: "center" });
};

/* =====================================================================
   Calendar
   ===================================================================== */
let calY, calM, selDate = iso(new Date());
{ const n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); }
const saveEvents = () => store.set("events", events);
const sortEv = (a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));

function renderCal() {
  const first = new Date(calY, calM, 1);
  $("#calTitle").textContent = first.toLocaleDateString(loc(), { month: "long", year: "numeric" });
  // week header (Sunday first)
  const sun0 = new Date(2026, 9, 4); // a Sunday
  $("#calWeek").innerHTML = Array.from({ length: 7 }, (_, i) =>
    `<div>${esc(new Date(sun0.getFullYear(), sun0.getMonth(), sun0.getDate() + i).toLocaleDateString(loc(), { weekday: "short" }))}</div>`).join("");
  const start = new Date(calY, calM, 1 - first.getDay());
  const today = iso(new Date());
  const count = {};
  events.forEach(e => count[e.date] = (count[e.date] || 0) + 1);
  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = iso(d);
    const cls = ["cd", d.getMonth() !== calM && "out", k === today && "today", k === selDate && "sel"].filter(Boolean).join(" ");
    const dots = Math.min(3, count[k] || 0);
    html += `<button class="${cls}" data-d="${k}"><span>${num(d.getDate())}</span><span class="dots">${"<i></i>".repeat(dots)}</span></button>`;
  }
  $("#calGrid").innerHTML = html;
  $$("#calGrid .cd").forEach(b => b.onclick = () => {
    selDate = b.dataset.d;
    const d = fromIso(selDate);
    if (d.getMonth() !== calM) { calY = d.getFullYear(); calM = d.getMonth(); }
    renderCal();
  });
  renderDay();
}
function renderDay() {
  const d = fromIso(selDate), today = iso(new Date());
  const label = d.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long" });
  $("#dayTitle").textContent = selDate === today ? `${t("today")} · ${label}` : label;
  const list = events.filter(e => e.date === selDate).sort(sortEv);
  $("#evList").innerHTML = list.length ? list.map(e => `
    <div class="item">
      <span class="tm">${e.time ? fmtHM(e.time) : esc(t("allDay"))}</span>
      <span class="tx"><b>${esc(e.title)}</b></span>
      <button class="del" data-id="${esc(e.id)}" aria-label="Delete">${ICONS.x}</button>
    </div>`).join("") : `<div class="empty">${esc(t("noEvents"))}</div>`;
  $$("#evList .del").forEach(b => b.onclick = () => {
    events = events.filter(e => e.id !== b.dataset.id); saveEvents(); renderCal(); renderGlance(); toast(t("deleted"));
  });
}
$("#calPrev").onclick = () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); };
$("#calNext").onclick = () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); };
$("#calToday").onclick = () => { const n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); selDate = iso(n); renderCal(); };
$("#evForm").onsubmit = e => {
  e.preventDefault();
  const title = $("#evTitle").value.trim();
  if (!title) return;
  events.push({ id: uid(), date: selDate, time: $("#evTime").value || "", title });
  events.sort(sortEv); saveEvents();
  $("#evTitle").value = ""; $("#evTime").value = "";
  renderCal(); renderGlance(); toast(t("evAdded"));
};

/* =====================================================================
   Alarms
   ===================================================================== */
const saveAlarms = () => store.set("alarms", alarms);
let newDays = new Set();
const dayName = (i, style = "short") => new Date(2026, 9, 4 + i).toLocaleDateString(loc(), { weekday: style });

function renderDayPicker() {
  $("#alDays").innerHTML = Array.from({ length: 7 }, (_, i) =>
    `<button type="button" class="${newDays.has(i) ? "on" : ""}" data-i="${i}">${esc(dayName(i))}</button>`).join("");
  $$("#alDays button").forEach(b => b.onclick = () => {
    const i = +b.dataset.i; newDays.has(i) ? newDays.delete(i) : newDays.add(i); renderDayPicker();
  });
}
function repeatText(days) {
  if (!days.length) return t("once");
  if (days.length === 7) return t("everyday");
  const s = [...days].sort().join("");
  if (s === "12345") return t("weekdays");
  if (s === "06") return t("weekends");
  return [...days].sort().map(i => dayName(i)).join(", ");
}
function renderAlarms() {
  renderDayPicker();
  const list = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
  $("#alList").innerHTML = list.length ? list.map(a => {
    const [main, ap] = fmtHM(a.time, 0, true);
    return `<div class="item alarm${a.on ? "" : " off"}">
      <span class="big">${main}<small>${esc(ap)}</small></span>
      <span class="tx"><b>${esc(a.label || t("alarm"))}</b><small>${esc(repeatText(a.days))}</small></span>
      <button class="toggle${a.on ? " on" : ""}" data-id="${esc(a.id)}" aria-pressed="${a.on}" aria-label="On/off"></button>
      <button class="del" data-id="${esc(a.id)}" aria-label="Delete">${ICONS.x}</button>
    </div>`;
  }).join("") : `<div class="empty">${esc(t("noAlarms"))}</div>`;
  $$("#alList .toggle").forEach(b => b.onclick = () => {
    const a = alarms.find(x => x.id === b.dataset.id); a.on = !a.on; saveAlarms(); renderAlarms(); renderGlance();
  });
  $$("#alList .del").forEach(b => b.onclick = () => {
    alarms = alarms.filter(x => x.id !== b.dataset.id); saveAlarms(); renderAlarms(); renderGlance(); toast(t("deleted"));
  });
}
$("#alForm").onsubmit = e => {
  e.preventDefault();
  const time = $("#alTime").value;
  if (!time) return;
  alarms.push({ id: uid(), time, label: $("#alLabel").value.trim(), days: [...newDays].sort(), on: true });
  saveAlarms();
  $("#alLabel").value = ""; newDays = new Set();
  renderAlarms(); renderGlance(); unlockAudio(); soundHint();
  toast(t("alarmSet", { t: fmtHM(time) }));
};

/* next time an alarm will ring, as a Date */
function nextRing(a, from = new Date()) {
  const [h, m] = a.time.split(":").map(Number);
  for (let k = 0; k < 8; k++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + k, h, m);
    if (d <= from) continue;
    if (!a.days.length || a.days.includes(d.getDay())) return d;
  }
  return null;
}
function checkAlarms(d, h, m) {
  const hm = pad(h) + ":" + pad(m);
  alarms.forEach(a => {
    if (!a.on || a.time !== hm) return;
    if (a.days.length && !a.days.includes(d.getDay())) return;
    if (a._last === iso(d)) return; // already rang today
    a._last = iso(d);
    if (!a.days.length) a.on = false; // one-time alarm
    saveAlarms();
    ring(a);
  });
}

/* --- sound: Web Audio beeps (browsers need one tap before audio is allowed) --- */
let actx = null, beepTimer = null, ringTimeout = null, snoozeAt = 0, snoozeAlarm = null, ringing = null;
function unlockAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume().then(soundHint);
  } catch (e) {}
  soundHint();
}
function soundHint() { $("#soundHint").hidden = !!(actx && actx.state === "running"); }
addEventListener("pointerdown", unlockAudio);
addEventListener("keydown", unlockAudio);

function beep() {
  if (!actx) return;
  const now = actx.currentTime;
  [0, .18, .36].forEach(off => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0, now + off);
    g.gain.linearRampToValueAtTime(.35, now + off + .02);
    g.gain.linearRampToValueAtTime(0, now + off + .14);
    o.connect(g).connect(actx.destination);
    o.start(now + off); o.stop(now + off + .16);
  });
  navigator.vibrate?.([200, 100, 200]);
}
function ring(a) {
  ringing = a;
  $("#ringTime").textContent = fmtHM(a.time);
  $("#ringLabel").textContent = a.label || t("alarm");
  $("#ring").classList.add("on");
  unlockAudio(); beep();
  clearInterval(beepTimer); beepTimer = setInterval(beep, 1200);
  clearTimeout(ringTimeout); ringTimeout = setTimeout(stopRing, 10 * 60 * 1000); // give up after 10 min
  renderGlance(); if ($("#app").dataset.view === "alarm") renderAlarms();
}
function stopRing() {
  clearInterval(beepTimer); clearTimeout(ringTimeout);
  $("#ring").classList.remove("on"); ringing = null;
}
$("#stopAl").onclick = () => { snoozeAt = 0; stopRing(); };
$("#snooze").onclick = () => {
  snoozeAlarm = ringing; snoozeAt = Date.now() + 5 * 60 * 1000;
  stopRing(); toast(t("snoozed", { t: fmtDate(new Date(snoozeAt)) }));
};

/* =====================================================================
   At-a-glance list under the clock: today's events + next alarm
   ===================================================================== */
function renderGlance() {
  const now = new Date(), today = iso(now);
  const nowHM = pad(now.getHours()) + ":" + pad(now.getMinutes());
  const todays = events.filter(e => e.date === today && (!e.time || e.time >= nowHM)).sort(sortEv).slice(0, 3);
  let html = todays.map(e =>
    `<div class="gl" data-go="cal">${ICONS.cal}<span>${esc(e.title)}</span><em>${e.time ? fmtHM(e.time) : esc(t("allDay"))}</em></div>`).join("");

  let best = null, bestA = null;
  alarms.filter(a => a.on).forEach(a => { const d = nextRing(a, now); if (d && (!best || d < best)) { best = d; bestA = a; } });
  if (snoozeAt && (!best || snoozeAt < best)) { best = new Date(snoozeAt); bestA = snoozeAlarm; }
  if (best) {
    const diff = Math.round((fromIso(iso(best)) - fromIso(today)) / 864e5);
    const when = diff === 0 ? t("today") : diff === 1 ? t("tomorrow") : best.toLocaleDateString(loc(), { weekday: "short" });
    html += `<div class="gl" data-go="alarm">${ICONS.alarm}<span>${esc(bestA?.label || t("alarm"))}</span><em>${esc(when)} · ${fmtDate(best)}</em></div>`;
  }
  $("#glance").innerHTML = html;
  $$("#glance .gl").forEach(g => g.onclick = () => show(g.dataset.go));
}

/* =====================================================================
   Settings
   ===================================================================== */
const COLORS = ["#1db954", "#f5a524", "#8b7bff", "#4ea8ff", "#ff6b8b"];
function addAppRow(a, focus) {
  const row = document.createElement("div");
  row.className = "arow";
  row.innerHTML = `<input class="nm" placeholder="${esc(t("namePh"))}" value="${esc(a.name)}">
    <input class="url" placeholder="/sur/  or  http://mac-mini.local:8096" value="${esc(a.url)}">
    <button type="button" class="del" aria-label="Remove">${ICONS.x}</button>`;
  row.dataset.icon = a.icon || "app";
  row.dataset.color = a.color || COLORS[$("#appRows").children.length % COLORS.length];
  row.dataset.sub = a.sub || "";
  row.querySelector(".del").onclick = () => row.remove();
  $("#appRows").append(row);
  if (focus) row.querySelector(".nm").focus();
  return row;
}
function addSwRow(s, focus) {
  const row = document.createElement("div");
  row.className = "srow";
  row.dataset.id = s.id || uid();
  row.innerHTML = `<input class="nm" placeholder="${esc(t("namePh"))}" value="${esc(s.name)}">
    <button type="button" class="del" aria-label="Remove">${ICONS.x}</button>
    <input class="on" placeholder="${esc(t("onPh"))}" value="${esc(s.on)}">
    <input class="off" placeholder="${esc(t("offPh"))}" value="${esc(s.off)}">`;
  row.querySelector(".del").onclick = () => row.remove();
  $("#swRows").append(row);
  if (focus) row.querySelector(".nm").focus();
  return row;
}
function openSettings() {
  $("#sTheme").value = Home.theme.mode();
  $("#sName").value = cfg.name;
  $("#sCity").value = cfg.city;
  $("#sUnits").value = cfg.units;
  $("#sClock").value = cfg.clock;
  $("#sNewTab").checked = cfg.newTab;
  $("#appRows").innerHTML = ""; cfg.apps.forEach(a => addAppRow(a));
  $("#swRows").innerHTML = ""; cfg.switches.forEach(s => addSwRow(s));
  $("#dlg").classList.add("on");
}
const closeSettings = () => $("#dlg").classList.remove("on");
$("#openSet").onclick = openSettings;
$("#setCancel").onclick = closeSettings;
$("#dlg").onclick = e => { if (e.target.id === "dlg") closeSettings(); };
addEventListener("keydown", e => { if (e.key === "Escape") closeSettings(); });

const fixUrl = u => (u = u.trim()) && !/^([a-z]+:|\/|\.)/i.test(u) ? "http://" + u : u;
$("#setForm").onsubmit = e => {
  e.preventDefault();
  const before = cfg.city + cfg.units;
  cfg.name = $("#sName").value.trim();
  cfg.city = $("#sCity").value.trim() || DEFAULTS.city;
  cfg.units = $("#sUnits").value;
  cfg.clock = $("#sClock").value;
  cfg.newTab = $("#sNewTab").checked;
  cfg.apps = $$("#appRows .arow").map(r => ({
    name: r.querySelector(".nm").value.trim() || t("app"), sub: r.dataset.sub,
    url: fixUrl(r.querySelector(".url").value), icon: r.dataset.icon, color: r.dataset.color
  }));
  cfg.switches = $$("#swRows .srow").map(r => {
    const old = cfg.switches.find(s => s.id === r.dataset.id);
    const off = fixUrl(r.querySelector(".off").value);
    return { id: r.dataset.id, name: r.querySelector(".nm").value.trim() || t("switchN"),
      on: fixUrl(r.querySelector(".on").value), off, state: off ? !!old?.state : false };
  });
  saveCfg();
  Home.theme.set($("#sTheme").value);
  closeSettings();
  applyLang();
  if (before !== cfg.city + cfg.units) loadWeather();
  toast(t("saved"));
};

/* =====================================================================
   Apply UI text to the page
   ===================================================================== */
function applyLang() {
  $$("[data-t]").forEach(el => el.textContent = t(el.dataset.t));
  $("#evTitle").placeholder = t("eventPh");
  $("#alLabel").placeholder = t("labelPh");
  $("#openSet").title = t("settings");
  lastMinute = ""; // force date + glance refresh
  net(); applyTheme(); tick(); renderWeather(); renderApps(); renderSwitches(); renderGlance();
  const v = $("#app").dataset.view;
  if (v === "cal") renderCal();
  if (v === "alarm") renderAlarms();
}

/* keep tabs/windows on the same device in sync */
addEventListener("storage", e => {
  if (!e.key || !e.key.startsWith("ghor.")) return;
  cfg = Object.assign({}, DEFAULTS, store.get("cfg", {}));
  events = store.get("events", []); alarms = store.get("alarms", []);
  applyLang();
});

/* keep the screen awake (works on https or localhost) */
async function wake() { try { await navigator.wakeLock?.request("screen"); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

/* =====================================================================
   Start
   ===================================================================== */
applyLang();
loadStatus();
setInterval(tick, 1000);
loadWeather();
wake();
})();
