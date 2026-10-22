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

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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
    if (permiso?.state === "granted") return ""; // ya tiene permiso: arranca sin esperar
  } catch {
    /* algunos celulares no permiten consultar el permiso: seguimos */
  }

  // Esto hace que el celular muestre el aviso "¿Permitir el micrófono?"
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      flujo.getTracks().forEach((t) => t.stop()); // se suelta el micrófono para que el dictado pueda usarlo
      // En algunos celulares hay que dejarlo libre un instante antes de iniciar el dictado
      await esperar(250);
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
      return "No te escuché. Toca el micrófono, espera a ver \"Te escucho…\" y habla con calma.";
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
 *  - alResultado(texto): lo que el usuario dijo (texto final)
 *  - alParcial(texto):   lo que va entendiendo mientras habla (opcional)
 *  - alError(mensaje):   qué salió mal, ya en español
 *  - alTerminar():       el micrófono se cerró
 * Devuelve un objeto con start(), stop() y abort().
 * Si no se escucha nada, reintenta una vez solo antes de avisar.
 */
export function crearReconocimiento({ alResultado, alParcial, alError, alTerminar }) {
  let actual = null;
  let intentos = 0;
  let hubo = false;
  let textoFinal = "";
  let resultadoEnviado = false;
  let fallo = false;
  let detenido = false;
  let reintentar = false;
  let cerrado = false;

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    if (alTerminar) alTerminar();
  };

  const lanzar = () => {
    const rec = new Reconocimiento();
    rec.lang = "es-CO";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let parcial = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const texto = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += texto;
        else parcial += texto;
      }
      if (final.trim()) {
        hubo = true;
        textoFinal += `${textoFinal ? " " : ""}${final.trim()}`;
      }
      const transcripcion = [textoFinal, parcial.trim()].filter(Boolean).join(" ");
      if (transcripcion && alParcial) alParcial(transcripcion);
    };

    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      if (e.error === "no-speech" && intentos < 1 && !detenido) {
        reintentar = true; // se intenta una vez más sin molestar al usuario
        return;
      }
      fallo = true;
      if (alError) alError(mensajeErrorReconocimiento(e.error));
    };

    rec.onend = () => {
      if (reintentar && !detenido && !hubo) {
        reintentar = false;
        intentos += 1;
        setTimeout(() => {
          try {
            lanzar();
          } catch {
            if (alError) alError("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
            cerrar();
          }
        }, 200);
        return;
      }
      if (textoFinal.trim() && !resultadoEnviado) {
        resultadoEnviado = true;
        alResultado(textoFinal.trim());
      }
      if (!hubo && !fallo && !detenido && alError) {
        alError("No te escuché bien, intenta otra vez.");
      }
      cerrar();
    };

    actual = rec;
    rec.start();
  };

  return {
    start: () => lanzar(),
    stop: () => {
      detenido = true;
      try {
        actual?.stop();
      } catch {
        /* ya estaba detenido */
      }
    },
    abort: () => {
      detenido = true;
      try {
        actual?.abort();
      } catch {
        /* ya estaba detenido */
      }
    },
  };
}

/* ------------------------------------------------------------
   Voz (lectura en voz alta)
   ------------------------------------------------------------ */

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

// Elige la mejor voz en español disponible (prefiere español latino y voces naturales)
function elegirVoz() {
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  if (voces.length === 0) return null;
  const puntos = (v) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    let p = 0;
    if (lang === "es-co") p += 6;
    else if (lang === "es-mx" || lang === "es-us" || lang === "es-419") p += 5;
    else if (lang === "es-es") p += 3;
    if (/google|natural|online|neural/i.test(v.name)) p += 3;
    if (/sabina|paulina|helena|laura|monica|mónica|google español/i.test(v.name)) p += 1;
    return p;
  };
  return [...voces].sort((a, b) => puntos(b) - puntos(a))[0];
}

// Chrome corta las lecturas largas: se parte el texto en frases cortas
function partirEnFrases(texto) {
  const frases = texto.match(/[^.!?\n]+[.!?]*/g) || [texto];
  const trozos = [];
  let acumulado = "";
  for (const f of frases) {
    const limpia = f.trim();
    if (!limpia) continue;
    if ((acumulado + " " + limpia).length > 180 && acumulado) {
      trozos.push(acumulado.trim());
      acumulado = limpia;
    } else {
      acumulado += " " + limpia;
    }
  }
  if (acumulado.trim()) trozos.push(acumulado.trim());
  return trozos;
}

let turnoVoz = 0;

// Lee un texto en voz alta (en español si el dispositivo tiene una voz en español)
export function hablarTexto(texto, { alEmpezar, alTerminar } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (alTerminar) alTerminar();
    return;
  }
  const limpio = sinEmojis(texto || "").replace(/[*_#`]/g, "").trim();
  if (!limpio) {
    if (alTerminar) alTerminar();
    return;
  }

  window.speechSynthesis.cancel();
  const miTurno = ++turnoVoz;
  const trozos = partirEnFrases(limpio);
  const voz = elegirVoz();

  trozos.forEach((trozo, i) => {
    const u = new SpeechSynthesisUtterance(trozo);
    u.lang = voz?.lang || "es-CO";
    if (voz) u.voice = voz;
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    if (i === 0) u.onstart = () => miTurno === turnoVoz && alEmpezar && alEmpezar();
    if (i === trozos.length - 1) {
      u.onend = () => miTurno === turnoVoz && alTerminar && alTerminar();
    }
    u.onerror = () => miTurno === turnoVoz && alTerminar && alTerminar();
    window.speechSynthesis.speak(u);
  });
}

// Calla la voz inmediatamente
export function detenerVoz() {
  turnoVoz += 1;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* nada que detener */
  }
}