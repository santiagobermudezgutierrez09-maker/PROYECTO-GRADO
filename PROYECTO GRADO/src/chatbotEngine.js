// ============================================================
// MOTOR DEL CHATBOT (basado en reglas y palabras clave, SIN IA)
// ============================================================
// Como usa recetasData directamente, cualquier receta nueva que
// agregues ahí, el chatbot la conoce automáticamente.
//
// Mejoras de esta versión:
// - Reconoce coincidencias PARCIALES: si escribes "arroz", encuentra
//   cualquier receta cuyo nombre contenga "arroz", no solo el nombre completo.
// - También busca por INGREDIENTE: si escribes "banano", te dice en
//   qué recetas se usa, aunque no sea el nombre de ninguna receta.
// - Si hay varias coincidencias, te pregunta cuál te interesa.
// ============================================================

import recetas from "./recetasData";
import equivalencias from "./equivalencias";

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Palabras muy cortas o genéricas que no sirven para buscar
// (para que "de", "que", "el" no disparen búsquedas falsas)
const PALABRAS_IGNORADAS = [
  "de", "que", "el", "la", "los", "las", "un", "una", "y", "a", "con",
  "en", "por", "para", "es", "me", "mi", "lo", "se", "su", "al", "del",
];

// Saca del mensaje las palabras "útiles" (más de 2 letras, no genéricas)
function palabrasUtiles(mensajeNormalizado) {
  return mensajeNormalizado
    .split(/\s+/)
    .filter((palabra) => palabra.length > 2 && !PALABRAS_IGNORADAS.includes(palabra));
}

// Busca recetas cuyo NOMBRE coincida (completo o parcialmente) con el mensaje
function buscarRecetasPorNombre(mensajeNormalizado) {
  // Coincidencia completa: el nombre de la receta aparece dentro del mensaje
  const coincidenciaCompleta = recetas.filter((r) =>
    mensajeNormalizado.includes(normalizar(r.nombre))
  );
  if (coincidenciaCompleta.length > 0) return coincidenciaCompleta;

  // Coincidencia parcial: alguna palabra del mensaje aparece dentro del nombre
  const palabras = palabrasUtiles(mensajeNormalizado);
  if (palabras.length === 0) return [];

  return recetas.filter((r) => {
    const nombreNormalizado = normalizar(r.nombre);
    return palabras.some((palabra) => nombreNormalizado.includes(palabra));
  });
}

// Busca recetas que usan un ingrediente mencionado en el mensaje
function buscarRecetasPorIngrediente(mensajeNormalizado) {
  const palabras = palabrasUtiles(mensajeNormalizado);
  if (palabras.length === 0) return [];

  return recetas.filter((r) =>
    r.ingredientes.some((ing) => {
      const ingNormalizado = normalizar(ing);
      return palabras.some((palabra) => ingNormalizado.includes(palabra));
    })
  );
}

const intenciones = [
  { nombre: "saludo", palabras: ["hola", "buenas", "hey", "buenos dias", "buenas tardes", "buenas noches", "que tal"] },
  { nombre: "ayuda", palabras: ["ayuda", "que puedes hacer", "opciones", "menu", "que sabes hacer", "como funciona"] },
  { nombre: "tiempo", palabras: ["tiempo", "cuanto tarda", "cuanto demora", "cuanto dura", "minutos", "rapido", "lento"] },
  { nombre: "porciones", palabras: ["porciones", "personas", "rinde", "para cuantos", "cuantas porciones"] },
  { nombre: "ingredientes", palabras: ["ingredientes", "que necesito", "que lleva", "que le echo", "que compro", "lista de compras"] },
  { nombre: "sustituto", palabras: ["sustituto", "sustituir", "reemplazo", "reemplazar", "no tengo", "cambiar", "en vez de", "alternativa"] },
  { nombre: "pasos", palabras: ["pasos", "como se hace", "como preparo", "como cocino", "instrucciones", "procedimiento", "explica"] },
  { nombre: "paso_especifico", palabras: ["paso 1", "paso 2", "paso 3", "paso 4", "paso 5", "paso numero", "el paso"] },
  { nombre: "siguiente_paso", palabras: ["siguiente paso", "que sigue", "y ahora que", "despues que hago", "que hago ahora"] },
  { nombre: "dificultad", palabras: ["dificultad", "dificil", "facil", "complicado", "sencillo", "nivel"] },
  { nombre: "calorias", palabras: ["calorias", "cuanto engorda", "es saludable", "es sano", "kcal"] },
  { nombre: "dieta", palabras: ["dieta", "vegetariana", "vegetariano", "proteina", "es vegetariana", "sin carne"] },
  { nombre: "categoria", palabras: ["categoria", "tipo de receta", "es tradicional", "es fitness", "fecha especial"] },
  { nombre: "sugerencia", palabras: ["sugiereme", "recomiendame", "que cocino hoy", "no se que hacer", "sorprendeme", "algo rapido"] },
  { nombre: "agradecimiento", palabras: ["gracias", "genial", "perfecto", "excelente", "muy bien", "buenisimo"] },
  { nombre: "despedida", palabras: ["adios", "chao", "hasta luego", "nos vemos", "me voy"] },
];

