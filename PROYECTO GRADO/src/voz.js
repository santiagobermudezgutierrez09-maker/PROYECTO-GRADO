/* ------------------------------------------------------------
   Ayudas para usar el micrófono (dictado) y la voz (lectura en voz alta)
   tanto en computador como en celular.
   ------------------------------------------------------------ */

export const Reconocimiento =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

// La voz del navegador lee mal los emojis: se quitan solo para hablar
export const sinEmojis = (t) =>
  t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\uFE0F/gu, "");

const AYUDA_PERMISO =
  "El micrófono está bloqueado. Toca el candado 🔒 que está junto a la dirección de la página, entra a Permisos (o Configuración del sitio), activa Micrófono y recarga la página. Mientras tanto puedes escribir tu pregunta.";

// Los navegadores que se abren dentro de otras apps (Instagram, Facebook...) no dejan usar el micrófono
function esNavegadorIntegrado() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|; wv\)/i.test(ua);
}

/**
 * Revisa que se pueda usar el micrófono y, si falta, pide el permiso.
 * Hay que llamarla justo cuando el usuario toca el botón (si no, el celular no muestra el aviso).
 * Devuelve "" si todo está bien, o un mensaje claro en español si algo falla.
 */
export async function validarMicrofono() {
  if (esNavegadorIntegrado()) {
    return "Esta página está abierta dentro de otra app (Instagram, Facebook, WhatsApp...). Ábrela en Chrome para usar la voz, o escribe tu pregunta.";
  }
  if (!Reconocimiento) {
    return "Tu navegador no permite hablarle a Charin. Abre la página en Chrome o Edge, o escribe tu pregunta.";
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "El micrófono solo funciona en una página segura (https).";
  }

  // Si ya se bloqueó antes, el navegador no vuelve a preguntar: avisamos cómo activarlo
  try {
    const permiso = await navigator.permissions?.query({ name: "microphone" });
    if (permiso?.state === "denied") return AYUDA_PERMISO;
  } catch {
    /* algunos celulares no permiten consultar el permiso: seguimos */
  }

  // Esto hace que el celular muestre el aviso "¿Permitir el micrófono?"
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      flujo.getTracks().forEach((t) => t.stop()); // se suelta el micrófono para que el dictado pueda usarlo
    } catch (e) {
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") return AYUDA_PERMISO;
      if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") {
        return "No encuentro un micrófono en este dispositivo.";
      }
      if (e?.name === "NotReadableError") {
        return "Otra app está usando el micrófono. Ciérrala e inténtalo de nuevo.";
      }
      return "No se pudo activar el micrófono. Inténtalo de nuevo o escribe tu pregunta.";
    }
  }
  return "";
}

function mensajeErrorReconocimiento(codigo) {
  switch (codigo) {
    case "not-allowed":
    case "service-not-allowed":
      return AYUDA_PERMISO;
    case "no-speech":
      return "No te escuché. Toca el micrófono y habla con calma.";
    case "audio-capture":
      return "No encuentro un micrófono en este dispositivo.";
    case "network":
      return "Sin conexión: el dictado por voz necesita internet.";
    case "language-not-supported":
      return "Tu dispositivo no tiene dictado en español. Escribe tu pregunta.";
    default:
      return "No te escuché bien, intenta otra vez.";
  }
}

/**
 * Crea el reconocimiento de voz (dictado). Quien lo use debe llamar a .start().
 *  - alResultado(texto): lo que el usuario dijo
 *  - alError(mensaje): qué salió mal, ya en español
 *  - alTerminar(): el micrófono se cerró
 */
export function crearReconocimiento({ alResultado, alError, alTerminar }) {
  const rec = new Reconocimiento();
  rec.lang = "es-CO";
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let hubo = false;
  let fallo = false;

  rec.onresult = (e) => {
    hubo = true;
    alResultado(e.results[0][0].transcript);
  };
  rec.onerror = (e) => {
    fallo = true;
    if (e.error !== "aborted") alError(mensajeErrorReconocimiento(e.error));
  };
  rec.onend = () => {
    if (!hubo && !fallo) alError("No te escuché bien, intenta otra vez.");
    alTerminar();
  };
  return rec;
}

// En celulares (sobre todo iPhone) la voz solo suena si se "activa" con un toque del usuario
export function prepararVoz() {
  try {
    if (!window.speechSynthesis) return;
    const silencio = new SpeechSynthesisUtterance(" ");
    silencio.volume = 0;
    window.speechSynthesis.speak(silencio);
  } catch {
    /* sin voz, no pasa nada */
  }
}

// Lee un texto en voz alta (en español si el dispositivo tiene una voz en español)
export function hablarTexto(texto, { alEmpezar, alTerminar } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (alTerminar) alTerminar();
    return;
  }
  window.speechSynthesis.cancel();
  const voz = new SpeechSynthesisUtterance(sinEmojis(texto));
  voz.lang = "es-ES";
  const espanola = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith("es"));
  if (espanola) voz.voice = espanola;
  voz.onstart = () => alEmpezar && alEmpezar();
  voz.onend = () => alTerminar && alTerminar();
  voz.onerror = () => alTerminar && alTerminar();
  window.speechSynthesis.speak(voz);
}