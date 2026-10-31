// Family Fun 2.1.0 — Vite entry point.
// Three.js is bundled by Vite (npm `three`), so the built game has NO CDN
// dependency at runtime. Legacy game code stays as classic scripts (public/game/)
// because it relies on shared globals (scene, playerGroup, initGame, …);
// this entry loads Three first, then the classic scripts in dependency order.
//
// Loading-bug fix (2.0.1): boot can NEVER hang forever on the loading screen.
// Every script has an 8s timeout, load errors are captured, and on any failure
// the loading overlay is hidden and a visible error panel (with a Retry button
// that reloads the page) is shown instead of an endless spinner.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import './hud.css';
import './nextgen.css';
import './world-overhaul.css';

window.THREE = THREE;

// Bloom composer factory used by public/game/graphics.js (FFRender hook).
// Created lazily after initGame, only when quality=high (bloom on).
window.FFComposerFactory = function (renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.55, 0.85
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  window.FFComposer = composer;
  return composer;
};
window.addEventListener('resize', () => {
  if (window.FFComposer) window.FFComposer.setSize(window.innerWidth, window.innerHeight);
});

const SCRIPTS = [
  './game/textures.js',
  './game/quality.js',
  './game/economy.js',
  './game/audio.js',
  './game/quests.js',
  './game/save.js',
  './game/particles.js',
  './game/graphics.js',
  './game/ui.js',
  './game/game-core.js',
  './game/character-studio.js',
  './game/gameplay-overhaul.js',
  './game/world-overhaul.js',
  './game/gta.js',
  './game/gta-city.js',
  './game/gta-story.js',
  './game/landscape-hud.js',
];

const SCRIPT_TIMEOUT_MS = 8000;
let bootErrors = [];

function showBootError(title, detail) {
  const loading = document.getElementById('loading-screen');
  if (loading) loading.style.display = 'none';
  let panel = document.getElementById('ff-boot-error');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ff-boot-error';
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#0f0f1e;color:#fff;font-family:Vazirmatn,Arial,sans-serif;text-align:center;padding:24px;direction:rtl;';
    panel.innerHTML = '<div style="font-size:44px">⚠️</div><div id="ff-boot-error-title" style="font-size:18px;font-weight:700"></div><div id="ff-boot-error-detail" style="font-size:13px;opacity:.75;max-width:420px;line-height:1.8;word-break:break-word"></div><button id="ff-boot-retry" style="padding:13px 30px;border:none;border-radius:12px;background:linear-gradient(135deg,#ffd700,#ff8c42);color:#1a0a2e;font-family:inherit;font-weight:700;font-size:15px;cursor:pointer">🔄 تلاش مجدد</button>';
    document.body.appendChild(panel);
    panel.querySelector('#ff-boot-retry').onclick = () => location.reload();
  }
  panel.style.display = 'flex';
  const t = panel.querySelector('#ff-boot-error-title');
  const d = panel.querySelector('#ff-boot-error-detail');
  if (t) t.textContent = title;
  if (d) d.textContent = detail;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      s.remove();
      reject(new Error('زمان بارگذاری فایل تمام شد (۸ ثانیه): ' + src));
    }, SCRIPT_TIMEOUT_MS);
    s.onload = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error('فایل بارگذاری نشد: ' + src));
    };
    s.src = src;
    document.body.appendChild(s);
  });
}

async function boot() {
  const onErr = (ev) => {
    const msg = (ev && ev.message) || (ev && ev.reason && ev.reason.message) || String(ev && ev.reason || ev);
    if (msg) bootErrors.push(String(msg));
  };
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);
  // Safety net: even if some promise somehow hangs, never spin forever.
  const watchdog = setTimeout(() => {
    if (!window.FFBootDone && !window.FFBootFailed) {
      window.FFBootFailed = true;
      showBootError('بارگذاری بازی بیش از حد طول کشید', 'یک فایل بازی پاسخ نداد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.' + (bootErrors.length ? ' خطا: ' + bootErrors[0] : ''));
    }
  }, 30000);
  try {
    for (const src of SCRIPTS) {
      try {
        await loadScript(src);
      } catch (e) {
        throw e;
      }
    }
    clearTimeout(watchdog);
    window.FFBootDone = true;
    const loading = document.getElementById('loading-screen');
    if (loading) loading.style.display = 'none';
    console.log('[Family Fun 2.0.1] all game scripts loaded, Three bundled via Vite');
  } catch (e) {
    clearTimeout(watchdog);
    window.FFBootFailed = true;
    console.error('[Family Fun 2.0.1] boot failed', e, bootErrors);
    const detail = e.message + (bootErrors.length ? ' | خطای مرورگر: ' + bootErrors[0] : '');
    showBootError('خطا در بارگذاری بازی', detail);
  } finally {
    window.removeEventListener('error', onErr);
    window.removeEventListener('unhandledrejection', onErr);
  }
}
boot();
