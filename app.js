/**
 * GeoCapture: Animal Spawns
 * ─────────────────────────
 * A Pokémon-Go-style web game built with Leaflet.js.
 *
 * How it works:
 *  1. The browser's Geolocation API tracks the player's real-world position.
 *  2. Animals spawn randomly on the map within SPAWN_RADIUS_DEG of the player.
 *  3. When the player walks within CATCH_RADIUS_DEG (~50 m) of a spawned animal
 *     a notification appears offering a catch attempt.
 *  4. Catching requires a reflex mini-game: stop a moving slider inside the
 *     "sweet spot". Rarer animals have a narrower sweet spot.
 *  5. Successful catches grant XP and are saved to localStorage.
 *  6. Energy (consumed per attempt) regenerates 1 unit every 2 minutes.
 *  7. An admin debug panel allows offline / indoor testing without walking.
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Degrees radius within which animals are spawned around the player (~500 m). */
const SPAWN_RADIUS_DEG = 0.005;

/**
 * Degrees radius within which the player can attempt a catch (~50 m).
 * 0.0005° latitude ≈ 55 m; longitude varies by latitude but is close enough.
 */
const CATCH_RADIUS_DEG = 0.0005;

/** How often a new animal may spawn (milliseconds). */
const SPAWN_INTERVAL_MS = 30_000;

/** How long an animal stays on the map before fleeing (milliseconds). */
const ANIMAL_LIFETIME_MS = 60_000;

/** Energy regenerates 1 unit per this many milliseconds (2 minutes). */
const ENERGY_REGEN_MS = 120_000;

/** XP required to reach the next level: 100 × 1.5^(level-1). */
const xpForLevel = (level) => Math.floor(100 * Math.pow(1.5, level - 1));

// ─── Animal Database ──────────────────────────────────────────────────────────

/**
 * Full roster of catchable animals.
 *
 * Fields:
 *   name        – display name
 *   emoji       – fallback icon if image fails to load
 *   image       – real photo URL (loremflickr.com — free, no API key needed)
 *   rarity      – one of: Common | Uncommon | Rare | Epic | Legendary | Mythic
 *   xp          – experience awarded on successful catch
 *   difficulty  – sweet-spot width multiplier (1 = full width, 0.2 = very narrow)
 *   description – flavour text shown in the collection
 */
