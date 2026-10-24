import { useState, useRef, useEffect } from "react";
import MascotaCarga from "./MascotaCarga";
import { generarRespuesta } from "./chatbotEngine";
import {
  explicarErrorGemini,
  limpiarRespuestaChef,
  preguntarChef,
  saludoPorHora,
} from "./geminiService";
import {
  Reconocimiento,
  validarMicrofono,
  crearReconocimiento,
  prepararVoz,
  hablarTexto,
} from "./voz";
import "./AsistenteDona.css";

// Lo que dice Charin después del saludo (el saludo cambia según la hora y el nombre)
const SALUDOS = {
  home: "Soy Charin. Cuéntame qué se te antoja y te ayudo a prepararlo.",
  generador: "Dime qué ingredientes tienes y te digo qué postre puedes hacer y qué te falta. 🥕",
  cocina: "Estoy contigo mientras cocinas 🔥 Pregúntame lo que necesites, sin soltar la cuchara.",
  api: "Pregúntame por cualquier postre del mundo 🍰 Te cuento cómo se prepara.",
  fechas: "¿Tienes un evento? 🎉 Dime la ocasión y te sugiero qué postre preparar.",
};

const SUGERENCIAS = {
  home: ["¿Qué postre fácil hago hoy?", "Dame un postre saludable", "Quiero hacer ajiaco"],
  generador: [
    "Tengo huevos, harina y leche",
    "¿Con qué reemplazo la mantequilla?",
    "Me falta azúcar, ¿qué uso?",
  ],
  cocina: [
    "¿Cómo sé si ya está horneado?",
    "Se me quemó un poco, ¿qué hago?",
    "¿Puedo reemplazar un ingrediente?",
  ],
  api: ["¿Cuál es un postre típico de Francia?", "Postre fácil de otro país", "¿Cómo se hace un flan?"],
  fechas: ["Postre para un cumpleaños", "¿Qué hago para Halloween?", "Postre para 20 personas"],
};

