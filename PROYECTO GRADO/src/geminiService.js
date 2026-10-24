const KEY = import.meta.env.VITE_GEMINI_KEY;
const MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 10_000;

async function obtenerRespuestaGemini(url, body) {
  const controller = new AbortController();
  let agotado = false;
  const timeoutId = setTimeout(() => {
    agotado = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Error " + res.status);
    return await res.json();
  } catch (error) {
    if (agotado) throw new Error("La solicitud a Gemini superó el límite de 10 segundos.");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

const BASE = `Eres Charin, una dona chef amable, alegre y paciente que vive en la app "Charin Cook".
Ayudas con recetas, ingredientes, sustituciones, técnicas y tiempos, incluidos platos colombianos.
Contesta primero la pregunta concreta, con calidez y sin saludos o frases repetidas. Para dudas sencillas usa 2-4 frases; amplía si piden detalle. Habla con frases naturales y fáciles de escuchar. Interpreta errores pequeños del dictado usando el contexto; si no puedes saber qué quiso decir, pregunta en vez de adivinar.
Si piden una receta, ofrece ingredientes y pasos breves. No uses títulos ni formato recargado. Puedes usar un emoji ocasional. Mantén el foco en cocina; si no sabes algo o la pregunta es ajena, dilo con amabilidad.`;

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
  return `${momento}${primerNombre ? `, ${primerNombre}` : ""}! 🍩`;
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
  nombreUsuario = ""
) {
  if (!KEY) {
    throw new Error("Falta configurar VITE_GEMINI_KEY en el archivo .env.local.");
  }

  // Un par de turnos bastan para mantener el contexto sin alargar la solicitud.
  const reciente = historial
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .slice(-4);
  // Gemini exige que la conversación empiece con un mensaje del usuario
  while (reciente.length > 0 && reciente[0].rol === "bot") reciente.shift();

  const contents = [
    ...reciente.map((m) => ({
      role: m.rol === "bot" ? "model" : "user",
      parts: [{ text: m.texto }],
    })),
    { role: "user", parts: [{ text: mensaje }] },
  ];

  const datosUsuario =
    nombreUsuario && !nombreUsuario.includes("@")
      ? `\nEl usuario se llama ${nombreUsuario}.`
      : "";

  const data = await obtenerRespuestaGemini(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      systemInstruction: {
        parts: [
          {
            text: `${BASE}\n\nCONTEXTO ACTUAL: ${CONTEXTO[vista] || CONTEXTO.home}\nEs de ${momentoDelDia()} en Colombia.${datosUsuario}${
              contextoExtra ? `\n\n${contextoExtra}` : ""
            }`,
          },
        ],
      },
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 350 },
    }
  );
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Sin respuesta");
  return texto;
}

export function explicarErrorGemini(error) {
  const mensaje = error instanceof Error ? error.message : "";
  if (mensaje.includes("Falta configurar")) {
    console.warn("Gemini API key is not configured.", error);
    return "Charin no puede conectarse ahora, te doy una respuesta básica.";
  }
  if (mensaje.includes("superó el límite")) {
    return "Gemini está tardando más de lo normal. Inténtalo otra vez en un momento.";
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
export async function traducirReceta({ nombre, ingredientes, instrucciones }) {
  if (!KEY) {
    throw new Error("Falta configurar VITE_GEMINI_KEY en el archivo .env.local.");
  }

  const prompt = `Traduce al español natural y claro esta receta de postre.
Convierte las instrucciones en pasos cortos (sin numerarlos en el texto).
Mantén el mismo orden y la misma cantidad de ingredientes.
Pasa las medidas a español (cup = taza, tbsp = cucharada, tsp = cucharadita, etc.) sin cambiar las cantidades.
Responde SOLO con JSON con esta forma exacta:
{"nombre": "...", "ingredientes": ["..."], "pasos": ["..."]}

NOMBRE: ${nombre}
INGREDIENTES:
${ingredientes.map((i) => "- " + i).join("\n")}
INSTRUCCIONES:
${String(instrucciones).slice(0, 6000)}`;

  const data = await obtenerRespuestaGemini(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
      },
    }
  );
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Sin respuesta");

  const resultado = JSON.parse(texto.replace(/```json|```/g, "").trim());
  if (!Array.isArray(resultado.pasos) || !Array.isArray(resultado.ingredientes)) {
    throw new Error("Formato inválido");
  }
  return resultado;
}