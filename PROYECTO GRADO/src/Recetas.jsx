import { useState } from "react";
import recetas from "./recetasData";
import RecetaCard from "./RecetaCard";
import "./Recetas.css";

const nombresCategorias = {
  tradicional: "Postres Tradicionales",
  fitness: "Postres Fitness",
  especial: "Postres para Fechas Especiales",
};

// Botones de categoría (mismos de antes)
const botonesCategoria = [
  { valor: "todas", texto: "Todas" },
  { valor: "tradicional", texto: "Tradicionales" },
  { valor: "fitness", texto: "Fitness" },
  { valor: "especial", texto: "Fechas especiales" },
];

function Recetas() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");

  const [tiempoMax, setTiempoMax] = useState("todos");
  const [dificultad, setDificultad] = useState("todas");
  const [dieta, setDieta] = useState("todas");
  const [caloriasMax, setCaloriasMax] = useState("todas");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  let resultado = recetas.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (categoriaActiva !== "todas") {
    resultado = resultado.filter((r) => r.categoria === categoriaActiva);
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

  return (
    <div className="recetas">
      {/* Barra de búsqueda y botón de filtros */}
      <div className="recetas-barra">
        <div className="recetas-busqueda">
          <span className="recetas-busqueda-icono" aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Buscar postre..."
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

              <div className="recetas-grid">
                {recetasDeCategoria.map((receta) => (
                  <RecetaCard key={receta.id} receta={receta} />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

export default Recetas;