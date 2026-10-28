const API = "https://www.themealdb.com/api/json/v1/1";
const TIMEOUT_MS = 8_000;
const CACHE_MS = 30 * 60 * 1_000;
const cache = new Map();
const pending = new Map();

function esperar(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function obtenerJson(url) {
  let ultimoError;

  for (let intento = 0; intento < 2; intento += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      ultimoError = error;
      if (intento === 0) await esperar(300);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (ultimoError?.name === "AbortError") {
    throw new Error("La conexión con TheMealDB tardó más de 8 segundos.");
  }
  throw new Error("No se pudo conectar con TheMealDB después de reintentar.", {
    cause: ultimoError,
  });
}

function conCache(clave, url, seleccionar = (resultado) => resultado) {
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.guardadoEn < CACHE_MS) {
    return Promise.resolve(guardado.valor);
  }

  const solicitud = pending.get(clave);
  if (solicitud) return solicitud;

  const promesa = obtenerJson(url)
    .then((resultado) => {
      const valor = seleccionar(resultado);
      cache.set(clave, { valor, guardadoEn: Date.now() });
      return valor;
    })
    .finally(() => pending.delete(clave));

  pending.set(clave, promesa);
  return promesa;
}

export function obtenerPostres() {
  return conCache("desserts", `${API}/filter.php?c=Dessert`, (data) => data.meals || []);
}

export function obtenerDetallePostre(id) {
  return conCache(`detail:${id}`, `${API}/lookup.php?i=${encodeURIComponent(id)}`, (data) => {
    const receta = data.meals?.[0];
    if (!receta) throw new Error("TheMealDB no encontró el detalle de este postre.");
    return receta;
  });
}

const INGREDIENTES_API = {
  maduro: ["banana", "plantain"],
  platano: ["plantain", "banana"],
  "platano maduro": ["plantain", "banana"],
  banano: ["banana"],
  "banano maduro": ["banana"],
  azucar: ["sugar"],
  mantequilla: ["butter"],
  huevo: ["egg"],
  huevos: ["egg"],
  leche: ["milk"],
  harina: ["flour"],
};

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function buscarPostresPorIngrediente(ingrediente) {
  const termino = normalizar(ingrediente);
  const ingredienteApi = INGREDIENTES_API[termino] || [termino.replace(/\s+/g, "_")];
  const postres = await obtenerPostres();
  const idsPostres = new Set(postres.map((postre) => postre.idMeal));
  const respuestas = await Promise.allSettled(
    ingredienteApi.map((nombre) =>
      conCache(
        `ingredient:${nombre}`,
        `${API}/filter.php?i=${encodeURIComponent(nombre)}`,
        (data) => data.meals || []
      )
    )
  );
  const resultados = respuestas
    .filter((respuesta) => respuesta.status === "fulfilled")
    .map((respuesta) => respuesta.value);
  if (resultados.length === 0 && respuestas.length > 0) {
    const fallo = respuestas.find((respuesta) => respuesta.status === "rejected");
    throw fallo.reason;
  }
  const unicos = new Map();
  resultados.flat().forEach((postre) => {
    if (idsPostres.has(postre.idMeal)) unicos.set(postre.idMeal, postre.strMeal);
  });
  return [...unicos.values()];
}
