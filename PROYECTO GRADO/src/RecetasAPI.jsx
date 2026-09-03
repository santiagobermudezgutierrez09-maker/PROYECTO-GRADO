import { useState, useEffect } from "react";

function RecetasAPI() {
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState("");

  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    const cargarLista = async () => {
      try {
        const respuesta = await fetch(
          "https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert"
        );
        const datos = await respuesta.json();
        setLista(datos.meals || []);
      } catch (e) {
        setError("No se pudo conectar con los postres. Revisa tu conexión a internet.");
      } finally {
        setCargandoLista(false);
      }
    };
    cargarLista();
  }, []);

  const verDetalle = async (idMeal) => {
    setCargandoDetalle(true);
    try {
      const respuesta = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`
      );
      const datos = await respuesta.json();
      setRecetaSeleccionada(datos.meals ? datos.meals[0] : null);
    } catch (e) {
      setError("No se pudo cargar el detalle de este postre.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const obtenerIngredientes = (receta) => {
    const ingredientes = [];
    for (let i = 1; i <= 20; i++) {
      const ingrediente = receta[`strIngredient${i}`];
      const medida = receta[`strMeasure${i}`];
      if (ingrediente && ingrediente.trim()) {
        ingredientes.push(`${medida ? medida.trim() + " " : ""}${ingrediente.trim()}`);
      }
    }
    return ingredientes;
  };

  if (cargandoLista) {
    return <p style={{ textAlign: "center" }}>Cargando postres...</p>;
  }

  if (error) {
    return <p style={{ textAlign: "center", color: "var(--color-pink)" }}>{error}</p>;
  }

  if (recetaSeleccionada) {
    const ingredientes = obtenerIngredientes(recetaSeleccionada);
    return (
      <div style={{ maxWidth: "600px", margin: "20px auto" }}>
        <button onClick={() => setRecetaSeleccionada(null)} style={{ marginBottom: "16px" }}>
          ← Volver a la lista
        </button>
        <div className="card" style={{ textAlign: "left" }}>
          <h2>{recetaSeleccionada.strMeal}</h2>
          <img
            src={recetaSeleccionada.strMealThumb}
            alt={recetaSeleccionada.strMeal}
            style={{ width: "100%", borderRadius: "10px", marginBottom: "12px" }}
          />
          <p>
            <strong>Categoría:</strong> {recetaSeleccionada.strCategory} &nbsp;|&nbsp;
            <strong> Origen:</strong> {recetaSeleccionada.strArea}
          </p>
          <p>
            <strong>Ingredientes:</strong>
          </p>
          <ul>
            {ingredientes.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
          <p>
            <strong>Instrucciones:</strong>
          </p>
          <p style={{ whiteSpace: "pre-line" }}>{recetaSeleccionada.strInstructions}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", textAlign: "center" }}>
      <h2>🌐 Explorar más postres</h2>
      <p style={{ marginBottom: "20px" }}>
        Estos postres se traen en vivo desde TheMealDB.
      </p>

      {cargandoDetalle && <p>Cargando postre...</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
        }}
      >
        {lista.map((postre) => (
          <div
            key={postre.idMeal}
            className="card"
            onClick={() => verDetalle(postre.idMeal)}
            style={{ cursor: "pointer", padding: "10px" }}
          >
            <img
              src={postre.strMealThumb}
              alt={postre.strMeal}
              style={{ width: "100%", borderRadius: "8px", marginBottom: "8px" }}
            />
            <p style={{ margin: 0, fontWeight: 600 }}>{postre.strMeal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecetasAPI;