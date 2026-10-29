import nombresPostres from "./nombresPostres.json";

const MODELO = "gemini-2.5-flash";
const TIMEOUT_MS = 8_000;
const CACHE_KEY = "traduccionesPostres";
const traduccionesPendientes = new Map();

const DICCIONARIO_ES = {
  almond: "almendra",
  almonds: "almendras",
  apple: "manzana",
  apples: "manzanas",
  banana: "banano",
  bananas: "bananos",
  berry: "frutos rojos",
  berries: "frutos rojos",
  bread: "pan",
  cake: "pastel",
  cakes: "pasteles",
  carrot: "zanahoria",
  cherry: "cereza",
  cherries: "cerezas",
  chocolate: "chocolate",
  coconut: "coco",
  cookie: "galleta",
  cookies: "galletas",
  cream: "crema",
  custard: "natilla",
  date: "dátil",
  dates: "dátiles",
  flour: "harina",
  ginger: "jengibre",
  ice: "hielo",
  lemon: "limón",
  lime: "lima",
  mango: "mango",
  milk: "leche",
  orange: "naranja",
  pancakes: "panqueques",
  peach: "durazno",
  pear: "pera",
  pie: "tarta",
  pineapple: "piña",
  pistachio: "pistacho",
  pudding: "pudín",
  pumpkin: "calabaza",
  raspberry: "frambuesa",
  rice: "arroz",
  strawberry: "fresa",
  strawberries: "fresas",
  sugar: "azúcar",
  tart: "tarta",
  vanilla: "vainilla",
  walnut: "nuez",
  walnuts: "nueces",
  "ice cream": "helado",
};

const FRASES_ES = {
  "apple pie": "tarta de manzana",
  "apple tart": "tarta de manzana",
  "banana cake": "pastel de banano",
  "chocolate cake": "pastel de chocolate",
  "chocolate cheesecake": "cheesecake de chocolate",
  "chocolate pudding": "pudín de chocolate",
  "coconut cake": "pastel de coco",
  "ice cream": "helado",
  "lemon cake": "pastel de limón",
  "lemon pie": "tarta de limón",
  "lemon tart": "tarta de limón",
  "rice pudding": "arroz con leche",
  "strawberry cheesecake": "cheesecake de fresa",
  "vanilla cake": "pastel de vainilla",
};

const DICCIONARIO_EN = {
  almendra: "almond",
  almendras: "almonds",
  arroz: "rice",
  banano: "banana",
  bananos: "bananas",
  bizcocho: "cake",
  calabaza: "pumpkin",
  cereza: "cherry",
  cerezas: "cherries",
  chocolate: "chocolate",
  coco: "coconut",
  crema: "cream",
  durazno: "peach",
  frambuesa: "raspberry",
  fresa: "strawberry",
  fresas: "strawberries",
  galleta: "cookie",
  galletas: "cookies",
  helado: "ice cream",
  harina: "flour",
  jengibre: "ginger",
  lima: "lime",
  limon: "lemon",
  leche: "milk",
  mango: "mango",
  manzana: "apple",
  manzanas: "apples",
  naranja: "orange",
  natilla: "custard",
  pan: "bread",
  panqueque: "pancake",
  panqueques: "pancakes",
  pastel: "cake",
  pasteles: "cakes",
  pera: "pear",
  piña: "pineapple",
  pistacho: "pistachio",
  pudin: "pudding",
  tarta: "pie",
  tartas: "pies",
  vainilla: "vanilla",
  zanahoria: "carrot",
  azucar: "sugar",
  datil: "date",
  datiles: "dates",
  nuez: "walnut",
  nueces: "walnuts",
};

const FRASES_EN = {
  "arroz con leche": "rice pudding",
  "pudin de arroz": "rice pudding",
  "pastel de banano": "banana cake",
  "pastel de chocolate": "chocolate cake",
  "pastel de coco": "coconut cake",
  "pastel de limon": "lemon cake",
  "pastel de manzana": "apple pie",
  "pastel de vainilla": "vanilla cake",
  "tarta de chocolate": "chocolate cake",
  "tarta de limon": "lemon pie",
  "tarta de manzana": "apple pie",
};

const normalizar = (texto = "") =>
  texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const nombresPostresNormalizados = new Map(
  Object.entries(nombresPostres).map(([original, traducido]) => [normalizar(original), traducido])
);

export function obtenerNombrePostreEspanol(original) {
  return nombresPostres[original] || nombresPostresNormalizados.get(normalizar(original)) || null;
}

function leerCache() {
  try {
    const cache = JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY) || "{}");
    return cache && typeof cache === "object" && !Array.isArray(cache) ? cache : {};
  } catch {
    return {};
  }
}

function guardarCache(cache) {
  try {
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // La traducción sigue funcionando aunque el navegador no permita guardar caché.
  }
}

function traducirLocal(nombre) {
  const clave = normalizar(nombre);
  if (FRASES_ES[clave]) return FRASES_ES[clave];

  const palabras = clave.split(" ").filter(Boolean);
  const conectores = new Set(["a", "and", "of", "the", "with"]);
  const traducidas = [];
  for (let indice = 0; indice < palabras.length; indice += 1) {
    const palabra = palabras[indice];
    if (palabra === "ice" && palabras[indice + 1] === "cream") {
      traducidas.push("helado");
      indice += 1;
      continue;
    }
    if (conectores.has(palabra)) {
      if (palabra === "and") traducidas.push("y");
      continue;
    }
    traducidas.push(DICCIONARIO_ES[palabra]);
  }
  if (traducidas.some((palabra) => palabra === undefined)) return null;

  const resultado = traducidas.filter(Boolean).join(" ");
  if (!resultado) return null;
  return resultado.charAt(0).toLocaleUpperCase("es") + resultado.slice(1);
}

