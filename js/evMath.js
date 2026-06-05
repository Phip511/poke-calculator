// EV modifiers, caps, total EV logic
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

function getTotalEVs() {
  return Object.values(currentEVs).reduce((total, value) => total + value, 0);
}
/*
1) Calculation / helper function
2) Calculates the total EV count across all stats
3) Directly used by:
    - updateEVGainsDisplay()
    - updateCurrentEVsDisplay()
    - allocateEVs()
*/
function clampCurrentEV(value) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      return 0;
    }
    
    return Math.min(Math.max(parsed, 0), HARD_EV_CAP);
}


function clampTarget(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.min(Math.max(parsed, 0), EFFECTIVE_EV_CAP);
}
/*
1) A validation/sanitization helper function
2) Ensures EV values stay within legal range (0-252). Handles invalid input, negative numbers, and caps values above 252.
3) Directly used by:
    - getTargets()
    - syncCurrentEVsFromInputs()
*/

function getSelectedTrainingGameSetting() {
  const trainingGame = getEl("trainingGame").value;
  return trainingGameSettings[trainingGame] || trainingGameSettings.current;
}

function applyEVOverrideIfNeeded(pokemonName, defaultEVs) {
  const { overrideKey } = getSelectedTrainingGameSetting();

  if (overrideKey === "current") {
    return defaultEVs;
  }

  return evYieldOverrides[overrideKey]?.[pokemonName] || defaultEVs;
}
/*
1) A game correction / override function
2) Applies historical EV yield changes. EX: Roselia Gen 3 != Roselia modern EVs
3) Directly used by:
    - applyPokemonData()
*/

function calculateModifiedEVGains(baseGains) {
  const heldItem = getEl("heldItem").value;
  const hasPokerus = getEl("pokerus").checked;
  const { powerItemGeneration } = getSelectedTrainingGameSetting();

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
    modified[powerItemStat] += getPowerItemBonusByGeneration(powerItemGeneration);
  }

  if (hasPokerus) {
    for (const stat in modified) {
      modified[stat] *= 2;
    }
  }

  return modified;
}
/*
1) Pure EV calculation function
2) Applies modifiers to base EV gains (Power items, pokerus, machobrace, etc.)
3) Directly used by:
    - applyPokemonData()
    - refreshModifiedEVGains()
*/

function getPowerItemBonusByGeneration(powerItemGeneration) {
  if (
    powerItemGeneration === "gen4" ||
    powerItemGeneration === "gen5" ||
    powerItemGeneration === "gen6"
  ) {
    return 4;
  }

  if (powerItemGeneration === "gen7" || powerItemGeneration === "current") {
    return 8;
  }

  return 0;
}
/*
1) rules / business-logic helper function
2) implements pokemon generation mechanics for power item bonuses
3) Directly used by:
    - calculateModifiedEVGains()
*/

function getUsefulRemainingEVs(evState, targets) {
  const targetRemainingEVs = Object.keys(EMPTY_EVS).reduce((total, stat) => {
    return total + Math.max(targets[stat] - evState[stat], 0);
  }, 0);
  const totalRemainingEVs = Math.max(TOTAL_EV_CAP - getTotalEVsFromState(evState), 0);

  return Math.min(targetRemainingEVs, totalRemainingEVs);
}

function getTotalEVsFromState(evState) {
  return Object.values(evState).reduce((total, value) => total + value, 0);
}

function applyOneEstimatedBattle(evState, targets) {
  const nextState = { ...evState };
  let didProgress = false;

  for (const stat in evGains) {
    const gain = evGains[stat];

    if (gain <= 0 || nextState[stat] >= targets[stat]) {
      continue;
    }

    const remainingTargetEVs = targets[stat] - nextState[stat];
    const remainingTotalEVs = TOTAL_EV_CAP - getTotalEVsFromState(nextState);

    if (remainingTotalEVs <= 0) {
      break;
    }

    const amountToAdd = Math.min(gain, remainingTargetEVs, remainingTotalEVs);

    if (amountToAdd > 0) {
      nextState[stat] += amountToAdd;
      didProgress = true;
    }
  }

  return { nextState, didProgress };
}

function calculateBattlesNeededToTargets(targets) {
  let simulatedEVs = { ...currentEVs };
  let battlesNeeded = 0;
  const maxBattlesToCheck = TOTAL_EV_CAP;

  while (getUsefulRemainingEVs(simulatedEVs, targets) > 0) {
    const battleResult = applyOneEstimatedBattle(simulatedEVs, targets);

    if (!battleResult.didProgress || battlesNeeded >= maxBattlesToCheck) {
      return null;
    }

    simulatedEVs = battleResult.nextState;
    battlesNeeded += 1;
  }

  return battlesNeeded;
}

function getRemainingTrainingSummary() {
  const targets = getTargets();
  const remainingEVs = getUsefulRemainingEVs(currentEVs, targets);
  const battlesNeeded = calculateBattlesNeededToTargets(targets);

  return {
    remainingEVs,
    battlesNeededText: battlesNeeded === null ? "N/A" : battlesNeeded,
  };
}

function allocateEVs() {
  syncCurrentEVsFromInputs();
  lastWarningStat = null;

  const targets = getTargets();

  for (const stat in evGains) {
    const gain = evGains[stat];

    if (gain <= 0) {
      continue;
    }

    const target = targets[stat];
    const currentStatValue = currentEVs[stat];

    const remainingStatEVs = HARD_EV_CAP - currentStatValue;
    const remainingTotalEVs = TOTAL_EV_CAP - getTotalEVs();

    if (remainingTotalEVs <= 0) {
      showNotification("Total EV limit of 510 has been reached.");
      break;
    }

    if (remainingStatEVs <= 0) {
      showNotification(`${formatName(stat)} cannot exceed ${HARD_EV_CAP} EVs!`);
      continue;
    }

    if (currentStatValue < target && currentStatValue + gain >= target) {
      showNotification(`${formatName(stat)} will reach its useful EV target next!`);
    }

    if (currentStatValue + gain > HARD_EV_CAP) {
      showNotification(`${formatName(stat)} cannot exceed ${HARD_EV_CAP} EVs!`);
    }

    const amountToAdd = Math.min(gain, remainingStatEVs, remainingTotalEVs);
    currentEVs[stat] = currentStatValue + amountToAdd;
  }

  updateCurrentEVsDisplay();
  updateEVGainsDisplay();
  autosaveActiveSpread();
}
/*
1)  core business-logic / controller function
2) Heart of EV training system. Does the following:
    - syncs current EV state
    - applies EV gains
    - enforces:
        - 252 stat cap
        - 510 total EV cap
    - updates state
    - triggers notifications
    - refreshes UI
3) Directly used by:
    - Allocate EVs button listener
*/
