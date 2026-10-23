import { useState, useRef, useEffect } from "react";
import recetas from "./recetasData";
import RecetaCard from "./RecetaCard";
import "./Recetas.css";

const nombresCategorias = {
  tradicional: "Postres Tradicionales",
  fitness: "Postres Fitness",
  especial: "Postres para Fechas Especiales",
};

// Botones de categoría
const botonesCategoria = [
  { valor: "todas", texto: "Todas" },
  { valor: "tradicional", texto: "Tradicionales" },
  { valor: "fitness", texto: "Fitness" },
  { valor: "especial", texto: "Fechas especiales" },
];

const normalizar = (t = "") =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Un postre es "saludable" si es fitness, liviano o su dieta lo dice
const esSaludable = (r) =>
  r.categoria === "fitness" ||
  r.calorias <= 200 ||
  /vegan|saludable|sin azucar|light/.test(normalizar(r.dieta || ""));

const esBajaEnCalorias = (r) => r.calorias <= 200;

function TarjetaCompacta({ receta, alAbrir }) {
  return (
    <button type="button" className="rec-card" onClick={() => alAbrir(receta.id)}>
      <span className="rec-card-emoji" aria-hidden="true">
        {receta.emoji || "🍩"}
      </span>
      <span className="rec-card-nombre">{receta.nombre}</span>
      <span className="rec-card-meta">
        ⏱ {receta.tiempo} min · 🔥 {receta.calorias} kcal · {receta.dificultad}
      </span>
      <span className="rec-badges">
        {esSaludable(receta) && <span className="rec-badge rec-badge--verde">🌿 Saludable</span>}
        {esBajaEnCalorias(receta) && (
          <span className="rec-badge rec-badge--ambar">🔥 Baja en calorías</span>
        )}
      </span>
      <span className="rec-card-ver">Ver cómo se hace →</span>
    </button>
  );
}

