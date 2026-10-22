import { useState, useEffect } from "react";
import recetas from "./recetasData";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import "./ListaCompras.css";

const CLAVE_LISTA_INVITADO = "charinCook:listaComprasInvitado";

function ListaCompras() {
  const [recetasSeleccionadas, setRecetasSeleccionadas] = useState([]);
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState("");

  const usuario = auth.currentUser;

  useEffect(() => {
    const cargarLista = async () => {
      if (!usuario) {
        try {
          const guardada = localStorage.getItem(CLAVE_LISTA_INVITADO);
          if (!guardada) return;
          const items = JSON.parse(guardada);
          if (
            !Array.isArray(items) ||
            items.some(
              (item) =>
                typeof item?.nombre !== "string" || typeof item?.comprado !== "boolean"
            )
          ) {
            throw new Error("La lista guardada no tiene un formato válido.");
          }
          setLista(items);
        } catch {
          setMensaje("No se pudo cargar la lista guardada en este dispositivo.");
        }
        return;
      }

      try {
        const ref = doc(db, "listaCompras", usuario.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setLista(snap.data().items || []);
      } catch {
        setMensaje("No se pudo cargar tu lista de compras desde Firestore.");
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

    if (!usuario) {
      try {
        localStorage.setItem(CLAVE_LISTA_INVITADO, JSON.stringify(nuevaLista));
        setLista(nuevaLista);
        setMensaje("Tu lista y tus cambios se guardan en este dispositivo.");
      } catch {
        setLista(nuevaLista);
        setMensaje("La lista está disponible, pero no se pudo guardar en este dispositivo.");
      }
      return;
    }

    setMensaje("");
    try {
      await setDoc(doc(db, "listaCompras", usuario.uid), { items: nuevaLista });
      setLista(nuevaLista);
    } catch {
      setMensaje("La lista se armó, pero no se pudo guardar. Revisa tu conexión.");
      setLista(nuevaLista);
    }
  };

  const marcarComprado = async (nombre) => {
    const nuevaLista = lista.map((item) =>
      item.nombre === nombre ? { ...item, comprado: !item.comprado } : item
    );
    if (!usuario) {
      try {
        localStorage.setItem(CLAVE_LISTA_INVITADO, JSON.stringify(nuevaLista));
        setLista(nuevaLista);
        setMensaje("");
      } catch {
        setMensaje("No se pudo guardar el cambio en este dispositivo.");
      }
      return;
    }

    setLista(nuevaLista);
    try {
      await setDoc(doc(db, "listaCompras", usuario.uid), { items: nuevaLista });
      setMensaje("");
    } catch {
      setMensaje("No se pudo guardar el cambio. Revisa tu conexión.");
    }
  };

  const limpiarLista = async () => {
    if (!window.confirm("¿Vaciar la lista de compras? Esta acción no se puede deshacer.")) return;

    try {
      if (usuario) {
        await setDoc(doc(db, "listaCompras", usuario.uid), { items: [] });
      } else {
        localStorage.removeItem(CLAVE_LISTA_INVITADO);
      }
      setLista([]);
      setRecetasSeleccionadas([]);
      setMensaje("");
    } catch {
      setMensaje(
        usuario
          ? "No se pudo vaciar la lista en Firestore. Inténtalo de nuevo."
          : "No se pudo vaciar la lista guardada en este dispositivo."
      );
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
            <button onClick={limpiarLista}>Vaciar lista</button>
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