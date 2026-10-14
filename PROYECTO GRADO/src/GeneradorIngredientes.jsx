import { useState } from "react";
import recetas from "./recetasData";
import equivalencias from "./equivalencias";
import "./GeneradorIngredientes.css";

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
    <div className="gi">
      <p className="gi-intro">
        Escribe los ingredientes que tienes, separados por comas.
      </p>

      <form className="gi-form" onSubmit={buscarRecetas}>
        <input
          type="text"
          placeholder="Ej: arroz, pollo, cebolla"
          value={textoIngredientes}
          onChange={(e) => setTextoIngredientes(e.target.value)}
        />
        <button type="submit">Buscar recetas</button>
      </form>

      {buscado && recetasCompatibles.length === 0 && (
        <p className="gi-vacio">
          No encontramos recetas con esos ingredientes. Prueba con otros.
        </p>
      )}

      {recetasCompatibles.map((receta) => (
        <article key={receta.id} className="gi-receta">
          <div className="gi-receta-top">
            <h4 className="gi-nombre">{receta.nombre}</h4>
            <span className="gi-coincide">
              {receta.coincidencias} de {receta.ingredientes.length} ingredientes
            </span>
          </div>

          <div className="gi-barra" aria-hidden="true">
            <span
              style={{
                width: `${(receta.coincidencias / receta.ingredientes.length) * 100}%`,
              }}
            />
          </div>

          <p className="gi-subtitulo">Ingredientes necesarios</p>
          <ul className="gi-lista">
            {receta.ingredientes.map((ing, i) => {
              const yaLoTengo = textoIngredientes
                .toLowerCase()
                .includes(ing.toLowerCase());
              const sustituto = buscarSustituto(ing);
              return (
                <li key={i} className={yaLoTengo ? "gi-tengo" : "gi-falta"}>
                  <span>
                    {ing} {yaLoTengo ? "✅" : "❌"}
                  </span>
                  {!yaLoTengo && sustituto && (
                    <span className="gi-sustituto">
                      Puedes sustituirlo por: {sustituto}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}

export default GeneradorIngredientes;