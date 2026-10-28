import { useState, useRef, useEffect } from "react";
import Mascota from "./Mascota";
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
import "./Chatbot.css";

const construirSaludo = (nombre) =>
  `${saludoPorHora(nombre)} ¿En qué te puedo ayudar? Puedes preguntarme sobre recetas, cocina o cualquier otro tema.`;

const SUGERENCIAS = [
  "¿Qué postre fácil hago hoy?",
  "Dame un postre saludable",
  "Quiero hacer ajiaco",
];

const ETIQUETAS = {
  reposo: "Toca la dona o el micrófono para hablar, o escribe abajo",
  escuchando: "Te escucho… habla ahora",
  pensando: "El asistente está respondiendo…",
  hablando: "El asistente está hablando…",
};

/* ------------------------------------------------------------
   Sección "Chatbot": dona grande, voz y escritura
   ------------------------------------------------------------ */
function ChatDona({ nombreUsuario }) {
  const [mensajes, setMensajes] = useState(() => [
    { rol: "bot", saludo: true, texto: construirSaludo(nombreUsuario) },
  ]);
  const [entrada, setEntrada] = useState("");
  const [estado, setEstado] = useState("reposo");
  const [vozActiva, setVozActiva] = useState(true);
  const [error, setError] = useState("");
  const [transcripcionParcial, setTranscripcionParcial] = useState("");
  const [respuestaParcial, setRespuestaParcial] = useState("");

  const mensajesRef = useRef(mensajes);
  const estadoRef = useRef("reposo");
  const vozRef = useRef(true);
  const recRef = useRef(null);
  const finRef = useRef(null);
  const ultimoEnvioRef = useRef(0);

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
    if (!vozRef.current) {
      cambiarEstado("reposo");
      return;
    }
    hablarTexto(texto, {
      alEmpezar: () => cambiarEstado("hablando"),
      alTerminar: () => cambiarEstado("reposo"),
    });
  };

  const enviar = async (textoDirecto) => {
    const pregunta = (textoDirecto ?? entrada).trim();
    if (!pregunta || estadoRef.current === "pensando") return;
    if (!permitirMensajeChat(ultimoEnvioRef)) {
      setError("Espera un segundo antes de enviar otro mensaje.");
      return;
    }

    window.speechSynthesis?.cancel();
    setError("");
    setRespuestaParcial("");

    // El saludo y los errores no se mandan a la IA
    const historial = mensajesRef.current.filter((m) => !m.saludo && !m.error);

    setMensajes((m) => [...m, { rol: "user", texto: pregunta }]);
    setEntrada("");
    cambiarEstado("pensando");

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
          await preguntarChef(historial, pregunta, "home", "", nombreUsuario, setRespuestaParcial)
        );
      } catch (errorGemini) {
        console.warn("El asistente usará sus respuestas locales porque Gemini no está disponible.", errorGemini);
        setError(explicarErrorGemini(errorGemini));
        respuesta = generarRespuesta(pregunta, null, null, recetasExternas);
      }
    }

    setTranscripcionParcial("");
    setRespuestaParcial("");
    setMensajes((m) => [...m, { rol: "bot", texto: respuesta }]);
    hablar(respuesta);
  };

  const alternarMicrofono = async () => {
    prepararVoz(); // en el celular, la voz de Charin se activa con este toque
    if (estadoRef.current === "escuchando") {
      recRef.current?.stop();
      return;
    }
    if (estadoRef.current === "pensando") return;

    setError("");
    window.speechSynthesis?.cancel();

    // Revisa el micrófono y pide el permiso (en el celular sale el aviso "¿Permitir?")
    const problema = await validarMicrofono();
    if (problema) {
      setError(problema);
      return;
    }

    const rec = crearReconocimiento({
      alResultado: (texto) => {
        setTranscripcionParcial("");
        enviar(texto);
      },
      alParcial: setTranscripcionParcial,
      alError: (mensaje) => {
        setTranscripcionParcial("");
        cambiarEstado("reposo");
        setError(mensaje);
      },
      alTerminar: () => {
        setTranscripcionParcial("");
        if (estadoRef.current === "escuchando") cambiarEstado("reposo");
      },
    });
    recRef.current = rec;
    try {
      rec.start();
      cambiarEstado("escuchando");
    } catch {
      recRef.current = null;
      cambiarEstado("reposo");
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo o escribe tu pregunta.");
    }
  };

  const alternarVoz = () => {
    if (vozActiva) {
      window.speechSynthesis?.cancel();
      if (estadoRef.current === "hablando") cambiarEstado("reposo");
    } else {
      prepararVoz();
    }
    setVozActiva((v) => !v);
  };

  const enviarEscrito = (e) => {
    e.preventDefault();
    prepararVoz();
    enviar();
  };

  return (
    <div className="cb">
      <div className={`cb-escena cb-${estado}`}>
        <div className="cb-muneco">
          <Mascota
            hablando={estado === "pensando" || estado === "hablando"}
            alClic={alternarMicrofono}
            mensaje=""
          />
        </div>
        <p className="cb-estado" aria-live="polite">
          {estado === "escuchando" && transcripcionParcial
            ? `Te entendí: ${transcripcionParcial}`
            : ETIQUETAS[estado]}
        </p>
      </div>

      <div className="cb-historial" aria-live="polite">
        {mensajes.map((m, i) => (
          <p key={i} className={`cb-msg cb-msg--${m.rol}`}>
            {m.texto}
          </p>
        ))}
        {estado === "pensando" && (
          <p className="cb-msg cb-msg--bot">{respuestaParcial || "El asistente está respondiendo…"}</p>
        )}
        <div ref={finRef} />
      </div>

      {!hayConversacion && (
        <div className="cb-chips">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
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

      {error && (
        <p className="cb-error" role="alert">
          {error}
        </p>
      )}

      <div className="cb-controles">
        <button
          type="button"
          className={`cb-mic ${estado === "escuchando" ? "cb-mic--on" : ""}`}
          onClick={alternarMicrofono}
          aria-pressed={estado === "escuchando"}
          aria-label={estado === "escuchando" ? "Dejar de escuchar" : "Hablar con el asistente"}
          title={estado === "escuchando" ? "Dejar de escuchar" : "Hablar con el asistente"}
        >
          🎤
        </button>

        <form className="cb-form" onSubmit={enviarEscrito}>
          <input
            type="text"
            placeholder="Escribe tu pregunta aquí…"
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
          Tu navegador no permite usar el micrófono. Abre la página en Chrome o Edge, o escribe tu pregunta.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   Dentro de Modo cocina: chat compacto con voz.
   Responde con la IA sabiendo la receta y el paso en que vas;
   si la IA no está disponible, responde el motor de reglas.
   ------------------------------------------------------------ */
function contextoReceta(receta, paso) {
  const pasos = receta.pasos.map((p, i) => `${i + 1}. ${p}`).join(" ");
  return (
    `RECETA QUE EL USUARIO ESTÁ PREPARANDO: "${receta.nombre}" (${receta.tiempo} min, ` +
    `${receta.porciones} porciones, dificultad ${receta.dificultad}). ` +
    `Ingredientes: ${receta.ingredientes.join(", ")}. Pasos: ${pasos} ` +
    `PASO ACTUAL: ${paso + 1} de ${receta.pasos.length}. ` +
    `Responde pensando en esta receta y en este paso.`
  );
}

function ChatCompacto({ recetaActiva, pasoActualIndex, nombreUsuario }) {
  const [mensajes, setMensajes] = useState(() => [
    {
      autor: "bot",
      texto: `${saludoPorHora(nombreUsuario)} ¿En qué te ayudo con "${recetaActiva.nombre}"? También puedes preguntarme sobre cualquier otro tema.`,
    },
  ]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [error, setError] = useState("");
  const [transcripcionParcial, setTranscripcionParcial] = useState("");
  const [respuestaParcial, setRespuestaParcial] = useState("");

  const finRef = useRef(null);
  const recRef = useRef(null);
  const mensajesRef = useRef(mensajes);
  const pensandoRef = useRef(false);
  const escuchandoRef = useRef(false);
  const vozRef = useRef(true);
  const recetaRef = useRef(recetaActiva);
  const pasoRef = useRef(pasoActualIndex);
  const enviarRef = useRef(null);
  const ultimoEnvioRef = useRef(0);

  mensajesRef.current = mensajes;
  vozRef.current = vozActiva;
  recetaRef.current = recetaActiva;
  pasoRef.current = pasoActualIndex ?? 0;

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, pensando]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => {
      recRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const cambiarEscuchando = (valor) => {
    escuchandoRef.current = valor;
    setEscuchando(valor);
  };

  const enviar = async (texto) => {
    const pregunta = texto.trim();
    if (!pregunta || pensandoRef.current) return;
    if (!permitirMensajeChat(ultimoEnvioRef)) {
      setError("Espera un segundo antes de enviar otro mensaje.");
      return;
    }

    window.speechSynthesis?.cancel();
    setHablando(false);
    setError("");
    setRespuestaParcial("");

    // El saludo (primer mensaje) no se manda a la IA
    const historial = mensajesRef.current.slice(1).map((m) => ({
      rol: m.autor === "bot" ? "bot" : "user",
      texto: m.texto,
    }));

    setMensajes((m) => [...m, { autor: "usuario", texto: pregunta }]);
    setEntrada("");
    pensandoRef.current = true;
    setPensando(true);

    const receta = recetaRef.current;
    const paso = pasoRef.current;

    let recetasExternas = [];
    let respuestaLocal = responderConReglasPrioritarias(
      pregunta,
      receta,
      paso,
      recetasExternas
    );
    const consultaIngrediente = extraerConsultaIngrediente(pregunta);
    if (respuestaLocal === null && consultaIngrediente && !esConsultaBreveAbierta(pregunta)) {
      try {
        recetasExternas = await buscarPostresPorIngrediente(consultaIngrediente);
        respuestaLocal = responderConReglasPrioritarias(
          pregunta,
          receta,
          paso,
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
          await preguntarChef(
            historial,
            pregunta,
            "cocina",
            contextoReceta(receta, paso),
            nombreUsuario,
            setRespuestaParcial
          )
        );
      } catch (errorGemini) {
        console.warn("El asistente usará sus respuestas locales porque Gemini no está disponible.", errorGemini);
        setError(explicarErrorGemini(errorGemini));
        respuesta = generarRespuesta(pregunta, receta, paso, recetasExternas);
      }
    }

    setTranscripcionParcial("");
    setRespuestaParcial("");
    setMensajes((m) => [...m, { autor: "bot", texto: respuesta }]);
    pensandoRef.current = false;
    setPensando(false);
    if (vozRef.current) {
      hablarTexto(respuesta, {
        alEmpezar: () => setHablando(true),
        alTerminar: () => setHablando(false),
      });
    }
  };
  enviarRef.current = enviar;

  const enviarMensaje = (e) => {
    e.preventDefault();
    prepararVoz();
    enviar(entrada);
  };

  const alternarMicrofono = async () => {
    prepararVoz();
    if (escuchandoRef.current) {
      recRef.current?.stop();
      return;
    }
    if (pensandoRef.current) return;

    setError("");
    window.speechSynthesis?.cancel();

    const problema = await validarMicrofono();
    if (problema) {
      setError(problema);
      return;
    }

    const rec = crearReconocimiento({
      alResultado: (texto) => {
        setTranscripcionParcial("");
        enviarRef.current(texto);
      },
      alParcial: setTranscripcionParcial,
      alError: (mensaje) => {
        setTranscripcionParcial("");
        setError(mensaje);
      },
      alTerminar: () => {
        setTranscripcionParcial("");
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
      setError("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
    }
  };

  const alternarVoz = () => {
    if (vozActiva) {
      window.speechSynthesis?.cancel();
      setHablando(false);
    } else prepararVoz();
    setVozActiva((v) => !v);
  };

  return (
    <div className="cbc">
      <h3 className="cbc-titulo">Asistente de cocina</h3>
      <div className="cbc-mascota">
        <Mascota variante="en-chat-compacto" hablando={pensando || hablando} mensaje="" />
      </div>

      <div className="cbc-mensajes">
        {mensajes.map((m, i) => (
          <div key={i} className={`cbc-msg cbc-msg--${m.autor}`}>
            {m.texto}
          </div>
        ))}
        {pensando && <div className="cbc-msg cbc-msg--bot">{respuestaParcial || "El asistente está respondiendo…"}</div>}
        <div ref={finRef} />
      </div>

      {error && (
        <p className="cb-error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={enviarMensaje} className="chat-form cbc-form">
        <button
          type="button"
          className={`cbc-icono ${escuchando ? "cbc-icono--on" : ""}`}
          onClick={alternarMicrofono}
          aria-pressed={escuchando}
          aria-label={escuchando ? "Dejar de escuchar" : "Hablar con el asistente"}
          title={escuchando ? "Dejar de escuchar" : "Hablar con el asistente"}
        >
          🎤
        </button>
        <input
          type="text"
          placeholder={
            escuchando
              ? transcripcionParcial || "Te escucho…"
              : "Escribe tu pregunta..."
          }
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          maxLength={300}
        />
        <button type="submit" className="btn-enviar" disabled={pensando || !entrada.trim()}>
          Enviar
        </button>
        <button
          type="button"
          className="cbc-icono"
          onClick={alternarVoz}
          aria-pressed={vozActiva}
          aria-label={vozActiva ? "Silenciar voz" : "Activar voz"}
          title={vozActiva ? "Silenciar voz" : "Activar voz"}
        >
          {vozActiva ? "🔊" : "🔇"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------
   Punto de entrada: mismas props que antes (+ nombreUsuario opcional)
   ------------------------------------------------------------ */
function Chatbot({ recetaActiva = null, pasoActualIndex = null, nombreUsuario = "" }) {
  if (recetaActiva) {
    return (
      <ChatCompacto
        recetaActiva={recetaActiva}
        pasoActualIndex={pasoActualIndex}
        nombreUsuario={nombreUsuario}
      />
    );
  }
  return <ChatDona nombreUsuario={nombreUsuario} />;
}

export default Chatbot;