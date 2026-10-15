const KEY = import.meta.env.VITE_GEMINI_KEY;
const MODEL = "gemini-3.5-flash-lite";

const BASE = `Eres Charin, una dona chef amable, alegre y paciente que vive en la app "Charin Cook",
especializada en postres. Ayudas al usuario a cocinar: sugieres recetas, dices qué ingredientes
faltan, propones sustituciones, explicas técnicas, tiempos, temperaturas, utensilios y cómo conservar.

REGLAS:
- Responde SIEMPRE en español, corto (máximo 5 frases) y con calidez. Puedes usar 1 o 2 emojis.
- NO uses markdown: nada de asteriscos ni títulos. Si das pasos o ingredientes, usa líneas simples con guion.
- SOLO hablas de cocina: recetas, ingredientes, sustituciones, técnicas, utensilios, postres y conservación de alimentos.
- Si preguntan algo que no tiene que ver con cocina, responde con amabilidad que solo puedes ayudar con cocina y ofrece una idea de receta.
- Si no estás seguro de algo (alergias, cantidades exactas, seguridad alimentaria), dilo con honestidad.`;

const CONTEXTO = {
  home: "El usuario está en la pantalla de inicio. Salúdalo y ayúdale a decidir qué postre preparar hoy.",
  generador:
    "El usuario está en la pantalla '¿Qué puedo cocinar?', donde escribe los ingredientes que tiene. Ayúdale a decidir qué postre hacer con lo que tiene, qué le falta y por qué puede sustituirlo.",
  cocina:
    "El usuario está en 'Modo cocina', siguiendo una receta paso a paso con las manos ocupadas. Sé muy breve y práctico: tiempos, punto de cocción, qué hacer si algo sale mal.",
  api: "El usuario está en 'Más postres', explorando ideas de postres de todo el mundo. Cuéntale curiosidades, de dónde viene cada postre y cómo prepararlo.",
  // 🍩 NUEVO
  fechas:
    "El usuario está en 'Fechas y eventos', planeando una receta para una ocasión especial. Sugiere postres según la ocasión, el número de invitados y el tiempo que tiene para prepararlo.",
};

export async function preguntarChef(historial, mensaje, vista = "home") {
  if (!KEY) {
    throw new Error("Falta configurar VITE_GEMINI_KEY en el archivo .env.local.");
  }

  // Solo mandamos los últimos mensajes para gastar menos cuota
  const reciente = historial.slice(-10);

  const contents = [
    ...reciente.map((m) => ({
      role: m.rol === "bot" ? "model" : "user",
      parts: [{ text: m.texto }],
    })),
    { role: "user", parts: [{ text: mensaje }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${BASE}\n\nCONTEXTO ACTUAL: ${CONTEXTO[vista] || CONTEXTO.home}` }],
        },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
    }
  );

  if (!res.ok) throw new Error("Error " + res.status);
  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Sin respuesta");
  return texto;
}

// 🍩 NUEVO: traduce una receta de TheMealDB (inglés) al español
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) throw new Error("Error " + res.status);
  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Sin respuesta");

  const resultado = JSON.parse(texto.replace(/```json|```/g, "").trim());
  if (!Array.isArray(resultado.pasos) || !Array.isArray(resultado.ingredientes)) {
    throw new Error("Formato inválido");
  }
  return resultado;
}