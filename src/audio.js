// ============================================================================
// PATH OF FAITH — Audio Engine
// Fully synthesized via the Web Audio API — zero copyrighted assets.
//
// - Two music "contexts" (calm menu, energetic run) with speed-linked intensity
// - A synthesized gospel-style choir ("aah" pad + Amen cadences)
// - Per-world ambient soundscapes (wind, birds, waves, rain, thunder, chimes)
// - Rich SFX with combo-pitch, fanfares, level-up choir, game-over sting
// ============================================================================

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambGain = null;
    this.musicVolume = 0.7;
    this.sfxVolume = 0.9;
    this.musicPlaying = false;
    this._schedulerId = null;
    this._coinStep = 0; // for combo pitch

    // music state
    this.music = {
      mode: 'menu',     // 'menu' | 'run'
      intensity: 0,     // 0..1 (drives energy while running)
      step: 0,
      nextNoteTime: 0,
    };

    // ambience state
    this.ambience = {
      kind: null,
      src: null,
      gain: null,
      timer: null,
    };

    this.enabled = true;
  }

  // -------------------------------------------------------------------------
  // context
  // -------------------------------------------------------------------------
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.5 * this.musicVolume;
    this.ambGain.connect(this.masterGain);
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
    // ambience rides along with the music slider (it is part of the soundtrack)
    if (this.ambGain) this.ambGain.gain.value = 0.5 * v;
  }
  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  // -------------------------------------------------------------------------
  // low-level helpers
  // -------------------------------------------------------------------------
  _tone(freq, type, gainVal, start, dur, dest, freqEnd) {
    if (!this.ctx) return;
    const t = start != null ? start : this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainVal, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, gainVal, start, filterType, freq, dest) {
    if (!this.ctx) return;
    const t = start != null ? start : this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType || 'lowpass';
    filter.frequency.value = freq || 1000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(dest || this.sfxGain);
    src.start(t);
  }

  // A looping noise source (for wind / rain ambience).
  _noiseLoop(gainVal, filterType, freq, dest) {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType || 'lowpass';
    filter.frequency.value = freq || 800;
    const g = this.ctx.createGain();
    g.gain.value = gainVal;
    src.connect(filter); filter.connect(g); g.connect(dest || this.ambGain);
    src.start();
    return { src, filter, gain: g };
  }

  // A soft "choir aah" voice: two detuned oscillators through a lowpass with
  // a slow attack — reads like a synthesized gospel pad.
  _choirVoice(freq, t, dur, gain = 0.05, dest) {
    if (!this.ctx) return;
    const o1 = this.ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq;
    o2.detune.value = 8;
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 950;
    const g = this.ctx.createGain();
    const attack = Math.min(0.28, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - 0.25));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 4.6;
    const lg = this.ctx.createGain(); lg.gain.value = 5;
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(dest || this.musicGain);
    o1.start(t); o2.start(t); lfo.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  // -------------------------------------------------------------------------
  // Music
  // -------------------------------------------------------------------------
  setMusicContext(mode) {
    this.resume();
    this.music.mode = mode;
    this.music.step = 0;
    this.music.nextNoteTime = this.ctx ? this.ctx.currentTime + 0.1 : 0;
  }

  pulseMusic(intensity) {
    this.music.intensity = Math.max(0, Math.min(1, intensity || 0));
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    if (this.music.nextNoteTime < this.ctx.currentTime) {
      this.music.nextNoteTime = this.ctx.currentTime + 0.1;
    }
    this._schedulerId = setInterval(() => this._schedule(), 40);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this._schedulerId) { clearInterval(this._schedulerId); this._schedulerId = null; }
  }

  _schedule() {
    if (!this.ctx || !this.musicPlaying) return;
    const m = this.music;
    const tempo = m.mode === 'menu' ? 76 : 118 + m.intensity * 20;
    const stepDur = 60 / tempo / 4; // sixteenth notes
    while (m.nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playStep(m.step, m.nextNoteTime);
      m.nextNoteTime += stepDur;
      m.step += 1;
    }
  }

  _playStep(step, t) {
    if (this.music.mode === 'menu') this._menuStep(step, t);
    else this._runStep(step, t);
  }

  _menuStep(step, t) {
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [98.00, 146.83, 196.00, 246.94],  // G
      [110.00, 130.81, 164.81, 196.00], // Am7
      [87.31, 110.00, 130.81, 164.81],  // Fmaj7
    ];
    const bar = Math.floor(step / 16);
    const chord = chords[bar % 4];
    const s = step % 16;

    // warm pad at bar start
    if (s === 0) {
      this._choirVoice(chord[0], t, 3.0, 0.045);
      this._choirVoice(chord[1] * 2, t, 3.0, 0.02);
      this._tone(chord[0] / 2, 'sine', 0.05, t, 2.8, this.musicGain);
    }
    // gentle arpeggio on even 16ths
    if (s % 2 === 0) {
      const note = chord[(s >> 1) % 4] * (s % 8 >= 4 ? 2 : 1);
      this._tone(note, 'triangle', 0.03, t, 0.4, this.musicGain);
    }
    // sparkle
    if (s === 10) this._tone(chord[3] * 2, 'sine', 0.018, t, 0.9, this.musicGain);
  }

  _runStep(step, t) {
    const chords = [
      [130.81, 164.81, 196.00, 261.63], // C
      [98.00, 123.47, 146.83, 196.00],  // G
      [110.00, 130.81, 164.81, 220.00], // Am
      [87.31, 110.00, 130.81, 174.61],  // F
    ];
    const beat = step % 4;         // 4 sixteenths per beat
    const bar = Math.floor(step / 16);
    const chord = chords[Math.floor(step / 4) % 4];
    const inten = this.music.intensity;

    // bass on the beat
    if (beat === 0) this._tone(chord[0] / 2, 'sine', 0.07, t, 0.32, this.musicGain);
    // arpeggio (constant 16ths)
    const oct = (inten > 0.5 && step % 2 === 0) ? 2 : 1;
    this._tone(chord[beat % 4] * oct, 'triangle', 0.032, t, 0.16, this.musicGain);
    // soft kick
    if (beat === 0) this._kick(t, 0.06);
    // hat on off-16ths
    if (beat === 2) this._hat(t, 0.012);
    // shimmer sparkle when intensity is high
    if (inten > 0.65 && beat === 3) this._tone(chord[2] * 4, 'sine', 0.012, t, 0.5, this.musicGain);
    // "Amen" plagal sparkle every 4 bars (F -> C)
    if (bar % 4 === 3 && beat === 0) {
      this._choirVoice(174.61, t, 1.6, 0.02);
      this._tone(261.63, 'sine', 0.03, t + 0.4, 1.2, this.musicGain);
    }
  }

  _kick(t, gain) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.16);
  }

  _hat(t, gain) {
    if (!this.ctx) return;
    this._noise(0.05, gain, t, 'highpass', 8000, this.musicGain);
  }

  // -------------------------------------------------------------------------
  // Ambience (per world)
  // -------------------------------------------------------------------------
  setAmbience(kind) {
    this.resume();
    this.stopAmbience();
    if (!this.ctx || !kind) return;
    this.ambience.kind = kind;

    switch (kind) {
      case 'desert': {
        this.ambience.src = this._noiseLoop(0.22, 'lowpass', 420);
        this._ambEvents('wind');
        break;
      }
      case 'sea': {
        this.ambience.src = this._noiseLoop(0.10, 'lowpass', 700);
        this._ambEvents('waves');
        break;
      }
      case 'forest': {
        this.ambience.src = this._noiseLoop(0.06, 'lowpass', 900);
        this._ambEvents('birds');
        break;
      }
      case 'rain': {
        this.ambience.src = this._noiseLoop(0.09, 'highpass', 5500);
        this._ambEvents('rain');
        break;
      }
      case 'palace': {
        this.ambience.src = this._noiseLoop(0.04, 'lowpass', 300);
        this._ambEvents('chimes');
        break;
      }
      case 'temple': {
        this.ambience.src = this._noiseLoop(0.03, 'lowpass', 260);
        this._ambEvents('chimes');
        break;
      }
      case 'village': {
        this.ambience.src = this._noiseLoop(0.05, 'lowpass', 800);
        this._ambEvents('birds');
        break;
      }
      case 'city':
      default: {
        this.ambience.src = this._noiseLoop(0.05, 'lowpass', 500);
        this._ambEvents('city');
        break;
      }
    }
  }

  _ambEvents(kind) {
    if (!this.ctx) return;
    const schedule = () => {
      if (!this.ctx || this.ambience.kind === null) return;
      const t = this.ctx.currentTime;
      const delay = 1500 + Math.random() * 4000;
      if (kind === 'birds' || kind === 'city') {
        if (Math.random() < 0.7) this._bird(t);
        else this._tone(1200 + Math.random() * 900, 'sine', 0.02, t, 0.2, this.ambGain);
      } else if (kind === 'waves') {
        if (Math.random() < 0.7) this._wave(t);
      } else if (kind === 'wind') {
        if (Math.random() < 0.5) this._noise(1.2, 0.08, t, 'lowpass', 300 + Math.random() * 300, this.ambGain);
      } else if (kind === 'rain') {
        if (Math.random() < 0.35) this._thunder(t);
      } else if (kind === 'chimes') {
        this._tone([523, 659, 784, 1046][Math.floor(Math.random() * 4)], 'sine', 0.03, t, 1.6, this.ambGain);
      }
      this.ambience.timer = setTimeout(schedule, delay);
    };
    schedule();
  }

  _bird(t) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f0 = 2200 + Math.random() * 1800;
      this._tone(f0, 'sine', 0.025, t + i * 0.12, 0.09, this.ambGain, f0 * (0.8 + Math.random() * 0.4));
    }
  }

  _wave(t) {
    // rising/falling filtered noise swell
    if (!this.ctx) return;
    const dur = 2.2 + Math.random() * 1.5;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI); // swell in then out
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0.14;
    src.connect(filt); filt.connect(g); g.connect(this.ambGain);
    src.start(t);
  }

  _thunder(t) {
    this._noise(2.2, 0.16, t, 'lowpass', 180, this.ambGain);
    this._tone(50, 'sine', 0.1, t, 2.0, this.ambGain, 32);
  }

  stopAmbience() {
    if (this.ambience.timer) { clearTimeout(this.ambience.timer); this.ambience.timer = null; }
    if (this.ambience.src) {
      try { this.ambience.src.src.stop(); } catch (e) { /* noop */ }
      this.ambience.src = null;
    }
    this.ambience.kind = null;
  }

  // -------------------------------------------------------------------------
  // SFX
  // -------------------------------------------------------------------------
  click() {
    this.resume();
    this._tone(700, 'triangle', 0.13, null, 0.06);
    this._tone(1100, 'sine', 0.07, null, 0.05);
  }
  coin() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 1320 * Math.pow(1.059463, this._coinStep); // pitch rises in a combo
    this._coinStep = (this._coinStep + 1) % 12;
    this._tone(base, 'sine', 0.12, t, 0.09);
    this._tone(base * 1.335, 'sine', 0.12, t + 0.06, 0.12);
    if (this._coinStep === 0) this._tone(base * 2, 'sine', 0.08, t + 0.12, 0.2); // combo "ding"
  }
  scroll() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(523, 'sine', 0.14, t, 0.14);
    this._tone(659, 'sine', 0.14, t + 0.09, 0.14);
    this._tone(784, 'sine', 0.16, t + 0.18, 0.3);
  }
  faith() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(392, 'sine', 0.1, t, 0.5);
    this._tone(494, 'sine', 0.1, t + 0.02, 0.5);
    this._tone(587, 'sine', 0.1, t + 0.04, 0.6);
  }
  star() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(880, 'sine', 0.12, t, 0.12);
    this._tone(1175, 'sine', 0.12, t + 0.08, 0.2);
    this._tone(1568, 'sine', 0.12, t + 0.16, 0.3);
  }
  verse() {
    // soft heavenly major-7 chime when a Bible verse is revealed
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, i) =>
      this._tone(f, 'sine', 0.06, t + i * 0.07, 1.1, this.sfxGain));
    this._choirVoice(261.63, t + 0.3, 1.4, 0.03, this.sfxGain);
  }
  jump() {
    this.resume();
    this._tone(300, 'sine', 0.12, null, 0.18, this.sfxGain, 720);
  }
  slide() {
    this.resume();
    this._noise(0.22, 0.14, null, 'bandpass', 900);
  }
  crash() {
    this.resume();
    this._noise(0.4, 0.3, null, 'lowpass', 500);
    this._tone(150, 'sawtooth', 0.2, null, 0.4, this.sfxGain, 60);
  }
  gameOver() {
    // gentle, wistful descending phrase
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 349.23, 329.63, 261.63].forEach((f, i) =>
      this._tone(f, 'sine', 0.1, t + i * 0.22, 0.7, this.sfxGain));
    this._choirVoice(130.81, t + 0.1, 1.6, 0.025, this.sfxGain);
  }
  shieldBreak() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(500, 'triangle', 0.2, t, 0.2, this.sfxGain, 1200);
    this._noise(0.2, 0.15, t + 0.05, 'highpass', 3000);
  }
  shieldUp() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [329.63, 392, 523.25].forEach((f, i) => this._tone(f, 'triangle', 0.1, t + i * 0.05, 0.4, this.sfxGain));
  }
  wings() {
    // upward sweep for Wings of the Eagle
    this.resume();
    this._tone(300, 'sine', 0.14, null, 0.7, this.sfxGain, 1400);
    this._noise(0.5, 0.05, null, 'highpass', 2500);
  }
  powerup() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 'triangle', 0.14, t + i * 0.07, 0.16));
  }
  victory() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 'triangle', 0.16, t + i * 0.09, 0.3));
  }
  newRecord() {
    // celebratory fanfare with a gospel choir swell
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, 'triangle', 0.14, t + i * 0.08, 0.4));
    this._choirVoice(261.63, t + 0.1, 2.2, 0.04, this.sfxGain);
    this._choirVoice(329.63, t + 0.1, 2.2, 0.03, this.sfxGain);
    this._choirVoice(392.0, t + 0.1, 2.2, 0.03, this.sfxGain);
  }
  levelUp() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this._tone(f, 'triangle', 0.15, t + i * 0.1, 0.5));
    this._choirVoice(196.0, t + 0.4, 2.0, 0.04, this.sfxGain);
    this._choirVoice(261.63, t + 0.4, 2.0, 0.035, this.sfxGain);
  }
  amen() {
    // plagal "Amen" cadence (IV -> I)
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [174.61, 220.0, 261.63].forEach((f) => this._choirVoice(f, t, 1.1, 0.045, this.sfxGain));
    [130.81, 164.81, 196.0].forEach((f) => this._choirVoice(f, t + 0.85, 1.6, 0.045, this.sfxGain));
  }
  quizCorrect() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [659, 880, 1046].forEach((f, i) => this._tone(f, 'sine', 0.14, t + i * 0.08, 0.25));
  }
  quizWrong() {
    this.resume();
    this._tone(220, 'sawtooth', 0.12, null, 0.3, this.sfxGain, 150);
  }
  revive() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(262, 'sine', 0.12, t, 0.5);
    this._tone(392, 'sine', 0.12, t + 0.1, 0.5);
    this._tone(523, 'sine', 0.14, t + 0.2, 0.7);
    this._choirVoice(261.63, t + 0.35, 1.4, 0.03, this.sfxGain);
  }
  unlock() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523, 659, 784, 1046].forEach((f, i) => this._tone(f, 'triangle', 0.14, t + i * 0.06, 0.2));
  }

  // --- "alive" movement & moment sounds ------------------------------------
  footstep() {
    this.resume();
    if (!this.ctx) return;
    const f = this._footSide ? 96 : 108; // alternate left/right
    this._footSide = !this._footSide;
    this._tone(f, 'sine', 0.05, null, 0.06, this.sfxGain, f * 0.5);
    this._noise(0.04, 0.018, null, 'lowpass', 420);
  }
  land() {
    this.resume();
    this._noise(0.1, 0.08, null, 'lowpass', 600);
    this._tone(120, 'sine', 0.06, null, 0.1, this.sfxGain, 60);
  }
  nearMiss() {
    // airy whoosh when you clear an obstacle in your own lane
    this.resume();
    this._noise(0.18, 0.09, null, 'bandpass', 1500);
    this._tone(600, 'sine', 0.04, null, 0.15, this.sfxGain, 1500);
  }
  milestone() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => this._tone(f, 'sine', 0.09, t + i * 0.08, 0.3));
  }
  goSting() {
    // rising "Go!" blip at run start
    this.resume();
    this._tone(440, 'sine', 0.1, null, 0.16, this.sfxGain, 880);
  }
  praise() {
    // short choir swell for a star (a rare, precious collectible)
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392.0].forEach((f) => this._choirVoice(f, t, 1.2, 0.035, this.sfxGain));
    this._tone(1046.5, 'sine', 0.05, t + 0.2, 0.6, this.sfxGain);
  }
}

export const audio = new AudioEngine();
