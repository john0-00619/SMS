// ============================================================================
// PATH OF FAITH — Save System (localStorage, structured for future cloud sync)
// ============================================================================
import { DEFAULT_SETTINGS } from './data.js';

const KEY = 'path_of_faith_save_v1';

const EMPTY_STATE = () => ({
  version: 1,
  profile: {
    name: 'Runner',
    xp: 0,
    coins: 0,
    faithPoints: 0,
    highScore: 0,
    bestDistance: 0,
    totalRuns: 0,
    totalDistance: 0,
    totalCoins: 0,
    totalScrolls: 0,
    totalFaith: 0,
  },
  unlocks: {
    characters: ['david'],
    worlds: ['jerusalem'],
    outfits: ['classic'],
    verses: [],
  },
  selected: {
    character: 'david',
    world: 'jerusalem',
    outfit: 'classic',
  },
  characters: {}, // id -> { level, xp, upgrades }
  stats: {
    runs: 0,
    jumps: 0,
    slides: 0,
    powerupsUsed: 0,
    quizzesCorrect: 0,
    scrollsCollected: 0,
    starsCollected: 0,
  },
  missions: {},   // id -> progress
  missionsClaimed: {}, // id -> true
  daily: {
    lastLogin: null,      // 'YYYY-MM-DD'
    streak: 0,
    lastClaimed: null,    // 'YYYY-MM-DD' of last claimed reward
    challenges: {},       // id -> progress
    challengeDate: null,
  },
  settings: { ...DEFAULT_SETTINGS },
});

function safeParse(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

export class Save {
  constructor() {
    this.data = this._load();
  }

  _load() {
    if (typeof localStorage === 'undefined') return EMPTY_STATE();
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE();
    const parsed = safeParse(raw);
    if (!parsed || !parsed.profile) return EMPTY_STATE();
    // Merge with empty state to tolerate added fields.
    const base = EMPTY_STATE();
    const merged = {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      unlocks: { ...base.unlocks, ...parsed.unlocks },
      selected: { ...base.selected, ...parsed.selected },
      stats: { ...base.stats, ...parsed.stats },
      daily: { ...base.daily, ...parsed.daily },
      settings: { ...base.settings, ...parsed.settings },
    };
    return merged;
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* quota */ }
  }

  get profile() { return this.data.profile; }
  get unlocks() { return this.data.unlocks; }
  get selected() { return this.data.selected; }
  get settings() { return this.data.settings; }
  get stats() { return this.data.stats; }
  get missions() { return this.data.missions; }
  get missionsClaimed() { return this.data.missionsClaimed; }
  get daily() { return this.data.daily; }

  // --- character helpers ---
  getCharacter(id) {
    if (!this.data.characters[id]) {
      this.data.characters[id] = { level: 1, xp: 0, upgrades: 0 };
    }
    return this.data.characters[id];
  }

  // --- currency ---
  addCoins(n) { this.data.profile.coins += n; this.data.profile.totalCoins += Math.max(0, n); }
  addFaith(n) { this.data.profile.faithPoints += n; this.data.profile.totalFaith += Math.max(0, n); }
  addXp(n) { this.data.profile.xp += n; }
  spendCoins(n) {
    if (this.data.profile.coins < n) return false;
    this.data.profile.coins -= n;
    return true;
  }

  // --- record keeping ---
  recordRun({ distance, score, coins, scrolls, faith, stars, crashed, world }) {
    const p = this.data.profile;
    p.totalRuns += 1;
    p.totalDistance += Math.round(distance);
    p.totalCoins += coins;
    p.totalScrolls += scrolls;
    p.totalFaith += faith;
    let newRecord = false;
    if (score > p.highScore) { p.highScore = score; newRecord = true; }
    if (distance > p.bestDistance) p.bestDistance = Math.round(distance);
    return newRecord;
  }

  // --- mission progress ---
  addMissionProgress(type, amount) {
    for (const id in this.data.missions) {
      if (this.data.missionsClaimed[id]) continue;
      // Mission definitions live in data.js; resolved by UI. Store by generic key too.
    }
    // Generic accumulation for daily challenge + missions resolved by UI via stats.
    if (type === 'distance') this.data.profile.totalDistance += amount;
  }

  // --- reset ---
  resetProgress() {
    this.data = EMPTY_STATE();
    this.save();
  }

  resetTutorial() {
    this.data.settings.tutorialDone = false;
    this.save();
  }
}

export const store = new Save();
