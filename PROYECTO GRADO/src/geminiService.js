const MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20_000;
const CHAT_TIMEOUT_MS = 25_000;
const CHAT_RETRY_DELAY_MS = 1_000;
const CHAT_MAX_ATTEMPTS = 3;
const MODEL_LIST_TIMEOUT_MS = 5_000;
const TRADUCCION_CACHE_PREFIX = "charinCook:traduccion:v1:";
const TRADUCCION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const traduccionesCache = new Map();
const traduccionesPendientes = new Map();
let modelosFlashDisponiblesPromise;

class ErrorGemini extends Error {
  constructor(status, responseBody, message, code = "") {
    super(message);
    this.name = "ErrorGemini";
    this.status = status;
    this.responseBody = responseBody;
    this.code = code;
  }
}

function registrarErrorGemini(error, modelo = null) {
  const mensaje = error?.message || "Error desconocido.";
  const mensajeGemini = error?.responseBody || error?.message || "Sin mensaje de Gemini.";
  console.error("Fallo en la solicitud a Gemini.", {
    modelo,
    status: error?.status ?? null,
    message: mensaje,
    geminiMessage: mensajeGemini.slice(0, 2_000),
  });
}

function solicitudProxy(url, body, signal) {
  const ruta = new URL(url).pathname;
  const coincidencia = ruta.match(
    /\/v1beta\/models\/(gemini-[A-Za-z0-9._-]+):(generateContent|streamGenerateContent)$/
  );
  if (!coincidencia) throw new Error("La solicitud a Gemini tiene una ruta no válida.");
  return fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: coincidencia[1],
      action: coincidencia[2],
      request: body,
    }),
    signal,
  });
}

function extraerTexto(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((parte) => parte.text || "")
    .join("") || "";
}

