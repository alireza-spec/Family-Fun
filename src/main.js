// Family Fun 2.0 — Vite entry point.
// Three.js is bundled by Vite (npm `three`), so the built game has NO CDN
// dependency at runtime. Legacy game code stays as classic scripts (public/game/)
// because it relies on shared globals (scene, playerGroup, initGame, …);
// this entry loads Three first, then the classic scripts in dependency order.
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
  'game/textures.js',
  'game/quality.js',
  'game/economy.js',
  'game/audio.js',
  'game/quests.js',
  'game/save.js',
  'game/particles.js',
  'game/graphics.js',
  'game/ui.js',
  'game/game-core.js',
  'game/character-studio.js',
  'game/gameplay-overhaul.js',
  'game/world-overhaul.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.body.appendChild(s);
  });
}

async function boot() {
  const status = document.getElementById('load-status');
  try {
    for (const src of SCRIPTS) await loadScript(src);
    const loading = document.getElementById('loading-screen');
    if (loading) loading.style.display = 'none';
    console.log('[Family Fun 2.0] all game scripts loaded, Three bundled via Vite');
  } catch (e) {
    console.error('[Family Fun 2.0] boot failed', e);
    if (status) {
      status.textContent = 'خطا در بارگذاری بازی: ' + e.message;
      status.style.color = '#ff4444';
    }
  }
}
boot();