export default function AsistenteDona({ vista, visible, nombreUsuario = "" }) {
  const [Mascota3D, setMascota3D] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([{ rol: "bot", saludo: true }]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [error, setError] = useState("");
  const [parcial, setParcial] = useState("");

  const finRef = useRef(null);
  const recRef = useRef(null);
  const mensajesRef = useRef(mensajes);
  const cargandoRef = useRef(false);
  const escuchandoRef = useRef(false);
  const vozRef = useRef(true);
  const vistaRef = useRef("home");
  const enviarRef = useRef(null);

  const vistaSegura = SALUDOS[vista] ? vista : "home";
  const hayConversacion = mensajes.some((m) => m.rol === "user");

  useEffect(() => {
    if (!visible || Mascota3D) return undefined;

    const cargarMascota = () => {
      import("./Mascota")
        .then(({ default: ComponenteMascota }) => {
          setMascota3D(() => ComponenteMascota);
        })
        .catch((error) => {
          console.warn("No se pudo cargar la mascota 3D.", error);
        });
    };

    if (window.requestIdleCallback) {
      const idleId = window.requestIdleCallback(cargarMascota, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(cargarMascota, 300);
    return () => window.clearTimeout(timeoutId);
  }, [visible, Mascota3D]);

  mensajesRef.current = mensajes;
  vozRef.current = vozActiva;
  vistaRef.current = vistaSegura;

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, abierto]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => {
      recRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Al cerrar el chat o salir de la pantalla, se calla y se apaga el micrófono
  useEffect(() => {
    if (!abierto || !visible) {
      recRef.current?.abort();
      window.speechSynthesis?.cancel();
      setHablando(false);
    }
  }, [abierto, visible]);

  const cambiarEscuchando = (valor) => {
    escuchandoRef.current = valor;
    setEscuchando(valor);
  };

  async function enviar(textoDirecto) {
    const pregunta = (textoDirecto ?? texto).trim();
    if (!pregunta || cargandoRef.current) return;

    window.speechSynthesis?.cancel();
    setHablando(false);
    setError("");

    // El saludo y los errores no se mandan a la IA
    const historial = mensajesRef.current.filter((m) => !m.saludo && !m.error);

    setMensajes((m) => [...m, { rol: "user", texto: pregunta }]);
    setTexto("");
    cargandoRef.current = true;
    setCargando(true);

    let respuesta;
    try {
      respuesta = limpiarRespuestaChef(
        await preguntarChef(historial, pregunta, vistaRef.current, "", nombreUsuario)
      );
    } catch (errorGemini) {
      // Si la IA falla, responde el motor de reglas para no quedarse callada
      if (!errorGemini?.message?.includes("superó el límite")) {
        const mensajeError = explicarErrorGemini(errorGemini);
        setError(
          errorGemini?.message?.includes("Falta configurar")
            ? mensajeError
            : `${mensajeError} Te doy una respuesta básica por ahora.`
        );
      }
      respuesta = generarRespuesta(pregunta);
    }

    setParcial("");
    setMensajes((m) => [...m, { rol: "bot", texto: respuesta }]);
    cargandoRef.current = false;
    setCargando(false);

    if (vozRef.current) {
      hablarTexto(respuesta, {
        alEmpezar: () => setHablando(true),
        alTerminar: () => setHablando(false),
      });
    }
  }
  enviarRef.current = enviar;

  async function alternarMicrofono() {
    prepararVoz(); // en el celular, la voz se activa con este toque
    if (escuchandoRef.current) {
      recRef.current?.stop();
      return;
    }
    if (cargandoRef.current) return;

    setError("");
    window.speechSynthesis?.cancel();
    setHablando(false);

    const problema = await validarMicrofono();
    if (problema) {
      setError(problema);
      return;
    }

    const rec = crearReconocimiento({
      alResultado: (dicho) => {
        setParcial("");
        enviarRef.current(dicho);
      },
      alParcial: setParcial,
      alError: (mensaje) => {
        setParcial("");
        setError(mensaje);
      },
      alTerminar: () => {
        setParcial("");
        cambiarEscuchando(false);
      },
    });
    recRef.current = rec;
    try {
      rec.start();
      cambiarEscuchando(true);
    } catch {
      recRef.current = null;
      cambiarEscuchando(false);
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo o escribe tu pregunta.");
    }
  }

  function alternarVoz() {
    if (vozActiva) {
      window.speechSynthesis?.cancel();
      setHablando(false);
    } else {
      prepararVoz();
    }
    setVozActiva((v) => !v);
  }

  function enviarEscrito() {
    prepararVoz();
    enviar();
  }

  return (
    <div
      className={abierto ? "asistente-abierto" : ""}
      style={{ display: visible ? "block" : "none" }}
    >
      {Mascota3D ? (
        <Mascota3D
          variante={vista === "home" ? "en-inicio" : ""}
          hablando={cargando || hablando}
          mensaje={abierto ? undefined : "¡Tócame y pregúntame de cocina! 🍩"}
          alClic={() => setAbierto((a) => !a)}
        />
      ) : (
        <MascotaCarga
          variante={vista === "home" ? "en-inicio" : ""}
          alClic={() => setAbierto((a) => !a)}
          mensaje="¡Tócame y pregúntame de cocina! 🍩"
        />
      )}

      {abierto && (
        <div className="asistente-panel" role="dialog" aria-label="Chat con Charin">
          <div className="asistente-cabecera">
            <span>🍩 Charin · tu chef IA</span>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar chat">
              ✕
            </button>
          </div>

          <div className="asistente-mensajes">
            {mensajes.map((m, i) => (
              <div key={i} className={`asist-msg ${m.rol}`}>
                {m.saludo
                  ? `${saludoPorHora(nombreUsuario)} ${SALUDOS[vistaSegura]}`
                  : m.texto}
              </div>
            ))}
            {cargando && <div className="asist-msg bot pensando">Charin está pensando…</div>}
            <div ref={finRef} />
          </div>

          {!hayConversacion && (
            <div className="asistente-chips">
              {SUGERENCIAS[vistaSegura].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    prepararVoz();
                    enviar(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {escuchando && (
            <p className="asistente-parcial" aria-live="polite">
              {parcial ? `Te entendí: ${parcial}` : "Te escucho… habla ahora 🎤"}
            </p>
          )}

          {error && (
            <p className="asistente-error" role="alert">
              {error}
            </p>
          )}

          <div className="asistente-entrada">
            {Reconocimiento && (
              <button
                type="button"
                className={`asistente-icono ${escuchando ? "asistente-icono--on" : ""}`}
                onClick={alternarMicrofono}
                aria-pressed={escuchando}
                aria-label={escuchando ? "Dejar de escuchar" : "Hablar con Charin"}
                title={escuchando ? "Dejar de escuchar" : "Hablar con Charin"}
              >
                🎤
              </button>
            )}
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarEscrito()}
              placeholder="Escribe o háblale a Charin…"
              maxLength={300}
            />
            <button onClick={enviarEscrito} disabled={cargando || !texto.trim()}>
              Enviar
            </button>
            <button
              type="button"
              className="asistente-icono"
              onClick={alternarVoz}
              aria-pressed={vozActiva}
              aria-label={vozActiva ? "Silenciar voz" : "Activar voz"}
              title={vozActiva ? "Silenciar voz" : "Activar voz"}
            >
              {vozActiva ? "🔊" : "🔇"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}