const ANIMALS = [
    // ── Common ────────────────────────────────────────────────────────────────
    { name: 'Red Fox',        emoji: '🦊', image: 'https://loremflickr.com/120/120/red,fox',         rarity: 'Common',    xp: 10,   difficulty: 1.0,  description: 'A cunning urban fox. Often seen raiding bins at night.' },
    { name: 'Brown Bear',     emoji: '🐻', image: 'https://loremflickr.com/120/120/brown,bear',      rarity: 'Common',    xp: 10,   difficulty: 1.0,  description: 'A large omnivore. Surprisingly fast for its size.' },
    { name: 'Rabbit',         emoji: '🐇', image: 'https://loremflickr.com/120/120/rabbit',          rarity: 'Common',    xp: 10,   difficulty: 1.0,  description: 'Twitchy and fast. Loves clover and garden vegetables.' },
    { name: 'Hedgehog',       emoji: '🦔', image: 'https://loremflickr.com/120/120/hedgehog',        rarity: 'Common',    xp: 10,   difficulty: 1.0,  description: 'A prickly night-time wanderer. Rolls into a ball when scared.' },
    { name: 'Duck',           emoji: '🦆', image: 'https://loremflickr.com/120/120/duck,bird',       rarity: 'Common',    xp: 10,   difficulty: 1.0,  description: 'Found near ponds. Quacks loudly when disturbed.' },

    // ── Uncommon ──────────────────────────────────────────────────────────────
    { name: 'Deer',           emoji: '🦌', image: 'https://loremflickr.com/120/120/deer,wildlife',   rarity: 'Uncommon',  xp: 25,   difficulty: 0.75, description: 'A graceful creature. Freeze if you spot one — they spook easily.' },
    { name: 'Raccoon',        emoji: '🦝', image: 'https://loremflickr.com/120/120/raccoon',         rarity: 'Uncommon',  xp: 25,   difficulty: 0.75, description: 'A masked bandit. Highly intelligent and surprisingly dexterous.' },
    { name: 'Wild Boar',      emoji: '🐗', image: 'https://loremflickr.com/120/120/boar,pig',        rarity: 'Uncommon',  xp: 25,   difficulty: 0.75, description: 'Stocky and stubborn. Better approached from downwind.' },
    { name: 'Flamingo',       emoji: '🦩', image: 'https://loremflickr.com/120/120/flamingo',        rarity: 'Uncommon',  xp: 25,   difficulty: 0.75, description: 'Elegant pink wader. Gets its colour from the shrimp it eats.' },
    { name: 'Otter',          emoji: '🦦', image: 'https://loremflickr.com/120/120/otter',           rarity: 'Uncommon',  xp: 25,   difficulty: 0.75, description: 'Playful river-dweller. Holds hands with its partner while sleeping.' },

    // ── Rare ──────────────────────────────────────────────────────────────────
    { name: 'Snow Leopard',   emoji: '🐆', image: 'https://loremflickr.com/120/120/snow,leopard',    rarity: 'Rare',      xp: 50,   difficulty: 0.55, description: 'A phantom of the mountains. Rarely spotted, even by experts.' },
    { name: 'White Wolf',     emoji: '🐺', image: 'https://loremflickr.com/120/120/white,wolf',      rarity: 'Rare',      xp: 50,   difficulty: 0.55, description: 'Leads the pack through blizzards. Its howl can be heard for miles.' },
    { name: 'Peacock',        emoji: '🦚', image: 'https://loremflickr.com/120/120/peacock',         rarity: 'Rare',      xp: 50,   difficulty: 0.55, description: 'Iridescent tail feathers with hundreds of "eyes". A true showstopper.' },
    { name: 'Axolotl',        emoji: '🦎', image: 'https://loremflickr.com/120/120/axolotl',         rarity: 'Rare',      xp: 50,   difficulty: 0.55, description: 'The smiling salamander. Can regenerate lost limbs in weeks.' },
    { name: 'Narwhal',        emoji: '🦄', image: 'https://loremflickr.com/120/120/narwhal',         rarity: 'Rare',      xp: 50,   difficulty: 0.55, description: 'The unicorn of the sea. Its tusk is actually a giant tooth.' },

    // ── Epic ──────────────────────────────────────────────────────────────────
    { name: 'Black Panther',  emoji: '🐈‍⬛', image: 'https://loremflickr.com/120/120/black,panther',   rarity: 'Epic',      xp: 150,  difficulty: 0.4,  description: 'A melanistic leopard. Almost invisible in dense jungle canopy.' },
    { name: 'Giant Squid',    emoji: '🦑', image: 'https://loremflickr.com/120/120/giant,squid',     rarity: 'Epic',      xp: 150,  difficulty: 0.4,  description: 'A deep-sea titan. Its eyes are the size of footballs.' },
    { name: 'Komodo Dragon',  emoji: '🦕', image: 'https://loremflickr.com/120/120/komodo,dragon',   rarity: 'Epic',      xp: 150,  difficulty: 0.4,  description: 'Ancient reptile with venomous saliva. Top predator of its island.' },
    { name: 'Electric Eel',   emoji: '⚡',  image: 'https://loremflickr.com/120/120/electric,eel',    rarity: 'Epic',      xp: 150,  difficulty: 0.4,  description: 'Can discharge up to 600 volts. Approach with extreme caution!' },
    { name: 'Mantis Shrimp',  emoji: '🦐', image: 'https://loremflickr.com/120/120/mantis,shrimp',   rarity: 'Epic',      xp: 150,  difficulty: 0.4,  description: 'Punches with the force of a bullet. Sees 16 types of colour.' },

    // ── Legendary ─────────────────────────────────────────────────────────────
    { name: 'White Tiger',       emoji: '🐅', image: 'https://loremflickr.com/120/120/white,tiger',   rarity: 'Legendary', xp: 500,  difficulty: 0.3,  description: 'A majestic colour morph. Fewer than 100 exist worldwide.' },
    { name: 'Loch Ness Monster', emoji: '🐉', image: 'https://loremflickr.com/120/120/loch,ness',     rarity: 'Legendary', xp: 500,  difficulty: 0.3,  description: 'Lurks in the Scottish highlands. Extremely camera-shy.' },
    { name: 'Thunderbird',       emoji: '🦅', image: 'https://loremflickr.com/120/120/eagle,storm',   rarity: 'Legendary', xp: 500,  difficulty: 0.3,  description: 'A storm-spirit of indigenous legend. Its wingbeats summon thunder.' },
    { name: 'Coelacanth',        emoji: '🐟', image: 'https://loremflickr.com/120/120/deep,sea,fish', rarity: 'Legendary', xp: 500,  difficulty: 0.3,  description: 'A "living fossil" unchanged for 400 million years. Thought extinct.' },
    { name: 'Quetzal',           emoji: '🦜', image: 'https://loremflickr.com/120/120/quetzal,bird',  rarity: 'Legendary', xp: 500,  difficulty: 0.3,  description: 'Sacred bird of the Maya. Its tail feathers can reach 1 metre long.' },

    // ── Mythic ────────────────────────────────────────────────────────────────
    { name: 'Golden Phoenix',  emoji: '🔥', image: 'https://loremflickr.com/120/120/phoenix,fire',    rarity: 'Mythic',    xp: 2000, difficulty: 0.2,  description: 'Born from flame and reborn from ash. The rarest creature in existence.' },
    { name: 'Crystal Unicorn', emoji: '🦄', image: 'https://loremflickr.com/120/120/unicorn,fantasy', rarity: 'Mythic',    xp: 2000, difficulty: 0.2,  description: 'Its horn heals any wound. Vanishes if approached with ill intent.' },
    { name: 'Shadow Dragon',   emoji: '🐲', image: 'https://loremflickr.com/120/120/dragon,fantasy',  rarity: 'Mythic',    xp: 2000, difficulty: 0.2,  description: 'Older than recorded history. Lives between worlds.' },
];

