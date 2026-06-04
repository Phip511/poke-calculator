// localStorage save/load helpers for EV training sessions

let activeSpreadId = "";
let isLoadingSavedSpread = false;

function getSavedSpreads() {
  try {
    const rawSpreads = localStorage.getItem(STORAGE_KEY);
    return rawSpreads ? JSON.parse(rawSpreads) : [];
  } catch (error) {
    console.error("Error reading saved spreads:", error);
    return [];
  }
}

function setSavedSpreads(spreads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spreads));
}

function buildSpreadSnapshot(name) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    pokemonName: selectedPokemon,
    speciesName: selectedSpecies,
    currentEVs: { ...currentEVs },
    targetEVs: getTargets(),
    trainingGen: getEl("trainingGen").value,
    heldItem: getEl("heldItem").value,
    hasPokerus: getEl("pokerus").checked,
    savedAt: new Date().toISOString(),
  };
}

function getSpreadNameInputValue() {
  return getEl("spreadName").value.trim();
}

function getDefaultSpreadName() {
  const pokemonLabel = selectedPokemon ? formatName(selectedPokemon) : "Training";
  return `${pokemonLabel} Spread`;
}

function createCurrentSpread() {
  if (!selectedPokemon) {
    showNotification("Select a Pokemon before adding a spread.");
    return;
  }

  syncCurrentEVsFromInputs();

  const spreadName = getSpreadNameInputValue() || getDefaultSpreadName();
  const spreads = getSavedSpreads();
  const snapshot = buildSpreadSnapshot(spreadName);

  spreads.push(snapshot);
  setSavedSpreads(spreads);
  activeSpreadId = snapshot.id;
  updateSavedSpreadList(snapshot.id);
  getEl("spreadName").value = spreadName;
  updateActiveSpreadLabel();
  showNotification("EV spread added.");
}

function applyTargetEVs(targetEVs) {
  getEl("targetHp").value = clampTarget(targetEVs.hp);
  getEl("targetAtk").value = clampTarget(targetEVs.attack);
  getEl("targetDef").value = clampTarget(targetEVs.defense);
  getEl("targetSpa").value = clampTarget(targetEVs.specialAttack);
  getEl("targetSpd").value = clampTarget(targetEVs.specialDefense);
  getEl("targetSpe").value = clampTarget(targetEVs.speed);
}

function applyCurrentEVs(savedCurrentEVs) {
  currentEVs = {
    hp: clampCurrentEV(savedCurrentEVs.hp),
    attack: clampCurrentEV(savedCurrentEVs.attack),
    defense: clampCurrentEV(savedCurrentEVs.defense),
    specialAttack: clampCurrentEV(savedCurrentEVs.specialAttack),
    specialDefense: clampCurrentEV(savedCurrentEVs.specialDefense),
    speed: clampCurrentEV(savedCurrentEVs.speed),
  };
}

async function loadSelectedSpread() {
  const spreadId = getEl("savedSpreadList").value;
  const spread = getSavedSpreads().find(savedSpread => savedSpread.id === spreadId);

  if (!spread) {
    activeSpreadId = "";
    updateActiveSpreadLabel();
    return;
  }

  isLoadingSavedSpread = true;

  try {
    activeSpreadId = spread.id;
    getEl("trainingGen").value = spread.trainingGen || "current";
    getEl("heldItem").value = spread.heldItem || "none";
    getEl("pokerus").checked = Boolean(spread.hasPokerus);

    await setSelectedPokemon(spread.pokemonName, true);

    applyTargetEVs(spread.targetEVs || EMPTY_EVS);
    applyCurrentEVs(spread.currentEVs || EMPTY_EVS);
    refreshModifiedEVGains();
    updateCurrentEVsDisplay();
    updateEVGainsDisplay();

    getEl("spreadName").value = spread.name;
    updateActiveSpreadLabel();
    showNotification(`Loaded ${spread.name}.`);
  } finally {
    isLoadingSavedSpread = false;
  }
}

function deleteSelectedSpread() {
  const spreadId = getEl("savedSpreadList").value;

  if (!spreadId) {
    showNotification("Choose a saved spread to delete.");
    return;
  }

  const spreads = getSavedSpreads();
  const spreadToDelete = spreads.find(spread => spread.id === spreadId);
  const remainingSpreads = spreads.filter(spread => spread.id !== spreadId);

  setSavedSpreads(remainingSpreads);
  if (activeSpreadId === spreadId) {
    activeSpreadId = "";
  }

  updateSavedSpreadList();
  getEl("spreadName").value = "";
  updateActiveSpreadLabel();
  showNotification(`${spreadToDelete?.name || "Spread"} deleted.`);
}

function autosaveActiveSpread() {
  if (!activeSpreadId || isLoadingSavedSpread || !selectedPokemon) {
    return;
  }

  const spreads = getSavedSpreads();
  const existingIndex = spreads.findIndex(spread => spread.id === activeSpreadId);

  if (existingIndex < 0) {
    activeSpreadId = "";
    updateSavedSpreadList();
    updateActiveSpreadLabel();
    return;
  }

  const existingSpread = spreads[existingIndex];
  const snapshot = buildSpreadSnapshot(existingSpread.name);

  snapshot.id = existingSpread.id;
  snapshot.savedAt = new Date().toISOString();
  spreads[existingIndex] = snapshot;

  setSavedSpreads(spreads);
  updateSavedSpreadList(activeSpreadId);
  updateActiveSpreadLabel();
}

function updateSavedSpreadList(selectedSpreadId = "") {
  const spreadList = getEl("savedSpreadList");
  const spreads = getSavedSpreads().sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  spreadList.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a saved spread";
  spreadList.appendChild(placeholder);

  spreads.forEach(spread => {
    const option = document.createElement("option");
    option.value = spread.id;
    option.textContent = `${spread.name} (${formatName(spread.pokemonName)})`;
    spreadList.appendChild(option);
  });

  spreadList.value = selectedSpreadId;
  updateActiveSpreadLabel();
}

function updateActiveSpreadLabel() {
  const activeSpread = getSavedSpreads().find(spread => spread.id === activeSpreadId);
  getEl("activeSpreadLabel").textContent = activeSpread
    ? `Active: ${activeSpread.name}`
    : "None selected";
}

function toggleSavedSpreadsPanel() {
  const toggle = getEl("savedSpreadsToggle");
  const panel = getEl("savedSpreadsPanel");
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";

  toggle.setAttribute("aria-expanded", String(!isExpanded));
  panel.hidden = isExpanded;
}
