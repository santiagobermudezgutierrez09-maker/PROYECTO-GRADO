import { useEffect, useMemo, useRef, useState } from "react";
import recetas from "./recetasData";
import RecetaCard from "./RecetaCard";
import { obtenerDetallePostre, obtenerPostres } from "./mealDbService";
import { coincideNombreTraducido, traducirNombres } from "./traductorNombres";
import "./Recetas.css";

const FILTROS = [
  { id: "menos30", texto: "Menos de 30 min" },
  { id: "sinHorno", texto: "Sin horno" },
  { id: "fitness", texto: "Fitness" },
  { id: "faciles", texto: "Fáciles" },
  { id: "chocolate", texto: "Con chocolate" },
];

const CATEGORIAS = [
  ["tradicional", "Postres tradicionales"],
  ["fitness", "Postres fitness"],
  ["especial", "Para fechas especiales"],
];

const normalizar = (texto = "") =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function tiempoPostre(postre) {
  const pasos = (postre.strInstructions || "").split(/[.!?\n]+/).filter(Boolean);
  return Math.max(15, Math.ceil(pasos.length * 3));
}

function dificultadPostre(postre) {
  const ingredientes = Array.from({ length: 20 }, (_, i) => postre[`strIngredient${i + 1}`])
    .filter((nombre) => nombre?.trim()).length;
  const pasos = (postre.strInstructions || "").split(/[.!?\n]+/).filter(Boolean).length;
  return ingredientes > 10 || pasos > 9 ? "Avanzada" : ingredientes > 6 || pasos > 5 ? "Intermedia" : "Fácil";
}