/** Weighted spawn pool — common animals appear more often than rare ones. */
const RARITY_WEIGHT = {
    Common:    60,
    Uncommon:  25,
    Rare:      10,
    Epic:       3,
    Legendary:  1.5,
    Mythic:     0.5,
};

// ─── Game State ───────────────────────────────────────────────────────────────

const state = {
    /** Player's current latitude/longitude (updated by Geolocation API). */
    position: { lat: 37.7749, lng: -122.4194 }, // default: San Francisco

    /** Array of active animal spawns: { animal, lat, lng, marker, timerId, id } */
    spawns: [],

    /** Next unique spawn ID. */
    nextSpawnId: 0,

    /** Animals the player has caught. Loaded from / saved to localStorage. */
    caught: JSON.parse(localStorage.getItem('geocapture_caught') || '[]'),

    /** Current energy level. */
    energy: 10,

    /** Maximum energy (increases with level). */
    maxEnergy: 10,

    /** Total accumulated experience points. */
    xp: 0,

    /** Current player level. */
    level: 1,

    /** The animal currently being offered for catch (set by proximity check). */
    pendingCatch: null,

    /** The spawn object for the animal being offered. */
    pendingSpawn: null,

    /** Consecutive successful catches without missing. */
    catchStreak: 0,

    /** Handle for the mini-game slider animation frame. */
    sliderRAF: null,

    /** Whether fast-spawn debug mode is active. */
    fastSpawn: false,

    /** Handle for the normal spawn interval. */
    spawnInterval: null,

    /** Handle for fast-spawn debug interval. */
    fastSpawnInterval: null,
};

// ─── Map Setup ────────────────────────────────────────────────────────────────

/** Leaflet map instance. */
const map = L.map('map', { zoomControl: true }).setView(
    [state.position.lat, state.position.lng], 16
);

// CartoDB Voyager tiles — clean, readable basemap with good landmark detail.
L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
    }
).addTo(map);

/**
 * Blue circle marker showing the player's current position.
 * Updated whenever the Geolocation API fires a new position.
 */
const playerMarker = L.circleMarker(
    [state.position.lat, state.position.lng],
    { radius: 10, color: '#6366f1', fillColor: '#818cf8', fillOpacity: 0.9, weight: 3 }
).addTo(map);

// ─── Geolocation ──────────────────────────────────────────────────────────────