function detectarIntencion(mensajeNormalizado) {
  let mejorIntencion = null;
  let mejorPuntaje = 0;

  intenciones.forEach((intencion) => {
    const puntaje = intencion.palabras.filter((palabra) => mensajeNormalizado.includes(palabra)).length;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorIntencion = intencion.nombre;
    }
  });

  return mejorIntencion;
}

function buscarSustitutoEnMensaje(mensajeNormalizado, recetaContexto) {
  if (recetaContexto) {
    const ingredienteEnReceta = recetaContexto.ingredientes.find((ing) =>
      mensajeNormalizado.includes(normalizar(ing))
    );
    if (ingredienteEnReceta) {
      const equivalencia = equivalencias.find(
        (eq) => normalizar(eq.original) === normalizar(ingredienteEnReceta)
      );
      if (equivalencia) {
        return `Puedes sustituir "${ingredienteEnReceta}" por "${equivalencia.sustituto}". Va a cambiar un poco el sabor, pero funciona bien.`;
      }
      return `Tengo registrado "${ingredienteEnReceta}" en esta receta, pero no tengo un sustituto guardado para él todavía.`;
    }
  }

  const equivalenciaGeneral = equivalencias.find((eq) =>
    mensajeNormalizado.includes(normalizar(eq.original))
  );
  if (equivalenciaGeneral) {
    return `Puedes sustituir "${equivalenciaGeneral.original}" por "${equivalenciaGeneral.sustituto}".`;
  }

  return null;
}

function extraerNumeroPaso(mensajeNormalizado) {
  const coincidencia = mensajeNormalizado.match(/paso\s*(\d+)/);
  return coincidencia ? parseInt(coincidencia[1], 10) : null;
}

function recetaAleatoria() {
  return recetas[Math.floor(Math.random() * recetas.length)];
}