function traducirBusquedaLocal(busqueda) {
  const clave = normalizar(busqueda);
  if (FRASES_EN[clave]) return FRASES_EN[clave];

  const palabras = clave.split(" ").filter((palabra) => !["de", "del", "el", "la", "los", "las", "con", "y"].includes(palabra));
  const traducidas = palabras.map((palabra) => DICCIONARIO_EN[palabra]);
  if (!palabras.length || traducidas.some((palabra) => !palabra)) return null;
  return traducidas.join(" ");
}

function extraerTexto(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((parte) => parte.text || "")
    .join("")
    .trim() || "";
}

async function consultarGemini(prompt) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODELO,
        action: "generateContent",
        request: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    return extraerTexto(await response.json());
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function limpiarJson(texto) {
  return texto.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
}

async function traducirLote(nombres) {
  try {
    const respuesta = await consultarGemini(
      `Traduce al español estos nombres de postres. Responde SOLO un arreglo JSON en el mismo orden, sin texto adicional. Conserva los nombres propios (por ejemplo 'Banoffee Pie' puede quedar 'Pastel Banoffee').\n${JSON.stringify(nombres)}`
    );
    const traducidos = JSON.parse(limpiarJson(respuesta));
    if (!Array.isArray(traducidos) || traducidos.length !== nombres.length) return {};
    return Object.fromEntries(
      nombres.map((nombre, indice) => [
        nombre,
        typeof traducidos[indice] === "string" && traducidos[indice].trim()
          ? traducidos[indice].trim()
          : nombre,
      ])
    );
  } catch {
    return {};
  }
}

export async function traducirNombres(listaDeNombres) {
  const nombres = [...new Set(listaDeNombres.filter((nombre) => typeof nombre === "string" && nombre.trim()))];
  const cache = leerCache();
  const resultado = {};
  const pendientes = [];

  for (const nombre of nombres) {
    const nombreDelDiccionario = obtenerNombrePostreEspanol(nombre);
    if (nombreDelDiccionario) {
      resultado[nombre] = nombreDelDiccionario;
      cache[nombre] = nombreDelDiccionario;
    } else if (typeof cache[nombre] === "string" && cache[nombre].trim()) {
      resultado[nombre] = cache[nombre];
    } else {
      const local = traducirLocal(nombre);
      if (local) {
        resultado[nombre] = local;
        cache[nombre] = local;
      } else {
        pendientes.push(nombre);
      }
    }
  }
  guardarCache(cache);

  const porTraducir = pendientes.filter((nombre) => !traduccionesPendientes.has(nombre));
  if (porTraducir.length) {
    const lote = traducirLote(porTraducir).then((traducciones) => {
      const cacheActual = leerCache();
      for (const nombre of porTraducir) {
        if (traducciones[nombre] && traducciones[nombre] !== nombre) {
          cacheActual[nombre] = traducciones[nombre];
        }
      }
      guardarCache(cacheActual);
      return traducciones;
    }).finally(() => {
      porTraducir.forEach((nombre) => traduccionesPendientes.delete(nombre));
    });
    porTraducir.forEach((nombre) => {
      traduccionesPendientes.set(nombre, lote.then((traducciones) => traducciones[nombre] || nombre));
    });
  }

  await Promise.all(pendientes.map(async (nombre) => {
    resultado[nombre] = traduccionesPendientes.has(nombre)
      ? await traduccionesPendientes.get(nombre)
      : nombre;
  }));
  return resultado;
}

export async function traducirBusquedaAlIngles(busqueda) {
  const texto = busqueda.trim();
  if (!texto) return "";
  const local = traducirBusquedaLocal(texto);
  if (local) return local;
  try {
    const respuesta = await consultarGemini(
      `Traduce al inglés esta búsqueda de postre o ingrediente escrita en español. Responde solo con la traducción en inglés, sin comillas ni explicación: ${texto}`
    );
    return limpiarJson(respuesta).replace(/^["']|["']$/g, "").trim() || texto;
  } catch {
    return texto;
  }
}

export function coincideNombreTraducido(nombre, original, busqueda) {
  const consulta = normalizar(busqueda);
  if (!consulta) return true;
  const nombreJson = obtenerNombrePostreEspanol(original);
  const textoEspanol = normalizar(nombreJson || nombre);
  if (textoEspanol.includes(consulta)) return true;

  const texto = `${textoEspanol} ${normalizar(nombre)} ${normalizar(original)}`;
  if (texto.includes(consulta)) return true;
  const tokens = consulta.split(" ").filter((token) => !["de", "del", "el", "la", "los", "las", "con", "y"].includes(token));
  const sinonimos = {
    pastel: ["pastel", "tarta", "cake", "pie", "tart", "gateau"],
    tarta: ["tarta", "pastel", "cake", "pie", "tart", "gateau"],
    pudin: ["pudin", "pudding", "natilla"],
    natilla: ["natilla", "custard", "pudin", "pudding"],
    manzana: ["manzana", "apple"],
    arroz: ["arroz", "rice"],
    banano: ["banano", "banana"],
    coco: ["coco", "coconut"],
    fresa: ["fresa", "strawberry"],
    limon: ["limon", "lemon"],
  };
  return tokens.length > 0 && tokens.every((token) =>
    (sinonimos[token] || [token]).some((variante) => texto.includes(normalizar(variante)))
  );
}
