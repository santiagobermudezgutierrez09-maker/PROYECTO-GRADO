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

const ENLACE_APP = "https://proyecto-grado-virid.vercel.app/";

function RecetaCard({ receta, alQuitarFavorito }) {
  const [esFavorita, setEsFavorita] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nota, setNota] = useState("");
  const [notaGuardada, setNotaGuardada] = useState(false);
  const [menuCompartir, setMenuCompartir] = useState(false);

  const usuario = auth.currentUser;
  const claveNota = `nota_${receta.id}`;

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

  // Carga "Mis notas": en Firestore si hay sesión, en el navegador si es invitado
  useEffect(() => {
    const cargarNota = async () => {
      try {
        if (usuario) {
          const snap = await getDoc(doc(db, "notas", `${usuario.uid}_${receta.id}`));
          if (snap.exists()) {
            setNota(snap.data().texto || "");
            setNotaGuardada(true);
          }
        } else {
          const guardada = localStorage.getItem(claveNota);
          if (guardada) {
            setNota(guardada);
            setNotaGuardada(true);
          }
        }
      } catch {
        /* si falla, la nota simplemente empieza vacía */
      }
    };
    cargarNota();
  }, [usuario, receta.id, claveNota]);

  // Escucha los comentarios de esta receta en tiempo real (los ve cualquier persona)
  useEffect(() => {
    const q = query(collection(db, "comentarios"), where("recetaId", "==", receta.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const eliminarComentario = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar tu comentario?")) return;
    try {
      await deleteDoc(doc(db, "comentarios", id));
      setMensaje("Comentario eliminado.");
    } catch {
      setMensaje("No se pudo eliminar el comentario. Inténtalo de nuevo.");
    }
  };

  const guardarNota = async () => {
    if (!nota.trim()) {
      setMensaje("Escribe algo en tu nota antes de guardarla.");
      return;
    }
    try {
      if (usuario) {
        await setDoc(doc(db, "notas", `${usuario.uid}_${receta.id}`), {
          usuarioId: usuario.uid,
          recetaId: receta.id,
          texto: nota.trim(),
          fecha: serverTimestamp(),
        });
      } else {
        localStorage.setItem(claveNota, nota.trim());
      }
      setNotaGuardada(true);
      setMensaje("Nota guardada 📝");
    } catch {
      setMensaje("No se pudo guardar tu nota. Inténtalo de nuevo.");
    }
  };

  const borrarNota = async () => {
    try {
      if (usuario) {
        await deleteDoc(doc(db, "notas", `${usuario.uid}_${receta.id}`));
      } else {
        localStorage.removeItem(claveNota);
      }
      setNota("");
      setNotaGuardada(false);
      setMensaje("Nota borrada.");
    } catch {
      setMensaje("No se pudo borrar tu nota. Inténtalo de nuevo.");
    }
  };

  /* ---------- Compartir ---------- */
  const listaIngredientes = receta.ingredientes.map((ing) => `• ${ing}`).join("\n");
  const listaPasos = receta.pasos.map((paso, i) => `${i + 1}. ${paso}`).join("\n");

  const textoCompleto =
`🍰 ${receta.nombre} — Charin Cook

⏱ Tiempo: ${receta.tiempo} min | 🍽 Porciones: ${receta.porciones} | Dificultad: ${receta.dificultad}

Ingredientes:
${listaIngredientes}

Pasos:
${listaPasos}

Más recetas en: ${ENLACE_APP}`;

  const textoCorto =
`🍰 ${receta.nombre} — Charin Cook
Ingredientes: ${receta.ingredientes.slice(0, 6).join(", ")}...
Mira la receta y más postres aquí: ${ENLACE_APP}`;

  const enlacesCompartir = [
    { nombre: "WhatsApp", icono: "💬", url: `https://wa.me/?text=${encodeURIComponent(textoCorto)}` },
    {
      nombre: "Gmail",
      icono: "✉️",
      url: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Receta: ${receta.nombre}`)}&body=${encodeURIComponent(textoCompleto)}`,
    },
    {
      nombre: "Correo",
      icono: "📧",
      url: `mailto:?subject=${encodeURIComponent(`Receta: ${receta.nombre}`)}&body=${encodeURIComponent(textoCompleto)}`,
    },
    {
      nombre: "Telegram",
      icono: "✈️",
      url: `https://t.me/share/url?url=${encodeURIComponent(ENLACE_APP)}&text=${encodeURIComponent(textoCorto)}`,
    },
    {
      nombre: "Facebook",
      icono: "📘",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ENLACE_APP)}&quote=${encodeURIComponent(textoCorto)}`,
    },
    { nombre: "X", icono: "🐦", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCorto)}` },
  ];

  const abrirEnlace = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setMenuCompartir(false);
  };

  const copiarReceta = async () => {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setMensaje("Receta copiada, ¡ya puedes pegarla donde quieras!");
    } catch {
      setMensaje("Tu navegador no permitió copiar. Prueba desde Chrome o Edge.");
    }
    setMenuCompartir(false);
  };

  const compartirNativo = async () => {
    try {
      await navigator.share({ title: receta.nombre, text: textoCorto, url: ENLACE_APP });
    } catch (error) {
      if (error?.name !== "AbortError") {
        setMensaje("No se pudo abrir el menú de compartir. Usa una de las opciones de abajo.");
      }
    }
    setMenuCompartir(false);
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
          <dt>Preparación (aprox.)</dt>
          <dd>{receta.tiempoPreparacion} min</dd>
        </div>
        <div>
          <dt>Cocción (aprox.)</dt>
          <dd>{receta.tiempoCoccion} min</dd>
        </div>
        <div>
          <dt>Tiempo total</dt>
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
            disabled={!usuario}
          >
            {esFavorita ? "❤️ Quitar de favoritos" : "🤍 Guardar en favoritos"}
          </button>
          <button
            type="button"
            className="rc-btn"
            onClick={() => setMenuCompartir((v) => !v)}
            aria-expanded={menuCompartir}
          >
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
              disabled={!usuario}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            >
              {n <= calificacion ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      {/* Menú de compartir */}
      {menuCompartir && (
        <div className="rc-compartir">
          <p className="rc-compartir-titulo">Compartir esta receta por:</p>
          <div className="rc-compartir-botones">
            {enlacesCompartir.map((e) => (
              <button key={e.nombre} type="button" className="rc-btn" onClick={() => abrirEnlace(e.url)}>
                {e.icono} {e.nombre}
              </button>
            ))}
            {typeof navigator !== "undefined" && navigator.share && (
              <button type="button" className="rc-btn" onClick={compartirNativo}>
                ⋯ Más opciones
              </button>
            )}
            <button type="button" className="rc-btn" onClick={copiarReceta}>
              📋 Copiar receta
            </button>
          </div>
        </div>
      )}

      {!usuario && (
        <p className="rc-aviso-invitado">Inicia sesión para guardar, calificar o comentar</p>
      )}

      {mensaje && <p className="rc-mensaje">{mensaje}</p>}

      {/* Mis notas (privadas) */}
      <details className="rc-nota-caja">
        <summary>📝 Mis notas {notaGuardada ? "(guardada)" : ""}</summary>
        <p className="rc-nota-ayuda">
          Solo tú ves esto. Anota cambios, trucos o lo que quieras recordar de esta receta.
          {!usuario && " Como invitado, se guarda solo en este navegador."}
        </p>
        <textarea
          className="rc-nota-texto"
          rows={3}
          placeholder="Ej: le puse menos azúcar y quedó perfecta…"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={600}
        />
        <div className="rc-nota-botones">
          <button type="button" className="rc-btn rc-btn--primary" onClick={guardarNota}>
            Guardar nota
          </button>
          {notaGuardada && (
            <button type="button" className="rc-btn" onClick={borrarNota}>
              Borrar nota
            </button>
          )}
        </div>
      </details>

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
              <span className="rc-texto-comentario">{c.texto}</span>
              {usuario && c.usuarioId === usuario.uid && (
                <button
                  type="button"
                  className="rc-eliminar"
                  onClick={() => eliminarComentario(c.id)}
                >
                  🗑 Eliminar
                </button>
              )}
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
            disabled={!usuario}
          />
          <button type="submit" className="rc-btn rc-btn--primary" disabled={!usuario}>
            Enviar
          </button>
        </form>
      </details>
    </article>
  );
}

export default RecetaCard;