// Presenta un resumen corto de una receta (se usa cuando el usuario
// solo menciona un nombre, sin decir qué quiere saber de ella)
function resumenReceta(receta) {
  return `"${receta.nombre}" (${receta.categoria}) — ${receta.tiempo} min, dificultad ${receta.dificultad}, ${receta.calorias} kcal. Puedes preguntarme por sus ingredientes, pasos, o sustitutos.`;
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
export function generarRespuesta(mensajeOriginal, recetaActiva = null, pasoActualIndex = null) {
  const mensaje = normalizar(mensajeOriginal);
  const intencion = detectarIntencion(mensaje);

  // Busca si el mensaje menciona alguna receta (completa o parcialmente)
  const recetasPorNombre = buscarRecetasPorNombre(mensaje);
  const recetaMencionada = recetasPorNombre.length === 1 ? recetasPorNombre[0] : null;
  const receta = recetaMencionada || recetaActiva;

  // -------- Si detectó una intención clara, respondemos con eso --------
  if (intencion) {
    switch (intencion) {
      case "saludo":
        return receta
          ? `¡Hola! Estoy contigo con la receta "${receta.nombre}". Pregúntame por tiempo, ingredientes, pasos, sustitutos, dificultad o calorías.`
          : "¡Hola! Soy el asistente de Charin Cook. Menciona el nombre (o parte del nombre) de una receta, o escribe 'ayuda'.";

      case "ayuda":
        return "Puedo ayudarte con: tiempo, porciones, ingredientes, sustitutos, pasos (incluso uno específico, ej: 'paso 2'), dificultad, calorías, dieta, y sugerirte algo si no sabes qué cocinar. También puedes escribir solo el nombre (o parte del nombre) de una receta, o un ingrediente, y te digo qué encuentro.";

      case "tiempo":
        return receta ? `"${receta.nombre}" toma aproximadamente ${receta.tiempo} minutos en total.` : "Dime el nombre de la receta y te digo cuánto tiempo toma.";

      case "porciones":
        return receta ? `"${receta.nombre}" rinde para ${receta.porciones} porciones.` : "Dime el nombre de la receta y te digo para cuántas porciones rinde.";

      case "ingredientes":
        return receta ? `Para "${receta.nombre}" necesitas: ${receta.ingredientes.join(", ")}.` : "Dime el nombre de la receta y te digo qué ingredientes necesitas.";

      case "sustituto": {
        const respuestaSustituto = buscarSustitutoEnMensaje(mensaje, receta);
        return respuestaSustituto || "Dime el nombre exacto del ingrediente que te falta (por ejemplo: 'sustituto para la mantequilla') y busco si tengo una alternativa registrada.";
      }

      case "paso_especifico": {
        if (!receta) return "Dime primero de qué receta hablamos (o selecciona una en Modo Cocina) para explicarte un paso.";
        const numero = extraerNumeroPaso(mensaje);
        if (!numero || numero < 1 || numero > receta.pasos.length) {
          return `Esta receta tiene ${receta.pasos.length} pasos. Dime cuál número quieres, por ejemplo "paso 1".`;
        }
        return `Paso ${numero} de "${receta.nombre}": ${receta.pasos[numero - 1]}`;
      }

      case "siguiente_paso":
        if (!receta) return "Selecciona una receta en Modo Cocina para poder guiarte paso a paso.";
        if (pasoActualIndex === null) {
          return "Usa los botones 'Atrás' y 'Siguiente' en Modo Cocina, o dime 'paso 1', 'paso 2', etc.";
        }
        if (pasoActualIndex + 1 >= receta.pasos.length) {
          return "¡Ya vas en el último paso! Cuando lo termines, tu receta está lista. 🎉";
        }
        return `El siguiente paso es: ${receta.pasos[pasoActualIndex + 1]}`;

      case "pasos":
        return receta
          ? `Los pasos de "${receta.nombre}" son:\n` + receta.pasos.map((p, i) => `${i + 1}. ${p}`).join("\n")
          : "Dime el nombre de la receta y te explico todos sus pasos.";

      case "dificultad":
        return receta ? `"${receta.nombre}" tiene una dificultad ${receta.dificultad}.` : "Dime el nombre de la receta y te digo qué tan difícil es.";

      case "calorias":
        return receta ? `"${receta.nombre}" tiene aproximadamente ${receta.calorias} kcal por porción.` : "Dime el nombre de la receta y te digo cuántas calorías tiene.";

      case "dieta":
        return receta ? `"${receta.nombre}" está clasificada como ${receta.dieta}.` : "Dime el nombre de la receta y te digo qué tipo de dieta es.";

      case "categoria":
        return receta ? `"${receta.nombre}" pertenece a la categoría "${receta.categoria}".` : "Dime el nombre de la receta y te digo a qué categoría pertenece.";

      case "sugerencia": {
        const sugerida = recetaAleatoria();
        return `Te sugiero probar "${sugerida.nombre}" — toma ${sugerida.tiempo} minutos y tiene dificultad ${sugerida.dificultad}. ¿Quieres que te cuente los ingredientes?`;
      }

      case "agradecimiento":
        return "¡De nada! Aquí estoy si necesitas algo más mientras cocinas. 😊";

      case "despedida":
        return "¡Hasta luego! Que disfrutes tu receta. 👋";

      default:
        break;
    }
  }

  // -------- No hubo intención clara: intenta identificar qué mencionó --------

  // Si el mensaje coincide con el nombre de UNA sola receta, da un resumen
  if (recetasPorNombre.length === 1) {
    return resumenReceta(recetasPorNombre[0]);
  }

  // Si coincide con VARIAS recetas por nombre, las lista y pide precisar
  if (recetasPorNombre.length > 1) {
    const nombres = recetasPorNombre.slice(0, 6).map((r) => r.nombre).join(", ");
    return `Encontré varias recetas con eso: ${nombres}. ¿Cuál te interesa? Escribe el nombre completo.`;
  }

  // Si no encontró receta por nombre, busca por ingrediente
  const recetasPorIngrediente = buscarRecetasPorIngrediente(mensaje);
  if (recetasPorIngrediente.length > 0) {
    const nombres = recetasPorIngrediente.slice(0, 6).map((r) => r.nombre).join(", ");
    return `Ese ingrediente se usa en estas recetas: ${nombres}. ¿Sobre cuál quieres saber más?`;
  }

  // Última opción: no encontró nada
  return receta
    ? `No entendí bien esa pregunta sobre "${receta.nombre}". Puedes preguntarme por tiempo, ingredientes, pasos, sustitutos, dificultad, calorías o dieta.`
    : "No encontré ninguna receta ni ingrediente relacionado con eso. Intenta con otro nombre, o escribe 'ayuda' para ver qué puedo hacer.";
}

export default generarRespuesta;