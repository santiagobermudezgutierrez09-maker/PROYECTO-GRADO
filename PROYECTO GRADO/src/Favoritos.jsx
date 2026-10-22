import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import recetas from "./recetasData";
import RecetaCard from "./RecetaCard";
import "./Recetas.css";

// RF15 - Lista personal de favoritos: aquí se ven todas las recetas guardadas con el corazón
function Favoritos({ irA }) {
  const usuario = auth.currentUser;
  const [ids, setIds] = useState([]);
  const [cargando, setCargando] = useState(!!usuario);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario) return;
    let activo = true;

    const cargar = async () => {
      try {
        let lista;
        try {
          // Forma rápida: una sola consulta con todos los favoritos del usuario
          const snap = await getDocs(
            query(collection(db, "favoritos"), where("usuarioId", "==", usuario.uid))
          );
          lista = snap.docs.map((d) => d.data().recetaId);
        } catch {
          // Respaldo: revisa receta por receta (cada favorito se guarda como uid_recetaId)
          const lecturas = await Promise.all(
            recetas.map((r) => getDoc(doc(db, "favoritos", `${usuario.uid}_${r.id}`)))
          );
          lista = lecturas.filter((s) => s.exists()).map((s) => s.data().recetaId);
        }
        if (activo) setIds(lista);
      } catch {
        if (activo) setError("No se pudieron cargar tus favoritos. Revisa tu conexión e inténtalo de nuevo.");
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [usuario]);

  // Cuando el usuario quita el corazón desde esta pantalla, la tarjeta desaparece de la lista
  const quitarDeLaLista = (recetaId) => setIds((prev) => prev.filter((id) => id !== recetaId));

  if (!usuario) {
    return (
      <div className="recetas">
        <div className="card recetas-vacio">
          <p>
            🔒 Como invitado no puedes guardar favoritos. Inicia sesión desde el menú para armar tu lista
            personal de recetas.
          </p>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="recetas">
        <p className="recetas-conteo">Cargando tus favoritos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recetas">
        <div className="card recetas-vacio">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const favoritas = recetas.filter((r) => ids.includes(r.id));

  if (favoritas.length === 0) {
    return (
      <div className="recetas">
        <div className="card recetas-vacio">
          <p>
            Aún no tienes recetas favoritas. En "Ver recetas" toca el botón 🤍 Guardar en favoritos y
            aparecerán aquí.
          </p>
          <button onClick={() => irA("recetas")}>Ir a Ver recetas</button>
        </div>
      </div>
    );
  }

  return (
    <div className="recetas">
      <p className="recetas-conteo">
        {favoritas.length === 1 ? "1 receta favorita" : `${favoritas.length} recetas favoritas`}
      </p>
      <div className="recetas-grid">
        {favoritas.map((receta) => (
          <RecetaCard key={receta.id} receta={receta} alQuitarFavorito={quitarDeLaLista} />
        ))}
      </div>
    </div>
  );
}

export default Favoritos;