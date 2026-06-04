# poke-calculator
EV Counter Web App — README

Overview

This is a browser-based Pokémon Effort Value (EV) training calculator built using HTML, CSS, and JavaScript. Runtime Pokémon data is served by a local Node API backed by JSON files in `db/pokeapi`; the database can be generated from PokéAPI with the included seed script. The app helps simulate EV training by allowing users to select a Pokémon, apply training modifiers, and track EV progress toward target values.

---

Local Development

1. Start the local app/API server

   ```bash
   npm start
   ```

2. Open the app

   ```text
   http://localhost:3000
   ```

3. Build or refresh the local Pokémon database from PokéAPI

   ```bash
   npm run seed:db
   ```

The repository includes a tiny starter database containing Bulbasaur in `db/sample-pokeapi` so the server can boot immediately. Run `npm run seed:db` to populate the full local dataset in `db/pokeapi`.

`db/pokeapi` is ignored by Git because it is generated data. The server uses `db/pokeapi` when it exists and falls back to `db/sample-pokeapi` otherwise.

---

Local API

The frontend now calls the local API at `/api/v2` instead of calling PokéAPI directly.

Implemented compatibility routes:

* `GET /api/v2/generation/`
* `GET /api/v2/generation/:nameOrId`
* `GET /api/v2/pokemon-species/:name`
* `GET /api/v2/pokemon/:name`

Local insertion route:

* `POST /api/admin/pokemon`

Expected JSON shape:

```json
{
  "generationName": "generation-i",
  "species": {
    "name": "custom-species",
    "generation": { "name": "generation-i", "url": "/api/v2/generation/generation-i" },
    "varieties": [
      {
        "is_default": true,
        "pokemon": { "name": "custom-pokemon", "url": "/api/v2/pokemon/custom-pokemon" }
      }
    ]
  },
  "pokemon": {
    "name": "custom-pokemon",
    "species": { "name": "custom-species", "url": "/api/v2/pokemon-species/custom-species" },
    "sprites": { "front_default": "" },
    "stats": [
      { "effort": 0, "stat": { "name": "hp" } },
      { "effort": 0, "stat": { "name": "attack" } },
      { "effort": 0, "stat": { "name": "defense" } },
      { "effort": 1, "stat": { "name": "special-attack" } },
      { "effort": 0, "stat": { "name": "special-defense" } },
      { "effort": 0, "stat": { "name": "speed" } }
    ]
  }
}
```

This route is intentionally simple for now. It gives the project a clean local data-writing path without adding a full admin UI yet.

---

Features

1. Pokémon Selection

* Select a generation, then a Pokémon species, then a form (if applicable)
* Search bar supports direct Pokémon lookup (e.g., “charizard”, “deoxys”)
* Automatically resolves default forms for special Pokémon (e.g., Deoxys → Deoxys-Normal)
* Displays Pokémon sprite and EV yield

2. EV Gains Display

* Shows EV yield for the selected Pokémon
* Applies game-specific EV overrides where applicable
* Updates dynamically with training modifiers

3. Training Modifiers

* Held Items:

  * Macho Brace (doubles EV gain)
  * Power Items (add EVs to a specific stat)

    * Gen 4–6: +4 EVs
    * Gen 7+: +8 EVs
* Pokérus:

  * Doubles total EV gain
  * Stacks multiplicatively with held items

4. EV Tracking

* Manually set current EVs for all stats
* Set per-stat target EVs (max 252 per stat)
* Total EV cap enforced at 510

5. EV Allocation System

* “Allocate EVs” button applies EV gains from the selected Pokémon
* Automatically clamps values to:

  * Stat target (252 max per stat)
  * Global cap (510 total EVs)
* Shows notifications when:

  * A stat reaches its target
  * The total EV limit is reached

6. Visual Feedback

* Progress bars for each stat
* Total EV counter (e.g., 372 / 510)
* Highlighted stats when capped
* EV gains turn red when they would overflow

7. Reset System

* Reset button clears all current EVs without refreshing the page

---

How It Works

1. Select a Pokémon

   * Choose generation → species → form
     OR
   * Use the search bar

2. Configure Training

   * Choose held item
   * Toggle Pokérus
   * Set target EVs
   * Optionally set current EVs manually

3. Train

   * Click “Allocate EVs”
   * EVs increase according to:
     Final EV = (Base EV + Power Item Bonus) × Multipliers

4. Monitor Progress

   * Watch EV bars fill
   * Check total EV counter
   * Look for warnings or capped stats

---

Important Notes

* EV gains are per battle, not cumulative
* Power items affect only one stat but still allow base EV gains in others
* Pokérus doubles the final EV gain after item bonuses
* Some Pokémon have different EV yields depending on game or form

---

Known Limitations

* No persistent storage (refresh resets data)
* Notifications may repeat if conditions persist
* Not all historical EV changes may be covered
* No battle counter or “battles remaining” calculation yet

---

Future Improvements

* Remaining EV / battles needed display
* Smarter notifications (non-repeating, inline warnings)
* Improved UI feedback for overflow conditions
* Shiny sprite toggle
* Admin UI for adding/editing local Pokémon records

---

Credits

* Pokémon seed data provided by PokéAPI
  https://pokeapi.co/

---

End of README
