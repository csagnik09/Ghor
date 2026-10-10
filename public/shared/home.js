/*
  Shared by ঘর, সুর and ছবি (loaded in each page's <head>, before anything is drawn).

  Theme — one setting for all three apps, stored as "home.theme": auto | light | dark.
    Auto is light between sunrise and sunset. ঘর stores today's sunrise/sunset from its
    weather data ("home.sun"); until it has, auto means light from 6 AM to 6 PM.
    A change in any app or tab shows up everywhere straight away.

  Full screen — a button in every app. Browsers leave full screen when you open another
    page, so when you go from ঘর into সুর or ছবি (or back), the first tap or key press on
    the new page puts it back into full screen.

  API: Home.theme.mode() / .resolved() / .set(mode) / .setSun(rise, set) / .onChange(fn)
       Home.fullscreen.supported / .active() / .toggle() / .bind(button) / .onChange(fn)
*/
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "home.theme", SUN = "home.sun", FS = "home.fs";
  var get = function (k, s) { try { return (s || localStorage).getItem(k); } catch (e) { return null; } };
  var put = function (k, v, s) { try { (s || localStorage).setItem(k, v); } catch (e) {} };
  var del = function (k, s) { try { (s || localStorage).removeItem(k); } catch (e) {} };
  var valid = function (m) { return m === "auto" || m === "light" || m === "dark"; };

  /* ---------------- theme ---------------- */
  function initialMode() {
    var m = get(KEY);
    if (valid(m)) return m;
    // carry over a choice made before the apps shared one setting
    try { m = JSON.parse(get("ghor.cfg") || "{}").theme; } catch (e) { m = null; }
    if (!valid(m) || m === "auto") {
      var s = (get("sur.theme") || "").replace(/"/g, ""), c = (get("chobi.theme") || "").replace(/"/g, "");
      if (valid(s) && s !== "auto") m = s; else if (valid(c) && c !== "auto") m = c;
    }
    if (!valid(m)) m = "auto";
    put(KEY, m);
    return m;
  }
  var mode = initialMode(), themeFns = [];

  function isDay(d) {
    d = d || new Date();
    var now = d.getHours() * 60 + d.getMinutes(), rise = 360, set = 1080, s = null;
    try { s = JSON.parse(get(SUN) || "null"); } catch (e) {}
    if (s && s.rise && s.set) {   // minutes of the day, so yesterday's times still work today
      var r = new Date(s.rise), t = new Date(s.set);
      if (!isNaN(r) && !isNaN(t)) { rise = r.getHours() * 60 + r.getMinutes(); set = t.getHours() * 60 + t.getMinutes(); }
    }
    return now >= rise && now < set;
  }
  function resolved() { return mode === "auto" ? (isDay() ? "light" : "dark") : mode; }
  function apply(force) {
    var want = resolved(), changed = root.dataset.theme !== want;
    root.dataset.theme = want;
    root.style.colorScheme = want;
    if (changed || force) themeFns.forEach(function (fn) { try { fn(want, mode); } catch (e) { console.error(e); } });
  }
  apply();

  var theme = {
    mode: function () { return mode; },
    resolved: resolved,
    set: function (m) { if (!valid(m)) return; mode = m; put(KEY, m); apply(true); },
    setSun: function (rise, set) {
      if (!rise || !set) return;
      var v = JSON.stringify({ rise: +new Date(rise), set: +new Date(set) });
      if (get(SUN) !== v) { put(SUN, v); apply(); }
    },
    onChange: function (fn) { themeFns.push(fn); },
    apply: apply
  };
  addEventListener("storage", function (e) {
    if (e.key === KEY && valid(e.newValue)) { mode = e.newValue; apply(true); }
    else if (e.key === SUN || e.key === null) apply();
  });
  setInterval(apply, 30000);   // auto: switch at sunrise / sunset
  document.addEventListener("visibilitychange", function () { if (!document.hidden) apply(); });

  /* ---------------- full screen ---------------- */
  var reqFn = root.requestFullscreen || root.webkitRequestFullscreen;
  var supported = !!reqFn && document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
  var fsFns = [], leaving = false;
  var el = function () { return document.fullscreenElement || document.webkitFullscreenElement || null; };
  function enter() {
    try { var p = reqFn.call(root, { navigationUI: "hide" }); return p && p.catch ? p.catch(function () {}) : Promise.resolve(); }
    catch (e) { return Promise.resolve(); }
  }
  function exit() {
    var f = document.exitFullscreen || document.webkitExitFullscreen;
    try { var p = f && f.call(document); return p && p.catch ? p.catch(function () {}) : Promise.resolve(); }
    catch (e) { return Promise.resolve(); }
  }
  function toggle() {
    if (el()) { del(FS, sessionStorage); return exit(); }
    put(FS, "1", sessionStorage); return enter();
  }
  var ICON = {
    on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 4h2v6H4V8h4zm6 0h2v4h4v2h-6zM4 14h6v6H8v-4H4zm10 0h6v2h-4v4h-2z"/></svg>'
  };
  var bound = [];
  function paint() {
    var on = !!el();
    bound.forEach(function (b) {
      b.innerHTML = on ? ICON.off : ICON.on;
      b.title = on ? "Exit full screen" : "Full screen";
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function onFs() {
    if (el()) put(FS, "1", sessionStorage);
    else if (!leaving) del(FS, sessionStorage);   // the person left full screen on purpose
    paint();
    hideHint();
    fsFns.forEach(function (fn) { try { fn(!!el()); } catch (e) { console.error(e); } });
  }
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);
  // moving to another page drops full screen; that isn't the person turning it off
  addEventListener("pagehide", function () { leaving = true; });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a && !a.target && a.origin === location.origin) { leaving = true; setTimeout(function () { leaving = false; }, 1500); }
  }, true);

  /* coming from a page that was in full screen: the first tap or key press brings it back */
  var hint = null;
  function hideHint() { if (hint) { hint.remove(); hint = null; } }
  function resume(e) {
    if (e.type === "keydown" && (e.key === "Escape" || e.key === "f" || e.key === "F")) {
      if (e.key === "Escape") del(FS, sessionStorage);
      done(); return;
    }
    done();
    if (!el() && get(FS, sessionStorage) === "1") enter();
  }
  function done() {
    removeEventListener("click", resume, true); removeEventListener("keydown", resume, true);
    hideHint();
  }
  if (supported && get(FS, sessionStorage) === "1" && !el()) {
    addEventListener("click", resume, true);
    addEventListener("keydown", resume, true);
    var showHint = function () {
      if (el() || hint || get(FS, sessionStorage) !== "1") return;
      hint = document.createElement("div");
      hint.setAttribute("role", "status");
      hint.textContent = "Tap anywhere to continue in full screen";
      hint.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);transform:translateX(-50%);z-index:2147483647;" +
        "padding:9px 16px;border-radius:999px;background:#000c;color:#fff;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;" +
        "box-shadow:0 6px 20px #0005;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);white-space:nowrap";
      document.body.appendChild(hint);
      setTimeout(hideHint, 6000);
    };
    if (document.body) showHint(); else document.addEventListener("DOMContentLoaded", showHint);
  }

  var fullscreen = {
    supported: supported,
    active: function () { return !!el(); },
    toggle: toggle,
    enter: function () { put(FS, "1", sessionStorage); return enter(); },
    exit: function () { del(FS, sessionStorage); return exit(); },
    onChange: function (fn) { fsFns.push(fn); },
    /* turn a button into the full-screen toggle (hidden where full screen isn't possible, e.g. iPhone) */
    bind: function (b) {
      if (!b) return;
      if (!supported) { b.hidden = true; return; }
      bound.push(b);
      b.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
      paint();
    },
    icons: ICON
  };

  window.Home = { theme: theme, fullscreen: fullscreen };
})();
