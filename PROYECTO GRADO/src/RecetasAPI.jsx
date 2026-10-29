import { useState, useEffect, useMemo, useRef } from "react";
import { traducirReceta } from "./geminiService";
import { buscarPostresPorNombre, obtenerDetallePostre, obtenerPostres } from "./mealDbService";
import {
  coincideNombreTraducido,
  traducirBusquedaAlIngles,
  traducirNombres,
} from "./traductorNombres";
import "./RecetasAPI.css";

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
  const ingredientes = new Map();
  for (let i = 1; i <= 20; i++) {
    const nombre = receta[`strIngredient${i}`];
    const medida = receta[`strMeasure${i}`];
    if (nombre && nombre.trim()) {
      const limpio = nombre.trim().replace(/\s+/g, " ");
      const clave = limpio.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cantidad = (medida || "").trim().replace(/\s+/g, " ");
      const ingrediente = ingredientes.get(clave) || { nombre: limpio, medidas: new Map() };
      if (cantidad) {
        const claveCantidad = cantidad
          .toLocaleLowerCase("es")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!ingrediente.medidas.has(claveCantidad)) {
          ingrediente.medidas.set(claveCantidad, cantidad);
        }
      }
      ingredientes.set(clave, ingrediente);
    }
  }
  return [...ingredientes.values()].map(({ nombre, medidas }) => ({
    nombre,
    medida: [...medidas.values()].join(" + "),
  }));
}

function dividirPasos(texto) {
  return (texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^step\s*\d+$/i.test(l));
}

