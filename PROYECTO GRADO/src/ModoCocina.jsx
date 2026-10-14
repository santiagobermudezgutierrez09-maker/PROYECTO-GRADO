import { useState, useEffect, useRef } from "react";
import recetas from "./recetasData";
import Chatbot from "./Chatbot";
import "./ModoCocina.css";

function ModoCocina() {
  const [recetaId, setRecetaId] = useState("");
  const [pasoActual, setPasoActual] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [minutosInput, setMinutosInput] = useState(5);
  const intervaloRef = useRef(null);

  const receta = recetas.find((r) => r.id === Number(recetaId));

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
    if (!minutosInput || minutosInput < 1) return;
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

  if (!receta) {
    return (
      <div className="mc-selector">
        <p>Elige la receta que vas a preparar:</p>
        <select
          value={recetaId}
          onChange={(e) => {
            setRecetaId(e.target.value);
            setPasoActual(0);
          }}
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

  const totalPasos = receta.pasos.length;
  const esUltimoPaso = pasoActual === totalPasos - 1;
  const progreso = ((pasoActual + 1) / totalPasos) * 100;

  return (
    <div className="mc">
      <div className="mc-top">
        <h3 className="mc-nombre">{receta.nombre}</h3>
        <button className="mc-volver" onClick={() => setRecetaId("")}>
          ← Elegir otra receta
        </button>
      </div>

      <div
        className="mc-progreso"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalPasos}
        aria-valuenow={pasoActual + 1}
      >
        <span style={{ width: `${progreso}%` }} />
      </div>
      <p className="mc-contador">
        Paso {pasoActual + 1} de {totalPasos}
      </p>

      <p className="mc-paso">{receta.pasos[pasoActual]}</p>

      {esUltimoPaso && <p className="mc-fin">🎉 ¡Listo! Buen provecho.</p>}

      <div className="mc-nav">
        <button
          onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
          disabled={pasoActual === 0}
        >
          ⬅ Atrás
        </button>
        <button
          className="mc-siguiente"
          onClick={() => setPasoActual((p) => Math.min(totalPasos - 1, p + 1))}
          disabled={esUltimoPaso}
        >
          Siguiente ➡
        </button>
      </div>

      <section className="mc-timer">
        <h4>Temporizador</h4>
        <p className={`mc-reloj ${corriendo ? "mc-reloj--activo" : ""}`}>
          {formatoTiempo(segundos)}
        </p>

        {!corriendo ? (
          <>
            <div className="mc-presets">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  className={minutosInput === m ? "filtro-activo" : ""}
                  onClick={() => setMinutosInput(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="mc-controles">
              <input
                type="number"
                min="1"
                value={minutosInput}
                onChange={(e) => setMinutosInput(Number(e.target.value))}
              />
              <span>minutos</span>
              <button onClick={iniciarTemporizador}>Iniciar</button>
            </div>
          </>
        ) : (
          <div className="mc-controles">
            <button onClick={detenerTemporizador}>Detener</button>
          </div>
        )}
      </section>

      <Chatbot recetaActiva={receta} pasoActualIndex={pasoActual} />
    </div>
  );
}

export default ModoCocina;