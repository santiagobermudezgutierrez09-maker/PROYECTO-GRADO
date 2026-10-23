import { useState, useEffect, useMemo } from "react";
import recetas from "./recetasData";
import { obtenerFechaEspecialHoy } from "./eventosFechas";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import "./RecetasPorFecha.css";

/* ---------- Ayudas para trabajar con fechas (hora local, sin líos de zona horaria) ---------- */
const aFechaLocal = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const hoySinHora = () => {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
};
const aISO = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
const diasHasta = (f) => Math.round((f - hoySinHora()) / 86400000);

// n-ésimo día de la semana de un mes (diaSemana: 0 = domingo ... 6 = sábado; mes: 0 = enero)
const enesimoDia = (anio, mes, diaSemana, n) => {
  const primero = new Date(anio, mes, 1);
  const desplazamiento = (diaSemana - primero.getDay() + 7) % 7;
  return new Date(anio, mes, 1 + desplazamiento + (n - 1) * 7);
};

// Último día de la semana de un mes (por ejemplo, el último sábado de abril)
const ultimoDia = (anio, mes, diaSemana) => {
  const d = new Date(anio, mes + 1, 0);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() - 1);
  return d;
};

// Domingo de Pascua (para calcular Semana Santa cada año)
const pascua = (anio) => {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
};

const textoCuenta = (dias) => {
  if (dias === 0) return "¡Es hoy!";
  if (dias === 1) return "Mañana";
  if (dias > 1) return `Faltan ${dias} días`;
  return `Pasó hace ${-dias} día${dias === -1 ? "" : "s"}`;
};

const formatoBonito = (f) =>
  f.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

/* ---------- Fechas especiales (Colombia). Se recalculan solas cada año ---------- */
const FECHAS_ESPECIALES = [
  { nombre: "Año Nuevo", icono: "🎆", calcular: (a) => new Date(a, 0, 1) },
  { nombre: "San Valentín", icono: "💝", calcular: (a) => new Date(a, 1, 14) },
  { nombre: "Día de la Mujer", icono: "💐", calcular: (a) => new Date(a, 2, 8) },
  {
    nombre: "Viernes Santo",
    icono: "🕊️",
    calcular: (a) => {
      const p = pascua(a);
      return new Date(a, p.getMonth(), p.getDate() - 2);
    },
  },
  { nombre: "Día del Niño", icono: "🎈", calcular: (a) => ultimoDia(a, 3, 6) },
  { nombre: "Día de la Madre", icono: "🌷", calcular: (a) => enesimoDia(a, 4, 0, 2) },
  { nombre: "Día del Maestro", icono: "🍎", calcular: (a) => new Date(a, 4, 15) },
  { nombre: "Día del Padre", icono: "👔", calcular: (a) => enesimoDia(a, 5, 0, 3) },
  { nombre: "Día de la Independencia", icono: "🇨🇴", calcular: (a) => new Date(a, 6, 20) },
  { nombre: "Amor y Amistad", icono: "🤝", calcular: (a) => enesimoDia(a, 8, 6, 3) },
  { nombre: "Halloween", icono: "🎃", calcular: (a) => new Date(a, 9, 31) },
  { nombre: "Día de las Velitas", icono: "🕯️", calcular: (a) => new Date(a, 11, 7) },
  { nombre: "Nochebuena", icono: "🌟", calcular: (a) => new Date(a, 11, 24) },
  { nombre: "Navidad", icono: "🎄", calcular: (a) => new Date(a, 11, 25) },
  { nombre: "Fin de año", icono: "🥂", calcular: (a) => new Date(a, 11, 31) },
];

// Postres del catálogo que mejor van con cada fecha especial (por id)
const SUGERIDOS_POR_FECHA = {
  "Año Nuevo": [203, 207, 210, 214],
  "San Valentín": [206, 209, 220, 217],
  "Día de la Mujer": [226, 219, 209, 206],
  "Viernes Santo": [227, 15, 16, 5],
  "Día del Niño": [225, 210, 205, 213],
  "Día de la Madre": [219, 214, 212, 217],
  "Día del Maestro": [212, 204, 225, 215],
  "Día del Padre": [221, 204, 218, 215],
  "Día de la Independencia": [223, 214, 204, 1],
  "Amor y Amistad": [206, 209, 218, 210],
  Halloween: [222, 211, 213, 212],
  "Día de las Velitas": [201, 202, 216, 205],
  Nochebuena: [201, 202, 216, 225],
  Navidad: [201, 202, 205, 216],
  "Fin de año": [224, 203, 218, 209],
};

