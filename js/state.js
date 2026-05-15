// selectedPokemon, currentEVs, localStorage save/load
/*
Format for comments:
1) What the object / function is
2) What the object is used for
3) What functions / variables use it, if not obvious
*/
// note: if it's a single line object, it may not have all this info and just be summarized

/*
1) 
2) 
3) 
*/

let evGains = { ...EMPTY_EVS }; // Current EV reward after modifiers.
let currentEVs = { ...EMPTY_EVS }; // Current accumulated EVs for the trained Pokémon.
let baseEVGains = { ...EMPTY_EVS }; // Raw Pokémon EV yield BEFORE modifiers.

let selectedPokemon = null; // Current selected Pokémon form. EX: deoxys-attack
let selectedSpecies = null; // Current species independent of form. EX: deoxys
let isSyncingUI = false; // internal UI lock. Prevents infinite loop between dropdown and syncing
let lastWarningStat = null; // Tracks last stat warned about to avoid notification spam.
