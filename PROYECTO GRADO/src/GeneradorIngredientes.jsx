import { useState } from "react";
import recetas from "./recetasData";
import equivalencias from "./equivalencias";

function GeneradorIngredientes() {
  const [textoIngredientes, setTextoIngredientes] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [recetasCompatibles, setRecetasCompatibles] = useState([]);

  const buscarRecetas = (e) => {
    e.preventDefault();


    const misIngredientes = textoIngredientes
      .toLowerCase()
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);


    const resultado = recetas
      .map((receta) => {
        const ingredientesReceta = receta.ingredientes.map((i) => i.toLowerCase());
        const coincidencias = ingredientesReceta.filter((ing) =>
          misIngredientes.some((mio) => ing.includes(mio) || mio.includes(ing))
        );
        return { ...receta, coincidencias: coincidencias.length };
      })
      .filter((r) => r.coincidencias > 0)
      .sort((a, b) => b.coincidencias - a.coincidencias);

    setRecetasCompatibles(resultado);
    setBuscado(true);
  };


  const buscarSustituto = (ingrediente) => {
    const encontrado = equivalencias.find(
      (eq) => eq.original.toLowerCase() === ingrediente.toLowerCase()
    );
    return encontrado ? encontrado.sustituto : null;
  };

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto", textAlign: "center" }}>
      <h2>¿Qué puedo cocinar?</h2>
      <p>Escribe los ingredientes que tienes, separados por comas.</p>

      <form onSubmit={buscarRecetas} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Ej: arroz, pollo, cebolla"
          value={textoIngredientes}
          onChange={(e) => setTextoIngredientes(e.target.value)}
          style={{ padding: "8px", width: "70%" }}
        />
        <button type="submit" style={{ padding: "8px 16px", marginLeft: "8px" }}>
          Buscar recetas
        </button>
      </form>

      {buscado && recetasCompatibles.length === 0 && (
        <p>No encontramos recetas con esos ingredientes. Prueba con otros.</p>
      )}

      {recetasCompatibles.map((receta) => (
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
            Coincide con {receta.coincidencias} de tus ingredientes.
          </p>
          <p>
            <strong>Ingredientes necesarios:</strong>
          </p>
          <ul>
            {receta.ingredientes.map((ing, i) => {
              const yaLoTengo = textoIngredientes
                .toLowerCase()
                .includes(ing.toLowerCase());
              const sustituto = buscarSustituto(ing);
              return (
                <li key={i}>
                  {ing} {yaLoTengo ? "✅" : "❌"}
                  {!yaLoTengo && sustituto && (
                    <span> — Puedes sustituirlo por: {sustituto}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default GeneradorIngredientes;