if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 10_000,
    });
} else {
    showToast('⚠️ Geolocation is not supported by this browser. Using default location.', 'warn');
}

/**
 * Called whenever the browser has a new GPS fix.
 * Updates player marker, checks proximity to all active spawns.
 * @param {GeolocationPosition} pos
 */
function onPositionUpdate(pos) {
    const { latitude: lat, longitude: lng } = pos.coords;
    state.position = { lat, lng };
    playerMarker.setLatLng([lat, lng]);
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
    updateDebugInfo();
    checkProximity();
}

/**
 * Called when geolocation fails.
 * @param {GeolocationPositionError} err
 */
function onPositionError(err) {
    const messages = {
        1: 'Location permission denied. Enable it in your browser settings.',
        2: 'Location unavailable. Check your device\'s GPS/network.',
        3: 'Location request timed out. Retrying…',
    };
    showToast(`⚠️ ${messages[err.code] ?? 'Unknown location error.'}`, 'warn');
}

// ─── Animal Spawning ──────────────────────────────────────────────────────────

/**
 * Pick a random animal from the database, weighted by rarity.
 * @returns {object} Animal definition from ANIMALS array.
 */
function pickRandomAnimal() {
    const totalWeight = ANIMALS.reduce((sum, a) => sum + RARITY_WEIGHT[a.rarity], 0);
    let rand = Math.random() * totalWeight;
    for (const animal of ANIMALS) {
        rand -= RARITY_WEIGHT[animal.rarity];
        if (rand <= 0) return animal;
    }
    return ANIMALS[0];
}

/**
 * Spawn one animal at a random position near the player.
 * The animal will flee after ANIMAL_LIFETIME_MS milliseconds.
 * @param {object|null} forcedAnimal - Pass a specific animal object to override random selection (debug).
 */
