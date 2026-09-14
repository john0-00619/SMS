// Runs the game headless and asserts core behavior.
import { boot, step } from './harness.mjs';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name} ${extra}`); }
}

async function main() {
  console.log('Booting game headless...');
  const { game, store } = await boot();
  console.log('Boot OK. Running simulation...\n');

  // ---- menu state ----
  check('initial state is menu', game.state === 'menu');
  check('home screen rendered', game.ui.currentScreen === 'home');

  // ---- start a run ----
  store.settings.tutorialDone = true;
  game.startRun();
  check('state becomes running', game.state === 'running');
  check('player initialized lane 1', game.player.lane === 1);

  // ---- movement / jump / slide / ability (fresh run, no obstacles near) ----
  const laneBefore = game.player.lane;
  game._move(1);
  check('move right works', game.player.lane === Math.min(2, laneBefore + 1));

  game.player.onGround = true;
  game.jump();
  check('jump launches', game.player.onGround === false && game.player.vy > 0);

  game.player.onGround = true;
  game.slide();
  check('slide engages', game.player.sliding === true);

  game.useAbility();
  check('ability triggers cooldown', game.abilityCd > 0, `cd=${game.abilityCd}`);

  // ---- simulate 1 second of forward motion (before the first obstacle arrives) ----
  step(game, 1);
  check('distance accumulates', game.run.distance > 5, `distance=${game.run.distance}`);
  check('speed increased above base', game.speed > 11, `speed=${game.speed}`);
  check('collectibles spawned', game.collectibles.some((c) => c.active), 'no collectibles');

  // ---- longer run to (near-)guarantee obstacles ----
  game.startRun();
  step(game, 12);
  check('obstacles spawned over a longer run', game.obstacles.some((o) => o.active), 'no active obstacles');

  // ---- force a crash (fresh running state) ----
  game.startRun();
  game.shield = false;
  game.invincible = 0;
  game.flying = 0;
  const o = game.obstacles.find((x) => !x.active);
  check('free obstacle available', !!o);
  game._setObstacle(o, 'rock', game.player.lane, 0);
  game.player.jumpY = 0; game.player.onGround = true; game.player.sliding = false;
  step(game, 0.05);
  check('collision triggers game over', game.state === 'gameover', `state=${game.state}`);

  // ---- run stats recorded ----
  check('total runs incremented', store.profile.totalRuns >= 1, `runs=${store.profile.totalRuns}`);
  check('coins non-negative', store.profile.coins >= 0);

  // ---- quiz flow (probabilistic) ----
  if (game.quizQueued) {
    game._showQuiz('home');
    check('quiz screen active', game.state === 'quiz');
    game.answerQuiz(game.quizQuestion.correct);
    check('quiz answer handled', game.state === 'quiz');
  } else {
    console.log('  (quiz not queued this run — probabilistic, skipping)');
  }

  // ---- screens render without error ----
  game.ui.renderMissions();
  check('missions screen renders', game.ui.currentScreen === 'missions');
  game.ui.renderCharacters();
  check('characters screen renders', game.ui.currentScreen === 'characters');
  game.ui.renderWorlds();
  check('worlds screen renders', game.ui.currentScreen === 'worlds');
  game.ui.renderBible();
  check('bible screen renders', game.ui.currentScreen === 'bible');
  game.ui.renderShop();
  check('shop screen renders', game.ui.currentScreen === 'shop');
  game.ui.renderSettings();
  check('settings screen renders', game.ui.currentScreen === 'settings');
  game._refreshDaily();
  game.ui.renderDaily();
  check('daily screen renders', game.ui.currentScreen === 'daily');

  // ---- unlock a character (grant XP to satisfy level gate) ----
  store.profile.coins = 10000;
  store.profile.xp = 10000;
  game.unlockCharacter('moses');
  check('moses unlockable with coins', store.unlocks.characters.includes('moses'));

  // ---- world unlock ----
  game.unlockWorld('desert');
  check('desert unlockable', store.unlocks.worlds.includes('desert'));

  // ---- level gating blocks under-leveled unlock ----
  store.profile.xp = 0;
  store.profile.coins = 10000;
  game.unlockCharacter('esther'); // requires level 3
  check('level gate blocks under-leveled unlock', !store.unlocks.characters.includes('esther'));

  // ---- save/load round trip ----
  store.save();
  const raw = localStorage.getItem('path_of_faith_save_v1');
  check('save persisted', !!raw && raw.length > 0);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('HARNESS CRASH:', e);
  process.exit(2);
});
