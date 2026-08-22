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
    <div
      style={{
        maxWidth: "420px",
        margin: "20px auto",
        border: "1px solid #444",
        borderRadius: "10px",
        padding: "12px",
        textAlign: "left",
      }}
    >
      <h3 style={{ textAlign: "center" }}>💬 Chatbot asistente</h3>

      <div
        style={{
          maxHeight: "280px",
          overflowY: "auto",
          marginBottom: "10px",
          padding: "8px",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
        }}
      >
        {mensajes.map((m, i) => (
          <p
            key={i}
            style={{
              textAlign: m.autor === "usuario" ? "right" : "left",
              color: m.autor === "usuario" ? "#7fd1ff" : "#ffffff",
              whiteSpace: "pre-line",
            }}
          >
            <strong>{m.autor === "usuario" ? "Tú: " : "Bot: "}</strong>
            {m.texto}
          </p>
        ))}
      </div>

      <form onSubmit={enviarMensaje} style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          placeholder="Escribe tu pregunta..."
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default Chatbot;