function spawnAnimal(forcedAnimal = null) {
    const animal = forcedAnimal ?? pickRandomAnimal();

    // Random offset within SPAWN_RADIUS_DEG in each axis.
    const latOffset = (Math.random() - 0.5) * 2 * SPAWN_RADIUS_DEG;
    const lngOffset = (Math.random() - 0.5) * 2 * SPAWN_RADIUS_DEG;
    const lat = state.position.lat + latOffset;
    const lng = state.position.lng + lngOffset;

    // Build the Leaflet divIcon — photo inside a circle, emoji as fallback.
    const icon = L.divIcon({
        html: `<div class="animal-marker" data-rarity="${animal.rarity}">
                 <img src="${animal.image}" alt="${animal.name}"
                      onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                 <span class="marker-emoji-fallback" style="display:none">${animal.emoji}</span>
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        className: '',
    });

    const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${animal.emoji} ${animal.name}</strong><br><em>${animal.rarity}</em><br>${animal.description}`);

    const id = state.nextSpawnId++;

    // Auto-remove the animal after its lifetime expires.
    const timerId = setTimeout(() => removeSpawn(id), ANIMAL_LIFETIME_MS);

    state.spawns.push({ id, animal, lat, lng, marker, timerId });
    updateDebugInfo();
}

/**
 * Remove a spawn from the map and state by its ID.
 * @param {number} id
 */
function removeSpawn(id) {
    const idx = state.spawns.findIndex(s => s.id === id);
    if (idx === -1) return;
    const [spawn] = state.spawns.splice(idx, 1);
    clearTimeout(spawn.timerId);
    map.removeLayer(spawn.marker);
    updateDebugInfo();

    // If this was the animal being offered to the player, dismiss the notification.
    if (state.pendingSpawn?.id === id) {
        hideCatchNotification();
    }
}

// Start the regular spawn interval.
state.spawnInterval = setInterval(spawnAnimal, SPAWN_INTERVAL_MS);

// Spawn one animal immediately so the player has something to see right away.
setTimeout(spawnAnimal, 1_000);

// ─── Proximity Check ──────────────────────────────────────────────────────────

/**
 * Check all active spawns to see if the player is close enough to attempt
 * a catch.  Only one animal is offered at a time (the closest).
 */
function checkProximity() {
    // If a catch is already being offered, don't interrupt.
    if (state.pendingCatch) return;

    let closest = null;
    let closestDist = Infinity;

    for (const spawn of state.spawns) {
        const dist = distance(state.position.lat, state.position.lng, spawn.lat, spawn.lng);
        if (dist < CATCH_RADIUS_DEG && dist < closestDist) {
            closest = spawn;
            closestDist = dist;
        }
    }

    if (closest) {
        const distMetres = Math.round(closestDist * 111_000); // 1° lat ≈ 111 km
        showCatchNotification(closest, distMetres);
    }
}

/**
 * Cheap flat-earth distance in degrees (good enough for <1 km ranges).
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Approximate distance in degrees.
 */
function distance(lat1, lng1, lat2, lng2) {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
}

// ─── Catch Notification ───────────────────────────────────────────────────────

/**
 * Show the "nearby animal" notification banner.
 * @param {object} spawn - The spawn object.
 * @param {number} distMetres - Approximate distance in metres.
 */
function showCatchNotification(spawn, distMetres) {
    state.pendingCatch = spawn.animal;
    state.pendingSpawn = spawn;

    document.getElementById('notif-title').textContent = `${spawn.animal.emoji} Nearby!`;
    document.getElementById('notif-name').textContent =
        `${spawn.animal.name} [${spawn.animal.rarity}]`;
    document.getElementById('notif-distance').textContent = `~${distMetres} m away`;

    document.getElementById('catch-notification').classList.remove('hidden');
}

function hideCatchNotification() {
    state.pendingCatch = null;
    state.pendingSpawn = null;
    document.getElementById('catch-notification').classList.add('hidden');
}

// ─── Mini-Game ────────────────────────────────────────────────────────────────

/** Speed of the slider in pixels per second. */
let sliderSpeed = 200;

/** Current pixel position of the slider. */
let sliderPos = 0;

/** Direction: +1 = right, -1 = left. */
let sliderDir = 1;

/** Timestamp of the last animation frame. */
let lastFrameTime = null;

/**
 * Start the reflex mini-game for the current pending animal.
 * Positions the sweet spot based on rarity difficulty and starts the slider.
 */
function startMiniGame() {
    if (!state.pendingCatch) return;
    if (state.energy <= 0) {
        showToast('⚡ No energy! Wait for it to recharge.', 'warn');
        return;
    }

    const animal = state.pendingCatch;
    const meter = document.querySelector('.reflex-meter');
    const meterWidth = meter.offsetWidth;

    // Sweet spot width is proportional to difficulty (wider = easier).
    const spotWidth = Math.max(20, Math.floor(meterWidth * animal.difficulty * 0.35));
    const spotLeft  = Math.floor(Math.random() * (meterWidth - spotWidth));

    const spotEl = document.getElementById('sweet-spot');
    spotEl.style.width = `${spotWidth}px`;
    spotEl.style.left  = `${spotLeft}px`;

    // Chance label: difficulty × 100, capped at 95%.
    const chancePct = Math.min(95, Math.round(animal.difficulty * 100));
    document.getElementById('game-chance').textContent = chancePct;
    document.getElementById('game-animal-name').textContent = `${animal.emoji} ${animal.name}`;
    document.getElementById('game-rarity-badge').textContent = animal.rarity;
    document.getElementById('game-rarity-badge').dataset.rarity = animal.rarity;

    // Reset slider to left edge.
    sliderPos = 0;
    sliderDir = 1;
    lastFrameTime = null;
    document.getElementById('slider').style.left = '0px';

    document.getElementById('catch-game').classList.remove('hidden');
    hideCatchNotification();

    // Faster slider for harder animals.
    sliderSpeed = 150 + (1 - animal.difficulty) * 350;

    state.sliderRAF = requestAnimationFrame(animateSlider);
}

/**
 * Animate the slider back and forth across the reflex meter.
 * @param {DOMHighResTimeStamp} timestamp
 */
function animateSlider(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = (timestamp - lastFrameTime) / 1000; // seconds
    lastFrameTime = timestamp;

    const meter = document.querySelector('.reflex-meter');
    const sliderEl = document.getElementById('slider');
    const maxPos = meter.offsetWidth - sliderEl.offsetWidth;

    sliderPos += sliderDir * sliderSpeed * delta;

    if (sliderPos >= maxPos) { sliderPos = maxPos; sliderDir = -1; }
    if (sliderPos <= 0)      { sliderPos = 0;      sliderDir =  1; }

    sliderEl.style.left = `${sliderPos}px`;
    state.sliderRAF = requestAnimationFrame(animateSlider);
}

/** Stop the slider animation. */
function stopSlider() {
    if (state.sliderRAF) {
        cancelAnimationFrame(state.sliderRAF);
        state.sliderRAF = null;
    }
}

/**
 * Evaluate whether the slider is inside the sweet spot when the player taps.
 * Deducts energy, applies catch result, updates UI.
 */
function attemptCatch() {
    stopSlider();
    consumeEnergy(1);

    const sliderEl  = document.getElementById('slider');
    const spotEl    = document.getElementById('sweet-spot');
    const sliderLeft = parseFloat(sliderEl.style.left);
    const spotLeft   = parseFloat(spotEl.style.left);
    const spotRight  = spotLeft + spotEl.offsetWidth;

    const inZone = sliderLeft >= spotLeft && sliderLeft <= spotRight;

    // Even in the zone, rarity may cause a miss (extra RNG layer).
    const caught = inZone && Math.random() < state.pendingCatch.difficulty;

    document.getElementById('catch-game').classList.add('hidden');

    if (caught) {
        onCatchSuccess();
    } else {
        onCatchFail(inZone);
    }
}

/**
 * Handle a successful catch: record it, award XP, update streak.
 */
function onCatchSuccess() {
    const animal = state.pendingCatch;
    const spawn  = state.pendingSpawn;

    state.catchStreak++;
    const streakBonus = state.catchStreak > 1 ? Math.floor(animal.xp * 0.1 * (state.catchStreak - 1)) : 0;
    const totalXP = animal.xp + streakBonus;

    state.caught.push({
        ...animal,
        caughtAt: new Date().toISOString(),
        id: Date.now(),
    });
    saveCaught();

    addXP(totalXP);
    removeSpawn(spawn.id);
    clearPending();
    updateCollectionCount();
    updateStreakBadge();

    const msg = streakBonus > 0
        ? `✅ Caught ${animal.emoji} ${animal.name}! +${totalXP} XP (🔥 streak bonus +${streakBonus})`
        : `✅ Caught ${animal.emoji} ${animal.name}! +${totalXP} XP`;
    showToast(msg, 'success');

    playTone(880, 0.15, 'sine');
}

/**
 * Handle a missed catch.
 * @param {boolean} inZone - Whether the slider was at least in the zone.
 */
function onCatchFail(inZone) {
    state.catchStreak = 0;
    updateStreakBadge();

    const animal = state.pendingCatch;
    const spawn  = state.pendingSpawn;

    // Shake the game container to give visual feedback.
    const container = document.querySelector('.game-container');
    container?.classList.add('shake');
    setTimeout(() => container?.classList.remove('shake'), 500);

    const msg = inZone
        ? `😬 So close! ${animal.emoji} ${animal.name} resisted!`
        : `❌ Missed! ${animal.emoji} ${animal.name} got away.`;
    showToast(msg, 'error');

    removeSpawn(spawn.id);
    clearPending();

    playTone(220, 0.15, 'sawtooth');
}

/** Clear the pending catch state. */
function clearPending() {
    state.pendingCatch = null;
    state.pendingSpawn = null;
}

// ─── Energy ───────────────────────────────────────────────────────────────────

/**
 * Subtract energy; block if empty.
 * @param {number} amount
 */
function consumeEnergy(amount) {
    state.energy = Math.max(0, state.energy - amount);
    updateEnergyUI();
}

/** Regenerate 1 energy every ENERGY_REGEN_MS (up to max). */
setInterval(() => {
    if (state.energy < state.maxEnergy) {
        state.energy = Math.min(state.maxEnergy, state.energy + 1);
        updateEnergyUI();
    }
}, ENERGY_REGEN_MS);

function updateEnergyUI() {
    document.getElementById('energy-count').textContent = state.energy;
    document.getElementById('energy-max').textContent   = state.maxEnergy;
    const pct = (state.energy / state.maxEnergy) * 100;
    document.getElementById('energy-fill').style.width = `${pct}%`;
}

// ─── XP & Levelling ───────────────────────────────────────────────────────────

/**
 * Award XP and check for level-up.
 * @param {number} amount
 */
function addXP(amount) {
    state.xp += amount;
    checkLevelUp();
    updateXPBar();
}

function checkLevelUp() {
    const needed = xpForLevel(state.level);
    if (state.xp >= needed) {
        state.xp -= needed;
        state.level++;
        state.maxEnergy += 2;
        state.energy = state.maxEnergy; // full refill on level-up
        updateEnergyUI();
        showToast(`🎉 Level Up! You are now Level ${state.level}! Max energy +2.`, 'success');
        updateLevelDisplay();
        playTone(1047, 0.3, 'sine');
    }
}

function updateXPBar() {
    const needed = xpForLevel(state.level);
    const pct = Math.min(100, (state.xp / needed) * 100);
    document.getElementById('xp-bar').style.width = `${pct}%`;
    document.getElementById('level-display').textContent = `LVL ${state.level}`;
}

function updateLevelDisplay() {
    document.getElementById('level-display').textContent = `LVL ${state.level}`;
}

// ─── Catch Streak Badge ───────────────────────────────────────────────────────

function updateStreakBadge() {
    const badge = document.getElementById('streak-badge');
    const count = document.getElementById('streak-count');
    if (state.catchStreak > 1) {
        count.textContent = state.catchStreak;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ─── Collection ───────────────────────────────────────────────────────────────

function saveCaught() {
    localStorage.setItem('geocapture_caught', JSON.stringify(state.caught));
}

function updateCollectionCount() {
    document.getElementById('count').textContent = state.caught.length;
}

/** Render the collection modal grid from state.caught. */
function renderCollection() {
    const list = document.getElementById('captured-list');
    list.innerHTML = '';

    if (state.caught.length === 0) {
        list.innerHTML = '<p class="empty-collection">No creatures caught yet. Get exploring!</p>';
        return;
    }

    // Sort by rarity then name.
    const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    const sorted = [...state.caught].sort((a, b) => {
        const ri = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
        return ri !== 0 ? ri : a.name.localeCompare(b.name);
    });

    for (const creature of sorted) {
        const card = document.createElement('div');
        card.className = `creature-card rarity-${creature.rarity.toLowerCase()}`;
        card.innerHTML = `
            <div class="creature-photo-wrap">
                <img class="creature-photo" src="${creature.image}" alt="${creature.name}"
                     onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                <div class="creature-emoji-fallback" style="display:none">${creature.emoji}</div>
            </div>
            <div class="creature-name">${creature.name}</div>
            <div class="creature-rarity">${creature.rarity}</div>
            <div class="creature-desc">${creature.description}</div>
            <button class="release-btn" data-id="${creature.id}" title="Release this creature">Release</button>
        `;
        list.appendChild(card);
    }

    // Wire up release buttons.
    list.querySelectorAll('.release-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            state.caught = state.caught.filter(c => c.id !== id);
            saveCaught();
            updateCollectionCount();
            renderCollection();
            showToast('👋 Creature released.', 'info');
        });
    });

    // Update summary stats.
    document.getElementById('collection-total').textContent  = `${state.caught.length} caught`;
    const unique = new Set(state.caught.map(c => c.name)).size;
    document.getElementById('collection-unique').textContent = `${unique} unique`;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

/**
 * Display a brief toast message at the bottom of the screen.
 * @param {string} message
 * @param {'success'|'error'|'warn'|'info'} type
 */
function showToast(message, type = 'info') {
    const existing = document.getElementById('toast');
    existing?.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3_500);
}

