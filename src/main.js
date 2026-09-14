// ============================================================================
// PATH OF FAITH — entry point
// ============================================================================
import { Game } from './game.js';
import { store } from './save.js';
import { audio } from './audio.js';
import { WORLDS, CHARACTERS } from './data.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) { console.error('No canvas'); return; }

  const game = new Game(canvas);
  window.__game = game; // expose for debugging

  // Apply saved selections.
  const w = WORLDS.find((x) => x.id === store.selected.world) || WORLDS[0];
  const c = CHARACTERS.find((x) => x.id === store.selected.character) || CHARACTERS[0];
  game.applyWorld(w);
  game.applyCharacter(c);

  // Apply audio settings.
  audio.setMusicVolume(store.settings.music);
  audio.setSfxVolume(store.settings.sfx);

  // Apply quality setting.
  if (store.settings.quality === 'low') {
    game.renderer.renderer.setPixelRatio(1);
  }

  // Start ambient music on first interaction (autoplay policy).
  const startAudio = () => {
    audio.resume();
    audio.startMusic();
    window.removeEventListener('pointerdown', startAudio);
    window.removeEventListener('keydown', startAudio);
  };
  window.addEventListener('pointerdown', startAudio);
  window.addEventListener('keydown', startAudio);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
