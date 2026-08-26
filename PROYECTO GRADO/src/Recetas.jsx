import { useState } from "react";
import recetas from "./recetasData";
import RecetaCard from "./RecetaCard";

const nombresCategorias = {
  tradicional: "Recetas Tradicionales",
  fitness: "Recetas Fitness",
  especial: "Recetas para Fechas Especiales",
};

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

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto", textAlign: "center" }}>
      <h2>Catálogo de recetas</h2>

      <input
        type="text"
        placeholder="Buscar receta..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ padding: "8px", width: "80%", marginBottom: "12px" }}
      />

      <div style={{ marginBottom: "16px" }}>
        <button
          className={categoriaActiva === "todas" ? "filtro-activo" : ""}
          onClick={() => setCategoriaActiva("todas")}
        >
          Todas
        </button>
        <button
          className={categoriaActiva === "tradicional" ? "filtro-activo" : ""}
          onClick={() => setCategoriaActiva("tradicional")}
        >
          Tradicionales
        </button>
        <button
          className={categoriaActiva === "fitness" ? "filtro-activo" : ""}
          onClick={() => setCategoriaActiva("fitness")}
        >
          Fitness
        </button>
        <button
          className={categoriaActiva === "especial" ? "filtro-activo" : ""}
          onClick={() => setCategoriaActiva("especial")}
        >
          Fechas especiales
        </button>
      </div>

      <button
        onClick={() => setMostrarFiltros((v) => !v)}
        style={{ marginBottom: "16px" }}
      >
        {mostrarFiltros ? "Ocultar filtros avanzados ▲" : "Filtros avanzados ▾"}
      </button>

      {mostrarFiltros && (
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          justifyContent: "center",
          marginBottom: "24px",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 600 }}>
            Tiempo máximo
          </label>
          <select value={tiempoMax} onChange={(e) => setTiempoMax(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="20">Hasta 20 min</option>
            <option value="40">Hasta 40 min</option>
            <option value="60">Hasta 60 min</option>
            <option value="90">Hasta 90 min</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 600 }}>
            Dificultad
          </label>
          <select value={dificultad} onChange={(e) => setDificultad(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="fácil">Fácil</option>
            <option value="media">Media</option>
            <option value="difícil">Difícil</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 600 }}>
            Tipo de dieta
          </label>
          <select value={dieta} onChange={(e) => setDieta(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="vegetariana">Vegetariana</option>
            <option value="alta en proteína">Alta en proteína</option>
            <option value="estándar">Estándar</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 600 }}>
            Calorías máximas
          </label>
          <select value={caloriasMax} onChange={(e) => setCaloriasMax(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="300">Hasta 300 kcal</option>
            <option value="400">Hasta 400 kcal</option>
            <option value="500">Hasta 500 kcal</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={limpiarFiltros}>Limpiar filtros</button>
        </div>
      </div>
      )}

      {resultado.length === 0 && <p>No se encontraron recetas con esos filtros.</p>}

      {categorias
        .filter((cat) => categoriaActiva === "todas" || categoriaActiva === cat)
        .map((cat) => {
          const recetasDeCategoria = resultado.filter((r) => r.categoria === cat);
          if (recetasDeCategoria.length === 0) return null;

          return (
            <div key={cat} style={{ marginBottom: "30px" }}>
              <h3 style={{ borderBottom: "2px solid #888", paddingBottom: "6px" }}>
                {nombresCategorias[cat]}
              </h3>

              {recetasDeCategoria.map((receta) => (
                <RecetaCard key={receta.id} receta={receta} />
              ))}
            </div>
          );
        })}
    </div>
  );
}

export default Recetas;