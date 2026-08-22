import { useState, useEffect, useRef } from "react";
import recetas from "./recetasData";
import Chatbot from "./Chatbot";

function ModoCocina() {
  const [recetaId, setRecetaId] = useState("");
  const [pasoActual, setPasoActual] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [minutosInput, setMinutosInput] = useState(5);
  const intervaloRef = useRef(null);

  const receta = recetas.find((r) => r.id === Number(recetaId));

  // Maneja la cuenta regresiva del temporizador
  useEffect(() => {
    if (corriendo && segundos > 0) {
      intervaloRef.current = setInterval(() => {
        setSegundos((s) => s - 1);
      }, 1000);
    } else if (segundos === 0 && corriendo) {
      setCorriendo(false);
      alert("⏰ ¡Tiempo cumplido!");
    }
    return () => clearInterval(intervaloRef.current);
  }, [corriendo, segundos]);

  const iniciarTemporizador = () => {
    setSegundos(minutosInput * 60);
    setCorriendo(true);
  };

  const detenerTemporizador = () => {
    setCorriendo(false);
    clearInterval(intervaloRef.current);
  };

  const formatoTiempo = (totalSegundos) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${min}:${seg.toString().padStart(2, "0")}`;
  };

  // Selección de receta
  if (!receta) {
    return (
      <div style={{ maxWidth: "500px", margin: "20px auto", textAlign: "center" }}>
        <h2>Modo cocina</h2>
        <p>Elige la receta que vas a preparar:</p>
        <select
          value={recetaId}
          onChange={(e) => {
            setRecetaId(e.target.value);
            setPasoActual(0);
          }}
          style={{ padding: "8px", width: "100%" }}
        >
          <option value="">-- Selecciona una receta --</option>
          {recetas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const esUltimoPaso = pasoActual === receta.pasos.length - 1;

  // Vista de modo cocina: letras grandes, sin distracciones
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "20px auto",
        textAlign: "center",
        backgroundColor: "#111",
        color: "#fff",
        padding: "24px",
        borderRadius: "12px",
      }}
    >
      <button
        onClick={() => setRecetaId("")}
        style={{ marginBottom: "16px", fontSize: "14px" }}
      >
        ← Elegir otra receta
      </button>

      <h2 style={{ fontSize: "28px" }}>{receta.nombre}</h2>
      <p style={{ fontSize: "18px", opacity: 0.8 }}>
        Paso {pasoActual + 1} de {receta.pasos.length}
      </p>

      {/* Paso actual en letra grande */}
      <div
        style={{
          fontSize: "32px",
          lineHeight: "1.4",
          margin: "30px 0",
          minHeight: "150px",
        }}
      >
        {receta.pasos[pasoActual]}
      </div>

      {/* Navegación de pasos */}
      <div style={{ marginBottom: "30px" }}>
        <button
          onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
          disabled={pasoActual === 0}
          style={{ fontSize: "20px", padding: "12px 24px", marginRight: "10px" }}
        >
          ⬅ Atrás
        </button>
        <button
          onClick={() => setPasoActual((p) => Math.min(receta.pasos.length - 1, p + 1))}
          disabled={esUltimoPaso}
          style={{ fontSize: "20px", padding: "12px 24px" }}
        >
          Siguiente ➡
        </button>
      </div>

      {esUltimoPaso && <p style={{ fontSize: "22px" }}>🎉 ¡Listo! Buen provecho.</p>}

      {/* Temporizador */}
      <div
        style={{
          borderTop: "1px solid #444",
          paddingTop: "20px",
          marginTop: "20px",
        }}
      >
        <h3 style={{ fontSize: "20px" }}>Temporizador</h3>
        <p style={{ fontSize: "36px" }}>{formatoTiempo(segundos)}</p>

        {!corriendo ? (
          <div>
            <input
              type="number"
              min="1"
              value={minutosInput}
              onChange={(e) => setMinutosInput(Number(e.target.value))}
              style={{ padding: "8px", width: "80px", fontSize: "18px" }}
            />
            <span style={{ margin: "0 8px" }}>minutos</span>
            <button onClick={iniciarTemporizador} style={{ fontSize: "18px", padding: "8px 16px" }}>
              Iniciar
            </button>
          </div>
        ) : (
          <button onClick={detenerTemporizador} style={{ fontSize: "18px", padding: "8px 16px" }}>
            Detener
          </button>
        )}
      </div>

      {/* Chatbot contextual: sabe en qué receta está el usuario */}
      <Chatbot recetaActiva={receta} pasoActualIndex={pasoActual} />
    </div>
  );
}

export default ModoCocina;