// ─── Audio Feedback ───────────────────────────────────────────────────────────

/** Shared AudioContext; created lazily on first user interaction. */
let audioCtx = null;

/**
 * Play a simple synthesised tone for catch feedback.
 * @param {number} frequency - Hz
 * @param {number} duration  - seconds
 * @param {OscillatorType} type
 */
function playTone(frequency, duration, type = 'sine') {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (_) {
        // Audio is non-critical; silently swallow errors.
    }
}

// ─── Debug / Admin Panel ──────────────────────────────────────────────────────

/** Populate the "spawn specific" dropdown with all animal names. */
function populateSpawnSelect() {
    const sel = document.getElementById('spawn-select');
    ANIMALS.forEach((a, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${a.emoji} ${a.name} [${a.rarity}]`;
        sel.appendChild(opt);
    });
}
populateSpawnSelect();

/** Update the debug info panel with current position and spawn count. */
function updateDebugInfo() {
    const { lat, lng } = state.position;
    document.getElementById('debug-coords').textContent =
        `Position: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('debug-spawns').textContent =
        `Active spawns: ${state.spawns.length}`;
}

// ── Debug button wiring ───────────────────────────────────────────────────────

document.getElementById('debug-toggle').addEventListener('click', () => {
    document.getElementById('debug-panel').classList.toggle('hidden');
});

document.getElementById('spawn-here').addEventListener('click', () => {
    spawnAnimal();
    showToast('🐾 Forced a random spawn near you.', 'info');
});

document.getElementById('clear-all').addEventListener('click', () => {
    [...state.spawns].forEach(s => removeSpawn(s.id));
    hideCatchNotification();
    showToast('🗑️ All spawns cleared.', 'info');
});

document.getElementById('fast-spawn-toggle').addEventListener('change', (e) => {
    if (e.target.checked) {
        state.fastSpawnInterval = setInterval(spawnAnimal, 5_000);
        showToast('⚡ Fast spawn enabled (every 5 s).', 'info');
    } else {
        clearInterval(state.fastSpawnInterval);
        showToast('Fast spawn disabled.', 'info');
    }
});

document.getElementById('spawn-specific').addEventListener('click', () => {
    const idx = Number(document.getElementById('spawn-select').value);
    spawnAnimal(ANIMALS[idx]);
    showToast(`🐾 Spawned ${ANIMALS[idx].emoji} ${ANIMALS[idx].name}.`, 'info');
});

document.getElementById('teleport-btn').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('tp-lat').value);
    const lng = parseFloat(document.getElementById('tp-lng').value);
    if (isNaN(lat) || isNaN(lng)) {
        showToast('⚠️ Enter valid lat/lng values.', 'warn');
        return;
    }
    state.position = { lat, lng };
    playerMarker.setLatLng([lat, lng]);
    map.setView([lat, lng], 16);
    updateDebugInfo();
    showToast(`📍 Teleported to ${lat.toFixed(4)}, ${lng.toFixed(4)}.`, 'info');
});

