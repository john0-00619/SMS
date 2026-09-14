// ============================================================================
// PATH OF FAITH — Core game engine
// ============================================================================
import {
  GAME, CHARACTERS, WORLDS, MISSIONS, POWERUPS, VERSES, QUIZ,
  DAILY_REWARDS, DAILY_CHALLENGES, OUTFITS, LEVELS, levelForXp,
} from './data.js';
import { store } from './save.js';
import { audio } from './audio.js';
import { Renderer, buildCharacter, buildObstacle, buildCoin, buildScroll, buildFaithPoint, buildStar, buildPowerup, buildDecorPool, burst, updateBurst } from './render.js';
import { UI, REVIVE_COST } from './ui.js';
import {
  LANES, PLAYER_Z, RECYCLE_Z, SPAWN_Z, GRAVITY, JUMP_VELOCITY,
  BASE_SPEED, MAX_SPEED, SPEED_RAMP, COIN_VALUE, SCROLL_VALUE, FAITH_VALUE, STAR_VALUE,
} from './const.js';

const THREE = window.THREE;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const JUMP_OBSTACLE_TOP = 0.92; // jump obstacles occupy [0, 0.92]
const SLIDE_CLEARANCE = 1.15;   // slide obstacles occupy [1.15, up]
const BLOCK_TOP = 2.6;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ui = new UI();
    this.audio = audio;
    this.store = store;

    this.state = 'menu'; // menu | tutorial | running | paused | gameover | quiz | verse | levelup
    this.afterQuiz = 'home'; // where to go after quiz
    this.quizQueued = false;
    this.lastQuizRun = -100;

    this.scene = this.renderer.scene;
    this.world = null;
    this.character = null;
    this.player = null;

    // pools
    this.obstacles = [];
    this.collectibles = [];
    this.pits = [];
    this.decor = [];
    this.bursts = [];

    this.ray = new THREE.Raycaster();

    this._initPools();
    this._initInput();
    this.ui.init(this);

    this.running = false;
    this.ui.show('home');
    this._pendingToasts = [];
    this.activePills = [];
    this.faithMult = 1;
    this._multTimer = null;
    this._faithTimer = null;
    this.lastWasRecord = false;
    this.newVerseQueued = null;
    this.pendingLevelUp = null;
    this._preMusicVolume = null;
    this._preSfxVolume = null;
    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    // build initial menu backdrop scene
    this.audio.setMusicContext('menu');
    this.applyWorld(WORLDS[0]);
    this.applyCharacter(CHARACTERS[0]);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.pause();
    });
  }

  // -------------------------------------------------------------------------
  // setup
  // -------------------------------------------------------------------------
  applyWorld(world) {
    this.world = world;
    this.renderer.applyWorld(world);
    this.audio.setAmbience(world.ambience);
    // rebuild decor pool
    this.decor.forEach((d) => this.scene.remove(d));
    const fresh = buildDecorPool(world);
    this.decor = fresh;
    const step = 14;
    this.decor.forEach((g, i) => {
      const side = (i % 2 === 0) ? -1 : 1;
      const x = side * rand(7, 13);
      const z = -10 - (i % 12) * step;
      g.position.set(x, 0, z);
      g.userData.side = side;
      g.userData.minX = side * 7;
      g.userData.maxX = side * 13;
      this.scene.add(g);
    });
  }

  applyCharacter(charDef) {
    const outfit = OUTFITS.find((o) => o.id === this.store.selected.outfit);
    const colors = { ...charDef.colors, ...(outfit && outfit.tint ? outfit.tint : {}) };
    const scheme = { ...charDef, colors };
    this.audio.setLead(charDef.sound || 'harp');
    if (this.playerGroup) this.scene.remove(this.playerGroup);
    const built = buildCharacter(scheme);
    this.character = charDef;
    this.playerGroup = built.group;
    this.playerParts = built.parts;
    this.playerGroup.position.set(0, 0, PLAYER_Z);
    this.scene.add(this.playerGroup);

    // shield bubble
    if (this.shieldMesh) { this.scene.remove(this.shieldMesh); this.shieldMesh = null; }
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.18, depthWrite: false })
    );
    this.shieldMesh.position.set(0, 1.0, 0);
    this.shieldMesh.visible = false;
    this.playerGroup.add(this.shieldMesh);

    this.ui.renderHome();
  }

  _initPools() {
    // obstacles
    for (let i = 0; i < 40; i++) {
      this.obstacles.push({ obj: new THREE.Group(), active: false, type: null, kind: null, top: 0, lane: 0, x: 0, z: 0 });
      this.scene.add(this.obstacles[i].obj);
    }
    // coins
    for (let i = 0; i < 70; i++) {
      const g = buildCoin();
      g.visible = false;
      this.scene.add(g);
      this.collectibles.push({ obj: g, kind: 'coin', active: false, lane: 0, x: 0, z: 0 });
    }
    // scrolls
    for (let i = 0; i < 24; i++) {
      const g = buildScroll();
      g.visible = false;
      this.scene.add(g);
      this.collectibles.push({ obj: g, kind: 'scroll', active: false, lane: 0, x: 0, z: 0 });
    }
    // faith
    for (let i = 0; i < 24; i++) {
      const g = buildFaithPoint();
      g.visible = false;
      this.scene.add(g);
      this.collectibles.push({ obj: g, kind: 'faith', active: false, lane: 0, x: 0, z: 0 });
    }
    // stars
    for (let i = 0; i < 12; i++) {
      const g = buildStar();
      g.visible = false;
      this.scene.add(g);
      this.collectibles.push({ obj: g, kind: 'star', active: false, lane: 0, x: 0, z: 0 });
    }
    // powerups
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      g.visible = false;
      this.scene.add(g);
      this.collectibles.push({ obj: g, kind: 'powerup', active: false, lane: 0, x: 0, z: 0, pu: null });
    }
    // pits (gaps)
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(11, 3),
        new THREE.MeshLambertMaterial({ color: 0x2a5a7a, transparent: true, opacity: 0.9 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.01;
      const edge1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0x8a7a5a }));
      edge1.position.z = 1.7;
      const edge2 = edge1.clone(); edge2.position.z = -1.7;
      g.add(water, edge1, edge2);
      g.visible = false;
      this.scene.add(g);
      this.pits.push({ obj: g, active: false, z: 0 });
    }
  }

  _freeCollectible() {
    for (const c of this.collectibles) if (!c.active) return c;
    return null;
  }
  _freeObstacle() {
    for (const o of this.obstacles) if (!o.active) return o;
    return null;
  }
  _freePit() {
    for (const p of this.pits) if (!p.active) return p;
    return null;
  }

  _setObstacle(o, type, lane, z) {
    o.passed = false;
    if (o.type !== type) {
      // rebuild children
      while (o.obj.children.length) o.obj.remove(o.obj.children[0]);
      const built = buildObstacle(type, this.world);
      o.obj.add(built.group);
      o.kind = built.kind;
      o.type = type;
      o.top = o.kind === 'jump' ? JUMP_OBSTACLE_TOP : (o.kind === 'slide' ? SLIDE_CLEARANCE : BLOCK_TOP);
    }
    o.active = true;
    o.lane = lane;
    o.x = LANES[lane];
    o.z = z;
    o.obj.visible = true;
    o.obj.position.set(o.x, 0, z);
  }

  _setCollectible(c, kind, lane, z, pu) {
    // Rebuild the visual when the slot changes type (slots are reused across kinds).
    if (c.kind !== kind || (kind === 'powerup' && c.pu !== pu)) {
      while (c.obj.children.length) c.obj.remove(c.obj.children[0]);
      let g;
      if (kind === 'coin') g = buildCoin();
      else if (kind === 'scroll') g = buildScroll();
      else if (kind === 'faith') g = buildFaithPoint();
      else if (kind === 'star') g = buildStar();
      else g = buildPowerup(pu);
      while (g.children.length) c.obj.add(g.children[0]);
      c.obj.userData.spin = g.userData.spin || null;
    }
    c.active = true;
    c.kind = kind;
    c.lane = lane;
    c.x = LANES[lane];
    c.z = z;
    c.pu = kind === 'powerup' ? pu : null;
    c.obj.visible = true;
    c.obj.position.set(c.x, kind === 'star' ? 1.2 : kind === 'powerup' ? 1.1 : 0.8, z);
  }

  _setPit(p, z) {
    p.active = true;
    p.z = z;
    p.obj.visible = true;
    p.obj.position.set(0, 0, z);
  }

  // -------------------------------------------------------------------------
  // input
  // -------------------------------------------------------------------------
  _initInput() {
    this._touchStart = null;
    const swipeThreshold = 24;

    const onStart = (x, y) => { this._touchStart = { x, y, t: performance.now() }; };
    const onEnd = (x, y) => {
      if (!this._touchStart) return;
      const dx = x - this._touchStart.x;
      const dy = y - this._touchStart.y;
      const dt = performance.now() - this._touchStart.t;
      this._touchStart = null;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 280) {
        // tap = jump
        if (this.state === 'running') this.jump();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > swipeThreshold) this._move(Math.sign(dx));
      } else if (Math.abs(dy) > swipeThreshold) {
        if (dy < 0) this.jump(); else this.slide();
      }
    };

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    }, { passive: false });

    // mouse for desktop testing
    this.canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => onEnd(e.clientX, e.clientY));

    window.addEventListener('keydown', (e) => {
      if (this.state === 'running') {
        switch (e.key) {
          case 'ArrowLeft': case 'a': case 'A': this._move(-1); break;
          case 'ArrowRight': case 'd': case 'D': this._move(1); break;
          case 'ArrowUp': case 'w': case 'W': case ' ': this.jump(); break;
          case 'ArrowDown': case 's': case 'S': this.slide(); break;
          case 'q': case 'Q': this.useAbility(); break;
          case 'Escape': case 'p': case 'P': this.pause(); break;
          default: break;
        }
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
      } else if (this.state === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.resume();
      } else if (this.state === 'menu') {
        if (e.key === 'Enter' || e.key === ' ') this.nav('play');
      }
    });
  }

  _move(dir) {
    if (this.state !== 'running') return;
    const next = clamp(this.player.lane + dir, 0, 2);
    if (next !== this.player.lane) {
      this.player.lane = next;
      this.audio.click();
    }
  }

  jump() {
    if (this.state !== 'running') return;
    if (this.player.onGround) {
      this.player.vy = JUMP_VELOCITY;
      this.player.onGround = false;
      this.audio.jump();
      this.runStats.jumps++;
      this.store.stats.jumps++;
    }
  }

  slide() {
    if (this.state !== 'running') return;
    if (this.player.onGround && !this.player.sliding) {
      this.player.sliding = true;
      this.player.slideT = 0;
      this.audio.slide();
      this.runStats.slides++;
      this.store.stats.slides++;
    }
  }

  // -------------------------------------------------------------------------
  // navigation
  // -------------------------------------------------------------------------
  nav(dest) {
    this.audio.resume();
    if (!this.audio.musicPlaying) this.audio.startMusic();
    this.audio.click();
    switch (dest) {
      case 'play': this._play(); break;
      case 'characters': this.ui.renderCharacters(); break;
      case 'worlds': this.ui.renderWorlds(); break;
      case 'missions': this.ui.renderMissions(); break;
      case 'bible': this.ui.renderBible(); break;
      case 'shop': this.ui.renderShop(); break;
      case 'daily': this._refreshDaily(); this.ui.renderDaily(); break;
      case 'settings': this.ui.renderSettings(); break;
      case 'home': this.toHome(); break;
      default: break;
    }
  }

  _play() {
    const s = this.store.settings;
    if (!s.tutorialDone) {
      this.state = 'tutorial';
      this.ui.renderTutorial();
      this.ui.hideScreens();
      return;
    }
    this.startRun();
  }

  beginRun() {
    this.store.settings.tutorialDone = true;
    this.store.save();
    this.startRun();
  }

  toHome() {
    if (this.quizQueued) { this._showQuiz('home'); return; }
    this.state = 'menu';
    this.audio.setMusicContext('menu');
    this.audio.startMusic();
    this.ui.hideScreens();
    this.ui.showHud(false);
    this._clearRun();
    this.applyCharacter(this.character);
    this.ui.renderHome();
    this.ui.show('home');
    this.renderer.setCameraShake(0);
    // flush deferred toasts (e.g. daily challenge rewards)
    const toasts = this._pendingToasts.splice(0);
    toasts.forEach((t) => this.ui.toast(t));
  }

  // -------------------------------------------------------------------------
  // run lifecycle
  // -------------------------------------------------------------------------
  startRun() {
    this._resetRun();
    this.state = 'running';
    this.ui.hideScreens();
    this.ui.showHud(true);
    this.ui.renderHome(); // refresh currencies on home for later
    this.audio.resume();
    this.audio.setMusicContext('run');
    this.audio.startMusic();
    this.audio.shofar(1);
  }

  _resetRun() {
    this.run = {
      distance: 0,
      coins: 0,
      scrolls: 0,
      faith: 0,
      stars: 0,
      score: 0,
      bestScore: 0,
      revived: false,
      crashed: false,
      world: this.world.id,
    };
    this.runStats = {
      distance: 0, coins: 0, scrolls: 0, jumps: 0, slides: 0,
      powerups: 0, faith: 0, stars: 0, score: 0, crashed: true,
    };
    this.speed = BASE_SPEED;
    this.speedMult = 1;
    this.multiplier = 1;
    this.magnet = 0;
    this.flying = 0;
    this.speedBoost = 0;
    this.light = 0;
    this.shield = false;
    this.invincible = 0;
    this.abilityCd = 0;
    this.spawnAccum = 0;
    this.spawnGap = 26;
    this.runPhase = 0;
    this.newVerseQueued = null;
    this.activePills = [];
    this.faithMult = 1;
    this._multTimer = null;
    this._faithTimer = null;
    this.lastWasRecord = false;
    this.nextMilestone = 500;
    this.footTimer = 0;
    this.wasAirborne = false;
    this.heartTimer = 0;

    this.player = {
      lane: 1, x: 0, jumpY: 0, vy: 0, onGround: true,
      sliding: false, slideT: 0,
    };
    this.playerGroup.position.set(0, 0, PLAYER_Z);
    this.playerGroup.rotation.set(0, 0, 0);
    this.shieldMesh.visible = false;

    // clear all active objects
    for (const o of this.obstacles) { o.active = false; o.obj.visible = false; }
    for (const c of this.collectibles) { c.active = false; c.obj.visible = false; }
    for (const p of this.pits) { p.active = false; p.obj.visible = false; }
    for (const b of this.bursts) { this.scene.remove(b.s); b.s.material.dispose(); }
    this.bursts = [];

    // pre-populate the track ahead of the player
    for (let z = -16; z >= -224; z -= this.spawnGap) this._spawnPattern(z);
  }

  _clearRun() {
    for (const o of this.obstacles) { o.active = false; o.obj.visible = false; }
    for (const c of this.collectibles) { c.active = false; c.obj.visible = false; }
    for (const p of this.pits) { p.active = false; p.obj.visible = false; }
    for (const b of this.bursts) { this.scene.remove(b.s); b.s.material.dispose(); }
    this.bursts = [];
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.audio.stopMusic();
    this.ui.renderPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.ui.hideScreens();
    this.ui.showHud(true);
    this.audio.resume();
    this.audio.startMusic();
  }

  togglePause() {
    if (this.state === 'running') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  restart() {
    this.startRun();
  }

  // -------------------------------------------------------------------------
  // abilities & power-ups
  // -------------------------------------------------------------------------
  useAbility() {
    if (this.state !== 'running') return;
    if (this.abilityCd > 0) return;
    const ab = this.character.ability;
    this.abilityCd = ab.cooldown;
    this.runStats.powerups++;
    this.store.stats.powerupsUsed++;
    this.audio.powerup();
    if (ab.type === 'shield' || ab.type === 'clear' || ab.type === 'light') this.audio.shieldUp();
    const d = ab.duration;
    switch (ab.type) {
      case 'speed': this.speedBoost = d; break;
      case 'clear': this._clearPath(); this.shield = true; this.invincible = 1.2; break;
      case 'shield': this.shield = true; break;
      case 'coin': this.multiplier *= ab.value; this._multTimer = d; break;
      case 'faith': this.faithMult = ab.value; this._faithTimer = d; break;
      case 'light': this.magnet = Math.max(this.magnet, d); this.shield = true; this.light = d; break;
      default: break;
    }
    this._burstAt(this.player.x, 1.2, PLAYER_Z, 'rgba(255,230,150,0.95)', 10);
  }

  _clearPath() {
    for (const o of this.obstacles) {
      if (o.active && o.z < 30 && o.z > -6) {
        o.active = false; o.obj.visible = false;
        this._burstAt(o.x, 1.0, o.z, 'rgba(160,220,255,0.9)', 6);
      }
    }
    for (const p of this.pits) {
      if (p.active && p.z < 30 && p.z > -6) { p.active = false; p.obj.visible = false; }
    }
  }

  _applyPowerup(pu) {
    const d = pu.duration || 5;
    switch (pu.type) {
      case 'shield': this.shield = true; break;
      case 'wings': this.flying = d; this.player.vy = Math.max(this.player.vy, 6); break;
      case 'magnet': this.magnet = d; break;
      case 'multiplier': this.multiplier = 2; break;
      case 'light': this.light = d; this.shield = true; break;
      case 'speed': this.speedBoost = d; break;
      default: break;
    }
    this.audio.powerup();
    if (pu.type === 'wings') this.audio.wings();
    if (pu.type === 'shield') this.audio.shieldUp();
    this._addActivePill(pu);
  }

  _addActivePill(pu) {
    this.activePills = this.activePills || [];
    this.activePills.push({ icon: pu.icon, name: pu.name, time: pu.duration || 5, color: '#' + pu.color.toString(16).padStart(6, '0') });
  }

  _burstAt(x, y, z, color, count = 8) {
    const sprites = burst(this.scene, new THREE.Vector3(x, y, z), color, count);
    this.bursts.push(...sprites);
  }

  // -------------------------------------------------------------------------
  // spawning
  // -------------------------------------------------------------------------
  _spawnLoop(dt) {
    this.spawnAccum += this.speed * dt;
    while (this.spawnAccum >= this.spawnGap) {
      this.spawnAccum -= this.spawnGap;
      this._spawnPattern(-220);
      // gradually tighten gap as distance grows (difficulty ramp)
      this.spawnGap = Math.max(16, 26 - this.run.distance * 0.005);
    }
  }

  _spawnPattern(z) {
    const lane = randInt(0, 2);
    const r = Math.random();

    // occasional coin-only breather
    if (r < 0.14) { this._coinLine(z, pick([0, 1, 2])); return; }

    // single jump obstacle + coins
    if (r < 0.34) {
      this._jumpObstacle(lane, z);
      if (Math.random() < 0.7) this._coinArc(z - 6, lane);
      return;
    }
    // double jump obstacle (two lanes blocked)
    if (r < 0.50) {
      const l2 = (lane + randInt(1, 2)) % 3;
      this._jumpObstacle(lane, z);
      this._jumpObstacle(l2, z + rand(0, 3));
      return;
    }
    // slide-under obstacle
    if (r < 0.62) {
      this._slideObstacle(lane, z);
      if (Math.random() < 0.6) this._coinLine(z - 7, (lane + 1) % 3);
      return;
    }
    // block wall — coins in a safe lane
    if (r < 0.76) {
      const safe = (lane + randInt(1, 2)) % 3;
      this._blockObstacle(lane, z);
      if (Math.random() < 0.6) this._coinLine(z - 5, safe);
      return;
    }
    // gap (pit) — jump over
    if (r < 0.84) {
      this._pit(z);
      if (Math.random() < 0.6) this._coinArc(z - 2, pick([0, 1, 2]));
      return;
    }
    // collectible row
    if (r < 0.90) {
      const c = pick(['scroll', 'faith', 'coin']);
      if (c === 'scroll') this._scrollRow(z);
      else if (c === 'faith') this._faithRow(z);
      else this._coinLine(z, pick([0, 1, 2]));
      return;
    }
    // star arc (over a jump obstacle — risk/reward)
    if (r < 0.95) {
      this._jumpObstacle(lane, z);
      this._starArc(z, lane);
      return;
    }
    // powerup
    const pu = pick(POWERUPS);
    const c = this._freeCollectible();
    if (c) this._setCollectible(c, 'powerup', pick([0, 1, 2]), z, pu.id);
  }

  _jumpObstacle(lane, z) {
    const o = this._freeObstacle();
    if (!o) return;
    const types = ['rock', 'log', 'cart', 'lowwall', 'stall', 'animal', 'fire'];
    this._setObstacle(o, pick(types), lane, z);
  }
  _slideObstacle(lane, z) {
    const o = this._freeObstacle();
    if (!o) return;
    const types = ['gate', 'branch', 'banner'];
    this._setObstacle(o, pick(types), lane, z);
  }
  _blockObstacle(lane, z) {
    const o = this._freeObstacle();
    if (!o) return;
    const types = ['soldier', 'tallwall'];
    this._setObstacle(o, pick(types), lane, z);
  }
  _pit(z) {
    const p = this._freePit();
    if (p) this._setPit(p, z);
  }

  _coinLine(z, lane) {
    for (let i = 0; i < 5; i++) {
      const c = this._freeCollectible();
      if (c) this._setCollectible(c, 'coin', lane, z - i * 2.4);
    }
  }
  _coinArc(z, lane) {
    for (let i = 0; i < 6; i++) {
      const c = this._freeCollectible();
      if (c) this._setCollectible(c, 'coin', lane, z - i * 2.2);
    }
  }
  _scrollRow(z) {
    const lane = randInt(0, 2);
    for (let i = 0; i < 3; i++) {
      const c = this._freeCollectible();
      if (c) this._setCollectible(c, 'scroll', lane, z - i * 2.6);
    }
  }
  _faithRow(z) {
    const lane = randInt(0, 2);
    for (let i = 0; i < 3; i++) {
      const c = this._freeCollectible();
      if (c) this._setCollectible(c, 'faith', lane, z - i * 2.8);
    }
  }
  _starArc(z, lane) {
    for (let i = 0; i < 3; i++) {
      const c = this._freeCollectible();
      if (c) this._setCollectible(c, 'star', lane, z - i * 3);
    }
  }

  // -------------------------------------------------------------------------
  // main loop
  // -------------------------------------------------------------------------
  _loop(now) {
    const dt = clamp((now - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = now;
    this._update(dt);
    updateBurst(this.bursts, dt);
    this.renderer.render();
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    if (this.state === 'running') {
      this._updateRun(dt);
    } else if (this.state === 'menu' || this.state === 'tutorial') {
      this._updateMenuBackdrop(dt);
    }
    this.renderer.updateCamera(this.player || { x: 0, jumpY: 0 }, dt);
  }

  _updateMenuBackdrop(dt) {
    this.renderer.scrollTextures(BASE_SPEED, dt);
    this._updateDecor(dt, BASE_SPEED);
    this.renderer.updateSide(BASE_SPEED, dt);
    // idle animation for the menu character
    if (this.playerParts) {
      this.runPhase = (this.runPhase || 0) + dt * 6;
      this._pose(this.runPhase, 0, false, false, dt);
    }
  }

  _updateRun(dt) {
    const run = this.run;
    // speed ramp
    const ramp = Math.min(MAX_SPEED - BASE_SPEED, run.distance * SPEED_RAMP);
    this.speedMult = 1 + (this.speedBoost > 0 ? 0.4 : 0);
    this.speed = (BASE_SPEED + ramp) * this.speedMult;
    run.distance += this.speed * dt;
    this.runStats.distance = run.distance;

    // timers
    this.magnet = Math.max(0, this.magnet - dt);
    this.flying = Math.max(0, this.flying - dt);
    this.speedBoost = Math.max(0, this.speedBoost - dt);
    this.light = Math.max(0, this.light - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    if (this._multTimer) { this._multTimer -= dt; if (this._multTimer <= 0) { this.multiplier = 1; this._multTimer = null; } }
    if (this._faithTimer) { this._faithTimer -= dt; if (this._faithTimer <= 0) { this.faithMult = 1; this._faithTimer = null; } }

    // active pills decay
    if (this.activePills) {
      this.activePills.forEach((p) => p.time -= dt);
      this.activePills = this.activePills.filter((p) => p.time > 0);
    }

    // --- player physics ---
    const p = this.player;
    p.x += (LANES[p.lane] - p.x) * Math.min(1, dt * 14);
    if (!p.onGround) {
      p.vy -= GRAVITY * dt;
      p.jumpY += p.vy * dt;
      if (p.jumpY <= 0) { p.jumpY = 0; p.vy = 0; p.onGround = true; }
    }
    if (p.sliding) {
      p.slideT += dt;
      if (p.slideT >= 0.85) { p.sliding = false; p.slideT = 0; }
    }
    if (this.flying > 0) {
      p.jumpY = Math.max(p.jumpY, 2.2);
      p.vy = 0;
      p.onGround = false;
    }

    // landing thud + footsteps
    if (this.wasAirborne && p.onGround) this.audio.land();
    this.wasAirborne = !p.onGround;
    if (p.onGround && !p.sliding) {
      this.footTimer -= dt;
      if (this.footTimer <= 0) {
        this.audio.footstep();
        this.footTimer = Math.max(0.16, 0.34 - this.speed * 0.004);
      }
    }

    // distance milestone fanfare
    if (run.distance >= this.nextMilestone) {
      this.audio.milestone();
      this.ui.toast(`⛰️ ${this.nextMilestone}m — keep the faith!`);
      this.nextMilestone += 500;
    }

    // danger heartbeat: pulse faster as an obstacle in our lane approaches
    this._dangerHeartbeat(dt);

    // --- move objects ---
    this._moveObstacles(dt);
    this._moveCollectibles(dt);
    this._movePits(dt);
    this._updateDecor(dt, this.speed);
    this.renderer.scrollTextures(this.speed, dt);
    this.renderer.updateSide(this.speed, dt);

    // --- collisions ---
    if (this.invincible <= 0 && this.flying <= 0) {
      this._checkObstacleCollisions();
      this._checkPitCollisions();
    }

    // --- collections ---
    this._checkCollectibles();

    // --- scoring ---
    const faithMult = this.faithMult || 1;
    run.score = Math.floor(
      (run.distance * 2 + run.coins * COIN_VALUE + run.scrolls * 40 + run.faith * 8 + run.stars * 120) * this.multiplier
    );
    this.runStats.score = run.score;
    this.runStats.crashed = false;
    this.audio.pulseMusic(this.speed / MAX_SPEED);

    // live mission progress (no_crash at 400m, score, distance)
    this._liveMissionProgress();

    // --- pose ---
    this.runPhase += dt * (4 + this.speed * 0.35);
    this._pose(this.runPhase, p.jumpY, p.sliding, p.onGround, dt);

    // --- shield bubble ---
    this.shieldMesh.visible = this.shield || this.invincible > 0;
    this.shieldMesh.rotation.y += dt * 2;

    // --- HUD ---
    this._updateHud();
    this._spawnLoop(dt);
  }

  _dangerHeartbeat(dt) {
    if (this.flying > 0 || this.invincible > 0 || this.shield) return;
    const p = this.player;
    if (!p.onGround) return;
    // nearest obstacle ahead in the player's lane
    let nearest = Infinity;
    for (const o of this.obstacles) {
      if (!o.active || o.lane !== p.lane) continue;
      const ahead = o.z - PLAYER_Z;
      if (ahead > 0 && ahead < nearest) nearest = ahead;
    }
    if (nearest > 14 || !isFinite(nearest)) { this.heartTimer = 0; return; }
    this.heartTimer -= dt;
    if (this.heartTimer <= 0) {
      this.audio.heartbeat();
      // interval tightens from 0.7s (far) down to 0.28s (very close)
      this.heartTimer = 0.28 + (nearest / 14) * 0.42;
    }
  }

  _moveObstacles(dt) {
    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.z += this.speed * dt;
      o.obj.position.z = o.z;
      // near-miss whoosh when an obstacle in our lane passes us safely
      if (!o.passed && o.z > PLAYER_Z + 0.25) {
        o.passed = true;
        if (o.lane === this.player.lane) this.audio.nearMiss();
      }
      if (o.z > RECYCLE_Z) { o.active = false; o.obj.visible = false; }
    }
  }

  _moveCollectibles(dt) {
    for (const c of this.collectibles) {
      if (!c.active) continue;
      c.z += this.speed * dt;
      // magnet attraction
      if (this.magnet > 0 && Math.abs(c.z - PLAYER_Z) < 9 && Math.abs(c.x - this.player.x) < 5) {
        c.x += (this.player.x - c.x) * Math.min(1, dt * 10);
        c.z += (PLAYER_Z - c.z) * Math.min(1, dt * 10);
      }
      c.obj.position.x = c.x;
      c.obj.position.z = c.z;
      // spin
      if (c.obj.userData.spin) c.obj.userData.spin.rotation.y += dt * 4;
      if (c.kind === 'coin') c.obj.rotation.y += dt * 4;
      if (c.z > RECYCLE_Z) { c.active = false; c.obj.visible = false; }
    }
  }

  _movePits(dt) {
    for (const p of this.pits) {
      if (!p.active) continue;
      p.z += this.speed * dt;
      p.obj.position.z = p.z;
      if (p.z > RECYCLE_Z) { p.active = false; p.obj.visible = false; }
    }
  }

  _updateDecor(dt, speed) {
    for (const g of this.decor) {
      g.position.z += speed * dt;
      if (g.position.z > 16) {
        g.position.z -= 300;
        g.position.x = g.userData.side * rand(g.userData.minX, g.userData.maxX);
      }
    }
  }

  _pose(runPhase, jumpY, sliding, onGround, dt) {
    const parts = this.playerParts;
    if (!parts) return;
    const g = this.playerGroup;
    g.position.x = this.player ? this.player.x : 0;
    g.position.y = jumpY;

    if (sliding) {
      g.rotation.x = -1.2;
      g.position.y = 0.15;
      parts.legL.rotation.x = 0.9;
      parts.legR.rotation.x = 0.7;
      parts.armL.rotation.x = -0.8;
      parts.armR.rotation.x = -0.6;
      return;
    }
    g.rotation.x = 0;
    const sw = onGround ? Math.sin(runPhase) * 0.55 : 0.25;
    parts.legL.rotation.x = sw;
    parts.legR.rotation.x = -sw;
    parts.armL.rotation.x = -sw;
    parts.armR.rotation.x = sw;
    if (!onGround) {
      parts.legL.rotation.x = 0.5;
      parts.legR.rotation.x = -0.3;
    }
  }

  // -------------------------------------------------------------------------
  // collisions
  // -------------------------------------------------------------------------
  _checkObstacleCollisions() {
    const p = this.player;
    const playerBottom = p.jumpY;
    const playerTop = p.jumpY + (p.sliding ? 0.38 : 1.64);
    for (const o of this.obstacles) {
      if (!o.active) continue;
      if (o.lane !== p.lane) continue;
      if (Math.abs(o.z - PLAYER_Z) > 1.1) continue;
      let hit = false;
      if (o.kind === 'jump') {
        // obstacle occupies [0, top]
        if (playerBottom < o.top && playerTop > 0) hit = true;
      } else if (o.kind === 'slide') {
        // obstacle occupies [clearance, up]
        if (playerTop > o.clearance) hit = true;
      } else {
        // block occupies [0, top]
        if (playerTop > 0) hit = true;
      }
      if (hit) {
        o.active = false;
        o.obj.visible = false;
        this._crash();
        return;
      }
    }
  }

  _checkPitCollisions() {
    const p = this.player;
    for (const pit of this.pits) {
      if (!pit.active) continue;
      if (Math.abs(pit.z - PLAYER_Z) < 1.2) {
        if (p.jumpY < 0.5) {
          this._crash();
          return;
        }
      }
    }
  }

  _crash() {
    if (this.shield) {
      this.shield = false;
      this.invincible = 1.4;
      this.audio.shieldBreak();
      this._burstAt(this.player.x, 1.2, PLAYER_Z, 'rgba(255,220,120,0.95)', 14);
      this.renderer.setCameraShake(0.4);
      return;
    }
    this.renderer.setCameraShake(0.9);
    this.audio.crash();
    this._vibrate([60, 30, 60, 30, 120]);
    this._burstAt(this.player.x, 1.2, PLAYER_Z, 'rgba(255,140,80,0.95)', 18);
    this._endRun(true);
  }

  // -------------------------------------------------------------------------
  // collectibles
  // -------------------------------------------------------------------------
  _checkCollectibles() {
    const p = this.player;
    for (const c of this.collectibles) {
      if (!c.active) continue;
      if (Math.abs(c.z - PLAYER_Z) < 0.9 && Math.abs(c.x - p.x) < 0.8) {
        c.active = false;
        c.obj.visible = false;
        this._collect(c);
      }
    }
  }

  _collect(c) {
    const run = this.run;
    const pos = { x: c.x, y: c.kind === 'star' ? 1.2 : 0.8, z: PLAYER_Z };
    switch (c.kind) {
      case 'coin': {
        const val = COIN_VALUE;
        run.coins += val;
        this.runStats.coins += val;
        this.audio.coin();
        this._vibrate(10);
        this._burstAt(pos.x, pos.y, pos.z, 'rgba(255,210,90,0.9)', 5);
        break;
      }
      case 'scroll': {
        run.scrolls += SCROLL_VALUE;
        this.runStats.scrolls += SCROLL_VALUE;
        this.store.stats.scrollsCollected++;
        this.audio.scroll();
        this._burstAt(pos.x, pos.y, pos.z, 'rgba(240,225,180,0.95)', 7);
        this._maybeUnlockVerse();
        break;
      }
      case 'faith': {
        run.faith += FAITH_VALUE;
        this.runStats.faith += FAITH_VALUE;
        this.audio.faith();
        this._burstAt(pos.x, pos.y, pos.z, 'rgba(255,200,90,0.95)', 6);
        break;
      }
      case 'star': {
        run.stars += STAR_VALUE;
        this.runStats.stars += STAR_VALUE;
        this.store.stats.starsCollected++;
        this.audio.star();
        this.audio.praise();
        this._vibrate([20, 30, 20]);
        this._burstAt(pos.x, pos.y, pos.z, 'rgba(255,240,160,0.95)', 10);
        break;
      }
      case 'powerup': {
        const pu = POWERUPS.find((x) => x.id === c.pu);
        if (pu) this._applyPowerup(pu);
        break;
      }
      default: break;
    }
  }

  _maybeUnlockVerse() {
    const s = this.store;
    const total = s.stats.scrollsCollected;
    if (total > 0 && total <= VERSES.length) {
      const idx = total - 1;
      if (idx < VERSES.length && !s.unlocks.verses.includes(idx)) {
        s.unlocks.verses.push(idx);
        s.unlocks.verses.sort((a, b) => a - b);
        this.newVerseQueued = VERSES[idx];
        this.audio.verse();
      }
    }
  }

  // -------------------------------------------------------------------------
  // run end
  // -------------------------------------------------------------------------
  _endRun(crashed) {
    this.runStats.crashed = crashed;
    this._applyRunToProgress();
    this.audio.stopMusic();
    this.state = 'gameover';
    this.ui.showHud(false);

    // end-of-run sting
    if (this.lastWasRecord) { this.audio.hallelujah(); this._vibrate([30, 30, 30, 30, 80]); }
    else if (crashed) this.audio.gameOver();
    else this.audio.victory();

    // queue quiz occasionally
    const lvl = levelForXp(this.store.profile.xp);
    const eligible = lvl.index >= 1 && (this.store.profile.totalRuns - this.lastQuizRun) >= 2;
    this.quizQueued = eligible && Math.random() < 0.5;

    const stats = {
      distance: this.run.distance,
      score: this.run.score,
      coins: this.run.coins,
      scrolls: this.run.scrolls,
      faith: this.run.faith,
      newRecord: this.lastWasRecord,
      revived: this.run.revived,
    };

    // level-up celebration takes precedence over the game-over screen
    if (this.pendingLevelUp) {
      const name = this.pendingLevelUp.name;
      this.pendingLevelUp = null;
      this._gameOverStats = stats;
      this.state = 'levelup';
      this.audio.levelUp();
      this.audio.shofar(2);
      this._vibrate([40, 40, 40, 40, 120]);
      this.ui.renderLevelUp(name);
      return;
    }
    this.ui.renderGameOver(stats);
  }

  _applyRunToProgress() {
    const s = this.store;
    const run = this.run;
    const rs = this.runStats;
    const levelBefore = levelForXp(s.profile.xp).index;
    // currencies & xp (coins/faith also added here as run rewards)
    const xp = Math.floor(run.distance / 10) + run.coins + run.scrolls * 3 + run.stars * 10;
    s.addCoins(run.coins);
    const faithGain = run.faith + run.scrolls + run.stars * 2 + Math.floor(run.distance / 100);
    s.addFaith(faithGain);
    s.addXp(xp);

    this.lastWasRecord = s.recordRun({
      distance: run.distance, score: run.score, coins: run.coins,
      scrolls: run.scrolls, faith: faithGain, stars: run.stars,
      crashed: rs.crashed, world: run.world,
    });

    // missions
    for (const m of MISSIONS) {
      if (s.missionsClaimed[m.id]) continue;
      let delta = 0;
      switch (m.type) {
        case 'distance': delta = Math.round(rs.distance); break;
        case 'coins': delta = rs.coins; break;
        case 'scrolls': delta = rs.scrolls; break;
        case 'jumps': delta = rs.jumps; break;
        case 'slides': delta = rs.slides; break;
        case 'powerups': delta = rs.powerups; break;
        case 'faith': delta = rs.faith + rs.scrolls; break;
        case 'stars': delta = rs.stars; break;
        case 'score': delta = rs.score >= m.target ? 1 : 0; break;
        case 'no_crash': delta = (!rs.crashed && rs.distance >= 300) ? 1 : 0; break;
        case 'world_jerusalem': delta = run.world === 'jerusalem' ? 1 : 0; break;
        default: break;
      }
      if (delta > 0) {
        s.missions[m.id] = Math.min(m.target, (s.missions[m.id] || 0) + delta);
      }
    }

    // daily challenges
    this._refreshDaily();
    for (const d of DAILY_CHALLENGES) {
      const cur = s.daily.challenges[d.id] || 0;
      if (cur >= d.target) continue;
      let delta = 0;
      switch (d.type) {
        case 'coins': delta = rs.coins; break;
        case 'distance': delta = Math.round(rs.distance); break;
        case 'scrolls': delta = rs.scrolls; break;
        case 'quiz': delta = 0; break;
        default: break;
      }
      if (delta > 0) {
        s.daily.challenges[d.id] = Math.min(d.target, cur + delta);
      }
    }
    // auto-grant daily challenge rewards reached
    for (const d of DAILY_CHALLENGES) {
      const cur = s.daily.challenges[d.id] || 0;
      const key = d.id + '_granted';
      if (cur >= d.target && !s.daily[key]) {
        s.daily[key] = true;
        s.addCoins(d.reward.coins);
        s.addFaith(d.reward.faith);
        this._pendingToasts.push(`🎯 Daily: ${d.text} — +🪙${d.reward.coins} +✨${d.reward.faith}`);
      }
    }

    // character xp
    const ch = s.getCharacter(s.selected.character);
    ch.xp += xp;
    while (ch.level < 5 && ch.xp >= ch.level * 500) {
      ch.xp -= ch.level * 500;
      ch.level++;
    }

    // player level-up detection
    const levelAfter = levelForXp(s.profile.xp).index;
    if (levelAfter > levelBefore) {
      this.pendingLevelUp = { index: levelAfter, name: LEVELS[levelAfter].name };
    }

    s.save();
  }

  _liveMissionProgress() {
    // Track no_crash and score live so they can be granted without waiting for crash.
    const s = this.store;
    for (const m of MISSIONS) {
      if (s.missionsClaimed[m.id]) continue;
      if (m.type === 'no_crash' && !this.runStats.crashed && this.run.distance >= 300) {
        s.missions[m.id] = m.target;
      }
    }
  }

  // -------------------------------------------------------------------------
  // quiz
  // -------------------------------------------------------------------------
  _showQuiz(after) {
    this.afterQuiz = after;
    this.quizQueued = false;
    this.lastQuizRun = this.store.profile.totalRuns;
    this.quizQuestion = pick(QUIZ);
    this.state = 'quiz';
    this.ui.renderQuiz(this.quizQuestion, (idx) => this.answerQuiz(idx));
  }

  answerQuiz(idx) {
    const q = this.quizQuestion;
    const correct = idx === q.correct;
    if (correct) {
      const reward = { coins: 100, faith: 50 };
      this.store.addCoins(reward.coins);
      this.store.addFaith(reward.faith);
      this.store.stats.quizzesCorrect++;
      // daily quiz challenge
      const d = DAILY_CHALLENGES.find((c) => c.type === 'quiz');
      if (d) {
        this.store.daily.challenges[d.id] = Math.min(d.target, (this.store.daily.challenges[d.id] || 0) + 1);
        if ((this.store.daily.challenges[d.id] || 0) >= d.target && !this.store.daily[d.id + '_granted']) {
          this.store.daily[d.id + '_granted'] = true;
          this.store.addCoins(d.reward.coins);
          this.store.addFaith(d.reward.faith);
        }
      }
      this.store.save();
      this.audio.quizCorrect();
    } else {
      this.audio.quizWrong();
    }
    this.ui.renderQuizResult(correct, q.ref, { coins: 100, faith: 50 });
  }

  continueAfterQuiz() {
    if (this.afterQuiz === 'run') this.startRun();
    else this.toHome();
  }

  continueAfterLevelUp() {
    this.state = 'gameover';
    this.ui.showHud(false);
    this.ui.renderGameOver(this._gameOverStats || {
      distance: 0, score: 0, coins: 0, scrolls: 0, faith: 0,
      newRecord: false, revived: false,
    });
  }

  // -------------------------------------------------------------------------
  // verse modal (mid-run)
  // -------------------------------------------------------------------------
  continueRun() {
    if (this.state === 'verse') {
      this.state = 'running';
      this.ui.hideScreens();
      this.ui.showHud(true);
    }
  }

  // -------------------------------------------------------------------------
  // revive
  // -------------------------------------------------------------------------
  revive() {
    if (this.run.revived) return;
    const s = this.store;
    if (s.profile.faithPoints < REVIVE_COST) {
      this.ui.toast(`Not enough faith points — need ${REVIVE_COST}✨`, '');
      return;
    }
    s.profile.faithPoints -= REVIVE_COST;
    s.save();
    this.run.revived = true;
    this.audio.revive();
    this.audio.shofar(1);
    // clear nearby obstacles and give shield + brief invincibility
    for (const o of this.obstacles) {
      if (o.active && o.z < 25 && o.z > -8) { o.active = false; o.obj.visible = false; }
    }
    for (const p of this.pits) {
      if (p.active && p.z < 25 && p.z > -8) { p.active = false; p.obj.visible = false; }
    }
    this.shield = true;
    this.invincible = 2.5;
    this.state = 'running';
    this.ui.hideScreens();
    this.ui.showHud(true);
    this.audio.startMusic();
  }

  // -------------------------------------------------------------------------
  // selection / unlock / upgrade
  // -------------------------------------------------------------------------
  selectCharacter(id) {
    if (!this.store.unlocks.characters.includes(id)) return;
    this.store.selected.character = id;
    this.store.save();
    this.audio.click();
    this.applyCharacter(CHARACTERS.find((c) => c.id === id));
    this.ui.renderCharacters();
  }

  unlockCharacter(id) {
    const c = CHARACTERS.find((x) => x.id === id);
    if (!c || this.store.unlocks.characters.includes(id)) return;
    const lvl = levelForXp(this.store.profile.xp);
    if (lvl.index < c.unlock.level) { this.ui.toast(`Reach ${c.unlock.level + 1} to unlock ${c.name}`); return; }
    if (!this.store.spendCoins(c.unlock.coins)) { this.ui.toast('Not enough coins'); return; }
    this.store.unlocks.characters.push(id);
    this.store.save();
    this.audio.unlock();
    this.ui.toast(`Unlocked ${c.name}!`);
    this.selectCharacter(id);
    this.ui.renderCharacters();
  }

  upgradeCharacter(id) {
    const c = this.store.getCharacter(id);
    if (c.level >= 5) return;
    const cost = 150 + c.level * 100;
    if (!this.store.spendCoins(cost)) { this.ui.toast('Not enough coins'); return; }
    c.level++;
    this.store.save();
    this.audio.unlock();
    this.ui.renderCharacters();
  }

  selectWorld(id) {
    if (!this.store.unlocks.worlds.includes(id)) return;
    this.store.selected.world = id;
    this.store.save();
    this.audio.click();
    this.applyWorld(WORLDS.find((w) => w.id === id));
    this.ui.renderWorlds();
  }

  unlockWorld(id) {
    const w = WORLDS.find((x) => x.id === id);
    if (!w || this.store.unlocks.worlds.includes(id)) return;
    const lvl = levelForXp(this.store.profile.xp);
    if (lvl.index < w.unlock.level) { this.ui.toast(`Reach ${w.unlock.level + 1} to unlock ${w.name}`); return; }
    if (!this.store.spendCoins(w.unlock.coins)) { this.ui.toast('Not enough coins'); return; }
    this.store.unlocks.worlds.push(id);
    this.store.save();
    this.audio.unlock();
    this.ui.toast(`Unlocked ${w.name}!`);
    this.selectWorld(id);
    this.ui.renderWorlds();
  }

  wearOutfit(id) {
    if (!this.store.unlocks.outfits.includes(id)) return;
    this.store.selected.outfit = id;
    this.store.save();
    this.audio.click();
    this.applyCharacter(this.character);
    this.ui.renderShop();
  }

  buyOutfit(id) {
    const o = OUTFITS.find((x) => x.id === id);
    if (!o || this.store.unlocks.outfits.includes(id)) return;
    if (!this.store.spendCoins(o.cost)) { this.ui.toast('Not enough coins'); return; }
    this.store.unlocks.outfits.push(id);
    this.store.save();
    this.audio.unlock();
    this.wearOutfit(id);
    this.ui.renderShop();
  }

  claimMission(id) {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m || this.store.missionsClaimed[id]) return;
    if ((this.store.missions[id] || 0) < m.target) return;
    this.store.missionsClaimed[id] = true;
    this.store.addCoins(m.reward.coins);
    this.store.addFaith(m.reward.faith);
    this.store.save();
    this.audio.unlock();
    this.ui.toast(`Mission complete! +🪙${m.reward.coins} +✨${m.reward.faith}`);
    this.ui.renderMissions();
  }

  claimDaily() {
    const s = this.store;
    const today = _todayStr();
    if (s.daily.lastClaimed === today) { this.ui.toast('Already claimed today'); return; }
    // streak
    const yesterday = _todayStr(-1);
    s.daily.streak = (s.daily.lastClaimed === yesterday) ? s.daily.streak + 1 : 1;
    s.daily.lastClaimed = today;
    const reward = DAILY_REWARDS[(s.daily.streak - 1) % 7];
    s.addCoins(reward.coins);
    if (reward.faith) s.addFaith(reward.faith);
    s.save();
    this.audio.unlock();
    this.ui.toast(`Day ${s.daily.streak} reward! +🪙${reward.coins}${reward.faith ? ' +✨' + reward.faith : ''}`);
    this.ui.renderDaily();
  }

  _refreshDaily() {
    const s = this.store;
    const today = _todayStr();
    if (s.daily.challengeDate !== today) {
      s.daily.challengeDate = today;
      s.daily.challenges = {};
      for (const d of DAILY_CHALLENGES) {
        if (s.daily[d.id + '_granted']) { /* keep granted flag to avoid re-grant, but reset progress */ }
        delete s.daily[d.id + '_granted'];
      }
    }
  }

  setSetting(key, value) {
    const s = this.store.settings;
    s[key] = value;
    if (key === 'music') this.audio.setMusicVolume(value);
    if (key === 'sfx') this.audio.setSfxVolume(value);
    if (key === 'quality') {
      this.renderer.renderer.setPixelRatio(value === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    }
    this.store.save();
  }

  resetTutorial() {
    this.store.resetTutorial();
    this.ui.toast('Tutorial reset');
  }

  _vibrate(pattern) {
    if (this.store.settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* not supported */ }
    }
  }

  toggleMusicMute() {
    const a = this.audio;
    if (a.musicVolume > 0) {
      this._preMusicVolume = a.musicVolume;
      a.setMusicVolume(0);
      this.store.settings.music = 0;
    } else {
      const v = this._preMusicVolume || 0.7;
      a.setMusicVolume(v);
      this.store.settings.music = v;
    }
    this.store.save();
    this.ui.renderPause();
  }

  toggleSfxMute() {
    const a = this.audio;
    if (a.sfxVolume > 0) {
      this._preSfxVolume = a.sfxVolume;
      a.setSfxVolume(0);
      this.store.settings.sfx = 0;
    } else {
      const v = this._preSfxVolume || 0.9;
      a.setSfxVolume(v);
      this.store.settings.sfx = v;
    }
    this.store.save();
    this.ui.renderPause();
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------
  _updateHud() {
    const ch = this.character;
    const abilityReady = this.abilityCd <= 0;
    const active = (this.activePills || []).map((p) => ({ ...p }));
    // include shield/flying states
    if (this.shield) active.unshift({ icon: '🛡️', name: 'Shield', time: null, color: '#ffd94a' });
    if (this.flying > 0) active.unshift({ icon: '🦅', name: 'Flying', time: this.flying, color: '#ffffff' });
    if (this.multiplier > 1) active.unshift({ icon: '✖️', name: 'x2 Faith', time: null, color: '#ffa05a' });

    // focus mission
    let mission = null;
    const s = this.store;
    for (const m of MISSIONS) {
      if (s.missionsClaimed[m.id]) continue;
      const key = this._missionKey(m.type);
      const live = this._liveStat(m.type);
      const progress = Math.min(m.target, (s.missions[m.id] || 0) + live);
      mission = { text: m.text, progress, target: m.target };
      break;
    }

    this.ui.updateHud({
      score: this.run.score,
      coins: this.run.coins,
      scrolls: this.run.scrolls,
      faith: this.run.faith,
      distance: this.run.distance,
      speed: this.speed,
      abilityName: ch.ability.name,
      abilityIcon: this._abilityIcon(ch.ability.type),
      abilityReady,
      cooldownPct: this.abilityCd / ch.ability.cooldown,
      active,
      mission,
    });

    // verse modal
    if (this.newVerseQueued) {
      this.state = 'verse';
      this.ui.renderVerse(this.newVerseQueued);
      this.newVerseQueued = null;
    }
  }

  _missionKey(type) { return type; }
  _liveStat(type) {
    const rs = this.runStats;
    switch (type) {
      case 'distance': return Math.round(rs.distance);
      case 'coins': return rs.coins;
      case 'scrolls': return rs.scrolls;
      case 'jumps': return rs.jumps;
      case 'slides': return rs.slides;
      case 'powerups': return rs.powerups;
      case 'faith': return rs.faith + rs.scrolls;
      case 'stars': return rs.stars;
      default: return 0;
    }
  }

  _abilityIcon(type) {
    return { speed: '⚡', clear: '🌊', shield: '🛡️', coin: '👑', faith: '✨', light: '🕯️' }[type] || '✨';
  }
}

function _todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
