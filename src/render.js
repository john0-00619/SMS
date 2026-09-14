// ============================================================================
// PATH OF FAITH — 3D renderer (Three.js, stylized low-poly, mobile-friendly)
// ============================================================================
import { LANES, LANE_WIDTH } from './const.js';

const THREE = window.THREE;

const _m = (color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

const _box = (w, h, d, color, opts = {}) => {
  const g = new THREE.BoxGeometry(w, h, d);
  return new THREE.Mesh(g, _m(color, opts));
};

const _cyl = (rt, rb, h, color, seg = 10) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  return new THREE.Mesh(g, _m(color));
};

// ---------------------------------------------------------------------------
// Canvas texture helper
// ---------------------------------------------------------------------------
function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

// ---------------------------------------------------------------------------
// Sky gradient dome
// ---------------------------------------------------------------------------
function buildSky(palette) {
  const c = makeCanvas(64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#' + palette.skyTop.toString(16).padStart(6, '0'));
    g.addColorStop(1, '#' + palette.skyHorizon.toString(16).padStart(6, '0'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.SphereGeometry(220, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  return { sky, tex };
}

// ---------------------------------------------------------------------------
// Ground textures per world
// ---------------------------------------------------------------------------
function buildGroundTexture(world, palette) {
  const kind = world.groundKind || 'stone';
  const base = palette.ground;
  const accent = palette.groundAccent;
  const canvas = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#' + base.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    // speckle
    for (let i = 0; i < 900; i++) {
      const shade = (Math.random() - 0.5) * 34;
      const r = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255;
      ctx.fillStyle = `rgb(${Math.max(0, r + shade) | 0},${Math.max(0, g + shade) | 0},${Math.max(0, b + shade) | 0})`;
      const s = Math.random() * 5 + 1;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    // cracks / variation depending on kind
    ctx.strokeStyle = '#' + accent.toString(16).padStart(6, '0');
    if (kind === 'stone' || kind === 'seabed' || kind === 'palace') {
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        let x = Math.random() * w, y = Math.random() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (kind === 'sand') {
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#' + accent.toString(16).padStart(6, '0');
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 20 + 6, 0.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildRoadTexture(palette) {
  const base = palette.accent;
  const edge = palette.accent2;
  const canvas = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#' + base.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const shade = (Math.random() - 0.5) * 30;
      const r = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255;
      ctx.fillStyle = `rgb(${Math.max(0, r + shade) | 0},${Math.max(0, g + shade) | 0},${Math.max(0, b + shade) | 0})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 5 + 1, Math.random() * 5 + 1);
    }
    // lane edges (two vertical lines)
    ctx.fillStyle = '#' + edge.toString(16).padStart(6, '0');
    ctx.globalAlpha = 0.55;
    const lane = w / 3;
    for (let k = 1; k <= 2; k++) {
      ctx.fillRect(lane * k - 3, 0, 6, h);
    }
    ctx.globalAlpha = 1;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// Star shape for collectibles (billboard sprite)
// ---------------------------------------------------------------------------
function starSprite(color, size = 64) {
  const c = makeCanvas(size, size, (ctx, s) => {
    const cx = s / 2, cy = s / 2, R = s * 0.46, r = s * 0.19;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  return new THREE.CanvasTexture(c);
}

const _glowCache = new Map();
function glowSprite(color, radius = 1.0) {
  if (_glowCache.has(color)) return _glowCache.get(color);
  const s = 64;
  const c = makeCanvas(s, s, (ctx) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  const tex = new THREE.CanvasTexture(c);
  _glowCache.set(color, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// RENDERER CLASS
// ---------------------------------------------------------------------------
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd9b98a, 30, 150);

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 4.4, 8.6);
    this.camera.lookAt(0, 1.1, -12);

    this.skyMesh = null;
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x9a8a6a, 1.05);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    this.sun.position.set(-12, 22, 10);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xbfd8ff, 0.35);
    this.fill.position.set(10, 6, -6);
    this.scene.add(this.fill);

    this.groundTex = null;
    this.roadTex = null;
    this.world = null;

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  applyWorld(world) {
    this.world = world;
    const p = world.palette;
    // sky
    if (this.skyMesh) this.scene.remove(this.skyMesh);
    const { sky } = buildSky(p);
    this.skyMesh = sky;
    this.scene.add(sky);
    // fog
    this.scene.fog.color.set(p.fog);
    this.scene.fog.far = p.fogFar;
    // lights
    this.hemi.color.set(p.sun);
    this.hemi.groundColor.set(p.ambient);
    this.hemi.intensity = 1.05;
    this.sun.color.set(p.sun);

    // ground
    if (this.groundTex) this.groundTex.dispose();
    if (this.roadTex) this.roadTex.dispose();
    this.groundTex = buildGroundTexture(world, p);
    this.roadTex = buildRoadTexture(p);

    if (this.groundMesh) this.scene.remove(this.groundMesh);
    const gTex = this.groundTex;
    gTex.repeat.set(14, 60);
    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 320),
      new THREE.MeshLambertMaterial({ map: gTex })
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.04, -145);
    this.scene.add(terrain);
    this.groundMesh = terrain;

    if (this.roadMesh) this.scene.remove(this.roadMesh);
    const rTex = this.roadTex;
    rTex.repeat.set(1, 48);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH * 3 + 2.6, 320),
      new THREE.MeshLambertMaterial({ map: rTex })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.0, -145);
    this.scene.add(road);
    this.roadMesh = road;

    // world-specific side features
    this._buildSideFeatures(world);
  }

  _buildSideFeatures(world) {
    if (this.sideGroup) { this.scene.remove(this.sideGroup); }
    this.sideGroup = new THREE.Group();
    this.sideSpan = 0;
    const id = world.id;
    if (id === 'redsea') {
      this.sideSpan = 26 * 12;
      // towering walls of water on both sides
      const waterMat = new THREE.MeshLambertMaterial({ color: 0x2a6080, transparent: true, opacity: 0.82 });
      for (const s of [-1, 1]) {
        for (let i = 0; i < 26; i++) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 26, 12), waterMat);
          wall.position.set(s * 13, 13, -i * 12 - 20);
          this.sideGroup.add(wall);
        }
      }
    } else if (id === 'babylon') {
      this.sideSpan = 14 * 22;
      const colMat = _m(0xd8b860);
      const topMat = _m(0x7a5a8a);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 14; i++) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 22, 10), colMat);
          col.position.set(s * 11, 11, -i * 22 - 20);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 10), topMat);
          cap.position.set(s * 11, 22.6, -i * 22 - 20);
          this.sideGroup.add(col, cap);
        }
      }
    }
    this.scene.add(this.sideGroup);
  }

  setCameraShake(intensity) {
    this.shake = intensity;
  }

  updateSide(speed, dt) {
    if (!this.sideGroup || !this.sideSpan) return;
    this.sideGroup.position.z += speed * dt;
    if (this.sideGroup.position.z > this.sideSpan) this.sideGroup.position.z -= this.sideSpan;
  }

  scrollTextures(speed, dt) {
    if (!this.groundTex) return;
    const off = speed * dt / 8;
    this.groundTex.offset.y += off;
    this.roadTex.offset.y += off;
  }

  updateCamera(player, dt) {
    const c = this.camera;
    // smooth follow
    const targetY = 4.4 + player.jumpY * 0.25;
    const targetX = player.x * 0.18;
    c.position.x += (targetX - c.position.x) * Math.min(1, dt * 8);
    c.position.y += (targetY - c.position.y) * Math.min(1, dt * 6);
    let sx = 0, sy = 0;
    if (this.shake && this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.5, dt * 12);
      if (this.shake < 0.002) this.shake = 0;
    }
    c.position.x += sx; c.position.y += sy;
    c.lookAt(player.x * 0.6, 1.1 + player.jumpY * 0.3, -12);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------
// CHARACTER BUILDER
// ---------------------------------------------------------------------------
export function buildCharacter(scheme) {
  const c = scheme.colors;
  const group = new THREE.Group();
  const parts = {};

  // --- body / robe ---
  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.36, 0.52, 10),
    _m(c.robe)
  );
  robe.position.y = 0.72;
  group.add(robe);
  const torso = _box(0.42, 0.34, 0.26, c.robe);
  torso.position.y = 1.02;
  group.add(torso);
  const belt = _box(0.44, 0.08, 0.28, c.sash);
  belt.position.y = 0.82;
  group.add(belt);

  // --- head ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), _m(c.skin));
  head.position.y = 1.34;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), _m(c.hair));
  hair.position.y = 1.4;
  group.add(hair);
  parts.head = group; // animate whole upper

  // --- arms (pivots at shoulders) ---
  const armGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8);
  const armL = new THREE.Group();
  armL.position.set(-0.32, 1.1, 0);
  const armLMesh = new THREE.Mesh(armGeo, _m(c.robe));
  armLMesh.position.y = -0.21;
  armL.add(armLMesh);
  group.add(armL);
  const armR = new THREE.Group();
  armR.position.set(0.32, 1.1, 0);
  const armRMesh = new THREE.Mesh(armGeo, _m(c.robe));
  armRMesh.position.y = -0.21;
  armR.add(armRMesh);
  group.add(armR);
  parts.armL = armL;
  parts.armR = armR;

  // --- legs (pivots at hips) ---
  const legGeo = new THREE.CylinderGeometry(0.075, 0.055, 0.5, 8);
  const legL = new THREE.Group();
  legL.position.set(-0.13, 0.5, 0);
  const legLMesh = new THREE.Mesh(legGeo, _m(c.tunic));
  legLMesh.position.y = -0.25;
  legL.add(legLMesh);
  group.add(legL);
  const legR = new THREE.Group();
  legR.position.set(0.13, 0.5, 0);
  const legRMesh = new THREE.Mesh(legGeo, _m(c.tunic));
  legRMesh.position.y = -0.25;
  legR.add(legRMesh);
  group.add(legR);
  parts.legL = legL;
  parts.legR = legR;

  // --- prop (held in right hand / on head) ---
  parts.prop = buildProp(scheme.prop, c);
  group.add(parts.prop);

  // group pivot at feet (y=0)
  parts.root = group;
  return { group, parts };
}

function buildProp(prop, c) {
  const g = new THREE.Group();
  g.position.set(0.38, 0.78, 0.05);
  switch (prop) {
    case 'sling': {
      const strap = _box(0.05, 0.5, 0.05, 0x6a4a2a);
      strap.position.y = -0.15;
      g.add(strap);
      break;
    }
    case 'staff': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), _m(0x8a5a2a));
      pole.position.y = -0.15;
      g.add(pole);
      const top = _box(0.09, 0.22, 0.09, 0xd8b34a);
      top.position.y = 0.5;
      g.add(top);
      break;
    }
    case 'crown': {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 10), _m(0xd8b34a));
      crown.position.set(0, 1.5, 0);
      g.add(crown);
      break;
    }
    case 'shield': {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), _m(0x8a2f2f));
      shield.rotation.z = Math.PI / 2;
      shield.position.set(-0.08, 0, 0.08);
      g.add(shield);
      break;
    }
    case 'sheaf': {
      const sheaf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6), _m(0xc9a15a));
      sheaf.position.y = -0.1;
      g.add(sheaf);
      break;
    }
    case 'sword': {
      const blade = _box(0.05, 0.6, 0.04, 0xcfd8e0);
      blade.position.y = -0.2;
      g.add(blade);
      const hilt = _box(0.12, 0.06, 0.04, 0x6a4a2a);
      hilt.position.y = -0.52;
      g.add(hilt);
      break;
    }
    case 'net': {
      const net = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.05, 0.5, 8), _m(0x9a8a6a, { transparent: true, opacity: 0.6 }));
      net.position.y = -0.15;
      g.add(net);
      break;
    }
    case 'scroll': {
      const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), _m(0xe8d5a8));
      scroll.rotation.z = Math.PI / 2;
      scroll.position.y = -0.1;
      g.add(scroll);
      break;
    }
    case 'lamp': {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), _m(0xffd94a, { emissive: 0xffb020, emissiveIntensity: 0.6 }));
      lamp.position.y = -0.1;
      g.add(lamp);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), _m(0x6a4a2a));
      pole.position.y = -0.3;
      g.add(pole);
      break;
    }
    default: break;
  }
  return g;
}

// ---------------------------------------------------------------------------
// OBSTACLE BUILDER — returns { group, kind }
// kind: 'jump' | 'slide' | 'block'
// ---------------------------------------------------------------------------
export function buildObstacle(type, world) {
  const group = new THREE.Group();
  const p = world.palette;
  const stone = p.accent2;
  const kindFor = {
    rock: 'jump', log: 'jump', cart: 'jump', lowwall: 'jump', stall: 'jump',
    animal: 'jump', fire: 'jump', soldier: 'block', tallwall: 'block',
    gate: 'slide', branch: 'slide', banner: 'slide',
  };
  const kind = kindFor[type] || 'jump';

  switch (type) {
    case 'rock': {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), _m(0x8a8072));
      r.position.y = 0.45;
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      group.add(r);
      break;
    }
    case 'log': {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 10), _m(0x6a4a2a));
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.34;
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.32, 10), _m(0xd0b078));
      cap.position.y = 0.34; cap.position.z = -1.2; cap.rotation.y = -Math.PI / 2;
      group.add(log, cap);
      break;
    }
    case 'cart': {
      const bed = _box(1.7, 0.35, 1.0, 0x8a5a2a);
      bed.position.y = 0.55;
      const wheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 10), _m(0x4a3a2a));
      wheel1.rotation.x = Math.PI / 2; wheel1.position.set(-0.6, 0.25, 0);
      const wheel2 = wheel1.clone(); wheel2.position.x = 0.6;
      group.add(bed, wheel1, wheel2);
      break;
    }
    case 'lowwall': {
      const wall = _box(2.0, 0.9, 0.5, stone);
      wall.position.y = 0.45;
      group.add(wall);
      break;
    }
    case 'stall': {
      const base = _box(1.9, 0.8, 1.0, 0x9a6a3a);
      base.position.y = 0.4;
      const awning = _box(2.1, 0.08, 1.1, 0x8a2f2f);
      awning.position.y = 0.85;
      awning.position.z = -0.2;
      awning.rotation.x = -0.15;
      group.add(base, awning);
      break;
    }
    case 'animal': {
      const body = _box(0.7, 0.45, 1.0, 0xe8e0d0);
      body.position.y = 0.45;
      const head = _box(0.3, 0.3, 0.4, 0xd8d0c0);
      head.position.set(0, 0.6, -0.6);
      const wool = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), _m(0xf0ead8));
      wool.position.y = 0.75;
      wool.scale.set(1.1, 0.6, 1.3);
      group.add(body, head, wool);
      break;
    }
    case 'fire': {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.5, 10), _m(0x5a4a3a));
      brazier.position.y = 0.25;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), _m(0xff8a20, { emissive: 0xff5a00, emissiveIntensity: 0.7 }));
      flame.position.y = 0.9;
      group.add(brazier, flame);
      group.userData.animated = true;
      break;
    }
    case 'soldier': {
      const body = _box(0.55, 1.1, 0.4, 0x4a5a6a);
      body.position.y = 0.9;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), _m(0xd9a066));
      head.position.y = 1.7;
      const helm = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 10), _m(0x6a6a6a));
      helm.position.y = 1.95;
      const shield = _box(0.4, 0.7, 0.06, 0x8a2f2f);
      shield.position.set(0.4, 0.9, 0);
      group.add(body, head, helm, shield);
      break;
    }
    case 'tallwall': {
      const wall = _box(2.2, 2.6, 0.6, stone);
      wall.position.y = 1.3;
      const cap = _box(2.3, 0.25, 0.7, p.accent);
      cap.position.y = 2.62;
      group.add(wall, cap);
      break;
    }
    case 'gate': {
      // overhead beam the player slides under
      const beam = _box(2.4, 0.5, 0.4, stone);
      beam.position.y = 1.5;
      const postL = _box(0.22, 2.4, 0.22, stone);
      postL.position.set(-1.15, 1.2, 0);
      const postR = postL.clone(); postR.position.x = 1.15;
      group.add(beam, postL, postR);
      break;
    }
    case 'branch': {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), _m(0x5a4a2a));
      branch.rotation.z = Math.PI / 2;
      branch.position.y = 1.6;
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), _m(0x4a7a3a));
      leaves.position.set(0.8, 1.65, 0);
      group.add(branch, leaves);
      break;
    }
    case 'banner': {
      const bar = _box(2.4, 0.1, 0.1, 0x6a4a2a);
      bar.position.y = 1.6;
      const cloth = _box(1.6, 0.7, 0.04, p.accent2);
      cloth.position.y = 1.2;
      group.add(bar, cloth);
      break;
    }
    default:
      break;
  }
  return { group, kind };
}

// ---------------------------------------------------------------------------
// COLLECTIBLES / POWER-UPS
// ---------------------------------------------------------------------------
export function buildCoin() {
  const group = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), _m(0xffd24a, { emissive: 0xb8860b, emissiveIntensity: 0.25 }));
  coin.rotation.x = Math.PI / 2;
  group.add(coin);
  group.userData.spin = coin;
  return group;
}

export function buildScroll() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 12), _m(0xf2e6c8));
  body.rotation.z = Math.PI / 2;
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12), _m(0xb08a4a));
  cap1.rotation.z = Math.PI / 2; cap1.position.x = -0.3;
  const cap2 = cap1.clone(); cap2.position.x = 0.3;
  group.add(body, cap1, cap2);
  group.userData.spin = group;
  return group;
}

export function buildFaithPoint() {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), _m(0xffd27a, { emissive: 0xffa020, emissiveIntensity: 0.8 }));
  group.add(orb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(255,200,90,0.85)'), transparent: true, depthWrite: false }));
  halo.scale.set(1.4, 1.4, 1);
  group.add(halo);
  return group;
}

export function buildStar() {
  const group = new THREE.Group();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: starSprite('#ffe08a'), transparent: true, depthWrite: false }));
  sprite.scale.set(1.0, 1.0, 1);
  group.add(sprite);
  return group;
}

export function buildPowerup(type) {
  const group = new THREE.Group();
  const map = {
    shield: 0xffd94a, wings: 0xffffff, magnet: 0x9ad0ff,
    multiplier: 0xffa05a, light: 0xffe9a0, speed: 0x8ad0ff,
  };
  const col = map[type] || 0xffffff;
  const icon = {
    shield: '🛡️', wings: '🦅', magnet: '🧲',
    multiplier: '✖️', light: '✨', speed: '⚡',
  }[type] || '❓';
  const base = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), _m(col, { emissive: col, emissiveIntensity: 0.5 }));
  group.add(base);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(255,255,255,0.9)'), transparent: true, depthWrite: false }));
  halo.scale.set(1.9, 1.9, 1);
  group.add(halo);
  group.userData.spin = base;
  group.userData.icon = icon;
  return group;
}

// ---------------------------------------------------------------------------
// BLURB / DECOR POOL (side scenery that moves past)
// ---------------------------------------------------------------------------
export function buildDecorPool(world) {
  const id = world.id;
  const p = world.palette;
  const pool = [];
  const kinds = [];
  if (id === 'jerusalem') kinds.push('palm', 'wall', 'stallSide', 'pillar');
  if (id === 'desert') kinds.push('dune', 'rock', 'cloud', 'cactus');
  if (id === 'redsea') kinds.push('rock', 'coral');
  if (id === 'davidskingdom') kinds.push('olive', 'hut', 'wall', 'bannerSide');
  if (id === 'noah') kinds.push('pine', 'arkPlank', 'tree', 'animalSide');
  if (id === 'galilee') kinds.push('olive', 'boat', 'field', 'hut');
  if (id === 'babylon') kinds.push('pillarSide', 'gateArch', 'garden', 'palm');

  function mk(kind) {
    const g = new THREE.Group();
    switch (kind) {
      case 'palm': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 8), _m(0x8a6a3a));
        trunk.position.y = 1.6;
        const fronds = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 7), _m(0x4a8a3a));
        fronds.position.y = 3.6;
        g.add(trunk, fronds);
        break;
      }
      case 'olive': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.8, 8), _m(0x6a5a3a));
        trunk.position.y = 0.9;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), _m(0x5a7a4a));
        crown.position.y = 2.2;
        g.add(trunk, crown);
        break;
      }
      case 'pine': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 8), _m(0x5a4a2a));
        trunk.position.y = 1.1;
        const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 8), _m(0x2a5a3a));
        c1.position.y = 2.4;
        const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 8), _m(0x336a44));
        c2.position.y = 3.3;
        g.add(trunk, c1, c2);
        break;
      }
      case 'tree': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.6, 8), _m(0x6a4a2a));
        trunk.position.y = 1.3;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), _m(0x3a6a3a));
        crown.position.y = 2.9;
        g.add(trunk, crown);
        break;
      }
      case 'wall': {
        const wall = _box(3, 1.8, 0.8, p.accent2);
        wall.position.y = 0.9;
        const cap = _box(3.2, 0.2, 0.9, p.accent);
        cap.position.y = 1.9;
        g.add(wall, cap);
        break;
      }
      case 'pillar': {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4, 10), _m(p.accent));
        col.position.y = 2;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), _m(p.accent2));
        cap.position.y = 4.1;
        g.add(col, cap);
        break;
      }
      case 'pillarSide': {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 7, 10), _m(0xd8b860));
        col.position.y = 3.5;
        g.add(col);
        break;
      }
      case 'stallSide': {
        const base = _box(2, 1, 1.2, 0x9a6a3a);
        base.position.y = 0.5;
        const awning = _box(2.2, 0.1, 1.4, 0x8a2f2f);
        awning.position.y = 1.05; awning.rotation.x = -0.12;
        g.add(base, awning);
        break;
      }
      case 'dune': {
        const dune = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), _m(0xd0b078));
        dune.scale.set(1.6, 0.5, 1.2);
        dune.position.y = 0.4;
        g.add(dune);
        break;
      }
      case 'rock': {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), _m(0x9a8a72));
        r.position.y = 0.5;
        g.add(r);
        break;
      }
      case 'coral': {
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 6), _m(0x6a9a8a));
        r.position.y = 0.6;
        g.add(r);
        break;
      }
      case 'cactus': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.6, 8), _m(0x4a7a3a));
        trunk.position.y = 0.8;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), _m(0x4a7a3a));
        arm.position.set(0.35, 1.0, 0); arm.rotation.z = -Math.PI / 2;
        g.add(trunk, arm);
        break;
      }
      case 'cloud': {
        const cl = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), _m(0xffffff, { transparent: true, opacity: 0.9 }));
        cl.position.y = 10;
        g.add(cl);
        break;
      }
      case 'hut': {
        const base = _box(2.4, 1.4, 2.0, 0xb09a6a);
        base.position.y = 0.7;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 4), _m(0x8a5a2a));
        roof.position.y = 2.0; roof.rotation.y = Math.PI / 4;
        g.add(base, roof);
        break;
      }
      case 'bannerSide': {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), _m(0x6a4a2a));
        pole.position.y = 2;
        const flag = _box(0.9, 0.5, 0.03, 0x8a2f2f);
        flag.position.set(0.5, 3.4, 0);
        g.add(pole, flag);
        break;
      }
      case 'arkPlank': {
        const plank = _box(3, 1.6, 0.6, 0x7a5a2a);
        plank.position.y = 0.8; plank.rotation.z = 0.06;
        g.add(plank);
        break;
      }
      case 'animalSide': {
        const b = _box(0.8, 0.5, 1.1, 0xd8c8a8);
        b.position.y = 0.5;
        const h = _box(0.34, 0.34, 0.5, 0xc8b898);
        h.position.set(0, 0.65, -0.65);
        g.add(b, h);
        break;
      }
      case 'boat': {
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 8), _m(0x8a6a3a));
        hull.rotation.x = Math.PI / 2; hull.scale.z = 1.6; hull.position.y = 0.5;
        g.add(hull);
        break;
      }
      case 'field': {
        const crop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), _m(0xc9a15a));
        crop.position.y = 0.4;
        g.add(crop);
        break;
      }
      case 'gateArch': {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 8, 12, Math.PI), _m(0xd8b860));
        arch.position.y = 2.6;
        g.add(arch);
        break;
      }
      case 'garden': {
        const box = _box(2.4, 0.8, 1.2, 0x8a6a3a);
        box.position.y = 0.4;
        const green = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), _m(0x4a8a3a));
        green.position.y = 1.1;
        g.add(box, green);
        break;
      }
      default: break;
    }
    pool.push(g);
  }
  kinds.forEach(mk);
  return pool;
}

// ---------------------------------------------------------------------------
// PARTICLE BURST (simple pooled sprites)
// ---------------------------------------------------------------------------
export function burst(scene, position, color, count = 8, opts = {}) {
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const tex = glowSprite(color);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.position.copy(position);
    s.scale.set(0.18, 0.18, 1);
    scene.add(s);
    sprites.push({
      s, vx: (Math.random() - 0.5) * (opts.spread || 3),
      vy: Math.random() * (opts.up || 4) + 0.5,
      vz: (Math.random() - 0.5) * (opts.spread || 3),
      life: 1,
    });
  }
  return sprites;
}

export function updateBurst(sprites, dt) {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const b = sprites[i];
    b.life -= dt * 2.4;
    b.s.position.x += b.vx * dt;
    b.s.position.y += b.vy * dt;
    b.s.position.z += b.vz * dt;
    b.vy -= 6 * dt;
    b.s.material.opacity = Math.max(0, b.life);
    if (b.life <= 0) {
      b.s.parent && b.s.parent.remove(b.s);
      // note: material.map is a shared cached texture — do not dispose it
      b.s.material.dispose();
      sprites.splice(i, 1);
    }
  }
}
