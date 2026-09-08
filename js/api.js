// PokéAPI fetch functions
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

function normalizePokemonName(name) {
  const cleanedName = name.trim().toLowerCase();
  return defaultFormNames[cleanedName] || cleanedName;
}
/*
1) An input normalization helper function.
2) Cleans user search input and resolves default forms. EX: "Deoxys" -> "deoxys-normal"
3) Directly used by:
    - setSelectedPokemon()
    
   Indirectly used by:
    - searchPokemon()
*/

function getStatEffort(data, statName) {
  const stat = data.stats.find(entry => entry.stat.name === statName);
  return stat ? stat.effort : 0;
}
/*
1) An API parsing helper function
2) Extracts EV yield values from PokeAPI stat data. EX: getStatEffort(pokemonData, "attack") -> 2 for Luxio
3) Directly used by:
    - buildEVsFromPokemonData()
*/

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

/*
1) A data transformation helper function
2) Builds the EV object structure from raw PokeAPI data for easier use in the app.
3) Directly used by:
    - applyPokemonData()
*/

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
    showNotification("Could not load generations.", "error");
  }
}
/*
1) An API loading function for generations
2) fetches Pokemon generations from PokeAPI and fills the generation dropdown
3) Directly used by:
    - app startup / initialization
*/

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
    showNotification("Could not load Pokémon list.", "error");
  }
}

/*
1) An API + dropdown population function
2) fetches pokemon species for a generation, sorts them, fills the species dropdown, and optionally loads the first species
3) Directly used by:
    - fetchGenerations() -> onchange handler
    - generation dropdown listener
    - syncGenerationSpeciesAndForms()
*/

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
    showNotification("Could not load Pokémon forms.", "error");
  }
}
/*
1) An API + UI population function
2) Fetches all forms/varieties for a pokemon species and populates the form dropdown
3) Directly used by:
    - fetchPokemonByGeneration()
    - setSelectedPokemon()
    - syncGenerationSpeciesAndForms()
*/
