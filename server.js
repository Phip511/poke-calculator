const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const GENERATED_DB_DIR = path.join(ROOT_DIR, "db", "pokeapi");
const SAMPLE_DB_DIR = path.join(ROOT_DIR, "db", "sample-pokeapi");
let activeDbDir = null;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(text);
}

function resourceUrl(req, resourcePath) {
  return `http://${req.headers.host}/api/v2/${resourcePath}`;
}

function slugFromUrlOrName(value) {
  return decodeURIComponent(String(value).split("/").filter(Boolean).pop() || "");
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getDbDir() {
  if (activeDbDir) {
    return activeDbDir;
  }

  const generatedIndexPath = path.join(GENERATED_DB_DIR, "generations.json");
  activeDbDir = await pathExists(generatedIndexPath) ? GENERATED_DB_DIR : SAMPLE_DB_DIR;
  return activeDbDir;
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function rewriteNamedApiResource(req, resource) {
  if (!resource || typeof resource !== "object") {
    return resource;
  }

  const name = resource.name || slugFromUrlOrName(resource.url);
  const resourceType = String(resource.url || "").includes("/pokemon-species/")
    ? "pokemon-species"
    : String(resource.url || "").includes("/generation/")
      ? "generation"
      : "pokemon";

  return {
    ...resource,
    url: resourceUrl(req, `${resourceType}/${name}`),
  };
}

function rewriteSpecies(req, speciesData) {
  return {
    ...speciesData,
    generation: rewriteNamedApiResource(req, speciesData.generation),
    varieties: (speciesData.varieties || []).map(variety => ({
      ...variety,
      pokemon: {
        ...variety.pokemon,
        url: resourceUrl(req, `pokemon/${variety.pokemon.name}`),
      },
    })),
  };
}

function rewritePokemon(req, pokemonData) {
  return {
    ...pokemonData,
    species: {
      ...pokemonData.species,
      url: resourceUrl(req, `pokemon-species/${pokemonData.species.name}`),
    },
  };
}

function rewriteGeneration(req, generationData) {
  return {
    ...generationData,
    pokemon_species: (generationData.pokemon_species || []).map(species => ({
      ...species,
      url: resourceUrl(req, `pokemon-species/${species.name}`),
    })),
  };
}

async function loadGenerationBySlug(slug) {
  const dbDir = await getDbDir();
  const generations = await readJson(path.join(dbDir, "generations.json"));
  const generation = generations.results.find(entry =>
    entry.name === slug || String(entry.id) === slug || slugFromUrlOrName(entry.url) === slug
  );

  if (!generation) {
    return null;
  }

  return readJson(path.join(dbDir, "generation", `${generation.name}.json`));
}

async function parseJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/v2/generation/") {
    const dbDir = await getDbDir();
    const generations = await readJson(path.join(dbDir, "generations.json"));
    sendJson(res, 200, {
      ...generations,
      results: generations.results.map(generation => ({
        ...generation,
        url: resourceUrl(req, `generation/${generation.name}`),
      })),
    });
    return;
  }

  const generationMatch = pathname.match(/^\/api\/v2\/generation\/([^/]+)\/?$/);
  if (generationMatch) {
    const generation = await loadGenerationBySlug(generationMatch[1]);

    if (!generation) {
      sendJson(res, 404, { error: "Generation not found." });
      return;
    }

    sendJson(res, 200, rewriteGeneration(req, generation));
    return;
  }

  const speciesMatch = pathname.match(/^\/api\/v2\/pokemon-species\/([^/]+)\/?$/);
  if (speciesMatch) {
    const speciesName = decodeURIComponent(speciesMatch[1]);
    const dbDir = await getDbDir();
    const species = await readJson(path.join(dbDir, "pokemon-species", `${speciesName}.json`));
    sendJson(res, 200, rewriteSpecies(req, species));
    return;
  }

  const pokemonMatch = pathname.match(/^\/api\/v2\/pokemon\/([^/]+)\/?$/);
  if (pokemonMatch) {
    const pokemonName = decodeURIComponent(pokemonMatch[1]);
    const dbDir = await getDbDir();
    const pokemon = await readJson(path.join(dbDir, "pokemon", `${pokemonName}.json`));
    sendJson(res, 200, rewritePokemon(req, pokemon));
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

async function handleAdmin(req, res, pathname) {
  if (req.method !== "POST" || pathname !== "/api/admin/pokemon") {
    sendJson(res, 404, { error: "Admin route not found." });
    return;
  }

  const body = await parseJsonBody(req);
  const { pokemon, species, generationName } = body;
  const dbDir = GENERATED_DB_DIR;
  activeDbDir = GENERATED_DB_DIR;

  if (!pokemon?.name || !species?.name || !generationName) {
    sendJson(res, 400, {
      error: "Expected JSON with pokemon.name, species.name, and generationName.",
    });
    return;
  }

  await writeJson(path.join(dbDir, "pokemon", `${pokemon.name}.json`), pokemon);
  await writeJson(path.join(dbDir, "pokemon-species", `${species.name}.json`), species);

  const generationsPath = path.join(dbDir, "generations.json");
  const generations = await pathExists(generationsPath)
    ? await readJson(generationsPath)
    : { count: 0, next: null, previous: null, results: [] };
  let generationIndex = generations.results.findIndex(entry => entry.name === generationName);

  if (generationIndex === -1) {
    generations.results.push({
      id: generations.results.length + 1,
      name: generationName,
      url: `/api/v2/generation/${generationName}`,
    });
    generationIndex = generations.results.length - 1;
    await writeJson(path.join(dbDir, "generation", `${generationName}.json`), {
      id: generations.results[generationIndex].id,
      name: generationName,
      pokemon_species: [],
    });
  }

  generations.count = generations.results.length;
  await writeJson(generationsPath, generations);

  const generationPath = path.join(dbDir, "generation", `${generationName}.json`);
  const generation = await readJson(generationPath);
  const hasSpecies = generation.pokemon_species.some(entry => entry.name === species.name);

  if (!hasSpecies) {
    generation.pokemon_species.push({
      name: species.name,
      url: `/api/v2/pokemon-species/${species.name}`,
    });
    generation.pokemon_species.sort((a, b) => a.name.localeCompare(b.name));
    await writeJson(generationPath, generation);
  }

  sendJson(res, 201, {
    pokemon: rewritePokemon(req, pokemon),
    species: rewriteSpecies(req, species),
    generation: rewriteGeneration(req, generation),
  });
}

async function serveStatic(res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT_DIR, requestedPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const content = await fs.readFile(filePath);
  const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
  sendText(res, 200, content, contentType);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/v2/")) {
      await handleApi(req, res, url.pathname);
      return;
    }

    if (url.pathname.startsWith("/api/admin/")) {
      await handleAdmin(req, res, url.pathname);
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Resource not found." });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Pokemon EV calculator running at http://localhost:${PORT}`);
});
