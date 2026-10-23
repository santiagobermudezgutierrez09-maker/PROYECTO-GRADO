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

// Lo que casi siempre hay en casa
const BASICOS = ["huevos", "harina", "azúcar", "leche", "mantequilla"];

// Grupos para que sea fácil encontrar cada ingrediente
const GRUPOS = [
  { id: "lacteos", icono: "🥛", titulo: "Lácteos y huevos", patron: /leche|huevo|queso|crema|mantequilla|yogur|yogurt|arequipe|nata/ },
  { id: "harinas", icono: "🌾", titulo: "Harinas y secos", patron: /harina|avena|maicena|polvo|levadura|galleta|arroz|almendra|nuez|nueces|mani|semilla|pan|pasas|bicarbonato|sal/ },
  { id: "dulces", icono: "🍫", titulo: "Dulces y sabores", patron: /azucar|panela|miel|chocolate|cacao|esencia|vainilla|canela|bocadillo|jarabe|stevia|gelatina|caramelo|cafe/ },
  { id: "frutas", icono: "🍓", titulo: "Frutas", patron: /limon|fresa|banano|mora|mango|manzana|coco|pina|maracuya|durazno|naranja|uva|guayaba|pera|fruta|zanahoria|calabaza/ },
];

function clasificar(nombre) {
  const n = limpiar(nombre);
  return GRUPOS.find((g) => g.patron.test(n))?.id || "otros";
}

