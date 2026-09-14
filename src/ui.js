// ============================================================================
// PATH OF FAITH — UI layer (DOM overlay, screens, HUD, menus)
// ============================================================================
import { GAME, CHARACTERS, WORLDS, MISSIONS, POWERUPS, VERSES, QUIZ, DAILY_REWARDS, DAILY_CHALLENGES, OUTFITS, LEVELS, levelForXp } from './data.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

export class UI {
  constructor() {
    this.root = null;
    this.game = null;
    this.currentScreen = null;
  }

  init(game) {
    this.game = game;
    this._buildDom();
  }

  _buildDom() {
    const style = el('style', null, CSS);
    document.head.appendChild(style);

    this.root = el('div', 'ui-root');
    this.root.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-top">
          <div class="hud-score" id="hud-score">0</div>
          <div class="hud-sub">
            <div class="hud-pill">🪙 <span id="hud-coins">0</span></div>
            <div class="hud-pill">📜 <span id="hud-scrolls">0</span></div>
            <div class="hud-pill">✨ <span id="hud-faith">0</span></div>
            <div class="hud-pill">🏃 <span id="hud-dist">0</span>m</div>
          </div>
        </div>
        <div class="hud-bottom">
          <div class="hud-ability" id="hud-ability">
            <div class="hud-ability-name" id="hud-ability-name">ABILITY</div>
            <div class="hud-ability-btn" id="hud-ability-btn">✨</div>
            <div class="hud-ability-cd" id="hud-ability-cd"></div>
          </div>
          <div class="hud-active" id="hud-active"></div>
        </div>
        <button class="icon-btn pause-btn" id="btn-pause">⏸</button>
        <div class="hud-speed" id="hud-speed"></div>
        <div class="hud-mission" id="hud-mission"></div>
      </div>

      <div id="screens">
        <div class="screen" id="screen-home"></div>
        <div class="screen" id="screen-characters"></div>
        <div class="screen" id="screen-worlds"></div>
        <div class="screen" id="screen-missions"></div>
        <div class="screen" id="screen-bible"></div>
        <div class="screen" id="screen-shop"></div>
        <div class="screen" id="screen-daily"></div>
        <div class="screen" id="screen-settings"></div>
        <div class="screen screen-center" id="screen-gameover"></div>
        <div class="screen screen-center" id="screen-pause"></div>
        <div class="screen screen-center" id="screen-tutorial"></div>
        <div class="screen screen-center" id="screen-quiz"></div>
        <div class="screen screen-center" id="screen-verse"></div>
        <div class="screen screen-center" id="screen-levelup"></div>
      </div>

      <div id="toast-wrap"></div>
    `;
    document.body.appendChild(this.root);

    this._bindStatic();
    this.renderHome();
  }

  _bindStatic() {
    $('#btn-pause').addEventListener('click', () => this.game.togglePause());
    $('#hud-ability-btn').addEventListener('click', () => this.game.useAbility());
  }

  // -------------------------------------------------------------------------
  // screen management
  // -------------------------------------------------------------------------
  show(screenId) {
    this.currentScreen = screenId;
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const s = $('#screen-' + screenId);
    if (s) s.classList.add('active');
    $('#screens').classList.toggle('hidden', screenId === 'none');
  }

  hideScreens() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $('#screens').classList.add('hidden');
  }

  showHud(show) {
    $('#hud').classList.toggle('hidden', !show);
  }

  toast(msg, kind = '') {
    const t = el('div', 'toast ' + kind, msg);
    $('#toast-wrap').appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 2200);
  }

  // -------------------------------------------------------------------------
  // HOME
  // -------------------------------------------------------------------------
  renderHome() {
    const s = this.game.store;
    const p = s.profile;
    const lvl = levelForXp(p.xp);
    const char = CHARACTERS.find((c) => c.id === s.selected.character);
    const world = WORLDS.find((w) => w.id === s.selected.world);
    const progress = lvl.next ? Math.min(100, Math.round(((p.xp - lvl.xp) / (lvl.next.xp - lvl.xp)) * 100)) : 100;

    $('#screen-home').innerHTML = `
      <div class="home-bg"></div>
      <div class="home-topbar">
        <div class="home-profile">
          <div class="avatar-ring"><div class="avatar-emoji">${charEmoji(char.id)}</div></div>
          <div class="home-profile-info">
            <div class="home-name">${esc(char.name)}</div>
            <div class="home-level">${lvl.name} · Lv ${lvl.index + 1}</div>
          </div>
        </div>
        <div class="home-xp-bar"><div class="home-xp-fill" style="width:${progress}%"></div></div>
        <div class="home-currencies">
          <div class="cur">🪙 ${fmt(p.coins)}</div>
          <div class="cur">✨ ${fmt(p.faithPoints)}</div>
          <div class="cur">🏆 ${fmt(p.highScore)}</div>
        </div>
      </div>
      <div class="home-title-wrap">
        <div class="home-title">${GAME.name}</div>
        <div class="home-tagline">${GAME.tagline}</div>
      </div>
      <div class="home-world-pill" id="home-world-pill">🌍 ${world.name} · 🧑 ${char.name}</div>
      <div class="home-menu">
        <button class="btn btn-primary btn-big" data-nav="play">▶ PLAY</button>
        <div class="home-grid">
          <button class="btn" data-nav="characters">🧑 CHARACTERS</button>
          <button class="btn" data-nav="worlds">🌍 WORLDS</button>
          <button class="btn" data-nav="missions">🎯 MISSIONS</button>
          <button class="btn" data-nav="bible">📖 BIBLE</button>
          <button class="btn" data-nav="shop">🏪 SHOP</button>
          <button class="btn" data-nav="daily">🎁 DAILY</button>
          <button class="btn" data-nav="settings">⚙️ SETTINGS</button>
        </div>
      </div>
      <div class="home-quiz-hint" id="home-quiz-hint"></div>
    `;
    this._navButtons();
    this._updateQuizHint();
  }

  _navButtons() {
    document.querySelectorAll('[data-nav]').forEach((b) => {
      b.addEventListener('click', () => {
        this.game.nav(b.dataset.nav);
      });
    });
  }

  _updateQuizHint() {
    const hint = $('#home-quiz-hint');
    if (!hint) return;
    const s = this.game.store;
    const lvl = levelForXp(s.profile.xp);
    if (lvl.index >= 1) {
      hint.innerHTML = `<span class="quiz-hint-dot">📖</span> Bible Knowledge mode is ready — it appears after some runs!`;
    } else {
      hint.innerHTML = `<span class="quiz-hint-dot">🔒</span> Reach Disciple level to unlock Bible Knowledge questions.`;
    }
  }

  // -------------------------------------------------------------------------
  // CHARACTERS
  // -------------------------------------------------------------------------
  renderCharacters() {
    const s = this.game.store;
    const cards = CHARACTERS.map((c) => {
      const owned = s.unlocks.characters.includes(c.id);
      const selected = s.selected.character === c.id;
      const lvl = s.getCharacter(c.id);
      const canUnlock = !owned && s.profile.coins >= c.unlock.coins && levelForXp(s.profile.xp).index >= c.unlock.level;
      return `
        <div class="char-card ${owned ? 'owned' : 'locked'} ${selected ? 'selected' : ''}" data-id="${c.id}">
          <div class="char-emoji" style="background:${cssCol(c.colors.robe)}">${charEmoji(c.id)}</div>
          <div class="char-name">${c.name}</div>
          <div class="char-role">${c.role}</div>
          <div class="char-ability">✨ ${c.ability.name}</div>
          ${owned
            ? `<div class="char-status">Lv ${lvl.level}${selected ? ' · ✔ Selected' : ''}</div>
               <button class="btn btn-mini ${selected ? 'btn-disabled' : ''}" data-select="${c.id}">${selected ? 'Selected' : 'Select'}</button>
               ${lvl.level < 5 ? `<button class="btn btn-mini" data-upgrade="${c.id}">Upgrade · ${upgradeCost(lvl.level)}🪙</button>` : ''}`
            : `<div class="char-lock">🔒 Lv ${c.unlock.level + 1} · ${c.unlock.coins}🪙</div>
               <button class="btn btn-mini ${canUnlock ? '' : 'btn-disabled'}" data-unlock="${c.id}">${canUnlock ? 'Unlock' : 'Locked'}</button>`}
        </div>`;
    }).join('');
    this._screen('characters', `
      <div class="panel-title">🧑 Characters</div>
      <div class="panel-sub">Unlock heroes of faith, each with a unique ability.</div>
      <div class="char-grid">${cards}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    document.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => this.game.selectCharacter(b.dataset.select)));
    document.querySelectorAll('[data-unlock]').forEach((b) => b.addEventListener('click', () => this.game.unlockCharacter(b.dataset.unlock)));
    document.querySelectorAll('[data-upgrade]').forEach((b) => b.addEventListener('click', () => this.game.upgradeCharacter(b.dataset.upgrade)));
  }

  // -------------------------------------------------------------------------
  // WORLDS
  // -------------------------------------------------------------------------
  renderWorlds() {
    const s = this.game.store;
    const cards = WORLDS.map((w) => {
      const owned = s.unlocks.worlds.includes(w.id);
      const selected = s.selected.world === w.id;
      const canUnlock = !owned && s.profile.coins >= w.unlock.coins && levelForXp(s.profile.xp).index >= w.unlock.level;
      return `
        <div class="world-card ${owned ? 'owned' : 'locked'} ${selected ? 'selected' : ''}" data-id="${w.id}">
          <div class="world-art" style="background:linear-gradient(160deg, ${cssCol(w.palette.skyTop)}, ${cssCol(w.palette.accent)})">${worldEmoji(w.id)}</div>
          <div class="world-name">${w.name}</div>
          <div class="world-chapter">${w.chapter}</div>
          ${owned
            ? `<button class="btn btn-mini ${selected ? 'btn-disabled' : ''}" data-world="${w.id}">${selected ? 'Selected' : 'Select'}</button>`
            : `<div class="char-lock">🔒 Lv ${w.unlock.level + 1} · ${w.unlock.coins}🪙</div>
               <button class="btn btn-mini ${canUnlock ? '' : 'btn-disabled'}" data-world-unlock="${w.id}">${canUnlock ? 'Unlock' : 'Locked'}</button>`}
        </div>`;
    }).join('');
    this._screen('worlds', `
      <div class="panel-title">🌍 Worlds</div>
      <div class="panel-sub">Journey through the lands of the Bible.</div>
      <div class="world-grid">${cards}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    document.querySelectorAll('[data-world]').forEach((b) => b.addEventListener('click', () => this.game.selectWorld(b.dataset.world)));
    document.querySelectorAll('[data-world-unlock]').forEach((b) => b.addEventListener('click', () => this.game.unlockWorld(b.dataset.worldUnlock)));
  }

  // -------------------------------------------------------------------------
  // MISSIONS
  // -------------------------------------------------------------------------
  renderMissions() {
    const s = this.game.store;
    const rows = MISSIONS.map((m) => {
      const done = s.missionsClaimed[m.id];
      const progress = Math.min(m.target, s.missions[m.id] || 0);
      const pct = Math.min(100, Math.round((progress / m.target) * 100));
      return `
        <div class="mission-row ${done ? 'done' : ''}">
          <div class="mission-text">${m.text}</div>
          <div class="mission-progress"><div class="mission-fill" style="width:${pct}%"></div></div>
          <div class="mission-meta">${done ? '✔ Complete' : `${progress}/${m.target}`} · 🪙${m.reward.coins} ✨${m.reward.faith}</div>
          ${done ? '' : `<button class="btn btn-mini ${progress >= m.target ? '' : 'btn-disabled'}" data-claim="${m.id}">Claim</button>`}
        </div>`;
    }).join('');
    this._screen('missions', `
      <div class="panel-title">🎯 Missions</div>
      <div class="panel-sub">Complete missions to earn coins and faith points.</div>
      <div class="mission-list">${rows}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    document.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => this.game.claimMission(b.dataset.claim)));
  }

  // -------------------------------------------------------------------------
  // BIBLE
  // -------------------------------------------------------------------------
  renderBible() {
    const s = this.game.store;
    const unlocked = VERSES.slice(0, s.unlocks.verses.length);
    const verseCards = VERSES.map((v, i) => {
      const isUnlocked = i < s.unlocks.verses.length;
      return `<div class="verse-card ${isUnlocked ? '' : 'locked'}">
        <div class="verse-ref">${v.ref}</div>
        <div class="verse-text">${isUnlocked ? v.text : '🔒 Collect Bible scrolls to unlock this verse'}</div>
      </div>`;
    }).join('');
    this._screen('bible', `
      <div class="panel-title">📖 Bible</div>
      <div class="panel-sub">${s.unlocks.verses.length} of ${VERSES.length} verses unlocked · ${s.stats.scrollsCollected} scrolls collected</div>
      <div class="verse-grid">${verseCards}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
  }

  // -------------------------------------------------------------------------
  // SHOP
  // -------------------------------------------------------------------------
  renderShop() {
    const s = this.game.store;
    const char = CHARACTERS.find((c) => c.id === s.selected.character);
    const outfitCards = OUTFITS.map((o) => {
      const owned = s.unlocks.outfits.includes(o.id);
      const selected = s.selected.outfit === o.id;
      const swatch = o.tint ? cssCol(o.tint.robe) : cssCol(char.colors.robe);
      return `<div class="shop-card ${selected ? 'selected' : ''}" data-outfit="${o.id}">
        <div class="outfit-swatch" style="background:${swatch}">${charEmoji(char.id)}</div>
        <div class="shop-name">${o.name}</div>
        ${owned
          ? `<button class="btn btn-mini ${selected ? 'btn-disabled' : ''}" data-wear="${o.id}">${selected ? 'Wearing' : 'Wear'}</button>`
          : `<button class="btn btn-mini ${s.profile.coins >= o.cost ? '' : 'btn-disabled'}" data-buyoutfit="${o.id}">${o.cost}🪙</button>`}
      </div>`;
    }).join('');
    this._screen('shop', `
      <div class="panel-title">🏪 Shop</div>
      <div class="panel-sub">Cosmetic outfits for ${char.name}. You have 🪙${fmt(s.profile.coins)}.</div>
      <div class="shop-grid">${outfitCards}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    document.querySelectorAll('[data-wear]').forEach((b) => b.addEventListener('click', () => this.game.wearOutfit(b.dataset.wear)));
    document.querySelectorAll('[data-buyoutfit]').forEach((b) => b.addEventListener('click', () => this.game.buyOutfit(b.dataset.buyoutfit)));
  }

  // -------------------------------------------------------------------------
  // DAILY
  // -------------------------------------------------------------------------
  renderDaily() {
    const s = this.game.store;
    const d = s.daily;
    const today = todayStr();
    const canClaim = d.lastClaimed !== today;
    const rewards = DAILY_REWARDS.map((r) => {
      const active = d.streak % 7 === r.day - 1;
      const claimed = d.lastClaimed === today && active;
      return `<div class="daily-day ${active && canClaim ? 'ready' : ''} ${claimed ? 'claimed' : ''}">
        <div class="daily-day-num">${r.day}</div>
        <div class="daily-day-reward">🪙${r.coins}${r.faith ? ' ✨' + r.faith : ''}</div>
      </div>`;
    }).join('');

    const challenges = DAILY_CHALLENGES.map((c) => {
      const prog = Math.min(c.target, d.challenges[c.id] || 0);
      return `<div class="daily-challenge">
        <div>${c.text}</div>
        <div class="daily-challenge-prog">${prog}/${c.target}</div>
      </div>`;
    }).join('');

    this._screen('daily', `
      <div class="panel-title">🎁 Daily Rewards</div>
      <div class="panel-sub">Login streak: 🔥 ${d.streak} day${d.streak === 1 ? '' : 's'}</div>
      <div class="daily-strip">${rewards}</div>
      <button class="btn ${canClaim ? 'btn-primary' : 'btn-disabled'}" data-daily-claim>${canClaim ? 'Claim Today’s Reward' : 'Claimed Today'}</button>
      <div class="panel-sub daily-challenge-title">Today’s Challenges</div>
      <div class="daily-challenges">${challenges}</div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    const btn = document.querySelector('[data-daily-claim]');
    if (btn) btn.addEventListener('click', () => this.game.claimDaily());
  }

  // -------------------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------------------
  renderSettings() {
    const st = this.game.store.settings;
    this._screen('settings', `
      <div class="panel-title">⚙️ Settings</div>
      <div class="settings-list">
        <div class="setting-row"><span>🎵 Music</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></div>
        <div class="setting-row"><span>🔊 Sound Effects</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></div>
        <div class="setting-row"><span>📳 Vibration</span><label class="switch"><input type="checkbox" data-set="vibration" ${st.vibration ? 'checked' : ''}><span class="slider"></span></label></div>
        <div class="setting-row"><span>🖼️ Graphics</span>
          <select data-set="quality">
            <option value="high" ${st.quality === 'high' ? 'selected' : ''}>High</option>
            <option value="low" ${st.quality === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div class="setting-row"><span>🌐 Language</span>
          <select data-set="language">
            <option value="en" ${st.language === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${st.language === 'es' ? 'selected' : ''}>Español</option>
            <option value="pt" ${st.language === 'pt' ? 'selected' : ''}>Português</option>
            <option value="fr" ${st.language === 'fr' ? 'selected' : ''}>Français</option>
          </select>
        </div>
        <div class="setting-row"><span>🔒 Privacy</span><button class="btn btn-mini" data-privacy>View</button></div>
        <div class="setting-row"><span>🔄 Reset Tutorial</span><button class="btn btn-mini" data-reset-tutorial>Reset</button></div>
      </div>
      <button class="btn btn-back" data-back="home">← Back</button>
    `);
    document.querySelectorAll('[data-set]').forEach((i) => {
      const evt = i.type === 'checkbox' ? 'change' : 'input';
      i.addEventListener(evt, () => {
        const val = i.type === 'checkbox' ? i.checked : (i.type === 'range' ? parseFloat(i.value) : i.value);
        this.game.setSetting(i.dataset.set, val);
      });
    });
    const priv = document.querySelector('[data-privacy]');
    if (priv) priv.addEventListener('click', () => this.toast('🔒 Your progress is stored only on this device.'));
    const rt = document.querySelector('[data-reset-tutorial]');
    if (rt) rt.addEventListener('click', () => { this.game.resetTutorial(); this.toast('Tutorial reset. It will show on your next run.'); });
  }

  // -------------------------------------------------------------------------
  // GAME OVER
  // -------------------------------------------------------------------------
  renderGameOver(stats) {
    const { distance, score, coins, scrolls, faith, newRecord, revived } = stats;
    this._screen('gameover', `
      <div class="panel-title ${newRecord ? 'record' : ''}">${newRecord ? '🏆 NEW RECORD!' : '💫 Run Complete'}</div>
      <div class="gameover-score">${fmt(score)}</div>
      <div class="gameover-grid">
        <div class="go-stat"><div class="go-val">${Math.round(distance)}m</div><div class="go-label">Distance</div></div>
        <div class="go-stat"><div class="go-val">🪙${coins}</div><div class="go-label">Coins</div></div>
        <div class="go-stat"><div class="go-val">📜${scrolls}</div><div class="go-label">Scrolls</div></div>
        <div class="go-stat"><div class="go-val">✨${faith}</div><div class="go-label">Faith</div></div>
      </div>
      ${!revived ? `<button class="btn btn-revive" data-revive>🕊 Revive (${REVIVE_COST}✨)</button>` : ''}
      <button class="btn btn-primary" data-runagain>▶ Run Again</button>
      <button class="btn" data-home>🏠 Home</button>
    `);
    const rev = document.querySelector('[data-revive]');
    if (rev) rev.addEventListener('click', () => this.game.revive());
    document.querySelector('[data-runagain]').addEventListener('click', () => this.game.restart());
    document.querySelector('[data-home]').addEventListener('click', () => this.game.toHome());
  }

  // -------------------------------------------------------------------------
  // PAUSE
  // -------------------------------------------------------------------------
  renderPause() {
    this._screen('pause', `
      <div class="panel-title">⏸ Paused</div>
      <button class="btn btn-primary" data-resume>▶ Resume</button>
      <button class="btn" data-quit>🏠 Home</button>
    `);
    document.querySelector('[data-resume]').addEventListener('click', () => this.game.resume());
    document.querySelector('[data-quit]').addEventListener('click', () => this.game.toHome());
  }

  // -------------------------------------------------------------------------
  // TUTORIAL
  // -------------------------------------------------------------------------
  renderTutorial() {
    this._screen('tutorial', `
      <div class="tutorial-card">
        <div class="panel-title">🕊 How to Play</div>
        <div class="tutorial-steps">
          <div class="tstep"><div class="tstep-icon">⬅️➡️</div><div>Swipe LEFT / RIGHT to change lanes</div></div>
          <div class="tstep"><div class="tstep-icon">⬆️</div><div>Swipe UP to jump</div></div>
          <div class="tstep"><div class="tstep-icon">⬇️</div><div>Swipe DOWN to slide</div></div>
          <div class="tstep"><div class="tstep-icon">🪙</div><div>Collect coins & Bible scrolls</div></div>
          <div class="tstep"><div class="tstep-icon">✨</div><div>Tap the ability button for a blessing</div></div>
        </div>
        <button class="btn btn-primary" data-tut-go>Let’s Run! ▶</button>
      </div>
    `);
    document.querySelector('[data-tut-go]').addEventListener('click', () => this.game.beginRun());
  }

  // -------------------------------------------------------------------------
  // QUIZ
  // -------------------------------------------------------------------------
  renderQuiz(question, onAnswer) {
    this._screen('quiz', `
      <div class="quiz-card">
        <div class="quiz-badge">📖 BIBLE KNOWLEDGE</div>
        <div class="quiz-q">${question.q}</div>
        <div class="quiz-options">
          ${question.a.map((ans, i) => `<button class="btn quiz-opt" data-opt="${i}">${ans}</button>`).join('')}
        </div>
      </div>
    `);
    document.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => onAnswer(parseInt(b.dataset.opt, 10))));
  }

  renderQuizResult(correct, ref, reward) {
    this._screen('quiz', `
      <div class="quiz-card">
        <div class="quiz-badge ${correct ? '' : 'bad'}">${correct ? '✅ Correct!' : '❌ Not quite'}</div>
        <div class="quiz-q">${correct ? 'Well done, faithful one!' : 'Keep reading the Word!'}</div>
        <div class="quiz-ref">${ref}</div>
        ${correct ? `<div class="quiz-reward">+🪙${reward.coins} +✨${reward.faith}</div>` : ''}
        <button class="btn btn-primary" data-quiz-cont>Continue</button>
      </div>
    `);
    document.querySelector('[data-quiz-cont]').addEventListener('click', () => this.game.continueAfterQuiz());
  }

  // -------------------------------------------------------------------------
  // VERSE (collected a scroll that unlocks a verse)
  // -------------------------------------------------------------------------
  renderVerse(verse) {
    this._screen('verse', `
      <div class="verse-card-big">
        <div class="verse-badge">📜 Scroll Collected</div>
        <div class="verse-ref">${verse.ref}</div>
        <div class="verse-text">${verse.text}</div>
        <button class="btn btn-primary" data-verse-cont>Continue ▶</button>
      </div>
    `);
    document.querySelector('[data-verse-cont]').addEventListener('click', () => this.game.continueRun());
  }

  // -------------------------------------------------------------------------
  // LEVEL UP
  // -------------------------------------------------------------------------
  renderLevelUp(levelName) {
    this._screen('levelup', `
      <div class="levelup-card">
        <div class="levelup-badge">⭐ LEVEL UP</div>
        <div class="levelup-title">${levelName}</div>
        <div class="levelup-sub">You are growing in faith!</div>
        <button class="btn btn-primary" data-lvl-cont>Continue</button>
      </div>
    `);
    document.querySelector('[data-lvl-cont]').addEventListener('click', () => this.game.continueAfterLevelUp());
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------
  updateHud(h) {
    $('#hud-score').textContent = fmt(h.score);
    $('#hud-coins').textContent = fmt(h.coins);
    $('#hud-scrolls').textContent = fmt(h.scrolls);
    $('#hud-faith').textContent = fmt(h.faith);
    $('#hud-dist').textContent = Math.round(h.distance);
    $('#hud-ability-name').textContent = h.abilityName;
    $('#hud-ability-btn').textContent = h.abilityIcon;
    const cd = $('#hud-ability-cd');
    cd.style.height = `${h.cooldownPct * 100}%`;
    $('#hud-ability-btn').classList.toggle('ready', h.abilityReady);
    // active powerups
    $('#hud-active').innerHTML = h.active.map((a) => `<span class="active-pill" style="border-color:${a.color}">${a.icon} ${a.name}${a.time != null ? ' ' + Math.ceil(a.time) + 's' : ''}</span>`).join('');
    // speed meter
    const spd = $('#hud-speed');
    spd.style.width = `${(h.speed / 34) * 100}%`;
    if (h.mission) {
      $('#hud-mission').textContent = `🎯 ${h.mission.text} (${h.mission.progress}/${h.mission.target})`;
      $('#hud-mission').style.display = 'block';
    } else {
      $('#hud-mission').style.display = 'none';
    }
  }

  _screen(id, html) {
    $('#screen-' + id).innerHTML = html;
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => this.game.nav(b.dataset.back)));
    this.show(id);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function esc(str) { return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmt(n) { return (n | 0).toLocaleString('en-US'); }
function cssCol(hex) { return '#' + hex.toString(16).padStart(6, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function charEmoji(id) {
  const m = { david: '🐑', moses: '🪄', esther: '👑', daniel: '🦁', ruth: '🌾', joshua: '⚔️', peter: '🎣', paul: '📜', mary: '🕯️' };
  return m[id] || '🧑';
}
function worldEmoji(id) {
  const m = { jerusalem: '🕍', desert: '🏜️', redsea: '🌊', davidskingdom: '👑', noah: '🌈', galilee: '🎣', babylon: '🏛️' };
  return m[id] || '🌍';
}
function upgradeCost(level) { return 150 + level * 100; }
export const REVIVE_COST = 50;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
const CSS = `
:root {
  --gold: #e8c15a;
  --gold-dark: #b8912f;
  --panel: rgba(28,22,40,0.92);
  --panel-soft: rgba(46,38,62,0.95);
  --ink: #f4ecd8;
  --ink-dim: #cbbfa4;
  --accent: #8a5a3a;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #1a1430; }
body { font-family: 'Segoe UI', 'Georgia', system-ui, sans-serif; color: var(--ink); user-select: none; }
canvas { display: block; position: fixed; inset: 0; touch-action: none; }

.ui-root { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
#screens, #screens * { pointer-events: auto; }
#hud .pause-btn, #hud .hud-ability-btn, #hud .icon-btn { pointer-events: auto; }

.hidden { display: none !important; }

/* ---- HUD ---- */
#hud { position: absolute; inset: 0; }
.hud-top { position: absolute; top: 0; left: 0; right: 0; padding: 10px 14px; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.hud-score { font-size: 44px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.5); letter-spacing: 1px; }
.hud-sub { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; justify-content: center; }
.hud-pill { background: rgba(20,16,32,0.6); border: 1px solid rgba(232,193,90,0.4); padding: 3px 10px; border-radius: 20px; font-size: 13px; }
.hud-bottom { position: absolute; bottom: 16px; left: 0; right: 0; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 16px; }
.hud-ability { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.hud-ability-name { font-size: 11px; color: var(--ink-dim); text-shadow: 0 1px 4px #000; }
.hud-ability-btn { width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle, #4a3a6a, #2a2038); border: 2px solid rgba(232,193,90,0.6); font-size: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
.hud-ability-btn.ready { background: radial-gradient(circle, #7a5a2a, #4a3018); animation: pulse 1.2s infinite; }
.hud-ability-cd { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.55); height: 0; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.hud-active { display: flex; gap: 6px; flex-wrap: wrap; max-width: 60%; justify-content: flex-end; }
.active-pill { background: rgba(20,16,32,0.7); border: 1px solid; padding: 4px 10px; border-radius: 16px; font-size: 12px; }
.pause-btn { position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(232,193,90,0.5); background: rgba(20,16,32,0.6); color: #fff; font-size: 20px; cursor: pointer; }
.icon-btn { border: none; }
.hud-speed { position: absolute; bottom: 0; left: 0; height: 4px; background: linear-gradient(90deg, #4aa0e0, #e8c15a); width: 0%; transition: width 0.2s; }
.hud-mission { position: absolute; bottom: 90px; left: 50%; transform: translateX(-50%); background: rgba(20,16,32,0.7); border: 1px solid rgba(232,193,90,0.4); padding: 4px 12px; border-radius: 16px; font-size: 12px; }

/* ---- Screens ---- */
#screens { position: absolute; inset: 0; overflow-y: auto; }
.screen { position: absolute; inset: 0; display: none; padding: 20px; overflow-y: auto; }
.screen.active { display: flex; flex-direction: column; }
.screen-center { align-items: center; justify-content: center; text-align: center; }

/* ---- Home ---- */
.home-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 20%, rgba(120,90,40,0.35), transparent 60%), linear-gradient(180deg, rgba(30,24,48,0.2), rgba(20,16,32,0.9)); }
.home-topbar { position: relative; display: flex; flex-direction: column; gap: 8px; }
.home-profile { display: flex; align-items: center; gap: 12px; }
.avatar-ring { width: 54px; height: 54px; border-radius: 50%; border: 2px solid var(--gold); background: #2a2038; display: flex; align-items: center; justify-content: center; font-size: 26px; }
.home-profile-info { display: flex; flex-direction: column; }
.home-name { font-size: 18px; font-weight: 700; }
.home-level { font-size: 12px; color: var(--ink-dim); }
.home-xp-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.12); overflow: hidden; }
.home-xp-fill { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); transition: width 0.4s; }
.home-currencies { display: flex; gap: 10px; flex-wrap: wrap; }
.cur { background: rgba(20,16,32,0.6); border: 1px solid rgba(232,193,90,0.35); padding: 4px 12px; border-radius: 16px; font-size: 14px; }
.home-title-wrap { position: relative; text-align: center; margin: 26px 0 6px; }
.home-title { font-size: 46px; font-weight: 900; letter-spacing: 4px; background: linear-gradient(180deg, #fff4d0, #e8c15a); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 2px 12px rgba(232,193,90,0.35); }
.home-tagline { font-size: 14px; color: var(--ink-dim); font-style: italic; }
.home-world-pill { position: relative; text-align: center; margin: 8px 0 16px; font-size: 13px; color: var(--ink-dim); }
.home-menu { position: relative; display: flex; flex-direction: column; gap: 10px; max-width: 420px; margin: 0 auto; width: 100%; }
.home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.home-quiz-hint { position: relative; text-align: center; margin: 18px auto 0; font-size: 12px; color: var(--ink-dim); max-width: 420px; }

/* ---- Buttons ---- */
.btn { display: inline-block; border: 1px solid rgba(232,193,90,0.5); background: linear-gradient(180deg, #3a2f4e, #2a2038); color: var(--ink); padding: 12px 16px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; transition: transform 0.08s, filter 0.1s; text-align: center; font-family: inherit; }
.btn:active { transform: scale(0.96); }
.btn-primary { background: linear-gradient(180deg, #f0cf6a, #c9992f); color: #2a1a08; border-color: #f5e0a0; text-shadow: 0 1px 0 rgba(255,255,255,0.3); }
.btn-big { font-size: 22px; padding: 16px; letter-spacing: 3px; }
.btn-back { align-self: flex-start; margin-top: 16px; }
.btn-disabled { opacity: 0.45; pointer-events: none; }
.btn-mini { padding: 7px 10px; font-size: 13px; border-radius: 10px; }
.btn-revive { background: linear-gradient(180deg, #6a9ad0, #3a6aa0); border-color: #9ac0e8; color: #fff; }

/* ---- Panels ---- */
.panel-title { font-size: 30px; font-weight: 900; text-align: center; letter-spacing: 1px; color: var(--gold); text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
.panel-title.record { animation: glow 1s infinite alternate; }
@keyframes glow { from { text-shadow: 0 0 8px rgba(232,193,90,0.4);} to { text-shadow: 0 0 20px rgba(255,240,180,0.9);} }
.panel-sub { text-align: center; color: var(--ink-dim); font-size: 13px; margin: 6px 0 16px; }

/* ---- Characters ---- */
.char-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.char-card { background: var(--panel-soft); border: 1px solid rgba(232,193,90,0.25); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.char-card.selected { border-color: var(--gold); box-shadow: 0 0 16px rgba(232,193,90,0.35); }
.char-card.locked { opacity: 0.75; }
.char-emoji { width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; border: 2px solid rgba(255,255,255,0.25); }
.char-name { font-weight: 800; font-size: 16px; }
.char-role { font-size: 11px; color: var(--ink-dim); font-style: italic; }
.char-ability { font-size: 11px; color: #ffd98a; }
.char-status { font-size: 12px; }
.char-lock { font-size: 11px; color: var(--ink-dim); }

/* ---- Worlds ---- */
.world-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.world-card { background: var(--panel-soft); border: 1px solid rgba(232,193,90,0.25); border-radius: 16px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.world-card.selected { border-color: var(--gold); box-shadow: 0 0 16px rgba(232,193,90,0.35); }
.world-card.locked { opacity: 0.75; }
.world-art { width: 100%; height: 70px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 34px; }
.world-name { font-weight: 800; font-size: 15px; }
.world-chapter { font-size: 11px; color: var(--ink-dim); }

/* ---- Missions ---- */
.mission-list { display: flex; flex-direction: column; gap: 10px; }
.mission-row { background: var(--panel-soft); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.mission-row.done { opacity: 0.6; }
.mission-text { font-weight: 700; font-size: 14px; }
.mission-progress { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.mission-fill { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); }
.mission-meta { font-size: 12px; color: var(--ink-dim); display: flex; justify-content: space-between; align-items: center; }

/* ---- Bible ---- */
.verse-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.verse-card { background: var(--panel-soft); border: 1px solid rgba(232,193,90,0.25); border-radius: 14px; padding: 14px; }
.verse-card.locked { opacity: 0.6; }
.verse-ref { font-weight: 800; color: var(--gold); font-size: 13px; }
.verse-text { font-style: italic; margin-top: 6px; font-size: 14px; line-height: 1.4; }

/* ---- Shop ---- */
.shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.shop-card { background: var(--panel-soft); border: 1px solid rgba(232,193,90,0.25); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.shop-card.selected { border-color: var(--gold); }
.outfit-swatch { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; border: 2px solid rgba(255,255,255,0.25); }
.shop-name { font-weight: 700; font-size: 13px; }

/* ---- Daily ---- */
.daily-strip { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; flex-wrap: wrap; }
.daily-day { width: 56px; height: 64px; border-radius: 10px; background: var(--panel-soft); border: 1px solid rgba(232,193,90,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.daily-day.ready { border-color: var(--gold); animation: pulse 1.2s infinite; }
.daily-day.claimed { opacity: 0.5; }
.daily-day-num { font-weight: 800; }
.daily-day-reward { font-size: 10px; color: var(--ink-dim); }
.daily-challenge-title { margin-top: 20px; }
.daily-challenges { display: flex; flex-direction: column; gap: 8px; }
.daily-challenge { background: var(--panel-soft); border-radius: 12px; padding: 10px 12px; font-size: 13px; display: flex; justify-content: space-between; }
.daily-challenge-prog { color: var(--gold); font-weight: 700; }

/* ---- Settings ---- */
.settings-list { display: flex; flex-direction: column; gap: 8px; }
.setting-row { background: var(--panel-soft); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.setting-row input[type=range] { flex: 1; accent-color: var(--gold); }
.setting-row select { background: #2a2038; color: var(--ink); border: 1px solid rgba(232,193,90,0.4); border-radius: 8px; padding: 6px; font-family: inherit; }
.switch { position: relative; width: 48px; height: 26px; display: inline-block; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: #3a2f4e; border-radius: 26px; transition: 0.2s; cursor: pointer; }
.slider:before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
.switch input:checked + .slider { background: var(--gold-dark); }
.switch input:checked + .slider:before { transform: translateX(22px); }

/* ---- Game over ---- */
.gameover-score { font-size: 60px; font-weight: 900; color: var(--gold); text-shadow: 0 2px 12px rgba(232,193,90,0.5); }
.gameover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; width: 100%; max-width: 340px; }
.go-stat { background: var(--panel-soft); border-radius: 14px; padding: 12px; }
.go-val { font-size: 20px; font-weight: 800; }
.go-label { font-size: 11px; color: var(--ink-dim); }

/* ---- Tutorial ---- */
.tutorial-card { background: var(--panel); border: 1px solid rgba(232,193,90,0.4); border-radius: 20px; padding: 26px; max-width: 380px; width: 100%; }
.tutorial-steps { display: flex; flex-direction: column; gap: 12px; margin: 18px 0; text-align: left; }
.tstep { display: flex; align-items: center; gap: 12px; font-size: 15px; }
.tstep-icon { font-size: 22px; width: 40px; text-align: center; }

/* ---- Quiz ---- */
.quiz-card { background: var(--panel); border: 1px solid rgba(232,193,90,0.4); border-radius: 20px; padding: 26px; max-width: 420px; width: 100%; }
.quiz-badge { display: inline-block; background: rgba(232,193,90,0.2); border: 1px solid var(--gold); padding: 4px 14px; border-radius: 20px; font-size: 12px; letter-spacing: 1px; }
.quiz-badge.bad { background: rgba(200,80,80,0.2); border-color: #c86060; }
.quiz-q { font-size: 22px; font-weight: 800; margin: 16px 0; line-height: 1.3; }
.quiz-options { display: flex; flex-direction: column; gap: 10px; }
.quiz-opt { font-size: 16px; }
.quiz-ref { color: var(--ink-dim); font-style: italic; margin-bottom: 12px; }
.quiz-reward { font-size: 18px; font-weight: 800; color: var(--gold); margin-bottom: 14px; }

/* ---- Verse big ---- */
.verse-card-big { background: var(--panel); border: 1px solid rgba(232,193,90,0.4); border-radius: 20px; padding: 30px; max-width: 440px; width: 100%; }
.verse-badge { color: var(--gold); font-weight: 700; letter-spacing: 1px; }
.verse-ref { font-size: 18px; font-weight: 800; color: var(--gold); margin: 14px 0 8px; }
.verse-text { font-size: 22px; font-style: italic; line-height: 1.45; margin-bottom: 18px; }

/* ---- Level up ---- */
.levelup-card { background: var(--panel); border: 1px solid rgba(232,193,90,0.4); border-radius: 20px; padding: 34px; max-width: 380px; width: 100%; }
.levelup-badge { color: var(--gold); letter-spacing: 2px; font-size: 14px; }
.levelup-title { font-size: 34px; font-weight: 900; margin: 14px 0; color: #fff4d0; }
.levelup-sub { color: var(--ink-dim); font-style: italic; margin-bottom: 20px; }

/* ---- Toast ---- */
#toast-wrap { position: absolute; top: 60px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; z-index: 30; }
.toast { background: var(--panel); border: 1px solid rgba(232,193,90,0.5); color: var(--ink); padding: 10px 20px; border-radius: 24px; font-size: 14px; font-weight: 600; opacity: 0; transform: translateY(-12px); transition: all 0.25s; }
.toast.show { opacity: 1; transform: translateY(0); }

@media (max-width: 480px) {
  .home-title { font-size: 36px; }
  .gameover-score { font-size: 48px; }
  .panel-title { font-size: 24px; }
}
`;