function Recetas({ busquedaInicial = "", irA }) {
  // Si llegan con el nombre exacto de un postre (por ejemplo desde Fechas), se abre directo
  const coincidenciaInicial = busquedaInicial
    ? recetas.find((r) => normalizar(r.nombre) === normalizar(busquedaInicial))
    : null;

  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [soloSaludables, setSoloSaludables] = useState(false);
  const [recetaAbiertaId, setRecetaAbiertaId] = useState(coincidenciaInicial?.id ?? null);

  const [tiempoMax, setTiempoMax] = useState("todos");
  const [dificultad, setDificultad] = useState("todas");
  const [dieta, setDieta] = useState("todas");
  const [caloriasMax, setCaloriasMax] = useState("todas");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const inicioRef = useRef(null);

  // Al abrir o cerrar una receta, vuelve arriba para verla desde el principio
  useEffect(() => {
    inicioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [recetaAbiertaId]);

  const recetaAbierta = recetas.find((r) => r.id === recetaAbiertaId);

  /* ---------- Vista de detalle: cómo se hace ---------- */
  if (recetaAbierta) {
    return (
      <div className="recetas" ref={inicioRef}>
        <div className="rec-detalle-barra">
          <button type="button" className="rec-volver" onClick={() => setRecetaAbiertaId(null)}>
            ← Volver a buscar postres
          </button>
          {irA && (
            <button
              type="button"
              className="rec-cocinar"
              onClick={() => irA("cocina", String(recetaAbierta.id))}
            >
              🔥 Cocinar paso a paso
            </button>
          )}
        </div>

        <RecetaCard receta={recetaAbierta} />

        {irA && (
          <div className="rec-detalle-barra rec-detalle-barra--pie">
            <button
              type="button"
              className="rec-cocinar"
              onClick={() => irA("cocina", String(recetaAbierta.id))}
            >
              🔥 Cocinar paso a paso
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---------- Lista ---------- */
  const termino = normalizar(busqueda);

  let resultado = recetas.filter(
    (r) =>
      normalizar(r.nombre).includes(termino) ||
      (termino.length > 2 && r.ingredientes.some((ing) => normalizar(ing).includes(termino)))
  );

  if (categoriaActiva !== "todas") {
    resultado = resultado.filter((r) => r.categoria === categoriaActiva);
  }
  if (soloSaludables) {
    resultado = resultado.filter(esSaludable);
  }
  if (tiempoMax !== "todos") {
    resultado = resultado.filter((r) => r.tiempo <= Number(tiempoMax));
  }
  if (dificultad !== "todas") {
    resultado = resultado.filter((r) => r.dificultad === dificultad);
  }
  if (dieta !== "todas") {
    resultado = resultado.filter((r) => r.dieta === dieta);
  }
  if (caloriasMax !== "todas") {
    resultado = resultado.filter((r) => r.calorias <= Number(caloriasMax));
  }

  const categorias = ["tradicional", "fitness", "especial"];

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaActiva("todas");
    setSoloSaludables(false);
    setTiempoMax("todos");
    setDificultad("todas");
    setDieta("todas");
    setCaloriasMax("todas");
  };

  // Cuántos filtros avanzados están puestos (para el aviso en el botón)
  const filtrosAvanzadosActivos = [
    tiempoMax !== "todos",
    dificultad !== "todas",
    dieta !== "todas",
    caloriasMax !== "todas",
  ].filter(Boolean).length;

  const sinFiltros =
    !busqueda.trim() &&
    categoriaActiva === "todas" &&
    !soloSaludables &&
    filtrosAvanzadosActivos === 0;

  const destacadas = recetas.filter(esSaludable).slice(0, 6);

  return (
    <div className="recetas" ref={inicioRef}>
      {/* Barra de búsqueda y botón de filtros */}
      <div className="recetas-barra">
        <div className="recetas-busqueda">
          <span className="recetas-busqueda-icono" aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Buscar postre o ingrediente..."
            aria-label="Buscar postre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <button
          className={`recetas-btn-filtros ${mostrarFiltros ? "abierto" : ""}`}
          onClick={() => setMostrarFiltros((v) => !v)}
          aria-expanded={mostrarFiltros}
        >
          {mostrarFiltros ? "Ocultar filtros avanzados ▲" : "Filtros avanzados ▾"}
          {filtrosAvanzadosActivos > 0 && (
            <span className="recetas-badge">{filtrosAvanzadosActivos}</span>
          )}
        </button>
      </div>

      {/* Categorías */}
      <div className="recetas-categorias" role="group" aria-label="Categorías">
        {botonesCategoria.map((b) => (
          <button
            key={b.valor}
            className={`recetas-chip ${categoriaActiva === b.valor ? "activo" : ""}`}
            onClick={() => setCategoriaActiva(b.valor)}
            aria-pressed={categoriaActiva === b.valor}
          >
            {b.texto}
          </button>
        ))}
        <button
          className={`recetas-chip rec-chip-verde ${soloSaludables ? "activo" : ""}`}
          onClick={() => setSoloSaludables((v) => !v)}
          aria-pressed={soloSaludables}
        >
          🌿 Saludables
        </button>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <div className="card recetas-filtros">
          <div className="recetas-campo">
            <label htmlFor="f-tiempo">Tiempo máximo</label>
            <select id="f-tiempo" value={tiempoMax} onChange={(e) => setTiempoMax(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="20">Hasta 20 min</option>
              <option value="40">Hasta 40 min</option>
              <option value="60">Hasta 60 min</option>
              <option value="90">Hasta 90 min</option>
            </select>
          </div>

          <div className="recetas-campo">
            <label htmlFor="f-dificultad">Dificultad</label>
            <select id="f-dificultad" value={dificultad} onChange={(e) => setDificultad(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="fácil">Fácil</option>
              <option value="media">Media</option>
              <option value="difícil">Difícil</option>
            </select>
          </div>

          <div className="recetas-campo">
            <label htmlFor="f-dieta">Tipo de dieta</label>
            <select id="f-dieta" value={dieta} onChange={(e) => setDieta(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="vegetariana">Vegetariana</option>
              <option value="alta en proteína">Alta en proteína</option>
              <option value="estándar">Estándar</option>
            </select>
          </div>

          <div className="recetas-campo">
            <label htmlFor="f-calorias">Calorías máximas</label>
            <select id="f-calorias" value={caloriasMax} onChange={(e) => setCaloriasMax(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="200">Hasta 200 kcal</option>
              <option value="300">Hasta 300 kcal</option>
              <option value="400">Hasta 400 kcal</option>
              <option value="500">Hasta 500 kcal</option>
            </select>
          </div>

          <div className="recetas-campo recetas-campo-boton">
            <button onClick={limpiarFiltros}>Limpiar filtros</button>
          </div>
        </div>
      )}

      {/* Destacado: postres saludables */}
      {sinFiltros && destacadas.length > 0 && (
        <section className="rec-destacado">
          <div className="rec-destacado-titulo">
            <h3>🌿 Postres saludables y livianos</h3>
            <button type="button" onClick={() => setSoloSaludables(true)}>
              Ver todos
            </button>
          </div>
          <p className="rec-destacado-sub">
            Opciones con pocas calorías, sin tanto azúcar y muy ricas.
          </p>
          <div className="rec-lista">
            {destacadas.map((r) => (
              <TarjetaCompacta key={r.id} receta={r} alAbrir={setRecetaAbiertaId} />
            ))}
          </div>
        </section>
      )}

      {/* Cantidad de resultados */}
      <p className="recetas-conteo">
        {resultado.length === 1 ? "1 receta" : `${resultado.length} recetas`}
      </p>

      {/* Sin resultados */}
      {resultado.length === 0 && (
        <div className="card recetas-vacio">
          <p>No se encontraron recetas con esos filtros.</p>
          <button onClick={limpiarFiltros}>Limpiar filtros</button>
        </div>
      )}

      {/* Recetas agrupadas por categoría */}
      {categorias
        .filter((cat) => categoriaActiva === "todas" || categoriaActiva === cat)
        .map((cat) => {
          const recetasDeCategoria = resultado.filter((r) => r.categoria === cat);
          if (recetasDeCategoria.length === 0) return null;

          return (
            <section key={cat} className="recetas-seccion">
              <div className="recetas-seccion-titulo">
                <h3>{nombresCategorias[cat]}</h3>
                <span>{recetasDeCategoria.length}</span>
              </div>

              <div className="rec-lista">
                {recetasDeCategoria.map((receta) => (
                  <TarjetaCompacta key={receta.id} receta={receta} alAbrir={setRecetaAbiertaId} />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

export default Recetas;