function GeneradorIngredientes({ irA }) {
  const [seleccion, setSeleccion] = useState([]);
  const [texto, setTexto] = useState("");
  const [verMasIngredientes, setVerMasIngredientes] = useState(false);
  const [verResto, setVerResto] = useState(false);

  // Los ingredientes más usados en tus recetas, ordenados por frecuencia
  const populares = useMemo(() => {
    const conteo = {};
    recetas.forEach((r) =>
      r.ingredientes.forEach((ing) => {
        const k = ing.toLowerCase().trim();
        conteo[k] = (conteo[k] || 0) + 1;
      })
    );
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .map(([nombre]) => nombre);
  }, []);

  const visibles = populares.slice(0, verMasIngredientes ? 90 : 30);

  const agrupados = useMemo(() => {
    const mapa = { lacteos: [], harinas: [], dulces: [], frutas: [], otros: [] };
    visibles.forEach((n) => mapa[clasificar(n)].push(n));
    return mapa;
  }, [visibles]);

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

  const agregarBasicos = () => {
    const nuevos = BASICOS.filter((b) => !estaSeleccionado(b));
    if (nuevos.length > 0) setSeleccion((prev) => [...prev, ...nuevos]);
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

  const renderReceta = (r) => {
    const faltantes = r.detalle.filter((d) => !d.tengo && !d.sustituido);
    const sustituidos = r.detalle.filter((d) => d.sustituido);

    return (
      <article key={r.id} className="gi-receta">
        <div className="gi-receta-top">
          <h4 className="gi-nombre">
            {r.emoji || "🍩"} {r.nombre}
          </h4>
          <span className={`gi-estado ${r.faltan === 0 ? "gi-estado--lista" : ""}`}>
            {r.faltan === 0
              ? "¡Puedes hacerla ya!"
              : r.faltan === 1
              ? "Te falta 1 ingrediente"
              : `Te faltan ${r.faltan} ingredientes`}
          </span>
        </div>

        {(r.tiempo || r.dificultad) && (
          <p className="gi-meta">
            {r.tiempo && <span>⏱ {r.tiempo} min</span>}
            {r.dificultad && <span>{r.dificultad}</span>}
            {r.calorias && <span>🔥 {r.calorias} kcal</span>}
          </p>
        )}

        <div className="gi-barra" aria-hidden="true">
          <span style={{ width: `${(r.cubiertos / r.detalle.length) * 100}%` }} />
        </div>

        {r.faltan === 0 ? (
          <p className="gi-todo">
            ✅ Tienes todo lo que necesitas
            {sustituidos.length > 0 && ` (usando sustitutos en ${sustituidos.length})`}.
          </p>
        ) : (
          <div className="gi-faltan">
            <strong>Te falta:</strong>
            <ul>
              {faltantes.map((d, i) => (
                <li key={i}>
                  ❌ {d.nombre}
                  {d.sustituto && <small> · prueba con: {d.sustituto}</small>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="gi-detalle">
          <summary>Ver todos los ingredientes</summary>
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
        </details>

        {irA && (
          <div className="gi-botones">
            <button type="button" onClick={() => irA("recetas", r.nombre)}>
              📖 Ver receta
            </button>
            <button
              type="button"
              className="gi-boton-principal"
              onClick={() => irA("cocina", String(r.id))}
            >
              🔥 Cocinar
            </button>
          </div>
        )}
      </article>
    );
  };

  const renderGrupo = (titulo, lista, clase) =>
    lista.length > 0 && (
      <section className="gi-grupo">
        <h3 className={`gi-grupo-titulo ${clase}`}>
          {titulo} <span>{lista.length}</span>
        </h3>
        {lista.map(renderReceta)}
      </section>
    );

  const grupoChips = (icono, titulo, nombres) =>
    nombres.length > 0 && (
      <div className="gi-ing-grupo" key={titulo}>
        <h4 className="gi-ing-titulo">
          {icono} {titulo}
        </h4>
        <div className="gi-chips gi-chips--grande">
          {nombres.map((nombre) => (
            <button
              key={nombre}
              type="button"
              className={`gi-chip ${estaSeleccionado(nombre) ? "gi-chip--on" : ""}`}
              aria-pressed={estaSeleccionado(nombre)}
              onClick={() => alternar(nombre)}
            >
              {estaSeleccionado(nombre) ? "✓ " : ""}
              {nombre}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="gi">
      <section className="gi-panel">
        <p className="gi-intro">
          <strong>1.</strong> Toca lo que tienes en casa. <strong>2.</strong> Mira abajo qué postres
          puedes hacer. ¡Así de fácil!
        </p>

        <button type="button" className="gi-atajo" onClick={agregarBasicos}>
          ⚡ Tengo lo básico (huevos, harina, azúcar, leche, mantequilla)
        </button>

        {GRUPOS.map((g) => grupoChips(g.icono, g.titulo, agrupados[g.id]))}
        {grupoChips("🧺", "Otros", agrupados.otros)}

        {populares.length > 30 && (
          <button
            type="button"
            className="gi-ver-mas"
            onClick={() => setVerMasIngredientes((v) => !v)}
          >
            {verMasIngredientes ? "Ver menos ingredientes ▲" : "Ver más ingredientes ▾"}
          </button>
        )}

        <form className="gi-form" onSubmit={agregarEscritos}>
          <input
            type="text"
            placeholder="¿No lo ves? Escríbelo aquí. Ej: leche, huevos, azúcar"
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
          Elige al menos un ingrediente y aquí aparecerán tus recetas posibles. 🥕
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
          {listas.length > 0 &&
            ` · ${listas.length} lista${listas.length === 1 ? "" : "s"} para preparar ya`}
        </p>
      )}

      {renderGrupo("✅ Puedes hacerlas ya", listas, "gi-grupo--lista")}
      {renderGrupo("🛒 Casi listas (te falta poquito)", casi, "gi-grupo--casi")}

      {resto.length > 0 && (
        <section className="gi-grupo">
          <button
            type="button"
            className="gi-ver-mas"
            onClick={() => setVerResto((v) => !v)}
          >
            {verResto
              ? "Ocultar las demás recetas ▲"
              : `Ver ${resto.length} recetas más con lo que tienes ▾`}
          </button>
          {verResto && resto.map(renderReceta)}
        </section>
      )}
    </div>
  );
}

export default GeneradorIngredientes;