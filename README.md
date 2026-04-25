# poke-calculator
EV Counter Web App — README

Overview
This is a browser-based Pokémon Effort Value (EV) training calculator built using HTML, CSS, and JavaScript with data from the PokéAPI. The app helps simulate EV training by allowing users to select a Pokémon, apply training modifiers, and track EV progress toward target values.

---

Features

1. Pokémon Selection

* Select a generation, then a Pokémon species, then a form (if applicable)
* Search bar supports direct Pokémon lookup (e.g., “charizard”, “deoxys”)
* Automatically resolves default forms for special Pokémon (e.g., Deoxys → Deoxys-Normal)
* Displays Pokémon sprite and EV yield

2. EV Gains Display

* Shows EV yield for the selected Pokémon
* Applies generation-specific EV overrides where applicable
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
* Some Pokémon have different EV yields depending on generation or form

---

Known Limitations

* No persistent storage (refresh resets data)
* Notifications may repeat if conditions persist
* Not all historical EV changes may be covered
* No battle counter or “battles remaining” calculation yet

---

Future Improvements

* Save/load EV spreads (localStorage)
* Remaining EV / battles needed display
* Smarter notifications (non-repeating, inline warnings)
* Improved UI feedback for overflow conditions
* Shiny sprite toggle

---

Credits

* Pokémon data provided by PokéAPI
  https://pokeapi.co/

---

End of README
