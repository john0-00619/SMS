# 🕊️ Path of Faith

A Bible-themed 3D endless runner, playable in any modern browser (mobile + desktop).
Built with **Three.js** and a hand-written game engine, with zero copyrighted assets —
all art is procedural low-poly geometry and all audio is synthesized in code.

Run the ancient road, walk by faith.

---

## ▶ Play

```
npm install        # vendors three.js (already committed in vendor/)
node server.js     # serves on http://0.0.0.0:8080
```

Open `http://localhost:8080` in a browser. On mobile, tap/visit the live preview.

> The game works offline once assets are served — no build step required.

---

## 🎮 Controls

| Action | Input |
|--------|-------|
| Change lane | Swipe **left / right** (or ← / → keys) |
| Jump | Swipe **up** (or ↑ / space) |
| Slide | Swipe **down** (or ↓) |
| Character ability | Tap the **ability button** (or Q) |
| Pause | ⏸ button (or Esc / P) |

---

## ✨ Features

- **3-lane endless running** with dynamic, fair obstacle generation (rocks, carts,
  walls, fires, animals, soldiers, collapsing bridges/gaps, market stalls, gates).
- **7 Bible worlds**: Jerusalem, Exodus Desert, Red Sea, David's Kingdom, Noah's
  World, Galilee, Babylon — each with its own palette, terrain and scenery.
- **9 unlockable characters** (David, Moses, Esther, Daniel, Ruth, Joshua, Peter,
  Paul, Mary Magdalene), each with a unique ability, stats, and upgrade levels.
- **6 power-ups**: Shield of Faith, Wings of the Eagle, Scroll Magnet, Faith
  Multiplier, Path of Light, Heavenly Speed.
- **Collectibles**: gold coins, Bible scrolls, faith points, stars.
- **Bible verses** unlocked by collecting scrolls (accurate references).
- **Bible Knowledge quiz** appears occasionally after runs — correct answers pay
  bonus rewards.
- **Missions & Daily challenges** with login streaks and 7-day rewards.
- **Progression**: XP, player levels (Beginner → Champion of Faith), coins, faith
  points, character upgrades, cosmetic outfits.
- **Save system** via `localStorage` (structured for future cloud sync), plus
  settings for music/SFX volume, vibration, graphics quality and language.
- **First-run tutorial**, pause (with quick music/SFX mute toggles), revive, and
  a fully synthesized soundtrack — calm menu theme, an energetic run theme that
  builds with speed, a gospel-style "choir" pad, and an "Amen" plagal cadence —
  plus per-world ambient soundscapes (wind, birds, waves, rain, thunder, temple
  chimes) and a rich SFX bank (coin-combo pitch, verse chimes, level-up fanfare,
  game-over sting, footsteps, landings, near-miss whooshes, milestone fanfares,
  star "praise" swells) with optional haptic vibration feedback.

---

## 🧪 Testing

A headless test harness exercises the full game loop (spawning, movement,
collision, scoring, unlocking, save persistence) without a browser:

```
node test/run.mjs
```

---

## 📁 Structure

```
index.html          — entry point
vendor/three.min.js — vendored Three.js (r160)
server.js           — tiny static dev server
src/
  main.js           — bootstrap
  game.js           — core game engine (loop, spawning, collisions, progression)
  render.js         — Three.js scene, worlds, character/obstacle builders, particles
  ui.js             — DOM overlay, all screens, HUD, CSS
  data.js           — characters, worlds, power-ups, missions, verses, quiz, etc.
  save.js           — localStorage save system
  audio.js          — synthesized Web Audio engine (music + SFX)
  const.js          — shared gameplay constants
test/
  harness.mjs       — jsdom + THREE/DOM stubs
  run.mjs           — assertions
```

## ⚖️ Originality

All game content — name, characters, environments, models, UI, icons, animations,
music, progression, story and missions — is original. The game uses proven
endless-runner *mechanics* but copies no commercial game's assets or characters.
