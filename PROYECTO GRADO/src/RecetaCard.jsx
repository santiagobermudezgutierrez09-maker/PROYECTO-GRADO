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
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import "./RecetaCard.css";

function RecetaCard({ receta, alQuitarFavorito }) {
  const [esFavorita, setEsFavorita] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mensaje, setMensaje] = useState("");

  const usuario = auth.currentUser;

  // Revisa si ya está marcada como favorita y si el usuario ya la calificó
  useEffect(() => {
    const cargarDatosDelUsuario = async () => {
      if (!usuario) return;
      try {
        const snapFav = await getDoc(doc(db, "favoritos", `${usuario.uid}_${receta.id}`));
        setEsFavorita(snapFav.exists());
        const snapCal = await getDoc(doc(db, "calificaciones", `${usuario.uid}_${receta.id}`));
        if (snapCal.exists()) setCalificacion(snapCal.data().estrellas || 0);
      } catch {
        setMensaje("No se pudieron cargar tus datos de esta receta. Inténtalo de nuevo.");
      }
    };
    cargarDatosDelUsuario();
  }, [usuario, receta.id]);

  // Escucha los comentarios de esta receta en tiempo real
  useEffect(() => {
    const q = query(collection(db, "comentarios"), where("recetaId", "==", receta.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Del más antiguo al más nuevo (si la fecha aún no llega del servidor, va al final)
        const milis = (c) => (c.fecha?.toMillis ? c.fecha.toMillis() : Infinity);
        lista.sort((a, b) => milis(a) - milis(b));
        setComentarios(lista);
      },
      () => setMensaje("No se pudieron cargar los comentarios de esta receta.")
    );
    return () => unsubscribe();
  }, [receta.id]);

  const toggleFavorito = async () => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para guardar favoritos.");
      return;
    }
    const ref = doc(db, "favoritos", `${usuario.uid}_${receta.id}`);
    try {
      if (esFavorita) {
        await deleteDoc(ref);
        setEsFavorita(false);
        setMensaje("Quitaste esta receta de tus favoritos.");
        if (alQuitarFavorito) alQuitarFavorito(receta.id);
      } else {
        await setDoc(ref, {
          usuarioId: usuario.uid,
          recetaId: receta.id,
          nombreReceta: receta.nombre,
        });
        setEsFavorita(true);
        setMensaje("Guardada en tus favoritos ❤️ Búscala en el menú, en \"Mis favoritos\".");
      }
    } catch {
      setMensaje("No se pudo actualizar tus favoritos. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const calificar = async (estrellas) => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para calificar.");
      return;
    }
    const anterior = calificacion;
    setCalificacion(estrellas);
    try {
      const ref = doc(db, "calificaciones", `${usuario.uid}_${receta.id}`);
      await setDoc(ref, {
        usuarioId: usuario.uid,
        recetaId: receta.id,
        estrellas: estrellas,
      });
      setMensaje(`¡Gracias! Calificaste esta receta con ${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}.`);
    } catch {
      setCalificacion(anterior);
      setMensaje("No se pudo guardar tu calificación. Inténtalo de nuevo.");
    }
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!usuario) {
      setMensaje("Debes iniciar sesión para comentar.");
      return;
    }
    if (!nuevoComentario.trim()) return;

    try {
      await addDoc(collection(db, "comentarios"), {
        recetaId: receta.id,
        usuarioId: usuario.uid,
        correo: usuario.email,
        texto: nuevoComentario.trim(),
        fecha: serverTimestamp(),
      });
      setNuevoComentario("");
    } catch {
      setMensaje("No se pudo enviar tu comentario. Inténtalo de nuevo.");
    }
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
        if (error?.name !== "AbortError") {
          setMensaje("No se pudo compartir esta receta. Inténtalo de nuevo.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textoCompartir);
        setMensaje("Copiado al portapapeles, ¡ya puedes pegarlo donde quieras!");
      } catch {
        setMensaje("Tu navegador no permitió copiar. Prueba desde Chrome o Edge.");
      }
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
              <span className="rc-autor">
                {c.correo}
                {c.fecha?.toDate ? ` · ${c.fecha.toDate().toLocaleDateString("es-CO")}` : ""}
              </span>
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