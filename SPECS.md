# GeoCapture: Animal Spawns — Project Specification

## 1. Overview

GeoCapture is a location-based web game inspired by Pokémon Go. Players explore their real-world surroundings while digital animals spawn on an interactive map near their GPS position. Catching animals requires physically approaching them and winning a reflex-based mini-game. All progress is stored locally in the browser with no backend required.

**Tech stack:** Vanilla HTML5, CSS3, JavaScript — no framework or build process.

---

## 2. Functional Requirements

### 2.1 Map & Geolocation
- The app must display a real-time interactive map centered on the player's GPS position using **Leaflet.js 1.9.4** with CartoDB Voyager tiles.
- The map must update continuously as the player moves.
- If geolocation is unavailable or denied, the app must display an informative error message.

### 2.2 Animal Spawning
- Animals must spawn automatically every **30 seconds** (`SPAWN_INTERVAL_MS = 30000`).
- Each spawn is placed at a random location within **~500 m** (`SPAWN_RADIUS_DEG = 0.005°`) of the player's current position.
- Each spawned animal marker disappears after **60 seconds** (`ANIMAL_LIFETIME_MS = 60000`) if not caught.
- Spawn probability must follow a weighted rarity system so Common animals appear more frequently than Mythic animals.

### 2.3 Proximity & Catch Triggering
- A catch attempt is only available when the player is within **~50 m** (`CATCH_RADIUS_DEG = 0.0005°`) of an animal.
- The app must notify the player when an animal is nearby.
- Tapping/clicking CATCH on a nearby animal triggers the mini-game.

### 2.4 Catch Mini-Game
- The mini-game presents a horizontal slider with a moving indicator.
- The player must stop the indicator inside a highlighted "sweet spot" by pressing a button.
- Sweet-spot width and indicator speed are scaled by the animal's **difficulty multiplier** (higher rarity = smaller target, faster speed).
- A successful stop counts as a catch; missing counts as a failed attempt.

### 2.5 Energy System
- Each catch attempt costs **1 energy point**.
- Energy regenerates at a rate of **1 point per 2 minutes** (`ENERGY_REGEN_MS = 120000`).
- Maximum energy starts at **10** and increases by **2 per level-up**.
- Players cannot attempt a catch with 0 energy.

### 2.6 XP & Levelling
- Successfully catching an animal awards XP based on rarity tier (see §4).
- XP required to reach level `n` = `100 × 1.5^(n−1)` (exponential scaling).
- Levelling up fully restores energy to the current maximum.

### 2.7 Catch Streak
- Consecutive successful catches increment a streak counter.
- Each streak level grants a **+10% XP bonus** on top of the base award.
- A failed catch or missed animal resets the streak to 0.

### 2.8 Collection System
- All caught animals are persisted in **localStorage**.
- A collection modal must display each caught species with its emoji/image, name, rarity, and quantity.

### 2.9 Debug Panel
- A hidden debug panel (toggled via a settings button) must allow:
  - Instant animal spawning
  - Player teleportation to arbitrary coordinates
  - Energy refill
  - Manual XP addition
- The panel is intended for indoor testing only and must not affect normal gameplay flow.

---

## 3. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Platform | Any modern browser supporting Geolocation API, localStorage, Web Audio API |
| Connectivity | CDN assets (Leaflet, Google Fonts) require internet; core gameplay works offline after first load |
| Performance | Map updates and proximity checks must not cause noticeable lag on mid-range mobile devices |
| Persistence | All game state (collection, XP, level, energy) must survive page refreshes via localStorage |
| No backend | The application runs entirely client-side; no server, database, or authentication required |

---

## 4. Animal Roster & Rarity Tiers

| Tier | XP Award | Difficulty Multiplier | Animals (30 total) |
|---|---|---|---|
| Common | 10 | 1.0 | Red Fox, Brown Bear, Rabbit, Hedgehog, Duck |
| Uncommon | 25 | 1.5 | Deer, Raccoon, Wild Boar, Flamingo, Otter |
| Rare | 50 | 2.0 | Snow Leopard, White Wolf, Peacock, Axolotl, Narwhal |
| Epic | 150 | 2.5 | Black Panther, Giant Squid, Komodo Dragon, Electric Eel, Mantis Shrimp |
| Legendary | 500 | 3.0 | White Tiger, Loch Ness Monster, Thunderbird, Coelacanth, Quetzal |
| Mythic | 2000 | 3.5 | Golden Phoenix, Crystal Unicorn, Shadow Dragon |

Each animal entry in `ANIMALS` contains: `name`, `emoji`, `imageUrl`, `rarity`, `xp`, `difficulty`, `description`.

---

## 5. Key Constants (app.js)

| Constant | Value | Description |
|---|---|---|
| `SPAWN_RADIUS_DEG` | `0.005` | Spawn area radius in degrees (~500 m) |
| `CATCH_RADIUS_DEG` | `0.0005` | Max catch distance in degrees (~50 m) |
| `SPAWN_INTERVAL_MS` | `30000` | Milliseconds between auto-spawns |
| `ANIMAL_LIFETIME_MS` | `60000` | Milliseconds before an uncaught animal flees |
| `ENERGY_REGEN_MS` | `120000` | Milliseconds per energy point regenerated |

---

## 6. File Structure

```
/
├── index.html   # App shell: map, mini-game overlay, collection modal, debug panel
├── app.js       # All game logic: spawning, catching, XP, energy, storage
├── style.css    # UI styling with glassmorphism effects and CSS animations
├── README.md    # Project overview and setup instructions
└── SPECS.md     # This file — full project specification
```

---

## 7. How to Run

1. **Direct open:** Open `index.html` in any modern browser. Geolocation prompts may be restricted on `file://` protocol in some browsers.
2. **Local server (recommended):**
   - Python: `python -m http.server 8000`
   - Node.js: `npx serve .`
   - VS Code: use the Live Server extension
3. Grant location permission when prompted.
4. Use the debug panel (⚙ button, bottom-right) to test without physical movement.
