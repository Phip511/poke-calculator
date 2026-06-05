// updating displays, notifications, dropdown syncing
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

function getEl(id) {
  return document.getElementById(id);
}
/*
1) A helper function to get DOM elements by ID.
2) Shortens docuement.getElementById() to getEl(), making code cleaner and easier to read.
3) used throughout UI-heavy logic:
    - showNotification()
    - getTargets()
    - applyPokemonData()
    - refreshModifiedEVGains()
    - syncCurrentEVsFromInputs()
    - updateEVGainsDisplay()
    - updateCurrentEVsDisplay()
    - updateEVRow()
    - fetchGenerations()
    - fetchPokemonByGeneration()
    - fetchPokemonForms()
    - syncGenerationSpeciesAndForms()
    - searchPokemon()
    - setupEventListeners()
*/

function formatName(name) {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
/*
1) A display formatting helper
2) Converts PokeAPI names to a human-readable format. EX: "deoxys-attack" -> "Deoxys Attack"
3) Functions:
    - applyPokemonData()
    - updateEVGainsDisplay()
    - fetchPokemonByGeneration()
    - fetchPokemonForms()
    - allocateEVs()
*/

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
/*
1) A UI rendering/helper function
2) Creates temporary popup notifications on the screen. EX: "Attack has reached its goal!"
3) Directly used by:
    - fetchGenerations()
    - fetchPokemonByGeneration()
    - fetchPokemonForms()
    - setSelectedPokemon()
    - resetEVs()
    - allocateEVs()
    - updateEVGainsDisplay()
*/

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

/*
1) A DOM -> state conversion helper function
2) Reads target EV inputs from HTML and converts them into a normalized EV object
3) Direclty used by:
    - updateEVGainsDisplay()
    - updateCurrentEVsDisplay()
    - allocateEVs()
*/

function renderPokemonImage(data) {
  const image = getEl("pokemonImage");

  image.src =
    data.sprites.front_default ||
    data.sprites.other?.["official-artwork"]?.front_default ||
    "";

  image.alt = `${formatName(data.name)} sprite`;
}

function syncCurrentEVsFromInputs() {
  currentEVs = {
    hp: clampCurrentEV(getEl("currentHp").value),
    attack: clampCurrentEV(getEl("currentAtk").value),
    defense: clampCurrentEV(getEl("currentDef").value),
    specialAttack: clampCurrentEV(getEl("currentSpa").value),
    specialDefense: clampCurrentEV(getEl("currentSpd").value),
    speed: clampCurrentEV(getEl("currentSpe").value),
  };

  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
}
/*
1) A DOM -> state synchronization function
2) Reads manual EV inoputs from HTML and updates currentEVs state object
3) Directly used by:
    - allocateEVs()
    - setupEventListeners()
*/

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

  updateRemainingTrainingSummary();
}
/*
1) UI rendering function
2) Updates:
    - EV gain numbers
    - red overflow coloring
    - warning notifications
3) Directly used by:
    - applyPokemonData()
    - refreshModifiedEVGains()
    - syncCurrentEVsFromInputs()
    - allocateEVs()
*/

function updateCurrentEVsDisplay() {
  const targets = getTargets();

  updateEVRow("hp", "currentHp", "barHp", currentEVs.hp, targets.hp);
  updateEVRow("attack", "currentAtk", "barAtk", currentEVs.attack, targets.attack);
  updateEVRow("defense", "currentDef", "barDef", currentEVs.defense, targets.defense);
  updateEVRow("specialAttack", "currentSpa", "barSpa", currentEVs.specialAttack, targets.specialAttack);
  updateEVRow("specialDefense", "currentSpd", "barSpd", currentEVs.specialDefense, targets.specialDefense);
  updateEVRow("speed", "currentSpe", "barSpe", currentEVs.speed, targets.speed);

  getEl("totalEVs").textContent = getTotalEVs();
  updateRemainingTrainingSummary();
}
/*
1) A UI rendering function
2) Updates the current EV inputs, EV bars, capped-stat highlights, and total EV counter
3) Directly used by:
    - syncCurrentEVsFromInputs()
    - resetEVs()
    - allocateEVs()
    - startup code
*/

function updateEVRow(statKey, inputId, barId, currentValue, targetValue) {
  const inputElement = getEl(inputId);
  const barElement = getEl(barId);
  const rowElement = inputElement.closest(".ev-row");

  inputElement.value = currentValue;

  // Bar fills based on the target value.
  // Example: target 8, current 8 = full bar.
  const barMax = targetValue > 0 ? targetValue : EFFECTIVE_EV_CAP;

  barElement.max = barMax;
  barElement.value = Math.min(currentValue, barMax);

  const isPastTarget = currentValue > targetValue && targetValue > 0;
  const isTargetReached = currentValue >= targetValue && targetValue > 0;
  const isEffectiveCapped = currentValue >= EFFECTIVE_EV_CAP && currentValue < HARD_EV_CAP;
  const isHardCapped = currentValue >= HARD_EV_CAP;

  // Red should win if the stat is past target OR at the hard 255 cap
  const shouldBeRed = isPastTarget || isHardCapped;

  // Gold only if target/useful cap reached, but NOT red
  const shouldBeGold = !shouldBeRed && (isTargetReached || isEffectiveCapped);

  inputElement.classList.toggle("capped-stat", shouldBeGold);
  rowElement.classList.toggle("capped", shouldBeGold);
  barElement.classList.toggle("capped-bar", shouldBeGold);

  inputElement.classList.toggle("hard-capped-stat", shouldBeRed);
  rowElement.classList.toggle("hard-capped", shouldBeRed);
  barElement.classList.toggle("hard-capped-bar", shouldBeRed);
}
/*
1) A helper function for rendering one EV row
2) Updates:
    - current EV input value
    - progress bar value
    - gold capped-stat styling
3) Directly used by:
    - updateCurrentEVsDisplay()
*/

function syncPokemonDropdown(speciesName) {
  const pokemonList = getEl("pokemonList");
  const matchingOption = [...pokemonList.options].find(
    option => option.value === speciesName
  );

  pokemonList.value = matchingOption ? speciesName : "";
}
/*
1)A UI synchronization helper function 
2) Updates the species dropdown to match the currently selected Pokemon
3) Directly used by:
    - setSelectedPokemon()
    - syncGenerationSpeciesAndForms()
*/

function updateRemainingTrainingSummary() {
  const remainingSummary = getRemainingTrainingSummary();

  getEl("remainingEVs").textContent = `${remainingSummary.remainingEVs} EVs`;
  getEl("battlesNeeded").textContent = remainingSummary.battlesNeededText;
}
