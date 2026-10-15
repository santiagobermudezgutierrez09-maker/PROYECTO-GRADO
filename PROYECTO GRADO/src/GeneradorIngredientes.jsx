import { useState, useMemo } from "react";
import recetas from "./recetasData";
import equivalencias from "./equivalencias";
import "./GeneradorIngredientes.css";

// Compara sin importar mayúsculas ni acentos
const limpiar = (t) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const buscarSustituto = (ingrediente) => {
  const encontrado = equivalencias.find(
    (eq) => limpiar(eq.original) === limpiar(ingrediente)
  );
  return encontrado ? encontrado.sustituto : null;
};

function GeneradorIngredientes() {
  const [seleccion, setSeleccion] = useState([]);
  const [texto, setTexto] = useState("");

  // Los ingredientes más usados en tus recetas, calculados automáticamente
  const sugeridos = useMemo(() => {
    const conteo = {};
    recetas.forEach((r) =>
      r.ingredientes.forEach((ing) => {
        const k = ing.toLowerCase().trim();
        conteo[k] = (conteo[k] || 0) + 1;
      })
    );
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([nombre]) => nombre);
  }, []);

  const estaSeleccionado = (nombre) =>
    seleccion.some((s) => limpiar(s) === limpiar(nombre));

  const alternar = (nombre) => {
    setSeleccion((prev) =>
      prev.some((s) => limpiar(s) === limpiar(nombre))
        ? prev.filter((s) => limpiar(s) !== limpiar(nombre))
        : [...prev, nombre]
    );
  };

  const agregarEscritos = (e) => {
    e.preventDefault();
    const nuevos = texto
      .split(",")
      .map((i) => i.toLowerCase().trim())
      .filter((i) => i.length >= 2 && !estaSeleccionado(i));
    if (nuevos.length > 0) setSeleccion((prev) => [...prev, ...nuevos]);
    setTexto("");
  };

  // Recetas posibles: se recalculan solas cada vez que cambia la selección
  const resultados = useMemo(() => {
    if (seleccion.length === 0) return [];

    const tiene = (ing) => {
      const i = limpiar(ing);
      return seleccion.some((s) => {
        const m = limpiar(s);
        return i.includes(m) || m.includes(i);
      });
    };

    const tieneSustituto = (sustituto) => {
      if (!sustituto) return false;
      const sus = limpiar(sustituto);
      return seleccion.some((s) => sus.includes(limpiar(s)));
    };

    return recetas
      .map((receta) => {
        const detalle = receta.ingredientes.map((ing) => {
          const tengo = tiene(ing);
          const sustituto = buscarSustituto(ing);
          const sustituido = !tengo && tieneSustituto(sustituto);
          return { nombre: ing, tengo, sustituto, sustituido };
        });
        const tengoCount = detalle.filter((d) => d.tengo).length;
        const cubiertos = detalle.filter((d) => d.tengo || d.sustituido).length;
        return {
          ...receta,
          detalle,
          tengoCount,
          cubiertos,
          faltan: detalle.length - cubiertos,
        };
      })
      .filter((r) => r.tengoCount > 0)
      .sort((a, b) => a.faltan - b.faltan || b.tengoCount - a.tengoCount);
  }, [seleccion]);

  const listas = resultados.filter((r) => r.faltan === 0);
  const casi = resultados.filter((r) => r.faltan >= 1 && r.faltan <= 2);
  const resto = resultados.filter((r) => r.faltan > 2);

  const renderReceta = (r) => (
    <article key={r.id} className="gi-receta">
      <div className="gi-receta-top">
        <h4 className="gi-nombre">{r.nombre}</h4>
        <span className={`gi-estado ${r.faltan === 0 ? "gi-estado--lista" : ""}`}>
          {r.faltan === 0
            ? "¡Lista para preparar!"
            : `Te ${r.faltan === 1 ? "falta" : "faltan"} ${r.faltan}`}
        </span>
      </div>

      {(r.tiempo || r.dificultad) && (
        <p className="gi-meta">
          {r.tiempo && <span>{r.tiempo} min</span>}
          {r.dificultad && <span>{r.dificultad}</span>}
        </p>
      )}

      <div className="gi-barra" aria-hidden="true">
        <span style={{ width: `${(r.cubiertos / r.detalle.length) * 100}%` }} />
      </div>

      <ul className="gi-lista">
        {r.detalle.map((d, i) => (
          <li
            key={i}
            className={d.tengo ? "gi-tengo" : d.sustituido ? "gi-sustituido" : "gi-falta"}
          >
            <span>
              {d.nombre} {d.tengo ? "✅" : d.sustituido ? "🔄" : "❌"}
            </span>
            {!d.tengo && d.sustituto && (
              <span className="gi-sustituto">
                {d.sustituido ? "Lo cubres con: " : "Puedes sustituirlo por: "}
                {d.sustituto}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );

  const renderGrupo = (titulo, lista, clase) =>
    lista.length > 0 && (
      <section className="gi-grupo">
        <h3 className={`gi-grupo-titulo ${clase}`}>
          {titulo} <span>{lista.length}</span>
        </h3>
        {lista.map(renderReceta)}
      </section>
    );

  return (
    <div className="gi">
      <section className="gi-panel">
        <p className="gi-intro">
          Toca los ingredientes que tienes en casa y te mostramos qué postres puedes preparar.
        </p>

        <h3 className="gi-subtitulo">Ingredientes comunes</h3>
        <div className="gi-chips">
          {sugeridos.map((nombre) => (
            <button
              key={nombre}
              type="button"
              className={`gi-chip ${estaSeleccionado(nombre) ? "gi-chip--on" : ""}`}
              aria-pressed={estaSeleccionado(nombre)}
              onClick={() => alternar(nombre)}
            >
              {nombre}
            </button>
          ))}
        </div>

        <form className="gi-form" onSubmit={agregarEscritos}>
          <input
            type="text"
            placeholder="¿Otro ingrediente? Ej: leche, huevos, azúcar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit">Agregar</button>
        </form>

        {seleccion.length > 0 && (
          <div className="gi-despensa">
            <div className="gi-despensa-top">
              <h3 className="gi-subtitulo">Tu despensa ({seleccion.length})</h3>
              <button type="button" className="gi-limpiar" onClick={() => setSeleccion([])}>
                Limpiar todo
              </button>
            </div>
            <div className="gi-chips">
              {seleccion.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  className="gi-chip gi-chip--on"
                  onClick={() => alternar(nombre)}
                  aria-label={`Quitar ${nombre}`}
                >
                  {nombre} ✕
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {seleccion.length === 0 && (
        <p className="gi-vacio">
          Elige al menos un ingrediente y aquí aparecerán tus recetas posibles.
        </p>
      )}

      {seleccion.length > 0 && resultados.length === 0 && (
        <p className="gi-vacio">
          No encontramos postres con esos ingredientes. Prueba agregando otros.
        </p>
      )}

      {resultados.length > 0 && (
        <p className="gi-resumen">
          {resultados.length} {resultados.length === 1 ? "receta posible" : "recetas posibles"}
          {listas.length > 0 && ` · ${listas.length} lista${listas.length === 1 ? "" : "s"} para preparar`}
        </p>
      )}

      {renderGrupo("Listas para preparar", listas, "gi-grupo--lista")}
      {renderGrupo("Casi listas", casi, "gi-grupo--casi")}
      {renderGrupo("Con lo que tienes", resto, "")}
    </div>
  );
}

export default GeneradorIngredientes;