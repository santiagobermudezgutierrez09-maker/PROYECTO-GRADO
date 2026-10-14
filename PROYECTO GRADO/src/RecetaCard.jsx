import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import "./RecetaCard.css";

function RecetaCard({ receta }) {
  const [esFavorita, setEsFavorita] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mensaje, setMensaje] = useState("");

  const usuario = auth.currentUser;

  // Revisa si ya está marcada como favorita al cargar
  useEffect(() => {
    const revisarFavorito = async () => {
      if (!usuario) return;
      const ref = doc(db, "favoritos", `${usuario.uid}_${receta.id}`);
      const snap = await getDoc(ref);
      setEsFavorita(snap.exists());
    };
    revisarFavorito();
  }, [usuario, receta.id]);

  // Escucha los comentarios de esta receta en tiempo real
  useEffect(() => {
    const q = query(collection(db, "comentarios"), where("recetaId", "==", receta.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComentarios(lista);
    });
    return () => unsubscribe();
  }, [receta.id]);

  const toggleFavorito = async () => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para guardar favoritos.");
      return;
    }
    const ref = doc(db, "favoritos", `${usuario.uid}_${receta.id}`);
    if (esFavorita) {
      await deleteDoc(ref);
      setEsFavorita(false);
    } else {
      await setDoc(ref, {
        usuarioId: usuario.uid,
        recetaId: receta.id,
        nombreReceta: receta.nombre,
      });
      setEsFavorita(true);
    }
  };

  const calificar = async (estrellas) => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para calificar.");
      return;
    }
    setCalificacion(estrellas);
    const ref = doc(db, "calificaciones", `${usuario.uid}_${receta.id}`);
    await setDoc(ref, {
      usuarioId: usuario.uid,
      recetaId: receta.id,
      estrellas: estrellas,
    });
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!usuario) {
      setMensaje("Debes iniciar sesión para comentar.");
      return;
    }
    if (!nuevoComentario.trim()) return;

    await addDoc(collection(db, "comentarios"), {
      recetaId: receta.id,
      usuarioId: usuario.uid,
      correo: usuario.email,
      texto: nuevoComentario,
      fecha: serverTimestamp(),
    });
    setNuevoComentario("");
  };

  const compartir = async () => {
    const listaIngredientes = receta.ingredientes.map((ing) => `• ${ing}`).join("\n");
    const listaPasos = receta.pasos.map((paso, i) => `${i + 1}. ${paso}`).join("\n");

    const textoCompartir =
`🍰 ${receta.nombre} — Charin Cook

⏱ Tiempo: ${receta.tiempo} min | 🍽 Porciones: ${receta.porciones} | Dificultad: ${receta.dificultad}

Ingredientes:
${listaIngredientes}

Pasos:
${listaPasos}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: receta.nombre, text: textoCompartir });
      } catch (error) {
        // el usuario canceló, no pasa nada
      }
    } else {
      await navigator.clipboard.writeText(textoCompartir);
      setMensaje("Copiado al portapapeles, ¡ya puedes pegarlo donde quieras!");
    }
  };

  return (
    <article className="rc">
      {/* Encabezado */}
      <header className="rc-header">
        <h3 className="rc-title">{receta.nombre}</h3>
        <div className="rc-tags">
          {receta.dificultad && <span className="rc-tag">{receta.dificultad}</span>}
          {receta.dieta && <span className="rc-tag rc-tag--soft">{receta.dieta}</span>}
        </div>
      </header>

      {/* Datos rápidos */}
      <dl className="rc-stats">
        <div>
          <dt>Tiempo</dt>
          <dd>{receta.tiempo} min</dd>
        </div>
        <div>
          <dt>Porciones</dt>
          <dd>{receta.porciones}</dd>
        </div>
        <div>
          <dt>Calorías</dt>
          <dd>{receta.calorias} kcal</dd>
        </div>
      </dl>

      {/* Ingredientes y pasos */}
      <div className="rc-body">
        <section>
          <h4 className="rc-subtitle">Ingredientes</h4>
          <ul className="rc-ingredientes">
            {receta.ingredientes.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="rc-subtitle">Pasos</h4>
          <ol className="rc-pasos">
            {receta.pasos.map((paso, i) => (
              <li key={i}>{paso}</li>
            ))}
          </ol>
        </section>
      </div>

      {/* Acciones y calificación */}
      <div className="rc-actions">
        <div className="rc-buttons">
          <button
            type="button"
            className={`rc-btn ${esFavorita ? "rc-btn--active" : ""}`}
            onClick={toggleFavorito}
          >
            {esFavorita ? "❤️ Quitar de favoritos" : "🤍 Guardar en favoritos"}
          </button>
          <button type="button" className="rc-btn" onClick={compartir}>
            🔗 Compartir
          </button>
        </div>

        <div className="rc-stars" role="group" aria-label="Calificar receta">
          <span className="rc-stars-label">Calificar</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`rc-star ${n <= calificacion ? "rc-star--on" : ""}`}
              onClick={() => calificar(n)}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            >
              {n <= calificacion ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      {mensaje && <p className="rc-mensaje">{mensaje}</p>}

      {/* Comentarios */}
      <details className="rc-comentarios">
        <summary>Comentarios ({comentarios.length})</summary>

        <ul className="rc-lista">
          {comentarios.map((c) => (
            <li key={c.id}>
              <span className="rc-autor">{c.correo}</span>
              <span>{c.texto}</span>
            </li>
          ))}
          {comentarios.length === 0 && (
            <li className="rc-vacio">Aún no hay comentarios. Escribe el primero.</li>
          )}
        </ul>

        <form className="rc-form" onSubmit={enviarComentario}>
          <input
            type="text"
            placeholder="Escribe un comentario..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
          />
          <button type="submit" className="rc-btn rc-btn--primary">
            Enviar
          </button>
        </form>
      </details>
    </article>
  );
}

export default RecetaCard;