// Postres sugeridos para una fecha: los de su lista o, si no tiene, una selección variada
function sugeridosDe(nombre) {
  const ids = SUGERIDOS_POR_FECHA[nombre];
  if (ids) return ids.map((id) => recetas.find((r) => r.id === id)).filter(Boolean);

  const especiales = recetas.filter((r) => r.categoria === "especial");
  const base = especiales.length > 0 ? especiales : recetas;
  const inicio = [...nombre].reduce((a, c) => a + c.charCodeAt(0), 0) % base.length;
  return Array.from({ length: Math.min(4, base.length) }, (_, i) => base[(inicio + i) % base.length]);
}

// Todas las fechas especiales a partir de hoy, de la más cercana a la más lejana
function calcularProximasFechas() {
  const hoy = hoySinHora();
  return FECHAS_ESPECIALES.map((f) => {
    let fecha = f.calcular(hoy.getFullYear());
    if (fecha < hoy) fecha = f.calcular(hoy.getFullYear() + 1);
    return { nombre: f.nombre, icono: f.icono, fecha, dias: diasHasta(fecha) };
  }).sort((a, b) => a.dias - b.dias);
}

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function TarjetaPostre({ receta, alAbrir }) {
  return (
    <button type="button" className="rf-postre" onClick={() => alAbrir(receta.nombre)}>
      <span className="rf-postre-emoji" aria-hidden="true">
        {receta.emoji || "🍰"}
      </span>
      <span className="rf-postre-nombre">{receta.nombre}</span>
      <span className="rf-postre-meta">
        ⏱ {receta.tiempo} min · {receta.dificultad}
      </span>
    </button>
  );
}

