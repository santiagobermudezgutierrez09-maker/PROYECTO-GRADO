import { useState, useRef, useEffect } from "react";
import MascotaCarga from "./MascotaCarga";
import {
  esConsultaBreveAbierta,
  extraerConsultaIngrediente,
  generarRespuesta,
  responderConReglasPrioritarias,
} from "./chatbotEngine";
import { buscarPostresPorIngrediente } from "./mealDbService";
import {
  explicarErrorGemini,
  limpiarRespuestaChef,
  preguntarChef,
  saludoPorHora,
} from "./geminiService";
import { permitirMensajeChat } from "./chatRequestGuard";
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
  home: "¿En qué te puedo ayudar? Puedes preguntarme sobre cocina o cualquier otro tema.",
  generador: "Dime qué ingredientes tienes y te sugiero qué preparar y qué podrías sustituir.",
  cocina: "¿Qué necesitas saber sobre la receta o el paso que estás preparando?",
  api: "Pregúntame por una receta, un ingrediente o cualquier otro tema.",
  fechas: "Cuéntame la ocasión y te sugiero recetas que encajen.",
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
  const [respuestaParcial, setRespuestaParcial] = useState("");

  const finRef = useRef(null);
  const recRef = useRef(null);
  const mensajesRef = useRef(mensajes);
  const cargandoRef = useRef(false);
  const escuchandoRef = useRef(false);
  const vozRef = useRef(true);
  const vistaRef = useRef("home");
  const enviarRef = useRef(null);
  const ultimoEnvioRef = useRef(0);

  const vistaSegura = SALUDOS[vista] ? vista : "home";
  const hayConversacion = mensajes.some((m) => m.rol === "user");

  useEffect(() => {
    if (!visible || Mascota3D) return undefined;

    let activo = true;

    import("./Mascota")
      .then(({ default: ComponenteMascota }) => {
        if (activo) setMascota3D(() => ComponenteMascota);
      })
      .catch((error) => {
        console.warn("No se pudo cargar la mascota 3D.", error);
      });

    return () => {
      activo = false;
    };
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
    if (!permitirMensajeChat(ultimoEnvioRef)) {
      setError("Espera un segundo antes de enviar otro mensaje.");
      return;
    }

    window.speechSynthesis?.cancel();
    setHablando(false);
    setError("");
    setRespuestaParcial("");

    // El saludo y los errores no se mandan a la IA
    const historial = mensajesRef.current.filter((m) => !m.saludo && !m.error);

    setMensajes((m) => [...m, { rol: "user", texto: pregunta }]);
    setTexto("");
    cargandoRef.current = true;
    setCargando(true);

    let recetasExternas = [];
    let respuestaLocal = responderConReglasPrioritarias(
      pregunta,
      null,
      null,
      recetasExternas
    );
    const consultaIngrediente = extraerConsultaIngrediente(pregunta);
    if (respuestaLocal === null && consultaIngrediente && !esConsultaBreveAbierta(pregunta)) {
      try {
        recetasExternas = await buscarPostresPorIngrediente(consultaIngrediente);
        respuestaLocal = responderConReglasPrioritarias(
          pregunta,
          null,
          null,
          recetasExternas
        );
      } catch {
        setError("No pude consultar las recetas internacionales ahora.");
      }
    }

    let respuesta;
    if (respuestaLocal !== null) {
      respuesta = respuestaLocal;
    } else {
      try {
        respuesta = limpiarRespuestaChef(
          await preguntarChef(historial, pregunta, vistaRef.current, "", nombreUsuario, setRespuestaParcial)
        );
      } catch (errorGemini) {
        console.warn("El asistente usará sus respuestas locales porque Gemini no está disponible.", errorGemini);
        setError(explicarErrorGemini(errorGemini));
        respuesta = generarRespuesta(pregunta, null, null, recetasExternas);
      }
    }

    setParcial("");
    setRespuestaParcial("");
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
          mensaje={abierto ? undefined : "Pregúntame lo que quieras"}
          alClic={() => setAbierto((a) => !a)}
        />
      ) : (
        <MascotaCarga
          variante={vista === "home" ? "en-inicio" : ""}
          alClic={() => setAbierto((a) => !a)}
          mensaje="Pregúntame lo que quieras"
        />
      )}

      {abierto && (
        <div className="asistente-panel" role="dialog" aria-label="Chat con Charin">
          <div className="asistente-cabecera">
            <span>Asistente de CharinCook</span>
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
            {cargando && <div className="asist-msg bot pensando">{respuestaParcial || "El asistente está respondiendo…"}</div>}
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
                aria-label={escuchando ? "Dejar de escuchar" : "Hablar con el asistente"}
                title={escuchando ? "Dejar de escuchar" : "Hablar con el asistente"}
              >
                🎤
              </button>
            )}
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarEscrito()}
              placeholder="Escribe tu pregunta aquí…"
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