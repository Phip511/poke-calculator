const fs = require("node:fs/promises");
const path = require("node:path");

const API_BASE = "https://pokeapi.co/api/v2";
const DB_DIR = path.join(__dirname, "..", "db", "pokeapi");

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json();
}

async function writeJson(relativePath, data) {
  const filePath = path.join(DB_DIR, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function seed() {
  console.log("Fetching generation index...");
  const generationIndex = await fetchJson(`${API_BASE}/generation/`);
  const generations = [];
  const speciesNames = new Set();
  const pokemonNames = new Set();

  for (const generationResource of generationIndex.results) {
    console.log(`Fetching ${generationResource.name}...`);
    const generation = await fetchJson(generationResource.url);

    generations.push({
      id: generation.id,
      name: generation.name,
      url: `/api/v2/generation/${generation.name}`,
    });

    generation.pokemon_species.forEach(species => speciesNames.add(species.name));
    await writeJson(`generation/${generation.name}.json`, generation);
  }

  await writeJson("generations.json", {
    count: generations.length,
    next: null,
    previous: null,
    results: generations.sort((a, b) => a.id - b.id),
  });

  for (const speciesName of [...speciesNames].sort()) {
    console.log(`Fetching species ${speciesName}...`);
    const species = await fetchJson(`${API_BASE}/pokemon-species/${speciesName}`);
    species.varieties.forEach(variety => pokemonNames.add(variety.pokemon.name));
    await writeJson(`pokemon-species/${speciesName}.json`, species);
  }

  for (const pokemonName of [...pokemonNames].sort()) {
    console.log(`Fetching pokemon ${pokemonName}...`);
    const pokemon = await fetchJson(`${API_BASE}/pokemon/${pokemonName}`);
    await writeJson(`pokemon/${pokemonName}.json`, pokemon);
  }

  console.log(`Seed complete: ${generations.length} generations, ${speciesNames.size} species, ${pokemonNames.size} pokemon forms.`);
}

seed().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
