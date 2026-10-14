import { useState, useRef, useEffect } from "react";
import Mascota from "./Mascota";
import { preguntarChef } from "./geminiService";
import "./AsistenteDona.css";

const SALUDOS = {
  home: "¡Hola! Soy Charin 🍩 Cuéntame qué se te antoja y te ayudo a prepararlo.",
  generador: "¡Dime qué ingredientes tienes y te digo qué postre puedes hacer y qué te falta! 🥕",
  cocina: "Estoy contigo mientras cocinas 🔥 Pregúntame lo que necesites, sin soltar la cuchara.",
  api: "¡Pregúntame por cualquier postre del mundo! 🍰 Te cuento cómo se prepara.",
};

const SUGERENCIAS = {
  home: ["¿Qué postre fácil hago hoy?", "Dame una receta sin horno", "Postre rápido para visitas"],
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
};

// Quita asteriscos de markdown por si la IA se le escapan
const limpiar = (t) => t.replace(/\*\*/g, "").replace(/^\s*\*\s/gm, "• ");

export default function AsistenteDona({ vista, visible }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([{ rol: "bot", saludo: true }]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef(null);

  const vistaSegura = SALUDOS[vista] ? vista : "home";
  const hayConversacion = mensajes.some((m) => m.rol === "user");

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, abierto]);

  async function enviar(textoDirecto) {
    const pregunta = (textoDirecto ?? texto).trim();
    if (!pregunta || cargando) return;

    // El saludo y los errores no se mandan a la IA
    const historial = mensajes.filter((m) => !m.saludo && !m.error);

    setMensajes((m) => [...m, { rol: "user", texto: pregunta }]);
    setTexto("");
    setCargando(true);

    try {
      const respuesta = await preguntarChef(historial, pregunta, vistaSegura);
      setMensajes((m) => [...m, { rol: "bot", texto: limpiar(respuesta) }]);
    } catch (e) {
      const textoError = e.message?.includes("VITE_GEMINI_KEY")
        ? "Falta configurar VITE_GEMINI_KEY en .env.local para conectar a Charin con Gemini."
        : "Uy, no pude responder ahora mismo. Inténtalo de nuevo en un momentico 🍩";
      setMensajes((m) => [
        ...m,
        {
          rol: "bot",
          error: true,
          texto: textoError,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className={abierto ? "asistente-abierto" : ""}
      style={{ display: visible ? "block" : "none" }}
    >
      <Mascota
        hablando={cargando}
        mensaje={abierto ? undefined : "¡Tócame y pregúntame de cocina! 🍩"}
        alClic={() => setAbierto((a) => !a)}
      />

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
                {m.saludo ? SALUDOS[vistaSegura] : m.texto}
              </div>
            ))}
            {cargando && <div className="asist-msg bot pensando">Charin está pensando…</div>}
            <div ref={finRef} />
          </div>

          {!hayConversacion && (
            <div className="asistente-chips">
              {SUGERENCIAS[vistaSegura].map((s) => (
                <button key={s} onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="asistente-entrada">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Escribe tu pregunta de cocina…"
              maxLength={300}
            />
            <button onClick={() => enviar()} disabled={cargando || !texto.trim()}>
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}