function RecetasAPI({ postreInicialId = "" }) {
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [resultadoBusquedaApi, setResultadoBusquedaApi] = useState({ termino: "", postres: [] });
  const [nombresTraducidos, setNombresTraducidos] = useState({});

  const [receta, setReceta] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");
  const [idDetalleFallido, setIdDetalleFallido] = useState(null);

  const [traducciones, setTraducciones] = useState({});
  const [traduciendo, setTraduciendo] = useState(false);
  const [errorTraduccion, setErrorTraduccion] = useState("");
  const [idioma, setIdioma] = useState("original"); // "original" | "es"

  const topRef = useRef(null);

  /* ---------- Cargar la lista de postres ---------- */
  const cargarLista = async () => {
    setCargandoLista(true);
    setError("");
    try {
      const postres = await obtenerPostres();
      setLista(postres);
      traducirNombres(postres.map((postre) => postre.strMeal))
        .then((nombres) => {
          setNombresTraducidos((actuales) => ({ ...actuales, ...nombres }));
        });
    } catch (errorCarga) {
      setError(
        errorCarga.message.includes("8 segundos")
          ? "La conexión está tardando más de lo esperado. Vuelve a intentarlo en un momento."
          : "No pudimos cargar los postres del mundo. Revisa tu conexión y vuelve a intentarlo."
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
  }, [receta]);

  /* ---------- Búsqueda en inglés y filtrado por nombres traducidos ---------- */
  useEffect(() => {
    let activo = true;
    const consulta = busqueda.trim();
    if (!consulta) return () => { activo = false; };

    const timeoutId = globalThis.setTimeout(async () => {
      const terminoIngles = await traducirBusquedaAlIngles(consulta);
      if (!activo) return;
      try {
        const encontrados = await buscarPostresPorNombre(terminoIngles);
        if (!activo) return;
        const idsDessert = new Set(lista.map((postre) => postre.idMeal));
        setResultadoBusquedaApi({
          termino: consulta.toLocaleLowerCase("es"),
          postres: encontrados.filter((postre) => idsDessert.has(postre.idMeal)),
        });
      } catch {
        if (activo) {
          setResultadoBusquedaApi({ termino: consulta.toLocaleLowerCase("es"), postres: [] });
        }
      }
    }, 300);

    return () => {
      activo = false;
      globalThis.clearTimeout(timeoutId);
    };
  }, [busqueda, lista]);

  const visibles = useMemo(() => {
    const consulta = busqueda.trim();
    const resultadosBusqueda = resultadoBusquedaApi.termino === consulta.toLocaleLowerCase("es")
      ? resultadoBusquedaApi.postres
      : [];
    const idsEncontradosPorApi = new Set(resultadosBusqueda.map((postre) => postre.idMeal));
    const candidatos = new Map(
      [...lista, ...resultadosBusqueda].map((postre) => [postre.idMeal, postre])
    );
    return [...candidatos.values()].filter((postre) =>
      !consulta ||
      idsEncontradosPorApi.has(postre.idMeal) ||
      coincideNombreTraducido(
        nombresTraducidos[postre.strMeal] || postre.strMeal,
        postre.strMeal,
        consulta
      )
    );
  }, [lista, resultadoBusquedaApi, nombresTraducidos, busqueda]);

  /* ---------- Detalle ---------- */
  const verDetalle = async (id) => {
    if (cargandoDetalle) return;
    setCargandoDetalle(true);
    setErrorDetalle("");
    setIdDetalleFallido(null);
    try {
      const detalle = await obtenerDetallePostre(id);
      setReceta(detalle);
      traducirNombres([detalle.strMeal]).then((nombres) => {
        setNombresTraducidos((actuales) => ({ ...actuales, ...nombres }));
      });
      setIdioma(traducciones[id] ? "es" : "original");
      setErrorTraduccion("");
    } catch (errorCarga) {
      setIdDetalleFallido(id);
      setErrorDetalle(
        errorCarga.message.includes("8 segundos")
          ? "La conexión está tardando más de lo esperado. Reintenta cargar este postre."
          : "No se pudo cargar el detalle de este postre. Inténtalo de nuevo."
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  useEffect(() => {
    if (!postreInicialId) return undefined;
    let activo = true;
    obtenerDetallePostre(postreInicialId)
      .then((detalle) => {
        if (!activo) return;
        setReceta(detalle);
        setIdioma("original");
        traducirNombres([detalle.strMeal]).then((nombres) => {
          if (activo) setNombresTraducidos((actuales) => ({ ...actuales, ...nombres }));
        });
        setErrorTraduccion("");
      })
      .catch((errorCarga) => {
        if (!activo) return;
        setIdDetalleFallido(postreInicialId);
        setErrorDetalle(
          errorCarga.message.includes("8 segundos")
            ? "La conexión está tardando más de lo esperado. Reintenta cargar este postre."
            : "No se pudo cargar el detalle de este postre. Inténtalo de nuevo."
        );
      })
      .finally(() => {
        if (activo) setCargandoDetalle(false);
      });
    return () => { activo = false; };
  }, [postreInicialId]);

  /* ---------- Traducir con Charin ---------- */
  const traducir = async () => {
    if (!receta) return;
    const id = receta.idMeal;
    setTraduciendo(true);
    setErrorTraduccion("");
    try {
      const ing = obtenerIngredientes(receta).map((i) => `${i.medida} ${i.nombre}`.trim());
      const t = await traducirReceta({
        id,
        nombre: receta.strMeal,
        ingredientes: ing,
        instrucciones: receta.strInstructions || "",
      });
      setTraducciones((prev) => ({ ...prev, [id]: t }));
      setIdioma("es");
    } catch (e) {
      console.error("No se pudo traducir la receta.", e);
      setErrorTraduccion(
        e?.message?.includes("Falta configurar")
          ? "La traducción no está configurada en este sitio. Añade GEMINI_API_KEY en Vercel → Settings → Environment Variables y vuelve a desplegar."
          : "Ahora mismo no puedo traducirla, pero puedes consultar la receta original e intentarlo de nuevo."
      );
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
    const titulo = mostrarES && t.nombre
      ? t.nombre
      : nombresTraducidos[receta.strMeal] || receta.strMeal;
    const idVideo = idYoutube(receta.strYoutube);
    const tiempoEstimado = Math.max(20, pasos.length * 4);
    const dificultadEstimada =
      ingredientes.length > 10 || pasos.length > 9
        ? "Avanzada"
        : ingredientes.length > 6 || pasos.length > 5
          ? "Intermedia"
          : "Sencilla";

    return (
      <div className="ra-contenedor" ref={topRef}>
        <button className="ra-volver" onClick={() => setReceta(null)}>
          ← Volver a los postres
        </button>

        <article className="ra-detalle">
          <div className="ra-hero">
            <img
              className="ra-hero-img"
              src={receta.strMealThumb}
              alt={receta.strMeal}
              width="320"
              height="240"
              decoding="async"
            />
            <div className="ra-hero-info">
              <h2 className="ra-detalle-titulo" title={receta.strMeal}>{titulo}</h2>

              <div className="ra-badges">
                {receta.strCategory && <span className="ra-badge">🍰 {receta.strCategory}</span>}
                {receta.strArea && <span className="ra-badge">🌎 {nombrePais(receta.strArea)}</span>}
                <span className="ra-badge">≈ {tiempoEstimado} min</span>
                <span className="ra-badge">Dificultad {dificultadEstimada}</span>
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
                {errorTraduccion && (
                  <button className="ra-btn-charin ra-btn-reintentar" onClick={traducir} disabled={traduciendo}>
                    Reintentar traducción
                  </button>
                )}
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
                        decoding="async"
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
      <h2 className="ra-titulo">Postres del mundo</h2>
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
              placeholder="Buscar postre en español o inglés…"
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
                  <img
                    src={postre.strMealThumb}
                    alt={nombresTraducidos[postre.strMeal] || postre.strMeal}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="ra-card-nombre" title={postre.strMeal}>
                    {nombresTraducidos[postre.strMeal] || postre.strMeal}
                  </span>
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