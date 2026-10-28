import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
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
        const consulta = query(
          collection(db, "favoritos"),
          where("usuarioId", "==", usuario.uid),
          limit(200)
        );
        const snapshot = await getDocs(consulta);
        const recetasDelCatalogo = new Set(recetas.map((receta) => receta.id));
        const lista = snapshot.docs
          .map((documento) => documento.data().recetaId)
          .filter((recetaId) => recetasDelCatalogo.has(recetaId));
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
  const quitarDeLaLista = useCallback(
    (recetaId) => setIds((prev) => prev.filter((id) => id !== recetaId)),
    []
  );

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