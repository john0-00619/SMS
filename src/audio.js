// ============================================================================
// PATH OF FAITH — Audio Engine (fully synthesized Web Audio, no copyrighted
// assets). Cinematic, uplifting, family-friendly. All sound generated in code.
// ============================================================================

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.musicVolume = 0.7;
    this.sfxVolume = 0.9;
    this.musicPlaying = false;
    this._schedulerId = null;
    this._nextNoteTime = 0;
    this._step = 0;
    this.enabled = true;
  }

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
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }
  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  // --- tone helpers ---------------------------------------------------------
  _tone(freq, type, gainVal, start, dur, dest, freqEnd) {
    if (!this.ctx) return;
    const t = start || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainVal, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, gainVal, start, filterType, freq, dest) {
    if (!this.ctx) return;
    const t = start || this.ctx.currentTime;
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

  // --- SFX ------------------------------------------------------------------
  click() {
    this.resume();
    this._tone(700, 'triangle', 0.15, null, 0.06);
    this._tone(1100, 'sine', 0.08, null, 0.05);
  }
  coin() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(1320, 'sine', 0.12, t, 0.09);
    this._tone(1760, 'sine', 0.12, t + 0.06, 0.12);
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
  shieldBreak() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(500, 'triangle', 0.2, t, 0.2, this.sfxGain, 1200);
    this._noise(0.2, 0.15, t + 0.05, 'highpass', 3000);
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
  }
  unlock() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523, 659, 784, 1046].forEach((f, i) => this._tone(f, 'triangle', 0.14, t + i * 0.06, 0.2));
  }

  // --- Music -----------------------------------------------------------------
  // Uplifting progression in C major: C - G - Am - F, arpeggiated.
  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._schedulerId = setInterval(() => this._schedule(), 40);
  }
  stopMusic() {
    this.musicPlaying = false;
    if (this._schedulerId) { clearInterval(this._schedulerId); this._schedulerId = null; }
  }

  _schedule() {
    if (!this.ctx || !this.musicPlaying) return;
    const bpm = 96;
    const stepDur = 60 / bpm / 2; // eighth notes
    while (this._nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playStep(this._step, this._nextNoteTime);
      this._nextNoteTime += stepDur;
      this._step = (this._step + 1) % 32; // 4 bars of 8 eighth-notes
    }
  }

  _playStep(step, t) {
    const bar = Math.floor(step / 8);
    const chords = [
      [261.63, 329.63, 392.0],   // C
      [196.0, 246.94, 293.66],   // G
      [220.0, 261.63, 329.63],   // Am
      [174.61, 220.0, 261.63],   // F
    ];
    const chord = chords[bar % 4];
    const idx = step % 8;
    const note = chord[idx % 3] * (idx >= 6 ? 2 : 1);
    const g = 0.045;
    this._tone(note, 'triangle', g, t, 0.5, this.musicGain);
    // soft pad root
    if (idx === 0) this._tone(chord[0] / 2, 'sine', 0.04, t, 1.4, this.musicGain);
    // gentle high sparkle every other bar
    if (idx === 4 && bar % 2 === 1) this._tone(chord[1] * 2, 'sine', 0.02, t, 0.8, this.musicGain);
  }
}

export const audio = new AudioEngine();