async function solicitarGemini(
  url,
  body,
  timeoutMs,
  { streaming = false, onChunk, modelo = null } = {}
) {
  const controller = new AbortController();
  let agotado = false;
  const timeoutId = globalThis.setTimeout(() => {
    agotado = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await solicitudProxy(url, body, controller.signal);
    if (!res.ok) {
      const responseBody = await res.text();
      let mensaje = responseBody || res.statusText;
      let code = res.status === 504 ? "TIMEOUT" : "";
      try {
        const detalle = JSON.parse(responseBody);
        mensaje = detalle.error || mensaje;
        code = detalle.code || code;
      } catch {
        // El proxy o Gemini pueden responder texto sin formato JSON.
      }
      throw new ErrorGemini(
        res.status,
        responseBody,
        `Gemini HTTP ${res.status}: ${mensaje}`,
        code
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
      ? new ErrorGemini(
          null,
          "",
          `Gemini no respondió dentro de ${timeoutMs / 1000} segundos.`,
          "TIMEOUT"
        )
      : error instanceof ErrorGemini
        ? error
        : new ErrorGemini(null, "", error?.message || "Error de red al conectar con Gemini.");
    registrarErrorGemini(fallo, modelo);
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
  try {
    return await solicitarGemini(url, body, timeoutMs, {
      streaming,
      onChunk,
    });
  } catch (error) {
    if (error.status !== 400 && error.status !== 404) throw error;

    const contenidoMinimo = minimoContents(contents, systemText);
    const urlMinima = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const data = await solicitarGemini(
      urlMinima,
      { contents: contenidoMinimo },
      timeoutMs
    );
    const texto = extraerTexto(data);
    if (!texto) throw new ErrorGemini(null, "", "Gemini respondió sin texto tras reintentar.");
    onChunk?.(texto);
    return texto;
  }
}

const modeloEsFlash = (modelo) =>
  modelo.toLowerCase().includes("flash") &&
  !modelo.toLowerCase().includes("embedding");

async function consultarModelosFlashDisponibles() {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    MODEL_LIST_TIMEOUT_MS
  );

  try {
    const res = await fetch(
      "/api/gemini",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listModels" }),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new ErrorGemini(
        res.status,
        body,
        `Gemini HTTP ${res.status}: ${body || res.statusText}`
      );
    }

    const data = await res.json();
    return (data.models || [])
      .filter(
        (model) =>
          typeof model.name === "string" &&
          modeloEsFlash(model.name) &&
          model.supportedGenerationMethods?.includes("generateContent")
      )
      .map((model) => model.name.split("/").pop())
      .filter((modelo) => modelo !== MODEL)
      .sort((a, b) => {
        const esLiteA = a.toLowerCase().includes("flash-lite");
        const esLiteB = b.toLowerCase().includes("flash-lite");
        if (esLiteA !== esLiteB) return esLiteA ? -1 : 1;
        return b.localeCompare(a, undefined, { numeric: true });
      });
  } catch (error) {
    const fallo =
      error instanceof ErrorGemini
        ? error
        : new ErrorGemini(
            null,
            "",
            error?.name === "AbortError"
              ? "La consulta de modelos de Gemini superó el límite de tiempo."
              : error?.message || "No se pudo consultar la lista de modelos de Gemini."
          );
    registrarErrorGemini(fallo, "models.list");
    throw fallo;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function obtenerModelosFlashDisponibles() {
  if (!modelosFlashDisponiblesPromise) {
    modelosFlashDisponiblesPromise = consultarModelosFlashDisponibles().catch(
      (error) => {
        modelosFlashDisponiblesPromise = null;
        throw error;
      }
    );
  }
  return modelosFlashDisponiblesPromise;
}

function reintentarChat(error) {
  if (error?.code === "MISSING_API_KEY") return false;
  return (
    error?.code === "TIMEOUT" ||
    error?.status === 429 ||
    error?.status === 503 ||
    error?.status === 504
  );
}

async function solicitarChatConReintento(modelo, opciones) {
  let ultimoError;
  for (let intento = 0; intento < CHAT_MAX_ATTEMPTS; intento++) {
    try {
      return await solicitarChatEnModelo(modelo, opciones);
    } catch (error) {
      ultimoError = error;
      if (intento === CHAT_MAX_ATTEMPTS - 1 || !reintentarChat(error)) throw error;
      opciones.onChunk?.("");
      await new Promise((resolve) =>
        globalThis.setTimeout(resolve, CHAT_RETRY_DELAY_MS * 2 ** intento)
      );
    }
  }
  throw ultimoError;
}

async function solicitarChatEnModelo(
  modelo,
  { body, contents, systemText, onChunk }
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse`;
  try {
    const respuesta = await solicitarGemini(url, body, CHAT_TIMEOUT_MS, {
      streaming: true,
      onChunk,
      modelo,
    });
    return respuesta;
  } catch (error) {
    if (error.status !== 400) {
      throw error;
    }
    const urlMinima = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
    const data = await solicitarGemini(
      urlMinima,
      { contents: minimoContents(contents, systemText) },
      CHAT_TIMEOUT_MS,
      { modelo }
    );
    const texto = extraerTexto(data);
    if (!texto) {
      const fallo = new ErrorGemini(
        null,
        "",
        "Gemini respondió sin texto tras reintentar.",
        "EMPTY_RESPONSE"
      );
      registrarErrorGemini(fallo, modelo);
      throw fallo;
    }
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
  const opciones = {
    body: {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
    },
    contents,
    systemText,
    onChunk,
  };

  try {
    return await solicitarChatConReintento(MODEL, opciones);
  } catch (error) {
    if (
      error.code === "MISSING_API_KEY" ||
      (error.status !== 404 &&
        error.status !== 503 &&
        error.code !== "TIMEOUT")
    ) {
      throw error;
    }
    onChunk?.("");

    let modelosDisponibles;
    try {
      modelosDisponibles = await obtenerModelosFlashDisponibles();
    } catch {
      throw error;
    }

    const modeloRespaldo = modelosDisponibles[0];
    if (!modeloRespaldo) throw error;
    console.warn("Gemini usará un modelo Flash de respaldo disponible.", {
      modeloPrincipal: MODEL,
      modeloRespaldo,
    });
    return solicitarChatConReintento(modeloRespaldo, opciones);
  }
}

function extraerMensajeGemini(error) {
  const cuerpo = error?.responseBody;
  if (typeof cuerpo === "string" && cuerpo) {
    try {
      const proxy = JSON.parse(cuerpo);
      const detalle =
        typeof proxy.error === "string" ? JSON.parse(proxy.error) : proxy.error;
      const mensaje = detalle?.error?.message || detalle?.message;
      if (typeof mensaje === "string" && mensaje.trim()) return mensaje.trim();
    } catch {
      if (cuerpo.length < 500) return cuerpo;
    }
  }

  const mensaje = error?.message || "";
  const coincidencia = mensaje.match(/Gemini HTTP \d+:\s*(.+)$/s);
  return coincidencia?.[1]?.slice(0, 500) || "sin detalle proporcionado";
}

export function explicarErrorGemini(error) {
  const mensaje = error instanceof Error ? error.message : "";
  if (error?.code === "MISSING_API_KEY") {
    return "El asistente no está configurado. Añade GEMINI_API_KEY en las variables de entorno de Vercel.";
  }
  if (error?.status === 403) {
    return "Google rechazó la clave de Gemini (HTTP 403). Puede estar restringida o revocada. Revisa su estado y las restricciones del proyecto en Google AI Studio → API keys.";
  }
  if (error?.status === 429 || error?.status === 503) {
    return "Hay mucha gente usando el asistente. Inténtalo de nuevo en unos segundos.";
  }
  if (
    error?.code === "TIMEOUT" ||
    mensaje.includes("superó el límite") ||
    mensaje.includes("25 segundos")
  ) {
    return "Gemini está tardando más de lo normal.";
  }
  if (mensaje.includes("Error 401") || mensaje.includes("Error 403")) {
    return "Gemini rechazó la solicitud. Revisa la configuración de la API.";
  }
  if (
    error?.status === 400 ||
    error?.status === 404 ||
    mensaje.includes("Error 400") ||
    mensaje.includes("Error 404")
  ) {
    const status = error?.status || Number(mensaje.match(/Error (\d{3})/)?.[1]);
    return `Gemini rechazó la solicitud (HTTP ${status}): ${extraerMensajeGemini(error)}`;
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