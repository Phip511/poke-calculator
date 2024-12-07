// API Base URL
const apiBase = "https://pokeapi.co/api/v2";

// Local variables
let evGains = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

let currentEVs = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

// Fetch Pokémon generations
async function fetchGenerations() {
  const generationList = document.getElementById("generationList");
  try {
    const response = await fetch(`${apiBase}/generation/`);
    const data = await response.json();

    // Populate the generation dropdown
    data.results.forEach((generation, index) => {
      const option = document.createElement("option");
      option.value = generation.url;
      option.textContent = `Generation ${index + 1}`;
      generationList.appendChild(option);
    });

    // Add change event listener to fetch Pokémon
    generationList.addEventListener("change", (event) => {
      fetchPokemonByGeneration(event.target.value);
    });
  } catch (error) {
    console.error("Error fetching generations:", error);
  }
}

// Fetch Pokémon for a selected generation
async function fetchPokemonByGeneration(genUrl) {
  const pokemonList = document.getElementById("pokemonList");
  pokemonList.innerHTML = ""; // Clear existing Pokémon options

  try {
    const response = await fetch(genUrl);
    const data = await response.json();

    // Populate the Pokémon dropdown
    data.pokemon_species.forEach((species) => {
      const option = document.createElement("option");
      option.value = species.name;
      option.textContent = species.name;
      pokemonList.appendChild(option);
    });

    // Add change event listener to fetch EVs
    pokemonList.addEventListener("change", (event) => {
      fetchPokemonEVs(event.target.value);
    });
  } catch (error) {
    console.error("Error fetching Pokémon for generation:", error);
  }
}

// Fetch Pokémon EVs and display image
async function fetchPokemonEVs(pokemonName) {
  try {
    const response = await fetch(`${apiBase}/pokemon/${pokemonName}`);
    const data = await response.json();

    // Set EV gains
    evGains = {
      hp: data.stats.find(stat => stat.stat.name === "hp").effort || 0,
      attack: data.stats.find(stat => stat.stat.name === "attack").effort || 0,
      defense: data.stats.find(stat => stat.stat.name === "defense").effort || 0,
      specialAttack: data.stats.find(stat => stat.stat.name === "special-attack").effort || 0,
      specialDefense: data.stats.find(stat => stat.stat.name === "special-defense").effort || 0,
      speed: data.stats.find(stat => stat.stat.name === "speed").effort || 0,
    };

    // Update EV gains display
    updateEVGainsDisplay();

    // Display Pokémon image
    document.getElementById("pokemonImage").src = data.sprites.front_default || "";
  } catch (error) {
    console.error("Error fetching Pokémon EVs:", error);
  }
}

// Update the EV Gains display
function updateEVGainsDisplay() {
  document.getElementById("gainHp").textContent = evGains.hp;
  document.getElementById("gainAtk").textContent = evGains.attack;
  document.getElementById("gainDef").textContent = evGains.defense;
  document.getElementById("gainSpa").textContent = evGains.specialAttack;
  document.getElementById("gainSpd").textContent = evGains.specialDefense;
  document.getElementById("gainSpe").textContent = evGains.speed;
}

// Function to show a flashing notification
function showNotification(message) {
    const notificationContainer = document.getElementById("notification");
    
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
  
    // Append to the container
    notificationContainer.appendChild(notification);
  
    // Remove the notification after the animation ends
    setTimeout(() => {
      notificationContainer.removeChild(notification);
    }, 3000); // Matches the duration of the fade-out animation
  }

// Allocate EVs based on gains
function allocateEVs() {
  const targets = {
    hp: parseInt(document.getElementById("targetHp").value),
    attack: parseInt(document.getElementById("targetAtk").value),
    defense: parseInt(document.getElementById("targetDef").value),
    specialAttack: parseInt(document.getElementById("targetSpa").value),
    specialDefense: parseInt(document.getElementById("targetSpd").value),
    speed: parseInt(document.getElementById("targetSpe").value),
  };

  // Update current EVs with bounds check
  for (const stat in evGains) {
    const currentStatValue = currentEVs[stat];
    const newStatValue = Math.min(
      currentStatValue + evGains[stat],
      targets[stat]
    );

    if (currentStatValue !== newStatValue && newStatValue === targets[stat]) {
      // Show notification when the stat reaches its target
      showNotification(`${stat.charAt(0).toUpperCase() + stat.slice(1)} has reached its goal!`);
    }

    currentEVs[stat] = newStatValue;
  }

  // Update the display
  updateCurrentEVsDisplay();
}

// Update the Current EVs display
function updateCurrentEVsDisplay() {
  document.getElementById("currentHp").textContent = currentEVs.hp;
  document.getElementById("currentAtk").textContent = currentEVs.attack;
  document.getElementById("currentDef").textContent = currentEVs.defense;
  document.getElementById("currentSpa").textContent = currentEVs.specialAttack;
  document.getElementById("currentSpd").textContent = currentEVs.specialDefense;
  document.getElementById("currentSpe").textContent = currentEVs.speed;
}

// Initialize the app
fetchGenerations();
