const apiBase = "https://pokeapi.co/api/v2";

const EMPTY_EVS = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

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

let evGains = { ...EMPTY_EVS };
let currentEVs = { ...EMPTY_EVS };
let baseEVGains = { ...EMPTY_EVS };

let selectedPokemon = null;
let selectedSpecies = null;
let isSyncingUI = false;
let lastWarningStat = null;

function getEl(id) {
  return document.getElementById(id);
}

function formatName(name) {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePokemonName(name) {
  const cleanedName = name.trim().toLowerCase();
  return defaultFormNames[cleanedName] || cleanedName;
}

function getStatEffort(data, statName) {
  const stat = data.stats.find(entry => entry.stat.name === statName);
  return stat ? stat.effort : 0;
}

function buildEVsFromPokemonData(data) {
  return {
    hp: getStatEffort(data, "hp"),
    attack: getStatEffort(data, "attack"),
    defense: getStatEffort(data, "defense"),
    specialAttack: getStatEffort(data, "special-attack"),
    specialDefense: getStatEffort(data, "special-defense"),
    speed: getStatEffort(data, "speed"),
  };
}

function showNotification(message) {
  const notificationContainer = getEl("notification");

  if (!notificationContainer) {
    console.warn(message);
    return;
  }

  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;

  notificationContainer.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function getTotalEVs() {
  return Object.values(currentEVs).reduce((total, value) => total + value, 0);
}

function getTargets() {
  return {
    hp: clampTarget(getEl("targetHp").value),
    attack: clampTarget(getEl("targetAtk").value),
    defense: clampTarget(getEl("targetDef").value),
    specialAttack: clampTarget(getEl("targetSpa").value),
    specialDefense: clampTarget(getEl("targetSpd").value),
    speed: clampTarget(getEl("targetSpe").value),
  };
}

function clampTarget(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.min(Math.max(parsed, 0), 252);
}

function applyEVOverrideIfNeeded(pokemonName, defaultEVs) {
  const trainingGen = getEl("trainingGen").value;

  if (trainingGen === "current") {
    return defaultEVs;
  }

  return evYieldOverrides[trainingGen]?.[pokemonName] || defaultEVs;
}

function applyPokemonData(data) {
  const defaultEVs = buildEVsFromPokemonData(data);
  baseEVGains = applyEVOverrideIfNeeded(data.name, defaultEVs);
  evGains = calculateModifiedEVGains(baseEVGains);

  updateEVGainsDisplay();

  const image = getEl("pokemonImage");
  image.src =
    data.sprites.front_default ||
    data.sprites.other?.["official-artwork"]?.front_default ||
    "";
  image.alt = `${formatName(data.name)} sprite`;
}

function calculateModifiedEVGains(baseGains) {
  const heldItem = getEl("heldItem").value;
  const hasPokerus = getEl("pokerus").checked;
  const trainingGen = getEl("trainingGen").value;

  let modified = { ...baseGains };

  const powerItemBonuses = {
    powerWeight: "hp",
    powerBracer: "attack",
    powerBelt: "defense",
    powerLens: "specialAttack",
    powerBand: "specialDefense",
    powerAnklet: "speed",
  };

  const powerItemStat = powerItemBonuses[heldItem];

  if (heldItem === "machoBrace") {
    for (const stat in modified) {
      modified[stat] *= 2;
    }
  }

  if (powerItemStat) {
    modified[powerItemStat] += getPowerItemBonusByGeneration(trainingGen);
  }

  if (hasPokerus) {
    for (const stat in modified) {
      modified[stat] *= 2;
    }
  }

  return modified;
}

function refreshModifiedEVGains() {
  evGains = calculateModifiedEVGains(baseEVGains);
  updateEVGainsDisplay();
}

function syncCurrentEVsFromInputs() {
  currentEVs = {
    hp: clampTarget(getEl("currentHp").value),
    attack: clampTarget(getEl("currentAtk").value),
    defense: clampTarget(getEl("currentDef").value),
    specialAttack: clampTarget(getEl("currentSpa").value),
    specialDefense: clampTarget(getEl("currentSpd").value),
    speed: clampTarget(getEl("currentSpe").value),
  };

  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
}

function updateEVGainsDisplay() {
  const targets = getTargets();
  const totalEVs = getTotalEVs();

  const statMap = {
    hp: "gainHp",
    attack: "gainAtk",
    defense: "gainDef",
    specialAttack: "gainSpa",
    specialDefense: "gainSpd",
    speed: "gainSpe",
  };

  for (const stat in evGains) {
    const el = getEl(statMap[stat]);
    const gain = evGains[stat];
    const current = currentEVs[stat];
    const target = targets[stat];

    el.textContent = gain;

    const willReach = current < target && current + gain >= target;
    const willOverflow = current + gain > target || totalEVs + gain > 510;

    // color red if overflow
    el.classList.toggle("ev-overflow", willOverflow);

    // trigger notification when about to reach
    if (willReach && lastWarningStat !== stat) {
      showNotification(`${formatName(stat)} will reach its goal next!`);
      lastWarningStat = stat;
    }
  }
}

function updateCurrentEVsDisplay() {
  const targets = getTargets();

  updateEVRow("hp", "currentHp", "barHp", currentEVs.hp, targets.hp);
  updateEVRow("attack", "currentAtk", "barAtk", currentEVs.attack, targets.attack);
  updateEVRow("defense", "currentDef", "barDef", currentEVs.defense, targets.defense);
  updateEVRow("specialAttack", "currentSpa", "barSpa", currentEVs.specialAttack, targets.specialAttack);
  updateEVRow("specialDefense", "currentSpd", "barSpd", currentEVs.specialDefense, targets.specialDefense);
  updateEVRow("speed", "currentSpe", "barSpe", currentEVs.speed, targets.speed);

  getEl("totalEVs").textContent = getTotalEVs();
}

function updateEVRow(statKey, inputId, barId, currentValue, targetValue) {
  const inputElement = getEl(inputId);
  const barElement = getEl(barId);
  const rowElement = inputElement.closest(".ev-row");

  inputElement.value = currentValue;
  barElement.value = currentValue;

  const isCapped = currentValue >= targetValue && targetValue > 0;

  inputElement.classList.toggle("capped-stat", isCapped);
  rowElement.classList.toggle("capped", isCapped);
}

function resetEVs() {
  currentEVs = { ...EMPTY_EVS };
  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
  showNotification("EVs have been reset.");
}

async function fetchGenerations() {
  const generationList = getEl("generationList");
  generationList.innerHTML = "";

  try {
    const response = await fetch(`${apiBase}/generation/`);

    if (!response.ok) {
      throw new Error("Could not fetch generations.");
    }

    const data = await response.json();

    const placeholder = document.createElement("option");
    placeholder.textContent = "Select a Generation";
    placeholder.disabled = true;
    generationList.appendChild(placeholder);

    data.results.forEach((generation, index) => {
      const option = document.createElement("option");
      option.value = generation.url;
      option.textContent = `Generation ${index + 1}`;
      generationList.appendChild(option);
    });

    generationList.onchange = async event => {
      if (isSyncingUI) return;
      await fetchPokemonByGeneration(event.target.value, true);
    };

    if (data.results.length > 0) {
      generationList.selectedIndex = 1;
      await fetchPokemonByGeneration(data.results[0].url, true);
    }
  } catch (error) {
    console.error("Error fetching generations:", error);
    showNotification("Could not load generations.");
  }
}

async function fetchPokemonByGeneration(genUrl, shouldLoadFirstSpecies = false) {
  const pokemonList = getEl("pokemonList");
  pokemonList.innerHTML = "";

  try {
    const response = await fetch(genUrl);

    if (!response.ok) {
      throw new Error("Could not fetch Pokémon for generation.");
    }

    const data = await response.json();

    const sortedSpecies = [...data.pokemon_species].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sortedSpecies.forEach(species => {
      const option = document.createElement("option");
      option.value = species.name;
      option.textContent = formatName(species.name);
      pokemonList.appendChild(option);
    });

    pokemonList.onchange = async event => {
      if (isSyncingUI) return;
      await fetchPokemonForms(event.target.value, null, true);
    };

    if (shouldLoadFirstSpecies && sortedSpecies.length > 0) {
      pokemonList.value = sortedSpecies[0].name;
      await fetchPokemonForms(sortedSpecies[0].name, null, true);
    }
  } catch (error) {
    console.error("Error fetching Pokémon for generation:", error);
    showNotification("Could not load Pokémon list.");
  }
}

async function fetchPokemonForms(speciesName, currentPokemonName = null, shouldLoadPokemon = true) {
  const formList = getEl("formList");
  formList.innerHTML = "";

  try {
    const response = await fetch(`${apiBase}/pokemon-species/${speciesName}`);

    if (!response.ok) {
      throw new Error("Could not fetch Pokémon forms.");
    }

    const speciesData = await response.json();

    speciesData.varieties.forEach(variety => {
      const option = document.createElement("option");
      option.value = variety.pokemon.name;
      option.textContent = formatName(variety.pokemon.name);
      formList.appendChild(option);
    });

    formList.onchange = async event => {
      if (isSyncingUI) return;
      await setSelectedPokemon(event.target.value, false);
    };

    const formToSelect =
      currentPokemonName ||
      speciesData.varieties.find(variety => variety.is_default)?.pokemon.name ||
      speciesData.varieties[0]?.pokemon.name;

    if (!formToSelect) {
      throw new Error("No forms found.");
    }

    formList.value = formToSelect;

    if (shouldLoadPokemon) {
      await setSelectedPokemon(formToSelect, false);
    }
  } catch (error) {
    console.error("Error fetching Pokémon forms:", error);
    showNotification("Could not load Pokémon forms.");
  }
}

function getPowerItemBonusByGeneration(trainingGen) {
  if (
    trainingGen === "gen4" ||
    trainingGen === "gen5" ||
    trainingGen === "gen6"
  ) {
    return 4;
  }

  if (trainingGen === "gen7" || trainingGen === "current") {
    return 8;
  }

  return 0;
}

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
    showNotification("Pokémon not found.");
  }
}

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

