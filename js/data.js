// constants like EMPTY_EVS, overrides, default form names
/*
Format for comments:
1) What the object / function is
2) What the object is used for
3) What functions / variables use it, if not obvious
*/


const apiBase = "https://pokeapi.co/api/v2";
/*
1) A constant string storing the root URL for the PokéAPI.
2) Prevents repeating: "https://pokeapi.co/api/v2" everywhere in fetch calls. Makes changing API source easier later.
3) Functions:
    - fetchGenerations()
    - fetchPokemonByGeneration()
    - fetchPokemonForms()
    - setSelectedPokemon()
*/
const EFFECTIVE_EV_CAP = 252;
const HARD_EV_CAP = 255;
const TOTAL_EV_CAP = 510;
// caps for the EVs
// EFFECTIVE_EV_CAP: 252 is the highest EV value that provides a stat increase.
// HARD_EV_CAP: 255 is the absolute maximum EVs in a single stat
// TOTAL_EV_CAP: 510 is the maximum total EVs across all stats for a single Pokémon.

const EMPTY_EVS = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};
/*
1) A template/default EV object. Mainly used with the spread operator (...) to create a copy
2) Used for:
    - initialize EV objects
    - reset EVs safely
    - clone empty EV spreads
3) 
Variables:
    - evGains
    - currentEVs
    - baseEVGains
Functions:
    - resetEVs()
*/

const evYieldOverrides = {
  gen3: {
    yanma: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 2 },
    misdreavus: { hp: 0, attack: 0, defense: 0, specialAttack: 1, specialDefense: 1, speed: 0 },
    blissey: { hp: 2, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    roselia: { hp: 0, attack: 0, defense: 0, specialAttack: 1, specialDefense: 0, speed: 0 },
    duskull: { hp: 0, attack: 0, defense: 1, specialAttack: 0, specialDefense: 1, speed: 0 },
    dusclops: { hp: 0, attack: 0, defense: 1, specialAttack: 0, specialDefense: 2, speed: 0 },
  },

  gen4: {
    "shaymin-sky": { hp: 3, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  },

  gen5: {
    "shaymin-sky": { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 3 },
    watchog: { hp: 0, attack: 1, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  },

  gen6: {
    "aegislash-shield": { hp: 0, attack: 0, defense: 2, specialAttack: 0, specialDefense: 1, speed: 0 },
    "aegislash-blade": { hp: 0, attack: 0, defense: 2, specialAttack: 0, specialDefense: 1, speed: 0 },
  },

  gen7: {
    "ninetales-alola": { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 2 },
    "dugtrio-alola": { hp: 0, attack: 2, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  },
};
/*
1) A custom database/object containing Pokémon whose EV yields changed between generations.
2) PokeAPI only gives the most current EV yields, so this is necessary to calculate EVs for older generations accurately.
3) Functions:
    - Directly: applyEVOverrideIfNeeded()
    - Indirectly: applyPokemonData()
*/

const defaultFormNames = {
  deoxys: "deoxys-normal",
  shaymin: "shaymin-land",
  giratina: "giratina-altered",
  tornadus: "tornadus-incarnate",
  thundurus: "thundurus-incarnate",
  landorus: "landorus-incarnate",
  enamorus: "enamorus-incarnate",
  darmanitan: "darmanitan-standard",
  aegislash: "aegislash-shield",
  basculin: "basculin-red-striped",
  pumpkaboo: "pumpkaboo-average",
  gourgeist: "gourgeist-average",
  toxtricity: "toxtricity-amped",
  eiscue: "eiscue-ice",
  indeedee: "indeedee-male",
  morpeko: "morpeko-full-belly",
  urshifu: "urshifu-single-strike",
  ogerpon: "ogerpon",
};
/*
1) A lookup table mapping: species name -> default form
2) Fixes PokéAPI search edge cases. For example, searching "deoxys" on PokeAPI fails, but deoxys-normal works. This allows users to search for the base form of a Pokémon without needing to know the specific form name.
3) Functions:
    - Directly:
        - normalizePokemonName()
    - Indirectly:
        - setSelectedPokemon()
        - searchPokemon()
*/