function TarjetaCatalogo({ receta, alAbrir }) {
  return (
    <button type="button" className="rec-card" onClick={() => alAbrir(receta.id)}>
      <span className="rec-card-imagen" aria-hidden="true">
        <span>{receta.emoji || "🍰"}</span>
      </span>
      <span className="rec-card-contenido">
        <span className="rec-card-nombre">{receta.nombre}</span>
        <span className="rec-card-meta">{receta.tiempo} min · Dificultad {receta.dificultad}</span>
        <span className="rec-card-ver">Ver receta <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}

function Recetas({ busquedaInicial = "", irA }) {
  const coincidenciaInicial = busquedaInicial
    ? recetas.find((r) => normalizar(r.nombre) === normalizar(busquedaInicial))
    : null;
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [filtroActivo, setFiltroActivo] = useState("");
  const [recetaAbiertaId, setRecetaAbiertaId] = useState(coincidenciaInicial?.id ?? null);
  const [postresMundo, setPostresMundo] = useState([]);
  const [nombresTraducidos, setNombresTraducidos] = useState({});
  const [cargandoMundo, setCargandoMundo] = useState(true);
  const [errorMundo, setErrorMundo] = useState("");
  const [intento, setIntento] = useState(0);
  const inicioRef = useRef(null);

  useEffect(() => {
    inicioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [recetaAbiertaId]);

  useEffect(() => {
    let activo = true;
    async function cargarDestacados() {
      setCargandoMundo(true);
      setErrorMundo("");
      try {
        const lista = await obtenerPostres();
        const respuestas = await Promise.allSettled(
          lista.slice(0, 6).map((postre) => obtenerDetallePostre(postre.idMeal))
        );
        if (!activo) return;
        const cargados = respuestas
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        setPostresMundo(cargados);
        traducirNombres(cargados.map((postre) => postre.strMeal))
          .then((nombres) => {
            if (activo) setNombresTraducidos((actuales) => ({ ...actuales, ...nombres }));
          });
        if (!cargados.length) setErrorMundo("No pudimos cargar los postres del mundo ahora mismo.");
        else if (cargados.length < respuestas.length) setErrorMundo("Algunos postres no están disponibles por ahora.");
      } catch {
        if (activo) setErrorMundo("No pudimos conectar con los postres del mundo. Inténtalo otra vez.");
      } finally {
        if (activo) setCargandoMundo(false);
      }
    }
    cargarDestacados();
    return () => { activo = false; };
  }, [intento]);

  const recetaAbierta = recetas.find((r) => r.id === recetaAbiertaId);
  const termino = normalizar(busqueda);
  const postresVisibles = useMemo(
    () => postresMundo.filter((p) => {
      if (!termino) return true;
      const ingredientes = Array.from({ length: 20 }, (_, i) => p[`strIngredient${i + 1}`] || "").join(" ");
      return (
        coincideNombreTraducido(nombresTraducidos[p.strMeal] || p.strMeal, p.strMeal, busqueda) ||
        normalizar(ingredientes).includes(termino)
      );
    }),
    [postresMundo, nombresTraducidos, termino, busqueda]
  );

  const recetasVisibles = useMemo(() => recetas.filter((receta) => {
    const coincideBusqueda = !termino ||
      normalizar(receta.nombre).includes(termino) ||
      receta.ingredientes.some((ing) => normalizar(ing).includes(termino));
    if (!coincideBusqueda) return false;
    if (filtroActivo === "menos30") return receta.tiempo < 30;
    if (filtroActivo === "sinHorno") return !receta.pasos.some((paso) => /horno|hornea|hornear/i.test(paso));
    if (filtroActivo === "fitness") return receta.categoria === "fitness";
    if (filtroActivo === "faciles") return receta.dificultad === "fácil";
    if (filtroActivo === "chocolate") return /chocolate|cacao/i.test(`${receta.nombre} ${receta.ingredientes.join(" ")}`);
    return true;
  }), [termino, filtroActivo]);

  if (recetaAbierta) {
    return (
      <div className="recetas" ref={inicioRef}>
        <div className="rec-detalle-barra">
          <button type="button" className="rec-volver" onClick={() => setRecetaAbiertaId(null)}>
            ← Volver a Postres rápidos
          </button>
          <button type="button" className="rec-cocinar" onClick={() => irA?.("cocina", String(recetaAbierta.id))}>
            Cocinar ahora
          </button>
        </div>
        <RecetaCard receta={recetaAbierta} />
      </div>
    );
  }

  return (
    <div className="recetas" ref={inicioRef}>
      <section className="rapidos-hero">
        <span className="rec-etiqueta">Inspiración para cualquier antojo</span>
        <h2>Postres rápidos</h2>
        <p>Busca una idea y encuentra algo rico para preparar sin complicarte.</p>
        <label className="recetas-busqueda">
          <svg className="recetas-busqueda-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="10.5" cy="10" r="6.5" />
            <path d="m15.5 15 5 5M8.2 10h4.6M8.7 12.2h3.6M9 8.6c.4-.7 1.7-.7 2 0" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por postre o ingrediente..."
            aria-label="Buscar postre o ingrediente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <div className="recetas-categorias" role="group" aria-label="Filtros de postres rápidos">
          {FILTROS.map((filtro) => (
            <button
              type="button"
              key={filtro.id}
              className={`recetas-chip ${filtroActivo === filtro.id ? "activo" : ""}`}
              aria-pressed={filtroActivo === filtro.id}
              onClick={() => setFiltroActivo((actual) => actual === filtro.id ? "" : filtro.id)}
            >
              {filtro.texto}
            </button>
          ))}
        </div>
      </section>

      <section className="rec-mundo" aria-labelledby="rec-mundo-titulo">
        <div className="rec-mundo-heading">
          <div>
            <span className="rec-etiqueta">Selección internacional · TheMealDB</span>
            <h2 id="rec-mundo-titulo">Postres del mundo</h2>
            <p>Ideas con fotos, sabores y recetas de distintos rincones del mundo.</p>
          </div>
          <button type="button" className="rec-mundo-enlace" onClick={() => irA?.("api")}>
            Explorar colección completa <span aria-hidden="true">→</span>
          </button>
        </div>
        {errorMundo && (
          <p className="rec-mundo-error" role="status">
            {errorMundo}
            {!postresMundo.length && <button type="button" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>}
          </p>
        )}
        {cargandoMundo ? (
          <div className="rec-mundo-grid" aria-label="Cargando postres del mundo">
            {Array.from({ length: 4 }, (_, i) => <div className="rec-mundo-skeleton" key={i} />)}
          </div>
        ) : postresVisibles.length > 0 ? (
          <div className="rec-mundo-grid">
            {postresVisibles.map((postre) => (
              <button
                type="button"
                className="rec-mundo-card"
                key={postre.idMeal}
                onClick={() => irA?.("api", postre.idMeal)}
              >
                <img src={postre.strMealThumb} alt="" loading="lazy" />
                <span className="rec-mundo-card-info">
                  <strong title={postre.strMeal}>
                    {nombresTraducidos[postre.strMeal] || postre.strMeal}
                  </strong>
                  <span>{`≈ ${tiempoPostre(postre)} min · Dificultad ${dificultadPostre(postre).toLowerCase()}`}</span>
                </span>
              </button>
            ))}
          </div>
        ) : !errorMundo ? (
          <p className="rec-mundo-error">No encontramos postres del mundo con esa búsqueda.</p>
        ) : null}
      </section>

      <section className="rec-catalogo">
        <div className="rec-catalogo-heading">
          <div>
            <span className="rec-etiqueta">Recetas de Charin Cook</span>
            <h2>Nuestro catálogo</h2>
          </div>
          <p>{recetasVisibles.length} {recetasVisibles.length === 1 ? "receta" : "recetas"}</p>
        </div>
        {recetasVisibles.length === 0 ? (
          <div className="card recetas-vacio">
            <span aria-hidden="true">🍮</span>
            <p>No encontramos recetas con ese filtro.</p>
            <button type="button" onClick={() => { setBusqueda(""); setFiltroActivo(""); }}>Ver todos los postres</button>
          </div>
        ) : (
          CATEGORIAS.map(([categoria, nombre]) => {
            const grupo = recetasVisibles.filter((receta) => receta.categoria === categoria);
            if (!grupo.length) return null;
            return (
              <section key={categoria} className="recetas-seccion">
                <div className="recetas-seccion-titulo"><h3>{nombre}</h3><span>{grupo.length}</span></div>
                <div className="recetas-grid">
                  {grupo.map((receta) => <TarjetaCatalogo key={receta.id} receta={receta} alAbrir={setRecetaAbiertaId} />)}
                </div>
              </section>
            );
          })
        )}
      </section>
    </div>
  );
}

export default Recetas;
