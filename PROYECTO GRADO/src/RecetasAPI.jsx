import { useState, useEffect, useMemo, useRef } from "react";
import { traducirReceta } from "./geminiService";
import "./RecetasAPI.css";

const API = "https://www.themealdb.com/api/json/v1/1";
const TIMEOUT_MS = 10_000;

async function obtenerJsonConTimeout(url) {
  const controller = new AbortController();
  let agotado = false;
  const timeoutId = setTimeout(() => {
    agotado = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (agotado) throw new Error("La solicitud tardó más de 10 segundos.");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Nombres de países en español (si falta alguno, se muestra el original)
const PAISES = {
  American: "Estados Unidos",
  British: "Reino Unido",
  Canadian: "Canadá",
  Chinese: "China",
  Croatian: "Croacia",
  Dutch: "Países Bajos",
  Egyptian: "Egipto",
  Filipino: "Filipinas",
  French: "Francia",
  Greek: "Grecia",
  Indian: "India",
  Irish: "Irlanda",
  Italian: "Italia",
  Jamaican: "Jamaica",
  Japanese: "Japón",
  Kenyan: "Kenia",
  Malaysian: "Malasia",
  Mexican: "México",
  Moroccan: "Marruecos",
  Polish: "Polonia",
  Portuguese: "Portugal",
  Russian: "Rusia",
  Spanish: "España",
  Thai: "Tailandia",
  Tunisian: "Túnez",
  Turkish: "Turquía",
  Ukrainian: "Ucrania",
  Uruguayan: "Uruguay",
  Vietnamese: "Vietnam",
  Algerian: "Argelia",
  Argentinian: "Argentina",
  Norwegian: "Noruega",
  Syrian: "Siria",
  Venezulan: "Venezuela",
  Unknown: "Otro",
};
const nombrePais = (a) => PAISES[a] || a;

// Saca el ID del video de un link de YouTube
function idYoutube(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

function obtenerIngredientes(receta) {
  const lista = [];
  for (let i = 1; i <= 20; i++) {
    const nombre = receta[`strIngredient${i}`];
    const medida = receta[`strMeasure${i}`];
    if (nombre && nombre.trim()) {
      lista.push({ nombre: nombre.trim(), medida: medida ? medida.trim() : "" });
    }
  }
  return lista;
}

function dividirPasos(texto) {
  return (texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^step\s*\d+$/i.test(l));
}

function mensajeErrorTraduccion(e) {
  const msg = e?.message || "";
  if (msg.includes("VITE_GEMINI_KEY")) return "Falta configurar VITE_GEMINI_KEY en .env.local.";
  if (msg.includes("429")) return "Muchas peticiones seguidas 😅 Espera un minutito e inténtalo de nuevo.";
  if (msg.toLowerCase().includes("failed to fetch")) return "Parece que no hay internet 📶";
  return "Charin no pudo traducir esta receta ahora mismo. Inténtalo de nuevo.";
}

function RecetasAPI() {
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [receta, setReceta] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");
  const [idDetalleFallido, setIdDetalleFallido] = useState(null);

  const [traducciones, setTraducciones] = useState({}); // guardadas por idMeal
  const [traduciendo, setTraduciendo] = useState(false);
  const [errorTraduccion, setErrorTraduccion] = useState("");
  const [idioma, setIdioma] = useState("original"); // "original" | "es"

  const topRef = useRef(null);

  /* ---------- Cargar la lista de postres ---------- */
  const cargarLista = async () => {
    setCargandoLista(true);
    setError("");
    try {
      const d = await obtenerJsonConTimeout(`${API}/filter.php?c=Dessert`);
      setLista(d.meals || []);
    } catch (e) {
      setError(
        e.message?.includes("10 segundos")
          ? "La búsqueda de postres tardó más de 10 segundos."
          : "No se pudo conectar con los postres. Revisa tu conexión a internet."
      );
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  /* ---------- Subir al inicio al abrir un postre ---------- */
  useEffect(() => {
    if (receta) topRef.current?.scrollIntoView({ block: "start" });
  }, [receta?.idMeal]);

  /* ---------- Buscador ---------- */
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((p) => !q || p.strMeal.toLowerCase().includes(q));
  }, [lista, busqueda]);

  /* ---------- Detalle ---------- */
  const verDetalle = async (id) => {
    if (cargandoDetalle) return;
    setCargandoDetalle(true);
    setErrorDetalle("");
    setIdDetalleFallido(null);
    try {
      const d = await obtenerJsonConTimeout(`${API}/lookup.php?i=${id}`);
      if (!d.meals?.[0]) throw new Error();
      setReceta(d.meals[0]);
      setIdioma(traducciones[id] ? "es" : "original");
      setErrorTraduccion("");
    } catch (e) {
      setIdDetalleFallido(id);
      setErrorDetalle(
        e.message?.includes("10 segundos")
          ? "La receta tardó más de 10 segundos en cargar."
          : "No se pudo cargar el detalle de este postre. Inténtalo de nuevo."
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  /* ---------- Traducir con Charin ---------- */
  const traducir = async () => {
    if (!receta) return;
    const id = receta.idMeal;
    if (traducciones[id]) {
      setIdioma("es");
      return;
    }
    setTraduciendo(true);
    setErrorTraduccion("");
    try {
      const ing = obtenerIngredientes(receta).map((i) => `${i.medida} ${i.nombre}`.trim());
      const t = await traducirReceta({
        nombre: receta.strMeal,
        ingredientes: ing,
        instrucciones: receta.strInstructions || "",
      });
      setTraducciones((prev) => ({ ...prev, [id]: t }));
      setIdioma("es");
    } catch (e) {
      setErrorTraduccion(mensajeErrorTraduccion(e));
    } finally {
      setTraduciendo(false);
    }
  };

  /* ============================ DETALLE ============================ */
  if (receta) {
    const ingredientes = obtenerIngredientes(receta);
    const t = traducciones[receta.idMeal];
    const mostrarES = idioma === "es" && !!t;
    const pasos = mostrarES ? t.pasos : dividirPasos(receta.strInstructions);
    const titulo = mostrarES && t.nombre ? t.nombre : receta.strMeal;
    const idVideo = idYoutube(receta.strYoutube);

    return (
      <div className="ra-contenedor" ref={topRef}>
        <button className="ra-volver" onClick={() => setReceta(null)}>
          ← Volver a los postres
        </button>

        <article className="ra-detalle">
          <div className="ra-hero">
            <img className="ra-hero-img" src={receta.strMealThumb} alt={receta.strMeal} />
            <div className="ra-hero-info">
              <h2 className="ra-detalle-titulo">{titulo}</h2>

              <div className="ra-badges">
                {receta.strCategory && <span className="ra-badge">🍰 {receta.strCategory}</span>}
                {receta.strArea && <span className="ra-badge">🌎 {nombrePais(receta.strArea)}</span>}
                {idVideo && <span className="ra-badge">🎥 Con video</span>}
              </div>

              {/* Traducción */}
              <div className="ra-traduccion">
                {t ? (
                  <div className="ra-segmentado" role="group" aria-label="Idioma de la receta">
                    <button
                      className={idioma === "original" ? "activo" : ""}
                      onClick={() => setIdioma("original")}
                    >
                      Original (inglés)
                    </button>
                    <button className={idioma === "es" ? "activo" : ""} onClick={() => setIdioma("es")}>
                      Español 🍩
                    </button>
                  </div>
                ) : (
                  <button className="ra-btn-charin" onClick={traducir} disabled={traduciendo}>
                    {traduciendo ? "Charin está traduciendo…" : "🍩 Traducir con Charin"}
                  </button>
                )}
                {errorTraduccion && <p className="ra-error-chico">{errorTraduccion}</p>}
              </div>

              {receta.strYoutube && (
                <a className="ra-link-yt" href={receta.strYoutube} target="_blank" rel="noreferrer">
                  Abrir el video en YouTube ↗
                </a>
              )}
            </div>
          </div>

          <div className="ra-columnas">
            {/* Ingredientes */}
            <section className="ra-bloque">
              <h3>Ingredientes</h3>
              <ul className="ra-ingredientes">
                {ingredientes.map((ing, i) => {
                  const texto =
                    mostrarES && t.ingredientes?.[i]
                      ? t.ingredientes[i]
                      : `${ing.medida} ${ing.nombre}`.trim();
                  return (
                    <li key={i}>
                      <img
                        src={`https://www.themealdb.com/images/ingredients/${encodeURIComponent(ing.nombre)}-small.png`}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span>{texto}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Pasos */}
            <section className="ra-bloque">
              <h3>Preparación</h3>
              <ol className="ra-pasos">
                {pasos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </section>
          </div>

          {/* Video */}
          {idVideo && (
            <section className="ra-bloque">
              <h3>Mira cómo se prepara</h3>
              <div className="ra-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${idVideo}`}
                  title={`Video de ${receta.strMeal}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </section>
          )}
        </article>
      </div>
    );
  }

  /* ============================ LISTA ============================ */
  return (
    <div className="ra-contenedor" ref={topRef}>
      <h2 className="ra-titulo">Explorar más postres</h2>
      <p className="ra-sub">
        {cargandoLista
          ? "Buscando postres deliciosos…"
          : `${visibles.length} postre${visibles.length === 1 ? "" : "s"} de todo el mundo`}
      </p>

      {error ? (
        <div className="ra-estado">
          <p>{error}</p>
          <button className="ra-btn-principal" onClick={cargarLista}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Solo el buscador: se ajusta la grilla a una sola columna */}
          <div className="ra-controles" style={{ gridTemplateColumns: "1fr" }}>
            <input
              className="ra-campo"
              type="search"
              placeholder="Buscar postre (en inglés: cake, pie…)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar postre"
            />
          </div>

          {errorDetalle && (
            <div className="ra-estado">
              <p>{errorDetalle}</p>
              {idDetalleFallido && (
                <button className="ra-btn-principal" onClick={() => verDetalle(idDetalleFallido)}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {cargandoDetalle && <p className="ra-sub">Abriendo la receta…</p>}

          {cargandoLista ? (
            <div className="ra-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="ra-card ra-skeleton" key={i}>
                  <div className="ra-skeleton-img" />
                  <div className="ra-skeleton-linea" />
                </div>
              ))}
            </div>
          ) : visibles.length === 0 ? (
            <div className="ra-estado">
              <p>No encontramos postres con ese filtro 🍩</p>
              <button className="ra-btn-principal" onClick={() => setBusqueda("")}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="ra-grid">
              {visibles.map((postre) => (
                <button
                  type="button"
                  key={postre.idMeal}
                  className="ra-card"
                  onClick={() => verDetalle(postre.idMeal)}
                  disabled={cargandoDetalle}
                >
                  <img src={postre.strMealThumb} alt={postre.strMeal} loading="lazy" />
                  <span className="ra-card-nombre">{postre.strMeal}</span>
                  <span className="ra-card-ver">Ver receta →</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RecetasAPI;