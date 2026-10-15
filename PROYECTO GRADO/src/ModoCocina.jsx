import { useState, useEffect, useRef, useCallback } from "react";
import recetas from "./recetasData";
import Chatbot from "./Chatbot";
import "./ModoCocina.css";

const CLAVE = "modoCocina:progreso";
const PRESETS = [5, 10, 15, 30];
const RADIO = 54;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/* ---------- Utilidades ---------- */

// Busca un tiempo dentro del texto del paso: "10 minutos", "1 hora", "10 a 15 min"
function detectarTiempo(texto = "") {
  const m = texto.match(
    /(\d+(?:[.,]\d+)?)(?:\s*(?:a|-|–|o)\s*\d+(?:[.,]\d+)?)?\s*(horas?|hrs?|h|minutos?|mins?|min)\b/i
  );
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  const esHora = /^h/i.test(m[2]);
  const seg = Math.round(n * (esHora ? 3600 : 60));
  return seg > 0 ? seg : null;
}

function formatoTiempo(total) {
  const h = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const ss = seg.toString().padStart(2, "0");
  return h > 0
    ? `${h}:${min.toString().padStart(2, "0")}:${ss}`
    : `${min}:${ss}`;
}

function formatoCorto(total) {
  if (total >= 3600 && total % 3600 === 0) return `${total / 3600} h`;
  if (total >= 3600) return `${Math.floor(total / 3600)} h ${Math.round((total % 3600) / 60)} min`;
  return `${Math.round(total / 60)} min`;
}

function sonarAlarma() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((retraso) => {
      const osc = ctx.createOscillator();
      const ganancia = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      ganancia.gain.setValueAtTime(0.0001, ctx.currentTime + retraso);
      ganancia.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + retraso + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + retraso + 0.3);
      osc.connect(ganancia).connect(ctx.destination);
      osc.start(ctx.currentTime + retraso);
      osc.stop(ctx.currentTime + retraso + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* sin audio, no pasa nada */
  }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
}

function leerProgreso() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE));
    const receta = recetas.find((r) => r.id === Number(g?.recetaId));
    if (!receta) return { recetaId: "", paso: 0 };
    const paso = Math.min(Math.max(0, g.paso || 0), receta.pasos.length - 1);
    return { recetaId: String(receta.id), paso };
  } catch {
    return { recetaId: "", paso: 0 };
  }
}

/* ---------- Componente ---------- */

