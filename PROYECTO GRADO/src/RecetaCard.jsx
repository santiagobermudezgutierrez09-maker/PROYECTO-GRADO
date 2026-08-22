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
    const textoCompartir = `Mira esta receta en Charin Cook: ${receta.nombre}`;
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
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
        textAlign: "left",
      }}
    >
      <h4>{receta.nombre}</h4>
      <p>
        Tiempo: {receta.tiempo} min — Porciones: {receta.porciones}
      </p>
      <p>
        Dificultad: {receta.dificultad} — Calorías: {receta.calorias} kcal — Dieta:{" "}
        {receta.dieta}
      </p>
      <p>
        <strong>Ingredientes:</strong> {receta.ingredientes.join(", ")}
      </p>
      <p>
        <strong>Pasos:</strong>
      </p>
      <ol>
        {receta.pasos.map((paso, i) => (
          <li key={i}>{paso}</li>
        ))}
      </ol>

      {/* Botones de favorito y compartir */}
      <div style={{ marginBottom: "8px" }}>
        <button onClick={toggleFavorito}>
          {esFavorita ? "❤️ Quitar de favoritos" : "🤍 Guardar en favoritos"}
        </button>
        <button onClick={compartir} style={{ marginLeft: "8px" }}>
          🔗 Compartir
        </button>
      </div>

      {/* Calificación con estrellas */}
      <div style={{ marginBottom: "8px" }}>
        <strong>Calificar: </strong>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            onClick={() => calificar(n)}
            style={{ cursor: "pointer", fontSize: "20px" }}
          >
            {n <= calificacion ? "⭐" : "☆"}
          </span>
        ))}
      </div>

      {mensaje && <p style={{ color: "orange" }}>{mensaje}</p>}

      {/* Comentarios */}
      <div>
        <strong>Comentarios:</strong>
        <ul>
          {comentarios.map((c) => (
            <li key={c.id}>
              <em>{c.correo}:</em> {c.texto}
            </li>
          ))}
          {comentarios.length === 0 && <li>Sé el primero en comentar.</li>}
        </ul>

        <form onSubmit={enviarComentario}>
          <input
            type="text"
            placeholder="Escribe un comentario..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            style={{ padding: "6px", width: "70%" }}
          />
          <button type="submit" style={{ marginLeft: "6px" }}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

export default RecetaCard;