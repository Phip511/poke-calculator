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
/* Converts API names such as "deoxys-attack" into display labels. */

function formatStatName(stat) {
  const statNames = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    specialAttack: "Special Attack",
    specialDefense: "Special Defense",
    speed: "Speed",
  };

  return statNames[stat] || formatName(stat);
}

function formatEVCount(value) {
  return `${value} EV${value === 1 ? "" : "s"}`;
}

const activeNotificationMessages = new Set();

function showNotification(message, tone = "info") {
  const notificationContainer = getEl("notification");

  if (!notificationContainer) {
    console.warn(message);
    return;
  }

  if (activeNotificationMessages.has(message)) {
    return;
  }

  activeNotificationMessages.add(message);

  const notification = document.createElement("div");
  notification.className = `notification notification-${tone}`;
  notification.textContent = message;
  notification.setAttribute("role", tone === "error" ? "alert" : "status");

  notificationContainer.appendChild(notification);

  setTimeout(() => {
    activeNotificationMessages.delete(message);

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

function renderPokemonImage(data = selectedPokemonData) {
  const image = getEl("pokemonImage");
  const shinyToggle = getEl("shinySprite");

  if (!data) {
    image.src = "";
    shinyToggle.disabled = true;
    return;
  }

  const normalSprite =
    data.sprites.front_default ||
    data.sprites.other?.["official-artwork"]?.front_default ||
    "";
  const shinySprite =
    data.sprites.front_shiny ||
    data.sprites.other?.["official-artwork"]?.front_shiny ||
    "";

  if (!shinySprite) {
    showShinySprite = false;
  }

  shinyToggle.disabled = !shinySprite;
  shinyToggle.checked = showShinySprite;
  shinyToggle.closest(".shiny-toggle").classList.toggle("is-unavailable", !shinySprite);
  image.src = showShinySprite ? shinySprite : normalSprite;

  image.alt = `${showShinySprite ? "Shiny " : ""}${formatName(data.name)} sprite`;
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
  const allocationPreview = getAllocationPreview(currentEVs, targets);

  const statElementMap = {
    hp: { gainId: "gainHp", currentInputId: "currentHp" },
    attack: { gainId: "gainAtk", currentInputId: "currentAtk" },
    defense: { gainId: "gainDef", currentInputId: "currentDef" },
    specialAttack: { gainId: "gainSpa", currentInputId: "currentSpa" },
    specialDefense: { gainId: "gainSpd", currentInputId: "currentSpd" },
    speed: { gainId: "gainSpe", currentInputId: "currentSpe" },
  };

  for (const stat in evGains) {
    const elementIds = statElementMap[stat];
    const el = getEl(elementIds.gainId);
    const gain = evGains[stat];
    const statPreview = allocationPreview.stats[stat];
    const rowElement = getEl(elementIds.currentInputId).closest(".ev-row");

    el.textContent = gain;
    el.classList.toggle("ev-overflow", statPreview.willExceedTarget || statPreview.isBlocked);
    rowElement.classList.toggle("will-overflow", statPreview.willExceedTarget);
    rowElement.classList.toggle("will-hit-target", statPreview.willReachTarget && !statPreview.willExceedTarget);
    rowElement.classList.toggle("allocation-blocked", statPreview.isBlocked);
  }

  updateTrainingFeedback(allocationPreview);
  updateRemainingTrainingSummary();
}
/*
1) UI rendering function
2) Updates:
    - EV gain numbers
    - target and cap previews
    - inline training feedback
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

  getEl("remainingEVs").textContent = formatEVCount(remainingSummary.remainingEVs);
  getEl("battlesNeeded").textContent = remainingSummary.battlesNeededText;
}

function updateTrainingFeedback(allocationPreview) {
  const warningContainer = getEl("trainingWarnings");
  const totalBox = getEl("totalEVs").closest(".total-ev-box");
  const projectedTotal = getEl("projectedTotalEVs");
  const allocateButton = getEl("allocateButton");
  const messages = [];

  totalBox.classList.toggle("near-total-cap", allocationPreview.isNearTotalCap);
  totalBox.classList.toggle("total-capped", allocationPreview.isTotalCapped);
  allocateButton.disabled = !selectedPokemon || !allocationPreview.hasAllocatableGain;
  projectedTotal.textContent = selectedPokemon && allocationPreview.hasAllocatableGain
    ? `Next battle: ${allocationPreview.projectedTotal} / ${TOTAL_EV_CAP}`
    : "";

  if (!selectedPokemon) {
    warningContainer.hidden = true;
    warningContainer.replaceChildren();
    return;
  }

  if (allocationPreview.isTotalCapped) {
    messages.push({
      tone: "danger",
      text: `The ${TOTAL_EV_CAP} total EV cap has been reached.`,
    });
  } else if (allocationPreview.blockedByTotal > 0) {
    messages.push({
      tone: "danger",
      text: `${formatEVCount(allocationPreview.blockedByTotal)} from the next battle will be blocked by the total cap.`,
    });
  }

  for (const stat in allocationPreview.stats) {
    const statPreview = allocationPreview.stats[stat];

    if (statPreview.blockedByHardCap > 0) {
      messages.push({
        tone: "danger",
        text: `${formatStatName(stat)} is limited by its ${HARD_EV_CAP} EV hard cap next battle.`,
      });
    } else if (statPreview.willExceedTarget) {
      messages.push({
        tone: "warning",
        text: `${formatStatName(stat)} will exceed its target by ${formatEVCount(statPreview.gainPastTarget)} next battle.`,
      });
    } else if (statPreview.willReachTarget) {
      messages.push({
        tone: "ready",
        text: `${formatStatName(stat)} will reach its target next battle.`,
      });
    }
  }

  warningContainer.replaceChildren();
  messages.forEach(({ tone, text }) => {
    const item = document.createElement("div");
    item.className = `training-warning training-warning-${tone}`;
    item.textContent = text;
    warningContainer.appendChild(item);
  });
  warningContainer.hidden = messages.length === 0;
}
