import { useState, useEffect } from "react";
import recetas from "./recetasData";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import "./ListaCompras.css";

function ListaCompras() {
  const [recetasSeleccionadas, setRecetasSeleccionadas] = useState([]);
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState("");

  const usuario = auth.currentUser;

  useEffect(() => {
    const cargarLista = async () => {
      if (!usuario) return;
      const ref = doc(db, "listaCompras", usuario.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setLista(snap.data().items || []);
      }
    };
    cargarLista();
  }, [usuario]);

  const toggleReceta = (id) => {
    setRecetasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const generarLista = async () => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para guardar tu lista de compras.");
      return;
    }
    if (recetasSeleccionadas.length === 0) {
      setMensaje("Selecciona al menos una receta.");
      return;
    }

    const ingredientesUnicos = new Set();
    recetasSeleccionadas.forEach((id) => {
      const receta = recetas.find((r) => r.id === id);
      receta.ingredientes.forEach((ing) => ingredientesUnicos.add(ing));
    });

    const nuevaLista = Array.from(ingredientesUnicos).map((ing) => {
      const existente = lista.find((item) => item.nombre === ing);
      return { nombre: ing, comprado: existente ? existente.comprado : false };
    });

    setLista(nuevaLista);
    setMensaje("");

    await setDoc(doc(db, "listaCompras", usuario.uid), { items: nuevaLista });
  };

  const marcarComprado = async (nombre) => {
    const nuevaLista = lista.map((item) =>
      item.nombre === nombre ? { ...item, comprado: !item.comprado } : item
    );
    setLista(nuevaLista);
    if (usuario) {
      await setDoc(doc(db, "listaCompras", usuario.uid), { items: nuevaLista });
    }
  };

  const limpiarLista = async () => {
    setLista([]);
    setRecetasSeleccionadas([]);
    if (usuario) {
      await setDoc(doc(db, "listaCompras", usuario.uid), { items: [] });
    }
  };

  const comprados = lista.filter((item) => item.comprado).length;

  return (
    <div className="lc">
      <p className="lc-intro">
        Elige las recetas que vas a preparar y arma tu lista automáticamente.
      </p>

      <div className="lc-grid">
        {/* Columna izquierda: elegir recetas */}
        <section className="lc-panel">
          <div className="lc-panel-top">
            <h3 className="lc-titulo">Recetas</h3>
            <span className="lc-contador">
              {recetasSeleccionadas.length} seleccionadas
            </span>
          </div>

          <div className="lc-recetas">
            {recetas.map((r) => {
              const activa = recetasSeleccionadas.includes(r.id);
              return (
                <label key={r.id} className={`lc-receta ${activa ? "lc-receta--on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => toggleReceta(r.id)}
                  />
                  <span>{r.nombre}</span>
                </label>
              );
            })}
          </div>

          <div className="lc-acciones">
            <button className="lc-principal" onClick={generarLista}>
              Generar lista de compras
            </button>
            <button onClick={limpiarLista}>Limpiar todo</button>
          </div>

          {mensaje && <p className="lc-mensaje">{mensaje}</p>}
        </section>

        {/* Columna derecha: la lista */}
        <section className="lc-panel">
          <div className="lc-panel-top">
            <h3 className="lc-titulo">Tu lista</h3>
            {lista.length > 0 && (
              <span className="lc-contador">
                {comprados} de {lista.length} comprados
              </span>
            )}
          </div>

          {lista.length > 0 ? (
            <>
              <div className="lc-barra" aria-hidden="true">
                <span style={{ width: `${(comprados / lista.length) * 100}%` }} />
              </div>

              <ul className="lc-lista">
                {lista.map((item) => (
                  <li key={item.nombre}>
                    <label className={item.comprado ? "lc-item lc-item--hecho" : "lc-item"}>
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={() => marcarComprado(item.nombre)}
                      />
                      <span>{item.nombre}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="lc-vacio">
              Tu lista aparecerá aquí cuando elijas recetas y pulses "Generar lista".
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default ListaCompras;