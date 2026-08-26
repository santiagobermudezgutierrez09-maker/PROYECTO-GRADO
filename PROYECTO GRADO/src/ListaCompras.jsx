import { useState, useEffect } from "react";
import recetas from "./recetasData";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

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

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", textAlign: "center" }}>
      <h2>Lista de compras</h2>
      <p>Elige las recetas que vas a preparar y arma tu lista automáticamente.</p>

      <div
        style={{
          textAlign: "left",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "12px",
          maxHeight: "200px",
          overflowY: "auto",
          marginBottom: "12px",
        }}
      >
        {recetas.map((r) => (
          <label key={r.id} style={{ display: "block", marginBottom: "4px" }}>
            <input
              type="checkbox"
              checked={recetasSeleccionadas.includes(r.id)}
              onChange={() => toggleReceta(r.id)}
            />{" "}
            {r.nombre}
          </label>
        ))}
      </div>

      <button onClick={generarLista} style={{ padding: "8px 16px", marginRight: "8px" }}>
        Generar lista de compras
      </button>
      <button onClick={limpiarLista} style={{ padding: "8px 16px" }}>
        Limpiar todo
      </button>

      {mensaje && <p style={{ color: "orange" }}>{mensaje}</p>}

      {lista.length > 0 && (
        <div style={{ textAlign: "left", marginTop: "20px" }}>
          <h3>Tu lista:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {lista.map((item) => (
              <li key={item.nombre} style={{ marginBottom: "6px" }}>
                <label
                  style={{
                    textDecoration: item.comprado ? "line-through" : "none",
                    color: item.comprado ? "#888" : "inherit",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.comprado}
                    onChange={() => marcarComprado(item.nombre)}
                  />{" "}
                  {item.nombre}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ListaCompras;