function syncPokemonDropdown(speciesName) {
  const pokemonList = getEl("pokemonList");
  const matchingOption = [...pokemonList.options].find(
    option => option.value === speciesName
  );

  pokemonList.value = matchingOption ? speciesName : "";
}

function searchPokemon() {
  const input = getEl("pokemonSearch");
  const name = input.value.trim();

  if (!name) {
    showNotification("Enter a Pokémon name.");
    return;
  }

  setSelectedPokemon(name, true);
}

function allocateEVs() {
  syncCurrentEVsFromInputs();
  lastWarningStat = null;

  const targets = getTargets();

  for (const stat in evGains) {
    const gain = evGains[stat];
    const target = targets[stat];

    if (gain <= 0) {
      continue;
    }

    const currentStatValue = currentEVs[stat];
    const remainingStatEVs = target - currentStatValue;
    const remainingTotalEVs = 510 - getTotalEVs();

    if (remainingTotalEVs <= 0) {
      showNotification("Total EV limit of 510 has been reached.");
      break;
    }

    if (remainingStatEVs <= 0) {
      continue;
    }

    const amountToAdd = Math.min(gain, remainingStatEVs, remainingTotalEVs);
    const newStatValue = currentStatValue + amountToAdd;

    currentEVs[stat] = newStatValue;

    if (newStatValue === target) {
      showNotification(`${formatName(stat)} has reached its goal!`);
    }
  }

  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
}

function setupEventListeners() {
  getEl("searchButton").onclick = searchPokemon;
  getEl("allocateButton").onclick = allocateEVs;
  getEl("resetButton").onclick = resetEVs;

  getEl("heldItem").onchange = refreshModifiedEVGains;
  getEl("pokerus").onchange = refreshModifiedEVGains;

  ["currentHp", "currentAtk", "currentDef", "currentSpa", "currentSpd", "currentSpe"].forEach(id => {
    getEl(id).onchange = syncCurrentEVsFromInputs;
  });

  getEl("pokemonSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchPokemon();
    }
  });

  getEl("trainingGen").onchange = () => {
    if (selectedPokemon) {
      setSelectedPokemon(selectedPokemon, false);
    } else {
      refreshModifiedEVGains();
    }
  };
}

setupEventListeners();
fetchGenerations();
updateCurrentEVsDisplay();
updateEVGainsDisplay();