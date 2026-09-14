// ============================================================================
// PATH OF FAITH — Game Data
// All characters, worlds, power-ups, missions, verses, quiz questions, etc.
// ============================================================================

export const GAME = {
  name: 'PATH OF FAITH',
  tagline: 'Run the ancient road. Walk by faith.',
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// PLAYER LEVELS
// ---------------------------------------------------------------------------
export const LEVELS = [
  { name: 'Beginner', xp: 0 },
  { name: 'Disciple', xp: 300 },
  { name: 'Follower', xp: 900 },
  { name: 'Messenger', xp: 2000 },
  { name: 'Warrior of Faith', xp: 4200 },
  { name: 'Champion of Faith', xp: 8000 },
];

export function levelForXp(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  return { index: idx, ...LEVELS[idx], next: LEVELS[idx + 1] || null };
}

// ---------------------------------------------------------------------------
// PLAYABLE CHARACTERS
// ability.type:
//   speed     — temporary speed boost
//   clear     — creates a safe path (clears/part path through obstacles)
//   shield    — protection from danger
//   coin      — increases coin & scroll rewards
//   faith     — increases faith points collected
//   slow      — slows time / steady ground
// ---------------------------------------------------------------------------
export const CHARACTERS = [
  {
    id: 'david', name: 'David', role: 'Shepherd King',
    desc: 'A young shepherd with a heart of courage. His sling never misses.',
    verse: { ref: '1 Samuel 17:45', text: '“You come against me with sword and spear, but I come against you in the name of the LORD.”' },
    colors: { skin: 0xd9a066, robe: 0x9a5b3a, tunic: 0xe8d5a8, sash: 0x8a2f2f, hair: 0x2b1b12, trim: 0xc9a15a },
    prop: 'sling',
    stats: { speed: 1.0, coin: 1.0, faith: 1.0, luck: 1.0 },
    ability: { name: 'Swift Courage', desc: 'A burst of heavenly speed.', type: 'speed', cooldown: 22, duration: 5, value: 1.5 },
    unlock: { coins: 0, level: 0 },
  },
  {
    id: 'moses', name: 'Moses', role: 'The Deliverer',
    desc: 'Led a nation through the sea. His staff makes a way where there is none.',
    verse: { ref: 'Exodus 14:21', text: '“Moses stretched out his hand over the sea, and the LORD drove the sea back.”' },
    colors: { skin: 0xc98d5a, robe: 0x7a4a2b, tunic: 0xd8c39a, sash: 0x4a6b3a, hair: 0x6b6b6b, trim: 0xb08a4a },
    prop: 'staff',
    stats: { speed: 0.98, coin: 1.0, faith: 1.15, luck: 1.0 },
    ability: { name: 'Part the Way', desc: 'Creates a safe path through obstacles.', type: 'clear', cooldown: 26, duration: 5, value: 1 },
    unlock: { coins: 250, level: 2 },
  },
  {
    id: 'esther', name: 'Esther', role: 'The Brave Queen',
    desc: 'Courage for such a time as this. Her presence multiplies every blessing.',
    verse: { ref: 'Esther 4:14', text: '“And who knows but that you have come to your royal position for such a time as this?”' },
    colors: { skin: 0xd9a066, robe: 0x6a2f8a, tunic: 0xe8d5a8, sash: 0xc9a15a, hair: 0x3a2412, trim: 0xd8b34a },
    prop: 'crown',
    stats: { speed: 1.0, coin: 1.2, faith: 1.0, luck: 1.1 },
    ability: { name: 'Royal Favor', desc: 'Doubles coin and scroll rewards.', type: 'coin', cooldown: 24, duration: 8, value: 2 },
    unlock: { coins: 400, level: 3 },
  },
  {
    id: 'daniel', name: 'Daniel', role: 'The Faithful',
    desc: 'Unshaken in the lion’s den. His faith is a shield around him.',
    verse: { ref: 'Daniel 6:22', text: '“My God sent his angel, and he shut the mouths of the lions.”' },
    colors: { skin: 0xcf9a63, robe: 0x2a4a6a, tunic: 0xd8c39a, sash: 0x8a2f2f, hair: 0x1a1a1a, trim: 0xb08a4a },
    prop: 'shield',
    stats: { speed: 1.0, coin: 1.0, faith: 1.1, luck: 1.05 },
    ability: { name: 'Angel’s Guard', desc: 'Temporary protection from danger.', type: 'shield', cooldown: 24, duration: 6, value: 1 },
    unlock: { coins: 350, level: 3 },
  },
  {
    id: 'ruth', name: 'Ruth', role: 'The Faithful One',
    desc: 'Where you go, I will go. Her loyalty gathers abundance.',
    verse: { ref: 'Ruth 1:16', text: '“Where you go I will go, and where you stay I will stay. Your people will be my people.”' },
    colors: { skin: 0xd9a066, robe: 0x5a7a3a, tunic: 0xe8d5a8, sash: 0x8a5a2a, hair: 0x2b1b12, trim: 0xc9a15a },
    prop: 'sheaf',
    stats: { speed: 1.0, coin: 1.15, faith: 1.0, luck: 1.1 },
    ability: { name: 'Gathering Grace', desc: 'A scroll magnet and coin bonus.', type: 'coin', cooldown: 24, duration: 8, value: 1.6 },
    unlock: { coins: 450, level: 4 },
  },
  {
    id: 'joshua', name: 'Joshua', role: 'The Commander',
    desc: 'Strong and courageous. He leads the charge into new territory.',
    verse: { ref: 'Joshua 1:9', text: '“Be strong and courageous. Do not be afraid; the LORD your God is with you.”' },
    colors: { skin: 0xc98d5a, robe: 0x4a4a6a, tunic: 0xd8c39a, sash: 0x8a2f2f, hair: 0x2b1b12, trim: 0xb08a4a },
    prop: 'sword',
    stats: { speed: 1.05, coin: 1.0, faith: 1.1, luck: 1.0 },
    ability: { name: 'Be Strong', desc: 'Speed and protection for a short charge.', type: 'speed', cooldown: 24, duration: 5, value: 1.35 },
    unlock: { coins: 500, level: 4 },
  },
  {
    id: 'peter', name: 'Peter', role: 'The Rock',
    desc: 'Walked on the water. When he fell, he was lifted up again.',
    verse: { ref: 'Matthew 14:29', text: '“Come,” he said. Then Peter got down out of the boat, walked on the water and came toward Jesus.' },
    colors: { skin: 0xd9a066, robe: 0x3a5a7a, tunic: 0xe0d0a8, sash: 0x6a3a2a, hair: 0x3a2a1a, trim: 0x9a8a6a },
    prop: 'net',
    stats: { speed: 1.0, coin: 1.0, faith: 1.2, luck: 1.0 },
    ability: { name: 'Walking Faith', desc: 'A safe path and faith boost.', type: 'clear', cooldown: 26, duration: 5, value: 1 },
    unlock: { coins: 600, level: 5 },
  },
  {
    id: 'paul', name: 'Paul', role: 'The Apostle',
    desc: 'Ran the race set before him. His words multiply every act of faith.',
    verse: { ref: '2 Timothy 4:7', text: '“I have fought the good fight, I have finished the race, I have kept the faith.”' },
    colors: { skin: 0xcf9a63, robe: 0x3a3a3a, tunic: 0xd8c39a, sash: 0x8a2f2f, hair: 0x5a5a5a, trim: 0x9a8a6a },
    prop: 'scroll',
    stats: { speed: 1.0, coin: 1.0, faith: 1.35, luck: 1.0 },
    ability: { name: 'Press On', desc: 'Greatly increases faith points collected.', type: 'faith', cooldown: 24, duration: 8, value: 2 },
    unlock: { coins: 700, level: 5 },
  },
  {
    id: 'mary', name: 'Mary Magdalene', role: 'The Devoted',
    desc: 'First at the empty tomb. Her devotion sees beyond every shadow.',
    verse: { ref: 'John 20:18', text: '“I have seen the Lord!” Mary Magdalene went to the disciples with the news.' },
    colors: { skin: 0xd9a066, robe: 0x8a4a5a, tunic: 0xe8d5a8, sash: 0x5a3a6a, hair: 0x3a2412, trim: 0xc9a15a },
    prop: 'lamp',
    stats: { speed: 1.0, coin: 1.1, faith: 1.15, luck: 1.05 },
    ability: { name: 'Light of Dawn', desc: 'Reveals the safest path and attracts rewards.', type: 'light', cooldown: 26, duration: 7, value: 1 },
    unlock: { coins: 900, level: 6 },
  },
];

// ---------------------------------------------------------------------------
// WORLDS (unlockable environments)
// ---------------------------------------------------------------------------
export const WORLDS = [
  {
    id: 'jerusalem', name: 'Jerusalem', chapter: 'The Holy City',
    desc: 'Run the ancient stone streets, past markets and city gates.',
    verse: { ref: 'Psalm 122:2', text: '“Our feet are standing in your gates, Jerusalem.”' },
    unlock: { coins: 0, level: 0 },
    palette: {
      skyTop: 0x87c6e8, skyHorizon: 0xf4d9a8, fog: 0xd9b98a, fogFar: 150,
      ground: 0x9a8a6a, groundAccent: 0xb09a78, sun: 0xfff2d8, ambient: 0x8890a0,
      accent: 0xd9b98a, accent2: 0x8a6a4a, water: 0x3a6a8a,
    },
    groundKind: 'stone',
  },
  {
    id: 'desert', name: 'Exodus Desert', chapter: 'The Wilderness',
    desc: 'Cross burning dunes beneath a pillar of cloud and fire.',
    verse: { ref: 'Exodus 13:21', text: '“By day the LORD went ahead of them in a pillar of cloud to guide them.”' },
    unlock: { coins: 300, level: 2 },
    palette: {
      skyTop: 0x9fd0e0, skyHorizon: 0xf0c890, fog: 0xe0c090, fogFar: 160,
      ground: 0xd0b078, groundAccent: 0xe0c088, sun: 0xfff0d0, ambient: 0xa09888,
      accent: 0xe0c090, accent2: 0x9a6a40, water: 0x4a8a9a,
    },
    groundKind: 'sand',
  },
  {
    id: 'redsea', name: 'Red Sea', chapter: 'The Parted Waters',
    desc: 'Run the sea floor between towering walls of water.',
    verse: { ref: 'Exodus 14:22', text: '“The Israelites went through the sea on dry ground, with a wall of water on their right and on their left.”' },
    unlock: { coins: 600, level: 4 },
    palette: {
      skyTop: 0x7fb8d8, skyHorizon: 0xbfe0ee, fog: 0x9fc8d8, fogFar: 150,
      ground: 0xc8a878, groundAccent: 0xd8b888, sun: 0xfff6e0, ambient: 0x8090a0,
      accent: 0x5aa0c0, accent2: 0x2a6080, water: 0x2a6080,
    },
    groundKind: 'seabed',
  },
  {
    id: 'davidskingdom', name: 'David’s Kingdom', chapter: 'The Royal Valley',
    desc: 'Journey through villages, valleys and the royal court.',
    verse: { ref: '1 Samuel 16:7', text: '“The LORD looks at the heart.”' },
    unlock: { coins: 900, level: 5 },
    palette: {
      skyTop: 0x8fc0d8, skyHorizon: 0xf4d09a, fog: 0xd8c098, fogFar: 150,
      ground: 0x8a9a5a, groundAccent: 0x9aaa6a, sun: 0xfff2d8, ambient: 0x889088,
      accent: 0xc0a860, accent2: 0x6a5a3a, water: 0x3a7a8a,
    },
    groundKind: 'village',
  },
  {
    id: 'noah', name: 'Noah’s World', chapter: 'The Great Flood',
    desc: 'Rainy forests and the mighty Ark under a stormy sky.',
    verse: { ref: 'Genesis 6:14', text: '“Make yourself an ark of cypress wood; make rooms in it.”' },
    unlock: { coins: 1200, level: 6 },
    palette: {
      skyTop: 0x6a8aa0, skyHorizon: 0xa8b8c0, fog: 0x8a9aa0, fogFar: 140,
      ground: 0x5a7a4a, groundAccent: 0x6a8a5a, sun: 0xd8e0e0, ambient: 0x788888,
      accent: 0x8a9a4a, accent2: 0x4a5a2a, water: 0x3a5a6a,
    },
    groundKind: 'forest',
  },
  {
    id: 'galilee', name: 'Galilee', chapter: 'The Sea of Galilee',
    desc: 'Fishing villages, boats and fields beside the lake.',
    verse: { ref: 'Matthew 4:19', text: '“Come, follow me, and I will send you out to fish for people.”' },
    unlock: { coins: 1500, level: 7 },
    palette: {
      skyTop: 0x9ad0e8, skyHorizon: 0xe8f0f0, fog: 0xbfd8d8, fogFar: 150,
      ground: 0xa0b088, groundAccent: 0xb0c098, sun: 0xfff6e0, ambient: 0x8898a0,
      accent: 0x6aa0b0, accent2: 0x3a6a80, water: 0x3a80a0,
    },
    groundKind: 'field',
  },
  {
    id: 'babylon', name: 'Babylon', chapter: 'The Great City',
    desc: 'Massive golden architecture and royal palace roads.',
    verse: { ref: 'Daniel 3:18', text: '“The God we serve is able to deliver us.”' },
    unlock: { coins: 2000, level: 8 },
    palette: {
      skyTop: 0x8a7ab0, skyHorizon: 0xe8c890, fog: 0xc0a880, fogFar: 150,
      ground: 0xa09070, groundAccent: 0xb8a888, sun: 0xfff0d0, ambient: 0x9088a0,
      accent: 0xd8b860, accent2: 0x7a5a8a, water: 0x3a6a8a,
    },
    groundKind: 'palace',
  },
];

// ---------------------------------------------------------------------------
// POWER-UPS
// ---------------------------------------------------------------------------
export const POWERUPS = [
  { id: 'shield', name: 'Shield of Faith', desc: 'Protects you from one crash.', type: 'shield', duration: 0, color: 0xffd94a, icon: '🛡️' },
  { id: 'wings', name: 'Wings of the Eagle', desc: 'Fly above the obstacles.', type: 'wings', duration: 6, color: 0xffffff, icon: '🦅' },
  { id: 'magnet', name: 'Scroll Magnet', desc: 'Attracts nearby scrolls and coins.', type: 'magnet', duration: 9, color: 0x9ad0ff, icon: '🧲' },
  { id: 'multiplier', name: 'Faith Multiplier', desc: 'Doubles score and faith points.', type: 'multiplier', duration: 10, color: 0xffa05a, icon: '✖️' },
  { id: 'light', name: 'Path of Light', desc: 'Reveals the safest route.', type: 'light', duration: 7, color: 0xffe9a0, icon: '✨' },
  { id: 'speed', name: 'Heavenly Speed', desc: 'A temporary speed boost.', type: 'speed', duration: 5, color: 0x8ad0ff, icon: '⚡' },
];

// ---------------------------------------------------------------------------
// MISSIONS
// ---------------------------------------------------------------------------
export const MISSIONS = [
  { id: 'm1', text: 'Run 1,000 meters', type: 'distance', target: 1000, reward: { coins: 150, faith: 40 } },
  { id: 'm2', text: 'Collect 100 coins', type: 'coins', target: 100, reward: { coins: 200, faith: 50 } },
  { id: 'm3', text: 'Collect 10 Bible scrolls', type: 'scrolls', target: 10, reward: { coins: 250, faith: 60 } },
  { id: 'm4', text: 'Jump over 20 obstacles', type: 'jumps', target: 20, reward: { coins: 180, faith: 45 } },
  { id: 'm5', text: 'Slide under 10 obstacles', type: 'slides', target: 10, reward: { coins: 180, faith: 45 } },
  { id: 'm6', text: 'Use 3 power-ups', type: 'powerups', target: 3, reward: { coins: 220, faith: 55 } },
  { id: 'm7', text: 'Collect 50 faith points', type: 'faith', target: 50, reward: { coins: 200, faith: 60 } },
  { id: 'm8', text: 'Run through Jerusalem', type: 'world_jerusalem', target: 1, reward: { coins: 150, faith: 40 } },
  { id: 'm9', text: 'Complete a run without crashing', type: 'no_crash', target: 1, reward: { coins: 300, faith: 80 } },
  { id: 'm10', text: 'Reach 3,000 score in one run', type: 'score', target: 3000, reward: { coins: 350, faith: 90 } },
  { id: 'm11', text: 'Collect 3 stars', type: 'stars', target: 3, reward: { coins: 200, faith: 50 } },
  { id: 'm12', text: 'Run 2,000 meters', type: 'distance', target: 2000, reward: { coins: 400, faith: 100 } },
];

export const DAILY_REWARDS = [
  { day: 1, coins: 100, label: 'Day 1' },
  { day: 2, coins: 150, label: 'Day 2' },
  { day: 3, coins: 200, label: 'Day 3' },
  { day: 4, coins: 250, faith: 40, label: 'Day 4' },
  { day: 5, coins: 300, label: 'Day 5' },
  { day: 6, coins: 400, faith: 60, label: 'Day 6' },
  { day: 7, coins: 600, faith: 100, label: 'Day 7' },
];

// ---------------------------------------------------------------------------
// BIBLE VERSES (unlocked by collecting scrolls)
// ---------------------------------------------------------------------------
export const VERSES = [
  { ref: 'Joshua 1:9', text: '“Be strong and courageous. Do not be afraid; the LORD your God will be with you wherever you go.”' },
  { ref: '2 Corinthians 5:7', text: '“For we live by faith, not by sight.”' },
  { ref: 'Psalm 23:1', text: '“The LORD is my shepherd, I lack nothing.”' },
  { ref: 'Philippians 4:13', text: '“I can do all this through him who gives me strength.”' },
  { ref: 'Isaiah 40:31', text: '“Those who hope in the LORD will renew their strength. They will soar on wings like eagles.”' },
  { ref: 'Proverbs 3:5', text: '“Trust in the LORD with all your heart and lean not on your own understanding.”' },
  { ref: 'John 3:16', text: '“For God so loved the world that he gave his one and only Son.”' },
  { ref: 'Psalm 119:105', text: '“Your word is a lamp for my feet, a light on my path.”' },
  { ref: 'Romans 8:28', text: '“In all things God works for the good of those who love him.”' },
  { ref: 'Matthew 5:9', text: '“Blessed are the peacemakers, for they will be called children of God.”' },
  { ref: 'Psalm 46:1', text: '“God is our refuge and strength, an ever-present help in trouble.”' },
  { ref: 'Galatians 5:22', text: '“The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness.”' },
  { ref: 'Jeremiah 29:11', text: '“For I know the plans I have for you, plans to give you hope and a future.”' },
  { ref: 'Matthew 19:26', text: '“With God all things are possible.”' },
  { ref: 'Psalm 27:1', text: '“The LORD is my light and my salvation — whom shall I fear?”' },
  { ref: 'Hebrews 11:1', text: '“Faith is confidence in what we hope for and assurance about what we do not see.”' },
  { ref: 'John 8:12', text: '“I am the light of the world. Whoever follows me will never walk in darkness.”' },
  { ref: 'Psalm 100:4', text: '“Enter his gates with thanksgiving and his courts with praise.”' },
  { ref: '1 Corinthians 16:14', text: '“Do everything in love.”' },
  { ref: 'Micah 6:8', text: '“Act justly and love mercy and walk humbly with your God.”' },
];

// ---------------------------------------------------------------------------
// BIBLE KNOWLEDGE QUIZ
// ---------------------------------------------------------------------------
export const QUIZ = [
  { q: 'Who defeated Goliath?', a: ['Moses', 'David', 'Daniel', 'Peter'], correct: 1, ref: '1 Samuel 17' },
  { q: 'How many days and nights did rain fall in Noah’s flood?', a: ['7', '12', '40', '100'], correct: 2, ref: 'Genesis 7:12' },
  { q: 'Who led the Israelites out of Egypt?', a: ['Abraham', 'Joshua', 'Moses', 'Joseph'], correct: 2, ref: 'Exodus 3:10' },
  { q: 'What sea did the Israelites cross on dry ground?', a: ['Dead Sea', 'Red Sea', 'Sea of Galilee', 'Mediterranean'], correct: 1, ref: 'Exodus 14:21' },
  { q: 'Who was thrown into the lions’ den?', a: ['Daniel', 'David', 'Jonah', 'Elijah'], correct: 0, ref: 'Daniel 6' },
  { q: 'What was Jonah swallowed by?', a: ['A whale', 'A great fish', 'A serpent', 'A storm'], correct: 1, ref: 'Jonah 1:17' },
  { q: 'Who built an ark?', a: ['Moses', 'Abraham', 'Noah', 'Solomon'], correct: 2, ref: 'Genesis 6:14' },
  { q: 'How many disciples did Jesus choose?', a: ['7', '10', '12', '40'], correct: 2, ref: 'Mark 3:14' },
  { q: 'Who walked on water toward Jesus?', a: ['John', 'Peter', 'Paul', 'Andrew'], correct: 1, ref: 'Matthew 14:29' },
  { q: 'What is the first book of the Bible?', a: ['Exodus', 'Psalms', 'Genesis', 'Matthew'], correct: 2, ref: 'The Bible' },
  { q: 'Who was the first king of Israel?', a: ['David', 'Solomon', 'Saul', 'Saul’s son'], correct: 2, ref: '1 Samuel 10' },
  { q: 'What did David use to defeat Goliath?', a: ['A sword', 'A sling and a stone', 'A spear', 'A bow'], correct: 1, ref: '1 Samuel 17:49' },
  { q: 'Where was Jesus born?', a: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Galilee'], correct: 2, ref: 'Matthew 2:1' },
  { q: 'How many books are in the Bible?', a: ['39', '27', '66', '73'], correct: 2, ref: 'The Bible' },
  { q: 'Who was the strongest man in the Bible?', a: ['Samson', 'Goliath', 'David', 'Saul'], correct: 0, ref: 'Judges 16' },
  { q: 'What did God create on the first day?', a: ['Animals', 'Light', 'Man', 'Plants'], correct: 1, ref: 'Genesis 1:3' },
  { q: 'Who received the Ten Commandments?', a: ['Aaron', 'Joshua', 'Moses', 'Abraham'], correct: 2, ref: 'Exodus 20' },
  { q: 'What is the shortest verse in the Bible?', a: ['“God is love.”', '“Jesus wept.”', '“Pray always.”', '“Rejoice!”'], correct: 1, ref: 'John 11:35' },
  { q: 'Who betrayed Jesus?', a: ['Peter', 'Judas', 'Thomas', 'James'], correct: 1, ref: 'Matthew 26:14' },
  { q: 'What did Jesus multiply to feed the crowd?', a: ['Bread and fish', 'Grain and wine', 'Water and oil', 'Figs and honey'], correct: 0, ref: 'John 6:9' },
  { q: 'Which apostle wrote many of the New Testament letters?', a: ['Peter', 'John', 'Paul', 'James'], correct: 2, ref: 'The Epistles' },
  { q: 'What is the greatest commandment?', a: ['Love God', 'Honor parents', 'Keep the Sabbath', 'Give to the poor'], correct: 0, ref: 'Mark 12:30' },
  { q: 'How did the walls of Jericho fall?', a: ['An earthquake', 'The people marched and shouted', 'Fire', 'A flood'], correct: 1, ref: 'Joshua 6' },
  { q: 'Who was the mother of Samuel?', a: ['Hannah', 'Ruth', 'Esther', 'Sarah'], correct: 0, ref: '1 Samuel 1' },
  { q: 'What is the last book of the Bible?', a: ['Jude', 'Revelation', 'Acts', 'Romans'], correct: 1, ref: 'The Bible' },
  { q: 'Who interpreted dreams for Pharaoh?', a: ['Daniel', 'Joseph', 'Moses', 'Aaron'], correct: 1, ref: 'Genesis 41' },
  { q: 'What did God give as a sign after the flood?', a: ['A star', 'A rainbow', 'A dove', 'A pillar of fire'], correct: 1, ref: 'Genesis 9:13' },
  { q: 'Who was Paul’s traveling companion?', a: ['Silas', 'Peter', 'John', 'Matthew'], correct: 0, ref: 'Acts 15:40' },
  { q: 'What is the “armor of God” in Ephesians?', a: ['A shield, sword, and belt of truth', 'A chariot', 'A crown', 'A robe'], correct: 0, ref: 'Ephesians 6:11' },
  { q: 'On what mountain did Moses receive the law?', a: ['Zion', 'Sinai', 'Carmel', 'Olives'], correct: 1, ref: 'Exodus 19' },
];

// ---------------------------------------------------------------------------
// DAILY CHALLENGES
// ---------------------------------------------------------------------------
export const DAILY_CHALLENGES = [
  { id: 'd1', text: 'Collect 50 coins today', type: 'coins', target: 50, reward: { coins: 120, faith: 30 } },
  { id: 'd2', text: 'Run 800 meters today', type: 'distance', target: 800, reward: { coins: 120, faith: 30 } },
  { id: 'd3', text: 'Collect 5 Bible scrolls today', type: 'scrolls', target: 5, reward: { coins: 150, faith: 40 } },
  { id: 'd4', text: 'Answer 1 Bible question correctly', type: 'quiz', target: 1, reward: { coins: 150, faith: 40 } },
];

// ---------------------------------------------------------------------------
// UPGRADES (per-character levels)
// ---------------------------------------------------------------------------
export const CHARACTER_MAX_LEVEL = 5;

// Cosmetic outfits (simplified recolors unlockable with coins).
export const OUTFITS = [
  { id: 'classic', name: 'Classic', cost: 0, tint: null },
  { id: 'royal', name: 'Royal Purple', cost: 300, tint: { robe: 0x5a2a7a, trim: 0xd8b34a } },
  { id: 'gold', name: 'Golden Thread', cost: 500, tint: { robe: 0xc9a15a, trim: 0xfff2d0 } },
  { id: 'emerald', name: 'Emerald', cost: 500, tint: { robe: 0x2a7a4a, trim: 0x9ad0a0 } },
  { id: 'scarlet', name: 'Scarlet', cost: 700, tint: { robe: 0x9a2f2f, trim: 0xf0c890 } },
];

// ---------------------------------------------------------------------------
// SETTINGS DEFAULTS
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS = {
  music: 0.7,
  sfx: 0.9,
  vibration: true,
  quality: 'high', // 'low' | 'high'
  language: 'en',
  tutorialDone: false,
};