function RecetasPorFecha({ irA }) {
  const fechaEspecial = obtenerFechaEspecialHoy();
  const recetasSugeridas = fechaEspecial
    ? recetas.filter((r) => r.categoria === fechaEspecial.categoriaSugerida).slice(0, 6)
    : [];

  const todasLasFechas = useMemo(() => calcularProximasFechas(), []);
  const [verTodas, setVerTodas] = useState(false);
  const proximasFechas = verTodas ? todasLasFechas : todasLasFechas.slice(0, 4);
  const hoyISO = aISO(hoySinHora());

  // RF30: la fecha especial más cercana y sus postres sugeridos
  const fechaCercana = todasLasFechas[0];
  const recetasFechaCercana = useMemo(
    () => (fechaCercana ? sugeridosDe(fechaCercana.nombre) : []),
    [fechaCercana]
  );

  const [eventos, setEventos] = useState([]);
  const [recetaElegida, setRecetaElegida] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [nombreEvento, setNombreEvento] = useState("");
  const [mensaje, setMensaje] = useState({ texto: "", ok: false });
  const [guardando, setGuardando] = useState(false);

  // Calendario: mes que se muestra y día seleccionado
  const [mesVista, setMesVista] = useState(() => {
    const h = hoySinHora();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO);

  const usuario = auth.currentUser;

  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "eventos"), where("usuarioId", "==", usuario.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
      setEventos(lista);
    });
    return () => unsubscribe();
  }, [usuario]);

  /* ---------- Datos del calendario ---------- */
  const anioVista = mesVista.getFullYear();

  const especialesPorDia = useMemo(() => {
    const mapa = {};
    FECHAS_ESPECIALES.forEach((f) => {
      const fecha = f.calcular(anioVista);
      const iso = aISO(fecha);
      mapa[iso] = [...(mapa[iso] || []), { nombre: f.nombre, icono: f.icono, fecha }];
    });
    return mapa;
  }, [anioVista]);

  const eventosPorDia = useMemo(() => {
    const mapa = {};
    eventos.forEach((ev) => {
      if (ev.fecha) mapa[ev.fecha] = [...(mapa[ev.fecha] || []), ev];
    });
    return mapa;
  }, [eventos]);

  const celdas = useMemo(() => {
    const primero = new Date(anioVista, mesVista.getMonth(), 1);
    const huecos = (primero.getDay() + 6) % 7; // la semana empieza el lunes
    const diasMes = new Date(anioVista, mesVista.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: huecos }, () => null),
      ...Array.from({ length: diasMes }, (_, i) => new Date(anioVista, mesVista.getMonth(), i + 1)),
    ];
  }, [anioVista, mesVista]);

  const cambiarMes = (delta) =>
    setMesVista((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const irAHoy = () => {
    const h = hoySinHora();
    setMesVista(new Date(h.getFullYear(), h.getMonth(), 1));
    setDiaSeleccionado(aISO(h));
  };

  const especialesDelDia = especialesPorDia[diaSeleccionado] || [];
  const eventosDelDia = eventosPorDia[diaSeleccionado] || [];
  const fechaSeleccionada = diaSeleccionado ? aFechaLocal(diaSeleccionado) : null;
  const diaSeleccionadoPasado = fechaSeleccionada ? diasHasta(fechaSeleccionada) < 0 : false;

  /* ---------- Eventos ---------- */
  const guardarEvento = async (e) => {
    e.preventDefault();
    if (!usuario) {
      setMensaje({ texto: "Debes iniciar sesión para guardar eventos.", ok: false });
      return;
    }
    if (!recetaElegida || !fechaEvento || !nombreEvento.trim()) {
      setMensaje({ texto: "Completa el nombre del evento, la receta y la fecha.", ok: false });
      return;
    }

    const receta = recetas.find((r) => r.id === Number(recetaElegida));
    if (!receta) {
      setMensaje({ texto: "Elige una receta de la lista.", ok: false });
      return;
    }

    setGuardando(true);
    try {
      await addDoc(collection(db, "eventos"), {
        usuarioId: usuario.uid,
        nombreEvento: nombreEvento.trim(),
        fecha: fechaEvento,
        recetaId: receta.id,
        recetaNombre: receta.nombre,
      });
      setNombreEvento("");
      setFechaEvento("");
      setRecetaElegida("");
      setMensaje({ texto: "¡Evento guardado! 🎉 Míralo en el calendario.", ok: true });
    } catch (error) {
      setMensaje({ texto: "No se pudo guardar el evento. Inténtalo de nuevo.", ok: false });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    try {
      await deleteDoc(doc(db, "eventos", id));
    } catch (error) {
      setMensaje({ texto: "No se pudo eliminar el evento.", ok: false });
    }
  };

  // Llena el formulario con una fecha (y un nombre si es una fecha especial) y baja hasta él
  const planear = (fecha, nombre = "", recetaSugerida = null) => {
    setNombreEvento(nombre);
    setFechaEvento(aISO(fecha));
    if (recetaSugerida) setRecetaElegida(String(recetaSugerida.id));
    setMensaje({ texto: "", ok: false });
    document.getElementById("form-evento")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const planearFecha = (f) => planear(f.fecha, f.nombre, sugeridosDe(f.nombre)[0]);

  const verReceta = (nombre) => irA && irA("recetas", nombre);

  return (
    <div className="rf-contenedor">
      {/* ---------- Hoy ---------- */}
      {fechaEspecial && (
        <section className="rf-hoy">
          <p className="rf-hoy-titulo">
            🎉 ¡Hoy es una buena fecha para <strong>{fechaEspecial.nombre}</strong>!
          </p>
          <p className="rf-hoy-sub">Recetas sugeridas para hoy:</p>
          <div className="rf-chips">
            {recetasSugeridas.map((r) => (
              <button key={r.id} type="button" className="rf-chip" onClick={() => verReceta(r.nombre)}>
                {r.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---------- La fecha especial más cercana ---------- */}
      {fechaCercana && recetasFechaCercana.length > 0 && (
        <section className="rf-hero">
          <div className="rf-hero-cabecera">
            <div className="rf-hero-icono" aria-hidden="true">
              {fechaCercana.icono}
            </div>
            <div className="rf-hero-textos">
              <p className="rf-hero-etiqueta">La fecha especial más cercana</p>
              <h3 className="rf-hero-nombre">{fechaCercana.nombre}</h3>
              <p className="rf-hero-fecha">{formatoBonito(fechaCercana.fecha)}</p>
            </div>
            <div className="rf-hero-cuenta">
              <span className="rf-hero-numero">
                {fechaCercana.dias === 0 ? "¡Hoy!" : fechaCercana.dias}
              </span>
              {fechaCercana.dias > 0 && (
                <span className="rf-hero-unidad">{fechaCercana.dias === 1 ? "día" : "días"}</span>
              )}
            </div>
          </div>

          <p className="rf-hoy-sub">Postres que te sugerimos para esa fecha:</p>
          <div className="rf-postres">
            {recetasFechaCercana.map((r) => (
              <TarjetaPostre key={r.id} receta={r} alAbrir={verReceta} />
            ))}
          </div>

          <button
            type="button"
            className="rf-btn-secundario"
            onClick={() => planearFecha(fechaCercana)}
            disabled={!usuario}
            title={!usuario ? "Inicia sesión para planear eventos" : ""}
          >
            📅 Planear {fechaCercana.nombre}
          </button>
        </section>
      )}

      {/* ---------- Calendario ---------- */}
      <section className="rf-tarjeta rf-calendario">
        <div className="rf-cal-cabecera">
          <button type="button" className="rf-cal-flecha" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <h3 className="rf-cal-mes">
            {mesVista.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </h3>
          <button type="button" className="rf-cal-flecha" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            ›
          </button>
          <button type="button" className="rf-cal-hoy" onClick={irAHoy}>
            Hoy
          </button>
        </div>

        <div className="rf-cal-semana" aria-hidden="true">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="rf-cal-grid">
          {celdas.map((fecha, i) => {
            if (!fecha) return <span key={`v${i}`} className="rf-dia rf-dia--vacio" />;
            const iso = aISO(fecha);
            const especiales = especialesPorDia[iso];
            const hayEventos = eventosPorDia[iso];
            return (
              <button
                key={iso}
                type="button"
                className={[
                  "rf-dia",
                  iso === hoyISO ? "rf-dia--hoy" : "",
                  especiales ? "rf-dia--especial" : "",
                  iso === diaSeleccionado ? "rf-dia--sel" : "",
                ].join(" ")}
                onClick={() => setDiaSeleccionado(iso)}
                aria-label={`${formatoBonito(fecha)}${especiales ? `, ${especiales[0].nombre}` : ""}`}
                aria-pressed={iso === diaSeleccionado}
              >
                <span className="rf-dia-num">{fecha.getDate()}</span>
                {especiales && <span className="rf-dia-icono">{especiales[0].icono}</span>}
                {hayEventos && <span className="rf-dia-punto" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <p className="rf-cal-leyenda">
          <span>🎉 Fecha especial</span>
          <span>
            <span className="rf-dia-punto rf-dia-punto--leyenda" aria-hidden="true" /> Tu evento
          </span>
        </p>

        {/* Detalle del día elegido */}
        {fechaSeleccionada && (
          <div className="rf-panel">
            <h4 className="rf-panel-titulo">{formatoBonito(fechaSeleccionada)}</h4>

            {especialesDelDia.map((f) => (
              <div key={f.nombre} className="rf-panel-especial">
                <p className="rf-panel-nombre">
                  {f.icono} {f.nombre}
                </p>
                <div className="rf-postres">
                  {sugeridosDe(f.nombre).map((r) => (
                    <TarjetaPostre key={r.id} receta={r} alAbrir={verReceta} />
                  ))}
                </div>
              </div>
            ))}

            {eventosDelDia.map((ev) => (
              <p key={ev.id} className="rf-panel-evento">
                📌 <strong>{ev.nombreEvento}</strong> · 🍰 {ev.recetaNombre}
              </p>
            ))}

            {especialesDelDia.length === 0 && eventosDelDia.length === 0 && (
              <p className="rf-vacio">No hay nada marcado este día.</p>
            )}

            {!diaSeleccionadoPasado && (
              <button
                type="button"
                className="rf-btn-secundario"
                onClick={() =>
                  planear(
                    fechaSeleccionada,
                    especialesDelDia[0]?.nombre || "",
                    especialesDelDia[0] ? sugeridosDe(especialesDelDia[0].nombre)[0] : null
                  )
                }
                disabled={!usuario}
                title={!usuario ? "Inicia sesión para planear eventos" : ""}
              >
                📅 Planear algo para este día
              </button>
            )}
          </div>
        )}
      </section>

      {/* ---------- Próximas fechas especiales ---------- */}
      <section>
        <h3 className="rf-titulo">Próximas fechas especiales</h3>
        <div className="rf-fechas">
          {proximasFechas.map((f) => (
            <div className="rf-fecha-card" key={f.nombre}>
              <div className="rf-fecha-icono">{f.icono}</div>
              <div className="rf-fecha-nombre">{f.nombre}</div>
              <div className="rf-fecha-dia">{formatoBonito(f.fecha)}</div>
              <div className="rf-fecha-cuenta">{textoCuenta(f.dias)}</div>
              <button
                type="button"
                className="rf-btn-secundario"
                onClick={() => planearFecha(f)}
                disabled={!usuario}
                title={!usuario ? "Inicia sesión para planear eventos" : ""}
              >
                Planear
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="rf-ver-mas" onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? "Ver menos fechas ▲" : `Ver las ${todasLasFechas.length} fechas del año ▾`}
        </button>
      </section>

      {/* ---------- Formulario ---------- */}
      <section id="form-evento" className="rf-tarjeta">
        <h3 className="rf-titulo">Planifica una receta para un evento</h3>

        {!usuario && (
          <div className="rf-aviso">
            🔒 Inicia sesión para guardar tus eventos. Como invitado puedes explorar las fechas,
            pero no guardarlas.
          </div>
        )}

        <form onSubmit={guardarEvento}>
          <fieldset disabled={!usuario || guardando} className="rf-fieldset">
            <input
              type="text"
              className="rf-campo"
              placeholder="Nombre del evento (ej: Cumpleaños de mamá)"
              value={nombreEvento}
              onChange={(e) => setNombreEvento(e.target.value)}
              maxLength={60}
            />

            <div className="rf-fila">
              <input
                type="date"
                className="rf-campo"
                value={fechaEvento}
                min={hoyISO}
                onChange={(e) => setFechaEvento(e.target.value)}
              />
              <select
                className="rf-campo"
                value={recetaElegida}
                onChange={(e) => setRecetaElegida(e.target.value)}
              >
                <option value="">-- Elige una receta --</option>
                {recetas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="rf-btn-principal">
              {guardando ? "Guardando…" : "Guardar evento"}
            </button>
          </fieldset>
        </form>

        {mensaje.texto && (
          <p className={`rf-mensaje ${mensaje.ok ? "ok" : "error"}`}>{mensaje.texto}</p>
        )}
      </section>

      {/* ---------- Mis eventos ---------- */}
      {usuario && (
        <section>
          <h3 className="rf-titulo">Tus eventos guardados</h3>

          {eventos.length === 0 ? (
            <p className="rf-vacio">
              Aún no tienes eventos. Planea el primero arriba o toca "Planear" en una fecha
              especial 🍰
            </p>
          ) : (
            <ul className="rf-lista">
              {eventos.map((ev) => {
                const fecha = ev.fecha ? aFechaLocal(ev.fecha) : null;
                const dias = fecha ? diasHasta(fecha) : null;
                return (
                  <li key={ev.id} className={`rf-evento ${dias !== null && dias < 0 ? "pasado" : ""}`}>
                    <div className="rf-evento-info">
                      <div className="rf-evento-nombre">{ev.nombreEvento}</div>
                      <div className="rf-evento-detalle">
                        📅 {fecha ? formatoBonito(fecha) : ev.fecha} · 🍰 {ev.recetaNombre}
                      </div>
                    </div>
                    <div className="rf-evento-lado">
                      {dias !== null && <span className="rf-cuenta">{textoCuenta(dias)}</span>}
                      <button
                        type="button"
                        className="rf-btn-borrar"
                        onClick={() => eliminarEvento(ev.id)}
                        aria-label={`Eliminar ${ev.nombreEvento}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default RecetasPorFecha;