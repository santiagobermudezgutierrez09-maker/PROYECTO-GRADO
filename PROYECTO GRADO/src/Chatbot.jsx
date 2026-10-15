import { useState, useRef, useEffect } from "react";
import Mascota from "./Mascota";
import { generarRespuesta } from "./chatbotEngine";
import { preguntarChef } from "./geminiService";
import "./Chatbot.css";

const Reconocimiento =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

const SALUDO =
  "¡Hola! Soy Charin 🍩 Háblame con el micrófono o escríbeme lo que quieras saber de postres.";

const SUGERENCIAS = [
  "¿Qué postre fácil hago hoy?",
  "Dame una receta sin horno",
  "Postre rápido para visitas",
];

const ETIQUETAS = {
  reposo: "Toca a Charin para hablarle, o escribe abajo",
  escuchando: "Te escucho…",
  pensando: "Charin está pensando…",
  hablando: "Charin está hablando…",
};

// Quita asteriscos de markdown por si la IA los deja
const limpiar = (t) => t.replace(/\*\*/g, "").replace(/^\s*\*\s/gm, "• ");

// La voz del navegador lee mal los emojis: se quitan solo para hablar
const sinEmojis = (t) => t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");

/* ------------------------------------------------------------
   Sección "Chatbot": dona grande, voz y escritura
   ------------------------------------------------------------ */