function ModoCocina() {
  const inicial = useRef(leerProgreso()).current;
  const [recetaId, setRecetaId] = useState(inicial.recetaId);
  const [pasoActual, setPasoActual] = useState(inicial.paso);
  const [busqueda, setBusqueda] = useState("");
  const [grande, setGrande] = useState(false);
  const [minutosInput, setMinutosInput] = useState(10);
  const [timer, setTimer] = useState({
    estado: "idle", // idle | corriendo | pausa | fin
    total: 0,
    restante: 0,
    fin: 0,
    paso: 0,
  });
  const toqueInicio = useRef(null);

  const receta = recetas.find((r) => r.id === Number(recetaId));
  const totalPasos = receta ? receta.pasos.length : 0;

  /* Guardar progreso para no perderlo al recargar */
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ recetaId, paso: pasoActual }));
    } catch {
      /* ignorar */
    }
  }, [recetaId, pasoActual]);

  /* Temporizador basado en hora de fin (no se atrasa si la pestaña duerme) */
  useEffect(() => {
    if (timer.estado !== "corriendo") return;
    const id = setInterval(() => {
      const rest = Math.max(0, Math.round((timer.fin - Date.now()) / 1000));
      if (rest <= 0) {
        setTimer((t) => ({ ...t, estado: "fin", restante: 0 }));
        sonarAlarma();
      } else {
        setTimer((t) => (t.restante === rest ? t : { ...t, restante: rest }));
      }
    }, 250);
    return () => clearInterval(id);
  }, [timer.estado, timer.fin]);

  /* Mantener la pantalla encendida mientras cocinas */
  useEffect(() => {
    if (!receta || !("wakeLock" in navigator)) return;
    let lock;
    const pedir = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* no disponible */
      }
    };
    pedir();
    const alVolver = () => document.visibilityState === "visible" && pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      lock?.release?.().catch(() => {});
    };
  }, [receta]);

  /* Flechas del teclado (no interfiere cuando escribes en el chat) */
  const ir = useCallback(
    (delta) =>
      setPasoActual((p) => Math.min(Math.max(0, p + delta), Math.max(0, totalPasos - 1))),
    [totalPasos]
  );

  useEffect(() => {
    if (!receta) return;
    const alTecla = (e) => {
      const tag = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.target.isContentEditable) return;
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [receta, ir]);

  /* Acciones del temporizador */
  const iniciar = (segundos) => {
    if (!segundos || segundos < 1) return;
    setTimer({
      estado: "corriendo",
      total: segundos,
      restante: segundos,
      fin: Date.now() + segundos * 1000,
      paso: pasoActual,
    });
  };
  const pausar = () => setTimer((t) => ({ ...t, estado: "pausa" }));
  const reanudar = () =>
    setTimer((t) => ({ ...t, estado: "corriendo", fin: Date.now() + t.restante * 1000 }));
  const reiniciar = () => setTimer((t) => ({ ...t, estado: "idle", restante: 0, total: 0 }));

  const elegirReceta = (id) => {
    setRecetaId(String(id));
    setPasoActual(0);
    reiniciar();
  };

  const volver = () => {
    setRecetaId("");
    setPasoActual(0);
    reiniciar();
  };

  /* Deslizar con el dedo */
  const alTocar = (e) => (toqueInicio.current = e.touches[0].clientX);
  const alSoltar = (e) => {
    if (toqueInicio.current == null) return;
    const dx = e.changedTouches[0].clientX - toqueInicio.current;
    if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1);
    toqueInicio.current = null;
  };

  /* ---------- Pantalla 1: elegir receta ---------- */
  if (!receta) {
    const lista = recetas.filter((r) =>
      r.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    );
    return (
      <div className="mc-selector">
        <h3 className="mc-selector-titulo">¿Qué vamos a preparar?</h3>
        <p className="mc-selector-sub">Elige una receta y te guío paso a paso.</p>

        {recetas.length > 6 && (
          <input
            className="mc-buscar"
            type="search"
            placeholder="Buscar receta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        )}

        <div className="mc-grid">
          {lista.map((r) => (
            <button key={r.id} className="mc-tarjeta" onClick={() => elegirReceta(r.id)}>
              <span className="mc-tarjeta-emoji">{r.emoji || "🍩"}</span>
              <span className="mc-tarjeta-nombre">{r.nombre}</span>
              <span className="mc-tarjeta-pasos">{r.pasos.length} pasos</span>
            </button>
          ))}
        </div>

        {lista.length === 0 && (
          <p className="mc-vacio">No encontré ninguna receta con ese nombre.</p>
        )}
      </div>
    );
  }

  /* ---------- Pantalla 2: cocinando ---------- */
  const textoPaso = receta.pasos[pasoActual];
  const esUltimoPaso = pasoActual === totalPasos - 1;
  const progreso = ((pasoActual + 1) / totalPasos) * 100;
  const tiempoDetectado = detectarTiempo(textoPaso);
  const hayTimer = timer.estado !== "idle";
  const fraccion = timer.total ? timer.restante / timer.total : 0;
  const timerDeOtroPaso = hayTimer && timer.paso !== pasoActual;

  return (
    <div className={`mc ${grande ? "mc--grande" : ""}`}>
      <div className="mc-top">
        <div className="mc-titulo-wrap">
          <button className="mc-volver" onClick={volver}>
            ← Recetas
          </button>
          <h3 className="mc-nombre">{receta.nombre}</h3>
        </div>
        <button
          className={`mc-aa ${grande ? "mc-aa--on" : ""}`}
          onClick={() => setGrande((g) => !g)}
          aria-pressed={grande}
          title="Letra grande"
        >
          Aa
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

      <div className="mc-puntos" aria-label="Ir a un paso">
        {receta.pasos.map((_, i) => (
          <button
            key={i}
            className={`mc-punto ${i === pasoActual ? "mc-punto--actual" : ""} ${
              i < pasoActual ? "mc-punto--hecho" : ""
            }`}
            onClick={() => setPasoActual(i)}
            aria-label={`Paso ${i + 1}`}
            aria-current={i === pasoActual ? "step" : undefined}
          >
            {i < pasoActual ? "✓" : i + 1}
          </button>
        ))}
      </div>

      <div className="mc-escenario" onTouchStart={alTocar} onTouchEnd={alSoltar}>
        <p className="mc-contador">
          Paso {pasoActual + 1} de {totalPasos}
        </p>
        {/* key reinicia la animación cada vez que cambia el paso */}
        <p className="mc-paso" key={pasoActual}>
          {textoPaso}
        </p>

        {tiempoDetectado && (!hayTimer || timer.estado === "fin" || timerDeOtroPaso) && (
          <button className="mc-auto" onClick={() => iniciar(tiempoDetectado)}>
            <span className="mc-auto-icono">⏱</span>
            <span>
              Iniciar temporizador de {formatoCorto(tiempoDetectado)}
              <small>Detecté este tiempo en el paso</small>
            </span>
          </button>
        )}
      </div>

      {esUltimoPaso && <p className="mc-fin">🎉 ¡Listo! Buen provecho.</p>}

      <div className="mc-nav">
        <button onClick={() => ir(-1)} disabled={pasoActual === 0}>
          ⬅ Atrás
        </button>
        {esUltimoPaso ? (
          <button className="mc-siguiente" onClick={volver}>
            Terminar 🍽
          </button>
        ) : (
          <button className="mc-siguiente" onClick={() => ir(1)}>
            Siguiente ➡
          </button>
        )}
      </div>

      <section className={`mc-timer mc-timer--${timer.estado}`}>
        {!hayTimer ? (
          <>
            <h4>Temporizador</h4>
            <div className="mc-presets">
              {PRESETS.map((m) => (
                <button key={m} onClick={() => iniciar(m * 60)}>
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
                aria-label="Minutos"
              />
              <span>min</span>
              <button className="mc-iniciar" onClick={() => iniciar(minutosInput * 60)}>
                Iniciar
              </button>
            </div>
          </>
        ) : (
          <div className="mc-timer-vivo">
            <div className="mc-anillo">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="mc-anillo-fondo" cx="60" cy="60" r={RADIO} />
                <circle
                  className="mc-anillo-valor"
                  cx="60"
                  cy="60"
                  r={RADIO}
                  strokeDasharray={CIRCUNFERENCIA}
                  strokeDashoffset={CIRCUNFERENCIA * (1 - fraccion)}
                />
              </svg>
              <span className="mc-anillo-tiempo">
                {timer.estado === "fin" ? "¡Listo!" : formatoTiempo(timer.restante)}
              </span>
            </div>

            <div className="mc-timer-info">
              <p className="mc-timer-label">
                {timer.estado === "fin"
                  ? "⏰ ¡Tiempo cumplido!"
                  : timer.estado === "pausa"
                  ? "En pausa"
                  : `Temporizador del paso ${timer.paso + 1}`}
              </p>
              <div className="mc-controles">
                {timer.estado === "corriendo" && <button onClick={pausar}>Pausar</button>}
                {timer.estado === "pausa" && (
                  <button className="mc-iniciar" onClick={reanudar}>
                    Seguir
                  </button>
                )}
                {timer.estado === "fin" && !esUltimoPaso && pasoActual === timer.paso && (
                  <button
                    className="mc-iniciar"
                    onClick={() => {
                      reiniciar();
                      ir(1);
                    }}
                  >
                    Siguiente paso
                  </button>
                )}
                <button onClick={reiniciar}>{timer.estado === "fin" ? "Cerrar" : "Cancelar"}</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Chatbot recetaActiva={receta} pasoActualIndex={pasoActual} />
    </div>
  );
}

export default ModoCocina;