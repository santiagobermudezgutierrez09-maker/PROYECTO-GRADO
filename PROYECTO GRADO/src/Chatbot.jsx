import { useState } from "react";
import { generarRespuesta } from "./chatbotEngine";

// recetaActiva: la receta seleccionada en Modo Cocina (puede venir vacía).
// pasoActualIndex: en qué paso va el usuario (opcional, solo lo usa Modo Cocina).
function Chatbot({ recetaActiva = null, pasoActualIndex = null }) {
  const [mensajes, setMensajes] = useState([
    {
      autor: "bot",
      texto: recetaActiva
        ? `¡Hola! Estoy contigo mientras preparas "${recetaActiva.nombre}". Escribe "ayuda" si quieres ver todo lo que puedo hacer.`
        : "¡Hola! Soy el asistente de Charin Cook. Puedes mencionar el nombre de cualquier receta, o escribir 'ayuda' para ver qué puedo hacer.",
    },
  ]);
  const [entrada, setEntrada] = useState("");

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
    <div className="card" style={{ maxWidth: "440px", margin: "20px auto", textAlign: "left" }}>
      <h3 style={{ textAlign: "center" }}>💬 chatbot asistente</h3>

      <div
        style={{
          maxHeight: "280px",
          overflowY: "auto",
          marginBottom: "10px",
          padding: "10px",
          backgroundColor: "rgba(0,0,0,0.04)",
          border: "2px solid var(--border-color)",
          borderRadius: "10px",
        }}
      >
        {mensajes.map((m, i) => (
          <div
            key={i}
            style={{
              display: "inline-block",
              maxWidth: "85%",
              float: m.autor === "usuario" ? "right" : "left",
              clear: "both",
              margin: "4px 0",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "2px solid var(--border-color)",
              backgroundColor: m.autor === "usuario" ? "var(--color-teal)" : "var(--bg-surface)",
              color: m.autor === "usuario" ? "#ffffff" : "var(--text-primary)",
              whiteSpace: "pre-line",
              fontSize: "0.9rem",
            }}
          >
            {m.texto}
          </div>
        ))}
        <div style={{ clear: "both" }} />
      </div>

      <form onSubmit={enviarMensaje} className="chat-form" style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          placeholder="Escribe tu pregunta..."
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
        <button type="submit" className="btn-enviar">Enviar</button>
      </form>
    </div>
  );
}

export default Chatbot;