function ChatDona() {
  const [mensajes, setMensajes] = useState([{ rol: "bot", saludo: true }]);
  const [entrada, setEntrada] = useState("");
  const [estado, setEstado] = useState("reposo");
  const [vozActiva, setVozActiva] = useState(true);
  const [error, setError] = useState("");

  const mensajesRef = useRef(mensajes);
  const estadoRef = useRef("reposo");
  const vozRef = useRef(true);
  const recRef = useRef(null);
  const finRef = useRef(null);

  mensajesRef.current = mensajes;
  vozRef.current = vozActiva;

  const cambiarEstado = (nuevo) => {
    estadoRef.current = nuevo;
    setEstado(nuevo);
  };

  const hayConversacion = mensajes.some((m) => m.rol === "user");

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, estado]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => {
      recRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const hablar = (texto) => {
    if (!vozRef.current || !window.speechSynthesis) {
      cambiarEstado("reposo");
      return;
    }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(sinEmojis(texto));
    voz.lang = "es-ES";
    const espanola = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("es"));
    if (espanola) voz.voice = espanola;
    voz.onstart = () => cambiarEstado("hablando");
    voz.onend = () => cambiarEstado("reposo");
    voz.onerror = () => cambiarEstado("reposo");
    window.speechSynthesis.speak(voz);
  };

  const enviar = async (textoDirecto) => {
    const pregunta = (textoDirecto ?? entrada).trim();
    if (!pregunta || estadoRef.current === "pensando") return;

    window.speechSynthesis?.cancel();
    setError("");

    // El saludo y los errores no se mandan a la IA
    const historial = mensajesRef.current.filter((m) => !m.saludo && !m.error);

    setMensajes((m) => [...m, { rol: "user", texto: pregunta }]);
    setEntrada("");
    cambiarEstado("pensando");

    let respuesta;
    try {
      respuesta = limpiar(await preguntarChef(historial, pregunta, "home"));
    } catch (e) {
      // Si la IA falla, responde el asistente local para no quedarse callada
      respuesta = generarRespuesta(pregunta, null, null);
    }

    setMensajes((m) => [...m, { rol: "bot", texto: respuesta }]);
    hablar(respuesta);
  };

  const alternarMicrofono = () => {
    if (!Reconocimiento) return;
    if (estadoRef.current === "escuchando") {
      recRef.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    setError("");

    const rec = new Reconocimiento();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.onresult = (e) => enviar(e.results[0][0].transcript);
    rec.onerror = (e) => {
      cambiarEstado("reposo");
      setError(
        e.error === "not-allowed"
          ? "Permite el uso del micrófono en tu navegador."
          : "No te escuché bien, intenta otra vez."
      );
    };
    rec.onend = () => {
      if (estadoRef.current === "escuchando") cambiarEstado("reposo");
    };
    recRef.current = rec;
    rec.start();
    cambiarEstado("escuchando");
  };

  const alternarVoz = () => {
    if (vozActiva) {
      window.speechSynthesis?.cancel();
      if (estadoRef.current === "hablando") cambiarEstado("reposo");
    }
    setVozActiva((v) => !v);
  };

  const enviarEscrito = (e) => {
    e.preventDefault();
    enviar();
  };

  return (
    <div className="cb">
      <div className={`cb-escena cb-${estado}`}>
        <div className="cb-muneco">
          <Mascota
            hablando={estado === "pensando" || estado === "hablando"}
            alClic={Reconocimiento ? alternarMicrofono : () => {}}
            mensaje=""
          />
        </div>
        <p className="cb-estado" aria-live="polite">
          {Reconocimiento ? ETIQUETAS[estado] : ETIQUETAS[estado].replace("Toca a Charin para hablarle, o escribe abajo", "Escríbele a Charin abajo")}
        </p>
      </div>

      <div className="cb-historial" aria-live="polite">
        {mensajes.map((m, i) => (
          <p key={i} className={`cb-msg cb-msg--${m.rol}`}>
            {m.saludo ? SALUDO : m.texto}
          </p>
        ))}
        <div ref={finRef} />
      </div>

      {!hayConversacion && (
        <div className="cb-chips">
          {SUGERENCIAS.map((s) => (
            <button key={s} type="button" onClick={() => enviar(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="cb-error">{error}</p>}

      <div className="cb-controles">
        {Reconocimiento && (
          <button
            type="button"
            className={`cb-mic ${estado === "escuchando" ? "cb-mic--on" : ""}`}
            onClick={alternarMicrofono}
            aria-pressed={estado === "escuchando"}
            aria-label={estado === "escuchando" ? "Dejar de escuchar" : "Hablar con Charin"}
          >
            🎤
          </button>
        )}

        <form className="cb-form" onSubmit={enviarEscrito}>
          <input
            type="text"
            placeholder="O escribe tu pregunta aquí…"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            disabled={estado === "pensando"}
            maxLength={300}
          />
          <button type="submit" disabled={estado === "pensando" || !entrada.trim()}>
            Enviar
          </button>
        </form>

        <button
          type="button"
          className="cb-voz"
          onClick={alternarVoz}
          aria-pressed={vozActiva}
          aria-label={vozActiva ? "Silenciar voz" : "Activar voz"}
          title={vozActiva ? "Silenciar voz" : "Activar voz"}
        >
          {vozActiva ? "🔊" : "🔇"}
        </button>
      </div>

      {!Reconocimiento && (
        <p className="cb-nota">
          Tu navegador no permite hablarle a Charin. Para usar el micrófono, abre la página en Chrome o Edge.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   Dentro de Modo cocina: versión compacta (igual que antes)
   ------------------------------------------------------------ */
function ChatCompacto({ recetaActiva, pasoActualIndex }) {
  const [mensajes, setMensajes] = useState([
    {
      autor: "bot",
      texto: `¡Hola! Estoy contigo mientras preparas "${recetaActiva.nombre}". Escribe "ayuda" si quieres ver todo lo que puedo hacer.`,
    },
  ]);
  const [entrada, setEntrada] = useState("");
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  const enviarMensaje = (e) => {
    e.preventDefault();
    if (!entrada.trim()) return;

    const mensajeUsuario = { autor: "usuario", texto: entrada };
    const respuestaBot = {
      autor: "bot",
      texto: generarRespuesta(entrada, recetaActiva, pasoActualIndex),
    };

    setMensajes((prev) => [...prev, mensajeUsuario, respuestaBot]);
    setEntrada("");
  };

  return (
    <div className="cbc">
      <h3 className="cbc-titulo">💬 Asistente de cocina</h3>

      <div className="cbc-mensajes">
        {mensajes.map((m, i) => (
          <div key={i} className={`cbc-msg cbc-msg--${m.autor}`}>
            {m.texto}
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviarMensaje} className="chat-form cbc-form">
        <input
          type="text"
          placeholder="Escribe tu pregunta..."
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
        />
        <button type="submit" className="btn-enviar">
          Enviar
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------
   Punto de entrada: mismas props que antes
   ------------------------------------------------------------ */
function Chatbot({ recetaActiva = null, pasoActualIndex = null }) {
  if (recetaActiva) {
    return <ChatCompacto recetaActiva={recetaActiva} pasoActualIndex={pasoActualIndex} />;
  }
  return <ChatDona />;
}

export default Chatbot;