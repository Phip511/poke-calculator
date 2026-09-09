const fs = require("node:fs/promises");
const path = require("node:path");

const API_BASE = "https://pokeapi.co/api/v2";
const DB_DIR = path.join(__dirname, "..", "db", "pokeapi");
const FORCE_REFRESH = process.argv.includes("--refresh");
const MAX_FETCH_ATTEMPTS = 3;
const CONCURRENCY = 6;

async function fetchJson(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      lastError = error;
    }

    if (response?.ok) {
      return response.json();
    }

    if (response) {
      lastError = new Error(`Request failed ${response.status}: ${url}`);

      if (response.status < 500 && response.status !== 429) {
        throw lastError;
      }
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      const delayMs = attempt * 750;
      console.warn(`${lastError.message} Retrying in ${delayMs}ms (${attempt}/${MAX_FETCH_ATTEMPTS - 1})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function writeJson(relativePath, data) {
  const filePath = path.join(DB_DIR, relativePath);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(temporaryPath, filePath);
}

async function readCachedJson(relativePath) {
  if (FORCE_REFRESH) {
    return null;
  }

  const filePath = path.join(DB_DIR, relativePath);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Ignoring invalid cache file ${relativePath}; it will be fetched again.`);
    }

    return null;
  }
}

async function loadResource(relativePath, url) {
  const cached = await readCachedJson(relativePath);

  if (cached) {
    return { data: cached, source: "cached" };
  }

  const data = await fetchJson(url);
  await writeJson(relativePath, data);
  return { data, source: "fetched" };
}

function logProgress(phase, index, total, name, source) {
  const shouldLog = source === "fetched" || index === 1 || index === total || index % 50 === 0;

  if (shouldLog) {
    console.log(`[${phase}] ${index}/${total} ${name} (${source})`);
  }
}

async function mapWithConcurrency(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.min(CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

async function seed() {
  if (process.argv.includes("--help")) {
    console.log("Usage: npm run seed:db [-- --refresh]");
    console.log("Existing valid records are reused unless --refresh is provided.");
    return;
  }

  console.log("Fetching generation index...");
  const generationIndex = await fetchJson(`${API_BASE}/generation/`);
  const generations = [];
  const speciesNames = new Set();
  const pokemonNames = new Set();
  const sourceCounts = { cached: 0, fetched: 0 };

  console.log(`Phase 1/3: ${generationIndex.results.length} generations`);
  let completedResources = 0;
  const generationRecords = await mapWithConcurrency(generationIndex.results, async generationResource => {
    const relativePath = `generation/${generationResource.name}.json`;
    const result = await loadResource(relativePath, generationResource.url);

    sourceCounts[result.source] += 1;
    completedResources += 1;
    logProgress("generations", completedResources, generationIndex.results.length, generationResource.name, result.source);
    return result.data;
  });

  for (const generation of generationRecords) {
    generations.push({
      id: generation.id,
      name: generation.name,
      url: `/api/v2/generation/${generation.name}`,
    });

    generation.pokemon_species.forEach(species => speciesNames.add(species.name));
  }

  await writeJson("generations.json", {
    count: generations.length,
    next: null,
    previous: null,
    results: generations.sort((a, b) => a.id - b.id),
  });

  const sortedSpeciesNames = [...speciesNames].sort();
  console.log(`Phase 2/3: ${sortedSpeciesNames.length} species records`);
  completedResources = 0;
  const speciesRecords = await mapWithConcurrency(sortedSpeciesNames, async speciesName => {
    const relativePath = `pokemon-species/${speciesName}.json`;
    const result = await loadResource(relativePath, `${API_BASE}/pokemon-species/${speciesName}`);

    sourceCounts[result.source] += 1;
    completedResources += 1;
    logProgress("species", completedResources, sortedSpeciesNames.length, speciesName, result.source);
    return result.data;
  });

  for (const species of speciesRecords) {
    species.varieties.forEach(variety => pokemonNames.add(variety.pokemon.name));
  }

  const sortedPokemonNames = [...pokemonNames].sort();
  console.log(`Phase 3/3: ${sortedPokemonNames.length} Pokémon/form records`);
  completedResources = 0;
  await mapWithConcurrency(sortedPokemonNames, async pokemonName => {
    const relativePath = `pokemon/${pokemonName}.json`;
    const result = await loadResource(relativePath, `${API_BASE}/pokemon/${pokemonName}`);

    sourceCounts[result.source] += 1;
    completedResources += 1;
    logProgress("pokemon/forms", completedResources, sortedPokemonNames.length, pokemonName, result.source);
  });

  console.log(`Seed complete: ${generations.length} generations, ${speciesNames.size} species, ${pokemonNames.size} Pokémon forms.`);
  console.log(`Resources: ${sourceCounts.fetched} fetched, ${sourceCounts.cached} reused from disk.`);
}

seed().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
