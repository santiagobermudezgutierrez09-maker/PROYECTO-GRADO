import { useState, useMemo } from "react";
import recetas from "./recetasData";
import equivalencias from "./equivalencias";
import logoDona from "./assets/logo-dona.png";
import "./GeneradorIngredientes.css";

// Compara sin importar mayúsculas ni acentos
const limpiar = (t) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const claveIngrediente = (nombre) => {
  const clave = limpiar(nombre);
  return /^huevos?$/.test(clave) ? "huevo" : clave;
};

const nombreIngrediente = (nombre) => {
  const limpio = String(nombre).trim().replace(/\s+/g, " ");
  if (/^huevos?$/i.test(limpio)) return "Huevos";
  const minusculas = limpio.toLocaleLowerCase("es");
  return minusculas.charAt(0).toLocaleUpperCase("es") + minusculas.slice(1);
};

const buscarSustituto = (ingrediente) => {
  const encontrado = equivalencias.find(
    (eq) => limpiar(eq.original) === limpiar(ingrediente)
  );
  return encontrado ? encontrado.sustituto : null;
};

// Lo que casi siempre hay en casa
const BASICOS = ["Huevos", "Harina", "Azúcar", "Leche", "Mantequilla"];

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
  const [filtroActivo, setFiltroActivo] = useState("todas");
  const [categoriaIngrediente, setCategoriaIngrediente] = useState("todas");
  const [resultadosAbiertos, setResultadosAbiertos] = useState(false);

  // Los ingredientes más usados en tus recetas, ordenados por frecuencia
  const populares = useMemo(() => {
    const conteo = new Map();
    recetas.forEach((r) => {
      const ingredientesUnicos = new Map(
        r.ingredientes.map((ing) => [claveIngrediente(ing), nombreIngrediente(ing)])
      );
      ingredientesUnicos.forEach((nombre, clave) => {
        const entrada = conteo.get(clave) || { nombre, cantidad: 0 };
        entrada.cantidad += 1;
        conteo.set(clave, entrada);
      });
    });
    return [...conteo.entries()]
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .map(([, ingrediente]) => ingrediente.nombre);
  }, []);

  const ingredientesFiltrados = useMemo(() => {
    const consulta = limpiar(texto);
    return populares
      .filter((nombre) => {
        const coincideTexto = !consulta || limpiar(nombre).includes(consulta);
        const coincideCategoria = categoriaIngrediente === "todas" ||
          clasificar(nombre) === categoriaIngrediente;
        return coincideTexto && coincideCategoria;
      });
  }, [populares, texto, categoriaIngrediente]);
  const visibles = ingredientesFiltrados.slice(0, verMasIngredientes ? 90 : 30);

  const estaSeleccionado = (nombre) =>
    seleccion.some((s) => claveIngrediente(s) === claveIngrediente(nombre));

  const alternar = (nombre) => {
    const nombreNormalizado = nombreIngrediente(nombre);
    setSeleccion((prev) =>
      prev.some((s) => claveIngrediente(s) === claveIngrediente(nombreNormalizado))
        ? prev.filter((s) => claveIngrediente(s) !== claveIngrediente(nombreNormalizado))
        : [...prev, nombreNormalizado]
    );
  };

  const agregarEscritos = (e) => {
    e.preventDefault();
    const nuevos = [...new Map(texto
      .split(",")
      .map(nombreIngrediente)
      .filter((i) => i.length >= 2)
      .map((i) => [claveIngrediente(i), i])).values()];
    if (nuevos.length > 0) {
      setSeleccion((prev) => {
        const claves = new Set(prev.map(claveIngrediente));
        return [...prev, ...nuevos.filter((i) => !claves.has(claveIngrediente(i)))];
      });
    }
    setTexto("");
  };

  // Recetas posibles: se recalculan solas cada vez que cambia la selección
  const resultados = useMemo(() => {
    if (seleccion.length === 0) return [];

    const tiene = (ing) => {
      return seleccion.some((s) => {
        const ingredienteClave = claveIngrediente(ing);
        const seleccionClave = claveIngrediente(s);
        return ingredienteClave === seleccionClave ||
          ingredienteClave.includes(seleccionClave) ||
          seleccionClave.includes(ingredienteClave);
      });
    };

    const tieneSustituto = (sustituto) => {
      if (!sustituto) return false;
      const sus = limpiar(sustituto);
      return seleccion.some((s) => sus.includes(limpiar(s)));
    };

    return recetas
      .map((receta) => {
        const ingredientesUnicos = new Map(
          receta.ingredientes.map((ing) => [claveIngrediente(ing), nombreIngrediente(ing)])
        );
        const detalle = [...ingredientesUnicos.values()].map((ing) => {
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

  const resultadosFiltrados = resultados.filter((r) => {
    if (filtroActivo === "listas") return r.faltan === 0;
    if (filtroActivo === "casi") return r.faltan >= 1 && r.faltan <= 2;
    if (filtroActivo === "sustitutos") return r.detalle.some((d) => d.sustituto);
    return true;
  });

  const listas = resultadosFiltrados.filter((r) => r.faltan === 0);
  const casi = resultadosFiltrados.filter((r) => r.faltan >= 1 && r.faltan <= 2);
  const resto = resultadosFiltrados.filter((r) => r.faltan > 2);

  const renderReceta = (r) => {
    const faltantes = r.detalle.filter((d) => !d.tengo && !d.sustituido);
    const sustituidos = r.detalle.filter((d) => d.sustituido);
    const coinciden = r.detalle.filter((d) => d.tengo || d.sustituido);
    const porcentaje = Math.round((r.cubiertos / r.detalle.length) * 100);
    const imagen = r.image || r.imagen || r.foto || r.strMealThumb;

    return (
      <article key={r.id} className="gi-receta">
        <div className="gi-receta-visual" aria-hidden="true">
          {imagen ? (
            <img src={imagen} alt="" loading="lazy" />
          ) : (
            <span>{r.emoji || "🍰"}</span>
          )}
          <span className="gi-visual-brillo" />
          <strong className="gi-coincidencia">{porcentaje}%</strong>
        </div>
        <div className="gi-receta-top">
          <h4 className="gi-nombre">
            {r.nombre}
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

        <div className="gi-progreso">
          <div className="gi-progreso-etiqueta">
            <span>Receta completa</span>
            <strong>{porcentaje}%</strong>
          </div>
          <div
            className="gi-barra"
            role="progressbar"
            aria-label={`Ingredientes disponibles para ${r.nombre}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
          >
            <span style={{ width: `${porcentaje}%` }} />
          </div>
        </div>

        {r.faltan === 0 && (
          <p className="gi-todo">
            Tienes todo lo necesario{sustituidos.length > 0 && ` con ${sustituidos.length} sustituto${sustituidos.length === 1 ? "" : "s"}`}.
          </p>
        )}

        <div className="gi-ingredientes-resumen">
          <div className="gi-ingredientes-bloque">
            <strong>Tienes ({coinciden.length})</strong>
            <div className="gi-ingredientes-chips">
              {coinciden.map((d, i) => (
                <span className={d.sustituido ? "gi-ingrediente gi-ingrediente--sustituido" : "gi-ingrediente gi-ingrediente--tengo"} key={i}>
                  {d.sustituido ? "↻" : "✓"} {d.nombre}
                </span>
              ))}
            </div>
          </div>
          {faltantes.length > 0 && (
            <div className="gi-ingredientes-bloque">
              <strong>Te faltan ({faltantes.length})</strong>
              <div className="gi-ingredientes-chips">
                {faltantes.map((d, i) => (
                  <span className="gi-ingrediente gi-ingrediente--falta" key={i}>
                    + {d.nombre}{d.sustituto && <small> · sustituible por {d.sustituto}</small>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

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
              Cocinar ahora
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

  const pestanas = [
    { id: "lacteos", label: "Lácteos", icono: "🥛" },
    { id: "harinas", label: "Harinas", icono: "🌾" },
    { id: "dulces", label: "Dulces", icono: "🍫" },
    { id: "frutas", label: "Frutas", icono: "🍓" },
    { id: "todas", label: "Todos", icono: "🧺" },
  ];

  const iconoIngrediente = (nombre) =>
    GRUPOS.find((grupo) => grupo.id === clasificar(nombre))?.icono || "🧺";

  const renderIngrediente = (nombre) => {
    const seleccionado = estaSeleccionado(nombre);
    return (
      <button
        key={nombre}
        type="button"
        className={`gi-ingrediente-card ${seleccionado ? "seleccionado" : ""}`}
        aria-pressed={seleccionado}
        onClick={() => alternar(nombre)}
      >
        <span className="gi-ingrediente-icono" aria-hidden="true">{iconoIngrediente(nombre)}</span>
        <span className="gi-ingrediente-nombre">{nombre}</span>
        <span className="gi-ingrediente-check" aria-hidden="true">{seleccionado ? "✓" : "+"}</span>
      </button>
    );
  };

  return (
    <div className="gi">
      <header className="gi-header">
        <div>
          <span className="gi-etiqueta">Cocina con lo que tienes</span>
          <h1>¿Qué puedo cocinar?</h1>
          <p>Elige lo que tienes a mano y encuentra tu próximo postre.</p>
        </div>
        <div className="gi-contador">
          <span><strong>{seleccion.length}</strong> {seleccion.length === 1 ? "ingrediente elegido" : "ingredientes elegidos"}</span>
          <button
            type="button"
            className="gi-limpiar"
            disabled={!seleccion.length}
            onClick={() => {
              setSeleccion([]);
              setFiltroActivo("todas");
              setVerResto(false);
              setResultadosAbiertos(false);
            }}
          >
            Limpiar
          </button>
        </div>
      </header>

      <div className="gi-columnas">
        <section className="gi-panel gi-despensa-panel">
          <div className="gi-panel-heading">
            <div><span className="gi-paso">01</span><h2>Tu despensa</h2></div>
            <p>Marca los ingredientes que tienes.</p>
          </div>
          <form className="gi-form" onSubmit={agregarEscritos}>
            <input
              type="search"
              placeholder="Busca un ingrediente..."
              aria-label="Buscar ingredientes"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" disabled={!texto.trim()} aria-label="Añadir ingrediente">
              Añadir
            </button>
          </form>

          <div className="gi-categorias" role="tablist" aria-label="Categorías de ingredientes">
            {pestanas.map(({ id, label, icono }) => (
              <button
                type="button"
                role="tab"
                key={id}
                className={categoriaIngrediente === id ? "gi-categoria gi-categoria--activa" : "gi-categoria"}
                aria-selected={categoriaIngrediente === id}
                onClick={() => {
                  setCategoriaIngrediente(id);
                  setVerMasIngredientes(false);
                }}
              >
                <span aria-hidden="true">{icono}</span> {label}
              </button>
            ))}
          </div>

          <div className="gi-selector" role="tabpanel">
            {visibles.map(renderIngrediente)}
            {visibles.length === 0 && (
              <p className="gi-busqueda-vacia">
                No encontramos ese ingrediente. Puedes añadirlo con el buscador.
              </p>
            )}
          </div>
          {ingredientesFiltrados.length > visibles.length && (
            <button
              type="button"
              className="gi-ver-mas"
              onClick={() => setVerMasIngredientes((v) => !v)}
            >
              {verMasIngredientes ? "Ver menos" : "Ver más ingredientes"}
            </button>
          )}
          <div className="gi-basicos">
            <span>Atajos</span>
            {BASICOS.map((nombre) => (
              <button
                type="button"
                key={nombre}
                className={estaSeleccionado(nombre) ? "activo" : ""}
                onClick={() => alternar(nombre)}
              >
                {estaSeleccionado(nombre) ? "✓ " : "+ "}{nombre}
              </button>
            ))}
          </div>
        </section>

        <section
          className={`gi-panel gi-resultados-panel ${resultadosAbiertos ? "gi-resultados-abiertos" : ""}`}
          aria-label="Postres para ti"
        >
          <div className="gi-panel-heading gi-resultados-heading">
            <div><span className="gi-paso">02</span><h2>Postres para ti</h2></div>
            <button
              type="button"
              className="gi-cerrar-resultados"
              aria-label="Cerrar resultados"
              onClick={() => setResultadosAbiertos(false)}
            >
              ✕
            </button>
          </div>
          {seleccion.length > 0 && (
            <div className="gi-seleccionados">
              <span className="gi-seleccionados-label">En tu despensa</span>
              <div>
                {seleccion.map((nombre) => (
                  <button type="button" key={nombre} onClick={() => alternar(nombre)} aria-label={`Quitar ${nombre}`}>
                    {nombre} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {seleccion.length === 0 ? (
            <div className="gi-vacio">
              <img src={logoDona} alt="" />
              <h3>Elige tus ingredientes y te mostramos qué cocinar</h3>
              <p>Tu próxima idea dulce está más cerca de lo que piensas.</p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="gi-vacio">
              <span aria-hidden="true">🍮</span>
              <h3>Probemos con otra combinación</h3>
              <p>No encontramos postres con esta selección. Añade o cambia algún ingrediente.</p>
            </div>
          ) : (
            <>
              <div className="gi-resultados-cabecera">
                <p className="gi-resumen">
                  {resultadosFiltrados.length} {resultadosFiltrados.length === 1 ? "postre" : "postres"} posibles
                </p>
                <div className="gi-filtros" role="group" aria-label="Filtrar postres">
                  {[
                    ["todas", "Todos"],
                    ["listas", "Listos"],
                    ["casi", "Casi listos"],
                    ["sustitutos", "Con sustitutos"],
                  ].map(([valor, etiqueta]) => (
                    <button
                      type="button"
                      className={filtroActivo === valor ? "gi-filtro gi-filtro--activo" : "gi-filtro"}
                      aria-pressed={filtroActivo === valor}
                      key={valor}
                      onClick={() => {
                        setFiltroActivo(valor);
                        setVerResto(false);
                      }}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
              {resultadosFiltrados.length === 0 && (
                <div className="gi-vacio gi-vacio-filtro"><p>No hay postres en este filtro. Prueba otra opción.</p></div>
              )}
              {renderGrupo("Listos para cocinar", listas, "gi-grupo--lista")}
              {renderGrupo("Casi listo (te falta 1 o 2)", casi, "gi-grupo--casi")}
              {resto.length > 0 && (
                <section className="gi-grupo">
                  <button type="button" className="gi-ver-mas" onClick={() => setVerResto((v) => !v)}>
                    {verResto ? "Ocultar otras ideas ▲" : `Ver ${resto.length} ideas más ▾`}
                  </button>
                  {verResto && resto.map(renderReceta)}
                </section>
              )}
            </>
          )}
        </section>
      </div>
      {resultadosAbiertos && <button type="button" className="gi-overlay" aria-label="Cerrar resultados" onClick={() => setResultadosAbiertos(false)} />}
      <button
        type="button"
        className="gi-movil-cta"
        onClick={() => setResultadosAbiertos((abierto) => !abierto)}
      >
        {resultadosAbiertos ? "Cerrar resultados" : `Ver ${resultados.length} postres`}
        {!resultadosAbiertos && <span aria-hidden="true">↑</span>}
      </button>
    </div>
  );
}

export default GeneradorIngredientes;