document.getElementById('refill-energy').addEventListener('click', () => {
    state.energy = state.maxEnergy;
    updateEnergyUI();
    showToast('⚡ Energy refilled!', 'info');
});

document.getElementById('add-xp-btn').addEventListener('click', () => {
    const amt = parseInt(document.getElementById('add-xp-amt').value, 10);
    if (isNaN(amt) || amt < 1) return;
    addXP(amt);
    showToast(`✨ Added ${amt} XP.`, 'info');
});

document.getElementById('reset-save').addEventListener('click', () => {
    if (!confirm('Reset all saved data? This cannot be undone.')) return;
    localStorage.removeItem('geocapture_caught');
    state.caught = [];
    state.xp = 0;
    state.level = 1;
    state.maxEnergy = 10;
    state.energy = 10;
    state.catchStreak = 0;
    updateEnergyUI();
    updateXPBar();
    updateCollectionCount();
    updateStreakBadge();
    showToast('🔄 Save data reset.', 'warn');
});

// ── Core UI wiring ────────────────────────────────────────────────────────────

document.getElementById('catch-btn').addEventListener('click', () => {
    hideCatchNotification();
    startMiniGame();
});

document.getElementById('mini-game-btn').addEventListener('click', attemptCatch);

document.getElementById('flee-btn').addEventListener('click', () => {
    stopSlider();
    document.getElementById('catch-game').classList.add('hidden');
    state.catchStreak = 0;
    updateStreakBadge();
    clearPending();
    showToast('🏃 You fled!', 'info');
});

document.getElementById('collection-toggle').addEventListener('click', () => {
    renderCollection();
    document.getElementById('collection-modal').classList.remove('hidden');
});

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('collection-modal').classList.add('hidden');
});

document.getElementById('collection-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
});

// ─── Initial UI State ─────────────────────────────────────────────────────────

updateCollectionCount();
updateEnergyUI();
updateXPBar();
updateDebugInfo();

// Kick off the regular proximity check every 5 seconds.
setInterval(checkProximity, 5_000);
