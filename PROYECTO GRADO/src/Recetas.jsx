import { useState } from "react";
import recetas from "./recetasData";

// Nombres bonitos para mostrar cada categoría
const nombresCategorias = {
  tradicional: "Recetas Tradicionales",
  fitness: "Recetas Fitness",
  especial: "Recetas para Fechas Especiales",
};

function Recetas() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todas");

  // Filtra primero por texto buscado
  const filtradasPorTexto = recetas.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Luego filtra por categoría (si el usuario eligió una)
  const filtradasFinal =
    categoriaActiva === "todas"
      ? filtradasPorTexto
      : filtradasPorTexto.filter((r) => r.categoria === categoriaActiva);

  // Agrupa las recetas por categoría para mostrarlas en secciones
  const categorias = ["tradicional", "fitness", "especial"];

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto", textAlign: "center" }}>
      <h2>Catálogo de recetas</h2>

      <input
        type="text"
        placeholder="Buscar receta..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ padding: "8px", width: "80%", marginBottom: "16px" }}
      />

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setCategoriaActiva("todas")}>Todas</button>
        <button onClick={() => setCategoriaActiva("tradicional")}>Tradicionales</button>
        <button onClick={() => setCategoriaActiva("fitness")}>Fitness</button>
        <button onClick={() => setCategoriaActiva("especial")}>Fechas especiales</button>
      </div>

      {filtradasFinal.length === 0 && <p>No se encontraron recetas.</p>}

      {categorias
        .filter((cat) => categoriaActiva === "todas" || categoriaActiva === cat)
        .map((cat) => {
          const recetasDeCategoria = filtradasFinal.filter((r) => r.categoria === cat);
          if (recetasDeCategoria.length === 0) return null;

          return (
            <div key={cat} style={{ marginBottom: "30px" }}>
              <h3 style={{ borderBottom: "2px solid #888", paddingBottom: "6px" }}>
                {nombresCategorias[cat]}
              </h3>

              {recetasDeCategoria.map((receta) => (
                <div
                  key={receta.id}
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
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}

export default Recetas;