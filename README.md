# 🐾 GeoCapture: Animal Spawns

A **Pokémon-Go-style location-based web game** where rare animals appear on a live map around your real-world position. Walk close enough to attempt a catch, win a reflex mini-game, and build your collection.

Built with **vanilla HTML5 · CSS3 · JavaScript** and **Leaflet.js** — no framework, no build step, just open and play.

---

## 🗺️ Live Map

The game uses [Leaflet.js](https://leafletjs.com/) with **CartoDB Voyager** tiles to display a high-detail street map centred on your GPS position. Your location appears as a **blue circle** that updates in real time as you move. Animals appear as circular photo markers on the map within ~500 m of you.

---

## 🚀 How to Run

### Option A — Open directly in a browser (simplest)
1. Download or clone this repo.
2. Open **`index.html`** in Chrome, Edge, or Firefox.
3. When prompted, click **Allow** for location access.
4. Animals will start spawning near you within a few seconds.

> **Note:** Some browsers block the Geolocation API on `file://` URLs.  
> If the map doesn't centre on you, use Option B.

### Option B — Local dev server (recommended)
Run any static server in the project folder:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code
Install the "Live Server" extension → right-click index.html → Open with Live Server
```

Then visit **`http://localhost:8080`** in your browser and grant location permission.

---

## 🎮 How to Play

| Step | What to do |
|------|-----------|
| **1. Explore** | Walk around in the real world. Animals spawn within ~500 m of you every 30 seconds. |
| **2. Get close** | Walk within ~50 m of an animal marker on the map. A **"Nearby!"** banner appears at the bottom of the screen showing the animal's name, rarity, and distance. |
| **3. Catch** | Tap **CATCH!** to start the reflex mini-game. Stop the moving slider inside the green sweet spot and hit **CAPTURE!**. |
| **4. Collect** | Caught animals are saved to your browser and shown in the **🐾 Collection** panel. |
| **5. Level up** | Each catch earns XP. Level up to increase your max energy by 2 (full refill on level-up). |

### Rarity tiers
| Tier | Colour | Catch difficulty | XP reward |
|------|--------|-----------------|-----------|
| Common | Grey | Very easy (wide sweet spot) | 10 |
| Uncommon | Green | Easy | 25 |
| Rare | Blue | Medium | 50 |
| Epic | Purple | Hard | 150 |
| Legendary | Gold | Very hard | 500 |
| Mythic | Red ✨ | Extremely hard (narrow sweet spot + extra RNG) | 2 000 |

### Catch streak bonus
Catch animals consecutively without missing to build a streak. Each level of streak adds **+10% XP** on top of the base reward (shown in the 🔥 badge in the header).

### Energy ⚡
- Every catch **attempt** costs 1 energy (win or lose).
- Energy refills automatically at **1 per 2 minutes**.
- Levelling up **fully refills** your energy bar.

---

## ⚙️ Admin Debug Mode (for testing indoors)

Press the **⚙️** button in the bottom-right corner to open the debug panel. This lets you test all game features without physically walking anywhere.

### Spawn Controls
| Button | What it does |
|--------|-------------|
| **Force Spawn Here** | Instantly spawns a random animal near your current position |
| **Clear Map** | Removes all active animal spawns |
| **Fast Spawn (checkbox)** | Spawns a new animal every 5 seconds instead of 30 |
| **Spawn Selected** | Spawns the specific animal chosen in the dropdown |

### Teleport
Enter any latitude/longitude and hit **Teleport** to move your map marker anywhere in the world. Useful for testing without GPS.

| Field | Example values |
|-------|---------------|
| Lat | `51.5074` (London) |
| Lng | `-0.1278` (London) |

### Player Cheats
| Button | What it does |
|--------|-------------|
| **Refill Energy** | Instantly restores energy to max |
| **+ XP** | Adds the number of XP you type into the box |
| **Reset Save** | Wipes all caught animals and resets level (requires confirmation) |

### Info panel
Shows your **current coordinates** and how many **active spawns** are on the map right now.

---

## 🐾 Animal Roster (28 species)

| Emoji | Name | Rarity |
|-------|------|--------|
| 🦊 | Red Fox | Common |
| 🐻 | Brown Bear | Common |
| 🐇 | Rabbit | Common |
| 🦔 | Hedgehog | Common |
| 🦆 | Duck | Common |
| 🦌 | Deer | Uncommon |
| 🦝 | Raccoon | Uncommon |
| 🐗 | Wild Boar | Uncommon |
| 🦩 | Flamingo | Uncommon |
| 🦦 | Otter | Uncommon |
| 🐆 | Snow Leopard | Rare |
| 🐺 | White Wolf | Rare |
| 🦚 | Peacock | Rare |
| 🦎 | Axolotl | Rare |
| 🦄 | Narwhal | Rare |
| 🐈‍⬛ | Black Panther | Epic |
| 🦑 | Giant Squid | Epic |
| 🦕 | Komodo Dragon | Epic |
| ⚡ | Electric Eel | Epic |
| 🦐 | Mantis Shrimp | Epic |
| 🐅 | White Tiger | Legendary |
| 🐉 | Loch Ness Monster | Legendary |
| 🦅 | Thunderbird | Legendary |
| 🐟 | Coelacanth | Legendary |
| 🦜 | Quetzal | Legendary |
| 🔥 | Golden Phoenix | Mythic |
| 🦄 | Crystal Unicorn | Mythic |
| 🐲 | Shadow Dragon | Mythic |

---

## 🏗️ Project Structure

```
geocapture/
├── index.html   — App shell: map, mini-game overlay, debug panel, modals
├── app.js       — All game logic: spawning, catching, XP, debug, audio
├── style.css    — Full UI styles: glassmorphism, animations, rarity colours
└── README.md    — This file
```

---

## 🛠️ Technology Stack

| Tech | Purpose |
|------|---------|
| **HTML5 Geolocation API** | Real-time GPS tracking |
| **Leaflet.js 1.9.4** | Interactive map rendering |
| **CartoDB Voyager tiles** | High-quality street map basemap |
| **Web Audio API** | Sound feedback on catch/miss/level-up |
| **localStorage** | Persist caught collection between sessions |
| **CSS animations** | Float, pulse, shake, mythic glow effects |
| **requestAnimationFrame** | Smooth reflex mini-game slider |

---

## 🔧 Customisation

All key gameplay values are constants at the top of `app.js` — easy to tweak:

```js
const SPAWN_RADIUS_DEG  = 0.005;    // How far from player animals spawn (~500 m)
const CATCH_RADIUS_DEG  = 0.0005;   // How close you must be to catch (~50 m)
const SPAWN_INTERVAL_MS = 30_000;   // New spawn every 30 seconds
const ANIMAL_LIFETIME_MS = 60_000;  // Animal flees after 60 seconds
const ENERGY_REGEN_MS   = 120_000;  // 1 energy refills every 2 minutes
```

To add a new animal, append an entry to the `ANIMALS` array in `app.js`:

```js
{ name: 'Pangolin', emoji: '🦎', rarity: 'Rare', xp: 50, difficulty: 0.55,
  image: 'https://loremflickr.com/120/120/pangolin',
  description: 'Covered in scales. The most trafficked mammal on earth.' },
```

---

## 📄 Licence

Open source — free to use and modify for educational purposes.
