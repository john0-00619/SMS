// Headless test harness: boots the game inside jsdom with a stubbed THREE and
// WebAudio, then drives the simulation to catch runtime errors and verify logic.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><canvas id="game-canvas"></canvas></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;

// Fake 2D canvas context (jsdom has no canvas backend).
const make2d = () =>
  new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'createLinearGradient' || p === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      return () => {};
    },
    set() { return true; },
    apply() { return {}; },
  });
window.HTMLCanvasElement.prototype.getContext = function () { return make2d(); };

// THREE stub: every class/method/property auto-materializes as a no-op proxy.
const makeObj = () =>
  new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'length') return 0;
      if (p === 'then') return undefined; // avoid being treated as a promise
      return makeObj();
    },
    set() { return true; },
    apply() { return makeObj(); },
    construct() { return makeObj(); },
  });
const THREE = new Proxy({}, {
  get(t, p) { return makeObj(); },
  set() { return true; },
});

// Globals the modules expect.
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.THREE = THREE;
window.THREE = THREE;
window.AudioContext = undefined;

let rafCbs = [];
globalThis.requestAnimationFrame = (cb) => { rafCbs.push(cb); return rafCbs.length; };
globalThis.cancelAnimationFrame = () => {};
const realPerf = globalThis.performance;
globalThis.performance = {
  now: () => realPerf ? realPerf.now() : Date.now(),
};

export { window, rafCbs };

// Boot the game.
export async function boot() {
  const { Game } = await import('../src/game.js');
  const { store } = await import('../src/save.js');
  const { CHARACTERS, WORLDS } = await import('../src/data.js');
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  const w = WORLDS.find((x) => x.id === store.selected.world) || WORLDS[0];
  const c = CHARACTERS.find((x) => x.id === store.selected.character) || CHARACTERS[0];
  game.applyWorld(w);
  game.applyCharacter(c);
  return { game, store };
}

export function step(game, seconds, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) game._update(dt);
}
