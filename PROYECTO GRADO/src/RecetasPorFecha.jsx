import { useState, useEffect } from "react";
import { useState as useState2 } from "react";
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
import { db, auth } from "./firebase";

function RecetasPorFecha() {
  const fechaEspecial = obtenerFechaEspecialHoy();
  const recetasSugeridas = fechaEspecial
    ? recetas.filter((r) => r.categoria === fechaEspecial.categoriaSugerida).slice(0, 6)
    : [];


  const [eventos, setEventos] = useState([]);
  const [recetaElegida, setRecetaElegida] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [nombreEvento, setNombreEvento] = useState("");
  const [mensaje, setMensaje] = useState("");

  const usuario = auth.currentUser;

  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "eventos"), where("usuarioId", "==", usuario.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
      setEventos(lista);
    });
    return () => unsubscribe();
  }, [usuario]);

  const guardarEvento = async (e) => {
    e.preventDefault();
    if (!usuario) {
      setMensaje("Debes iniciar sesión para guardar eventos.");
      return;
    }
    if (!recetaElegida || !fechaEvento || !nombreEvento.trim()) {
      setMensaje("Completa el nombre del evento, la receta y la fecha.");
      return;
    }

    const receta = recetas.find((r) => r.id === Number(recetaElegida));

    await addDoc(collection(db, "eventos"), {
      usuarioId: usuario.uid,
      nombreEvento,
      fecha: fechaEvento,
      recetaId: receta.id,
      recetaNombre: receta.nombre,
    });

    setNombreEvento("");
    setFechaEvento("");
    setRecetaElegida("");
    setMensaje("¡Evento guardado!");
  };

  const eliminarEvento = async (id) => {
    await deleteDoc(doc(db, "eventos", id));
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", textAlign: "center" }}>
      <h2>Recetas por fecha y eventos</h2>

      {}
      {fechaEspecial ? (
        <div style={{ marginBottom: "24px" }}>
          <p>
            🎉 ¡Hoy es una buena fecha para <strong>{fechaEspecial.nombre}</strong>! Aquí unas
            recetas sugeridas:
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recetasSugeridas.map((r) => (
              <li key={r.id}>{r.nombre}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ marginBottom: "24px" }}>
          Hoy no hay ninguna fecha especial registrada, pero puedes seguir viendo el catálogo
          completo en "Ver recetas".
        </p>
      )}

      {}
      <h3>Planifica una receta para un evento futuro</h3>
      <form onSubmit={guardarEvento} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "8px" }}>
          <input
            type="text"
            placeholder="Nombre del evento (ej: Cumpleaños de mamá)"
            value={nombreEvento}
            onChange={(e) => setNombreEvento(e.target.value)}
            style={{ padding: "8px", width: "80%" }}
          />
        </div>
        <div style={{ marginBottom: "8px" }}>
          <input
            type="date"
            value={fechaEvento}
            onChange={(e) => setFechaEvento(e.target.value)}
            style={{ padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "8px" }}>
          <select
            value={recetaElegida}
            onChange={(e) => setRecetaElegida(e.target.value)}
            style={{ padding: "8px", width: "80%" }}
          >
            <option value="">-- Elige una receta --</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" style={{ padding: "8px 16px" }}>
          Guardar evento
        </button>
      </form>

      {mensaje && <p style={{ color: "orange" }}>{mensaje}</p>}

      {eventos.length > 0 && (
        <div style={{ textAlign: "left" }}>
          <h3>Tus eventos guardados</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {eventos.map((ev) => (
              <li
                key={ev.id}
                style={{
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "8px",
                }}
              >
                <strong>{ev.nombreEvento}</strong> — {ev.fecha}
                <br />
                Receta: {ev.recetaNombre}
                <br />
                <button onClick={() => eliminarEvento(ev.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RecetasPorFecha;