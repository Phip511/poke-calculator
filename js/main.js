// startup and event listeners
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

function applyPokemonData(data) {
  const defaultEVs = buildEVsFromPokemonData(data);

  selectedPokemonData = data;
  baseEVGains = applyEVOverrideIfNeeded(data.name, defaultEVs);
  evGains = calculateModifiedEVGains(baseEVGains);

  renderPokemonImage(data);
  updateEVGainsDisplay();
}
/*
1) 
2) 
3) 
*/


function refreshModifiedEVGains() {
  evGains = calculateModifiedEVGains(baseEVGains);
  updateEVGainsDisplay();
}
/*
1) Synchronizaton/update helper
2) Recalculates modified EV gains after changes to modifiers (like Pokerus or Power Items) and updates the display.
3) Directly used by:
    - setupEventListeners()
    - trainingGame.onchange
*/

function resetEVs() {
  currentEVs = { ...EMPTY_EVS };
  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
  autosaveActiveSpread();
  showNotification("EVs have been reset.");
}
/*
1) user-action handler / coordination function
2) resets currentEVs back to all zeroes, updates UI, shows a notification
3) Directly used by:
    - setupEventListeners() -> reset button listener
*/

async function setSelectedPokemon(pokemonName, shouldAutoSwitchGeneration = true) {
  const normalizedName = normalizePokemonName(pokemonName);

  try {
    const response = await fetch(`${apiBase}/pokemon/${normalizedName}`);

    if (!response.ok) {
      throw new Error("Pokémon not found.");
    }

    const data = await response.json();

    selectedPokemon = data.name;
    selectedSpecies = data.species.name;

    applyPokemonData(data);
    getEl("pokemonSearch").value = formatName(data.name);

    if (shouldAutoSwitchGeneration) {
      await syncGenerationSpeciesAndForms(data);
    } else {
      isSyncingUI = true;
      syncPokemonDropdown(selectedSpecies);
      await fetchPokemonForms(selectedSpecies, data.name, false);
      isSyncingUI = false;
    }
  } catch (error) {
    console.error("Error selecting Pokémon:", error);
    showNotification("Pokémon not found.", "error");
  }
}
/*
1) A major orchestration/controller function
2) Does the following:
    - normalizes names
    - fetches Pokemon data
    - updates app state
    - updates UI
    - synchronizes dropdowns/forms/generation
    - handles search integration
3) Directly used by:
    - fetchPokemonForms()
    - searchPokemon()
    - form dropdown listeners
    - generation syncing logic
*/

async function syncGenerationSpeciesAndForms(pokemonData) {
  try {
    const speciesResponse = await fetch(pokemonData.species.url);

    if (!speciesResponse.ok) {
      throw new Error("Could not fetch Pokémon species.");
    }

    const speciesData = await speciesResponse.json();
    const generationUrl = speciesData.generation.url;
    const generationList = getEl("generationList");

    isSyncingUI = true;

    if (generationList.value !== generationUrl) {
      generationList.value = generationUrl;
      await fetchPokemonByGeneration(generationUrl, false);
    }

    syncPokemonDropdown(speciesData.name);
    await fetchPokemonForms(speciesData.name, pokemonData.name, false);
  } catch (error) {
    console.error("Error syncing UI:", error);
  } finally {
    isSyncingUI = false;
  }
}
/*
1) Syncrhonization / orchestration helper function
2) Keeps the 3 dropdowns all aligned with the currently selected Pokemon
3) Directly used by:
    - setSelectedPokemon()
*/

function searchPokemon() {
  const input = getEl("pokemonSearch");
  const name = input.value.trim();

  if (!name) {
    showNotification("Enter a Pokémon name.", "error");
    return;
  }

  setSelectedPokemon(name, true);
}
/*
1) A user-action/controller function
2) Handles search bar input and initiates Pokemon selection flow
    User types:
    -> validation
    -> setSelectedPokemon()
    -> full app synch and update flow
3) Directly used by:
    - search button click
    - Enter key listener
*/

function setupEventListeners() {
  getEl("searchButton").onclick = searchPokemon;
  getEl("allocateButton").onclick = allocateEVs;
  getEl("resetButton").onclick = resetEVs;
  getEl("savedSpreadsToggle").onclick = toggleSavedSpreadsPanel;
  getEl("addSpreadButton").onclick = createCurrentSpread;
  getEl("deleteSpreadButton").onclick = deleteSelectedSpread;
  getEl("savedSpreadList").onchange = loadSelectedSpread;

  getEl("heldItem").onchange = () => {
    refreshModifiedEVGains();
    autosaveActiveSpread();
  };
  getEl("pokerus").onchange = () => {
    refreshModifiedEVGains();
    autosaveActiveSpread();
  };
  getEl("shinySprite").onchange = event => {
    showShinySprite = event.target.checked;
    renderPokemonImage();
    autosaveActiveSpread();
  };

  ["currentHp", "currentAtk", "currentDef", "currentSpa", "currentSpd", "currentSpe"].forEach(id => {
    getEl(id).onchange = () => {
      syncCurrentEVsFromInputs();
      autosaveActiveSpread();
    };
  });

  ["targetHp", "targetAtk", "targetDef", "targetSpa", "targetSpd", "targetSpe"].forEach(id => {
    getEl(id).onchange = () => {
      updateCurrentEVsDisplay();
      updateEVGainsDisplay();
      autosaveActiveSpread();
    };
  });

  getEl("pokemonSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchPokemon();
    }
  });

  getEl("trainingGame").onchange = async () => {
    if (selectedPokemon) {
      await setSelectedPokemon(selectedPokemon, false);
    } else {
      refreshModifiedEVGains();
    }

    autosaveActiveSpread();
  };
}
/*
1) An application wiring / bootstrap function
2) Connects:
    - buttons
    - inputs
    - dropdowns
    - keyboard events
    to their respective handlers and functions.
    Bridge between HTML, UI and JavaScript Logic
3) Directly used by:
    - searchPokemon
    - allocateEVs
    - resetEVs
    - refreshModifiedEVGains
    - syncCurrentEVsFromInputs
    - setSelectedPokemon
*/

setupEventListeners();
updateSavedSpreadList();
fetchGenerations();
updateCurrentEVsDisplay();
updateEVGainsDisplay();
// startup initialization/render calls
