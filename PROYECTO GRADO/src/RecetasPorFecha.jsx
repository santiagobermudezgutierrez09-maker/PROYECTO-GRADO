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
  { nombre: "Año Nuevo", icono: "🎆", fecha: (a) => new Date(a, 0, 1) },
  { nombre: "San Valentín", icono: "💝", fecha: (a) => new Date(a, 1, 14) },
  { nombre: "Día de la Madre", icono: "🌷", fecha: (a) => enesimoDia(a, 4, 0, 2) },
  { nombre: "Día del Padre", icono: "👔", fecha: (a) => enesimoDia(a, 5, 0, 3) },
  { nombre: "Amor y Amistad", icono: "🤝", fecha: (a) => enesimoDia(a, 8, 6, 3) },
  { nombre: "Halloween", icono: "🎃", fecha: (a) => new Date(a, 9, 31) },
  { nombre: "Día de las Velitas", icono: "🕯️", fecha: (a) => new Date(a, 11, 7) },
  { nombre: "Navidad", icono: "🎄", fecha: (a) => new Date(a, 11, 25) },
];

// Postres del catálogo que mejor van con cada fecha especial (por id)
const SUGERIDOS_POR_FECHA = {
  "Año Nuevo": [203, 207, 210, 214],
  "San Valentín": [206, 209, 218, 217],
  "Día de la Madre": [209, 214, 212, 217],
  "Día del Padre": [204, 218, 212, 215],
  "Amor y Amistad": [206, 209, 218, 210],
  Halloween: [211, 213, 218, 212],
  "Día de las Velitas": [201, 202, 216, 205],
  Navidad: [201, 202, 205, 216],
};

function calcularProximasFechas() {
  const hoy = hoySinHora();
  return FECHAS_ESPECIALES.map((f) => {
    let fecha = f.fecha(hoy.getFullYear());
    if (fecha < hoy) fecha = f.fecha(hoy.getFullYear() + 1);
    return { nombre: f.nombre, icono: f.icono, fecha, dias: diasHasta(fecha) };
  })
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 4);
}

function RecetasPorFecha({ irA }) {
  const fechaEspecial = obtenerFechaEspecialHoy();
  const recetasSugeridas = fechaEspecial
    ? recetas.filter((r) => r.categoria === fechaEspecial.categoriaSugerida).slice(0, 6)
    : [];

  const proximasFechas = useMemo(() => calcularProximasFechas(), []);
  const hoyISO = aISO(hoySinHora());

  // RF30: postres sugeridos para la fecha especial más cercana (ids del catálogo "especial")
  const fechaCercana = proximasFechas[0];
  const recetasFechaCercana = useMemo(() => {
    if (!fechaCercana) return [];
    const ids = SUGERIDOS_POR_FECHA[fechaCercana.nombre] || [];
    const elegidas = ids.map((id) => recetas.find((r) => r.id === id)).filter(Boolean);
    if (elegidas.length > 0) return elegidas;
    // Si alguna fecha no tiene lista propia, se muestran postres de la categoría "especial"
    return recetas.filter((r) => r.categoria === "especial").slice(0, 4);
  }, [fechaCercana]);

  const [eventos, setEventos] = useState([]);
  const [recetaElegida, setRecetaElegida] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [nombreEvento, setNombreEvento] = useState("");
  const [mensaje, setMensaje] = useState({ texto: "", ok: false });
  const [guardando, setGuardando] = useState(false);

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
      setMensaje({ texto: "¡Evento guardado! 🎉", ok: true });
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

  // Al pulsar "Planear" en una fecha especial, se llena el formulario solo
  const planearFecha = (f) => {
    setNombreEvento(f.nombre);
    setFechaEvento(aISO(f.fecha));
    setMensaje({ texto: "", ok: false });
    document.getElementById("form-evento")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const verReceta = (nombre) => irA("recetas", nombre);

  return (
    <div className="rf-contenedor">
      {/* ---------- Hoy ---------- */}
      <section className="rf-hoy">
        {fechaEspecial ? (
          <>
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
          </>
        ) : (
          <p className="rf-hoy-vacio">
            Hoy no hay ninguna fecha especial registrada, pero puedes seguir viendo el catálogo
            completo en "Ver recetas".
          </p>
        )}
      </section>

      {/* ---------- Sugeridos para la fecha especial más cercana ---------- */}
      {fechaCercana && recetasFechaCercana.length > 0 && (
        <section className="rf-hoy">
          <p className="rf-hoy-titulo">
            {fechaCercana.icono} La fecha especial más cercana es <strong>{fechaCercana.nombre}</strong> ·{" "}
            {textoCuenta(fechaCercana.dias)}
          </p>
          <p className="rf-hoy-sub">Postres que te sugerimos para esa fecha:</p>
          <div className="rf-chips">
            {recetasFechaCercana.map((r) => (
              <button key={r.id} type="button" className="rf-chip" onClick={() => verReceta(r.nombre)}>
                {r.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

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