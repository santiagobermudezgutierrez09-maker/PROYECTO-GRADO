const KEY = import.meta.env.VITE_GEMINI_KEY;
const MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20_000;
const CHAT_TIMEOUT_MS = 6_000;
const TRADUCCION_CACHE_PREFIX = "charinCook:traduccion:v1:";
const TRADUCCION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const traduccionesCache = new Map();
const traduccionesPendientes = new Map();

class ErrorGemini extends Error {
  constructor(status, responseBody, message) {
    super(message);
    this.name = "ErrorGemini";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function registrarErrorGemini(error) {
  console.error("Fallo en la solicitud a Gemini.", {
    status: error?.status ?? null,
    responseBody: error?.responseBody || error?.message || "Sin cuerpo de respuesta HTTP.",
  });
}

function extraerTexto(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((parte) => parte.text || "")
    .join("") || "";
}

async function solicitarGemini(url, body, timeoutMs, { streaming = false, onChunk } = {}) {
  const controller = new AbortController();
  let agotado = false;
  const timeoutId = globalThis.setTimeout(() => {
    agotado = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const responseBody = await res.text();
      throw new ErrorGemini(
        res.status,
        responseBody,
        `Gemini HTTP ${res.status}: ${responseBody || res.statusText}`
      );
    }

    if (!streaming) return await res.json();
    if (!res.body?.getReader) {
      const data = await res.json();
      const text = extraerTexto(data);
      if (!text) throw new ErrorGemini(res.status, "", "Gemini respondió sin texto.");
      onChunk?.(text);
      return text;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let respuesta = "";
    let falloParseo;

    const procesarEventos = (bloque, ultimo = false) => {
      const eventos = bloque.split(/\r?\n\r?\n/);
      buffer = ultimo ? "" : eventos.pop() || "";
      for (const evento of eventos) {
        const datos = evento
          .split(/\r?\n/)
          .filter((linea) => linea.startsWith("data:"))
          .map((linea) => linea.slice(5).trim())
          .join("\n");
        if (!datos || datos === "[DONE]") continue;
        try {
          const objeto = JSON.parse(datos);
          const fragmento = extraerTexto(objeto);
          if (fragmento) {
            respuesta += fragmento;
            onChunk?.(respuesta);
          }
        } catch (error) {
          falloParseo = error;
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      procesarEventos(buffer);
    }
    buffer += decoder.decode();
    if (buffer.trim()) procesarEventos(`${buffer}\n\n`, true);
    if (falloParseo) throw new ErrorGemini(res.status, "", "La respuesta de Gemini llegó con formato inválido.");
    if (!respuesta.trim()) throw new ErrorGemini(res.status, "", "Gemini respondió sin texto.");
    return respuesta;
  } catch (error) {
    const fallo = agotado
      ? new ErrorGemini(null, "", `Gemini no respondió dentro de ${timeoutMs / 1000} segundos.`)
      : error instanceof ErrorGemini
        ? error
        : new ErrorGemini(null, "", error?.message || "Error de red al conectar con Gemini.");
    registrarErrorGemini(fallo);
    throw fallo;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function traduccionValida(resultado) {
  return (
    resultado &&
    typeof resultado.nombre === "string" &&
    Array.isArray(resultado.ingredientes) &&
    resultado.ingredientes.every((item) => typeof item === "string") &&
    Array.isArray(resultado.pasos) &&
    resultado.pasos.every((item) => typeof item === "string")
  );
}

function leerTraduccionCache(id) {
  if (!id) return null;
  const cacheada = traduccionesCache.get(id);
  if (cacheada) return cacheada;

  try {
    const bruto = globalThis.localStorage?.getItem(`${TRADUCCION_CACHE_PREFIX}${id}`);
    if (!bruto) return null;
    const guardada = JSON.parse(bruto);
    if (
      !Number.isFinite(guardada.timestamp) ||
      Date.now() - guardada.timestamp > TRADUCCION_CACHE_TTL_MS ||
      !traduccionValida(guardada.traduccion)
    ) {
      globalThis.localStorage.removeItem(`${TRADUCCION_CACHE_PREFIX}${id}`);
      return null;
    }
    traduccionesCache.set(id, guardada.traduccion);
    return guardada.traduccion;
  } catch (error) {
    console.warn("No se pudo leer la caché local de traducciones.", error);
    return null;
  }
}

function guardarTraduccionCache(id, traduccion) {
  if (!id) return;
  traduccionesCache.set(id, traduccion);
  try {
    globalThis.localStorage?.setItem(
      `${TRADUCCION_CACHE_PREFIX}${id}`,
      JSON.stringify({ timestamp: Date.now(), traduccion })
    );
  } catch (error) {
    console.warn("No se pudo guardar la caché local de traducciones.", error);
  }
}

function analizarTraduccion(texto) {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpio.indexOf("{");
  const final = limpio.lastIndexOf("}");
  if (inicio < 0 || final <= inicio) throw new Error("Gemini devolvió una traducción sin formato JSON.");

  let resultado;
  try {
    resultado = JSON.parse(limpio.slice(inicio, final + 1));
  } catch {
    throw new Error("Gemini devolvió una traducción con formato JSON inválido.");
  }
  if (!traduccionValida(resultado)) {
    throw new Error("Gemini devolvió una traducción incompleta.");
  }
  return resultado;
}

function esReintentable(error) {
  return error.status == null || error.status === 429 || error.status >= 500;
}

function contenidoAlternado(historial, mensaje) {
  const contenidos = [];
  for (const item of historial) {
    if (!item || typeof item.texto !== "string" || !item.texto.trim()) continue;
    const role = item.rol === "bot" || item.rol === "model" ? "model" : "user";
    if (role === "model" && contenidos.length === 0) continue;
    const ultimo = contenidos[contenidos.length - 1];
    if (ultimo?.role === role) {
      ultimo.parts[0].text += `\n${item.texto.trim()}`;
    } else {
      contenidos.push({ role, parts: [{ text: item.texto.trim() }] });
    }
  }

  const ultimo = contenidos[contenidos.length - 1];
  if (ultimo?.role === "user") {
    ultimo.parts[0].text += `\n${mensaje}`;
  } else {
    contenidos.push({ role: "user", parts: [{ text: mensaje }] });
  }
  return contenidos;
}

function minimoContents(contents, systemText) {
  const resultado = contents.map((item) => ({
    role: item.role,
    parts: item.parts.map((parte) => ({ ...parte })),
  }));
  if (!resultado.length || resultado[0].role !== "user") {
    throw new Error("El historial no inicia con un mensaje de usuario.");
  }
  if (systemText) {
    resultado[0].parts[0].text = `${systemText}\n\n${resultado[0].parts[0].text}`;
  }
  return resultado;
}

async function conReintentoMinimo({
  url,
  body,
  contents,
  systemText,
  timeoutMs,
  streaming = false,
  onChunk,
}) {
  const deadline = Date.now() + timeoutMs;
  try {
    return await solicitarGemini(url, body, Math.max(1, deadline - Date.now()), {
      streaming,
      onChunk,
    });
  } catch (error) {
    if (error.status !== 400 && error.status !== 404) throw error;

    const restantes = deadline - Date.now();
    if (restantes <= 0) throw error;

    const contenidoMinimo = minimoContents(contents, systemText);
    const urlMinima = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const data = await solicitarGemini(urlMinima, { contents: contenidoMinimo }, restantes);
    const texto = extraerTexto(data);
    if (!texto) throw new ErrorGemini(null, "", "Gemini respondió sin texto tras reintentar.");
    onChunk?.(texto);
    return texto;
  }
}

const BASE = `Eres el asistente de CharinCook. Responde en español de forma natural, clara y directa, como un asistente conversacional; no adoptes un personaje ni uses frases de relleno.
Puedes conversar sobre cualquier tema. Si la pregunta es de cocina, ayuda con recetas, ingredientes, sustituciones y técnicas.
Si el mensaje es vago o contiene una sola palabra, interpreta primero la intención más probable en el contexto de cocina y sugiere unas cuantas recetas o ideas relacionadas sin pedir aclaraciones. No limites las sugerencias a postres.
Responde con la extensión adecuada: breve para preguntas simples y detallada cuando pidan una receta. No termines siempre con una pregunta y evita los emojis, salvo que encajen de forma natural.
Detecta primero si pregunta por sustituciones, ingredientes, pasos o tiempo; responde a esa intención antes de buscar una receta por nombre.
Usa el contexto de la receta actual y el paso indicado. No inventes datos; si no sabes algo, dilo con honestidad.`;

const CONTEXTO = {
  home: "El usuario está en la pantalla de inicio. Ayúdale a decidir qué preparar hoy.",
  generador:
    "El usuario está en la pantalla '¿Qué puedo cocinar?', donde escribe los ingredientes que tiene. Ayúdale a decidir qué hacer con lo que tiene, qué le falta y por qué puede sustituirlo.",
  cocina:
    "El usuario está en 'Modo cocina', siguiendo una receta paso a paso con las manos ocupadas. Sé muy breve y práctico: tiempos, punto de cocción, qué hacer si algo sale mal.",
  api: "El usuario está en 'Más postres', explorando ideas de postres de todo el mundo. Cuéntale curiosidades, de dónde viene cada postre y cómo prepararlo.",
  fechas:
    "El usuario está en 'Fechas y eventos', planeando una receta para una ocasión especial. Sugiere postres según la ocasión, el número de invitados y el tiempo que tiene para prepararlo.",
};

export const limpiarRespuestaChef = (texto) =>
  texto
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*\*\s/gm, "• ");

// Saludo según la hora del día, usando el nombre si se conoce
export function saludoPorHora(nombre = "") {
  const h = new Date().getHours();
  const momento = h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches";
  const primerNombre = nombre && !nombre.includes("@") ? nombre.trim().split(/\s+/)[0] : "";
  return `${momento}${primerNombre ? `, ${primerNombre}` : ""}!`;
}

function momentoDelDia() {
  const h = new Date().getHours();
  return h < 12 ? "mañana" : h < 19 ? "tarde" : "noche";
}

// "contextoExtra" sirve para darle a Charin datos extra (por ejemplo, la receta y el paso en que va el usuario)
// "nombreUsuario" es opcional: sirve para hablarle por su nombre
export async function preguntarChef(
  historial,
  mensaje,
  vista = "home",
  contextoExtra = "",
  nombreUsuario = "",
  onChunk
) {
  if (!KEY) {
    const error = new ErrorGemini(
      null,
      "Falta configurar VITE_GEMINI_KEY en el archivo .env.local.",
      "Falta configurar VITE_GEMINI_KEY en el archivo .env.local."
    );
    registrarErrorGemini(error);
    throw error;
  }

  const reciente = historial
    .filter((item) => item && typeof item.texto === "string" && item.texto.trim())
    .slice(-6);
  const contents = contenidoAlternado(reciente, mensaje);

  const datosUsuario =
    nombreUsuario && !nombreUsuario.includes("@")
      ? `\nEl usuario se llama ${nombreUsuario}.`
      : "";

  const systemText = `${BASE}\n\nCONTEXTO ACTUAL: ${CONTEXTO[vista] || CONTEXTO.home}\nEs de ${momentoDelDia()} en Colombia.${datosUsuario}${
    contextoExtra ? `\n\n${contextoExtra}` : ""
  }`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;
  return conReintentoMinimo({
    url,
    body: {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
    },
    contents,
    systemText,
    timeoutMs: CHAT_TIMEOUT_MS,
    streaming: true,
    onChunk,
  });
}

export function explicarErrorGemini(error) {
  const mensaje = error instanceof Error ? error.message : "";
  if (mensaje.includes("Falta configurar")) {
    return "La traducción no está disponible ahora; puedes consultar la receta original.";
  }
  if (mensaje.includes("superó el límite") || mensaje.includes("6 segundos")) {
    return "Gemini está tardando más de lo normal.";
  }
  if (mensaje.includes("Error 429")) {
    return "Gemini está ocupado. Espera un momento e inténtalo de nuevo.";
  }
  if (mensaje.includes("Error 401") || mensaje.includes("Error 403")) {
    return "Gemini rechazó la solicitud. Revisa la configuración de la API.";
  }
  if (mensaje.includes("Error 400") || mensaje.includes("Error 404")) {
    return "Gemini rechazó la solicitud. Revisa el modelo y la configuración de la API.";
  }
  if (/Error 5\d\d/.test(mensaje)) {
    return "Gemini no está disponible temporalmente. Inténtalo de nuevo en un momento.";
  }
  if (mensaje.includes("Sin respuesta")) {
    return "Gemini no pudo responder esa pregunta. Prueba decirlo de otra manera.";
  }
  return "No pude conectar con Gemini. Revisa tu conexión e inténtalo de nuevo.";
}

// Traduce una receta de TheMealDB (inglés) al español
export async function traducirReceta({ id, nombre, ingredientes, instrucciones }) {
  const cacheada = leerTraduccionCache(id);
  if (cacheada) return cacheada;
  if (id && traduccionesPendientes.has(id)) return traduccionesPendientes.get(id);

  if (!KEY) {
    const error = new ErrorGemini(
      null,
      "Falta configurar VITE_GEMINI_KEY en el archivo .env.local.",
      "Falta configurar VITE_GEMINI_KEY en el archivo .env.local."
    );
    registrarErrorGemini(error);
    throw error;
  }

  const solicitud = traducirRecetaSinCache({ id, nombre, ingredientes, instrucciones });
  if (id) traduccionesPendientes.set(id, solicitud);
  try {
    const resultado = await solicitud;
    guardarTraduccionCache(id, resultado);
    return resultado;
  } finally {
    if (id) traduccionesPendientes.delete(id);
  }
}

async function traducirRecetaSinCache({ nombre, ingredientes, instrucciones }) {
  const prompt = `Traduce al español natural y claro esta receta de postre.
Conserva todos los ingredientes, cantidades y pasos, en el mismo orden; no omitas ni combines pasos.
Convierte las instrucciones en pasos claros (sin numerarlos en el texto).
Pasa las medidas a español (cup = taza, tbsp = cucharada, tsp = cucharadita, etc.) sin cambiar las cantidades.
Conserva sin traducir los nombres propios, marcas y nombres de lugares. El nombre propio "Charin Cook" debe conservarse exactamente así.
Responde SOLO con JSON con esta forma exacta:
{"nombre": "...", "ingredientes": ["..."], "pasos": ["..."]}

NOMBRE: ${nombre}
INGREDIENTES:
${ingredientes.map((i) => "- " + i).join("\n")}
INSTRUCCIONES:
${String(instrucciones).slice(0, 6000)}`;

  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  let ultimoError;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const respuesta = await conReintentoMinimo({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        body: {
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        },
        contents,
        systemText: "",
        timeoutMs: TIMEOUT_MS,
      });
      const texto = typeof respuesta === "string" ? respuesta : extraerTexto(respuesta);
      if (!texto) throw new Error("Gemini respondió sin texto.");
      const resultado = analizarTraduccion(texto);
      return {
        ...resultado,
        nombre: nombre.includes("Charin Cook") ? nombre : resultado.nombre || nombre,
      };
    } catch (error) {
      ultimoError = error;
      if (intento === 1 || !esReintentable(error)) throw error;
      await new Promise((resolve) => globalThis.setTimeout(resolve, 600));
    }
  }
  throw ultimoError;
}