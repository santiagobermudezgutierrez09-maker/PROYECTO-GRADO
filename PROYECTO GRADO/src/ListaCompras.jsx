import { useState, useEffect, useMemo } from "react";
import recetas from "./recetasData";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebaseAuth";
import "./ListaCompras.css";

const CLAVE_LISTA_INVITADO = "charinCook:listaComprasInvitado";

const normalizar = (t = "") =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Arma la lista a partir de las recetas elegidas y conserva lo comprado y lo agregado a mano
function construirLista(ids, listaActual) {
  const comprados = new Map(listaActual.map((i) => [i.nombre, i.comprado]));
  const nombres = new Set();
  ids.forEach((id) => {
    const receta = recetas.find((r) => r.id === id);
    receta?.ingredientes.forEach((ing) => nombres.add(ing));
  });
  const deRecetas = Array.from(nombres).map((nombre) => ({
    nombre,
    comprado: comprados.get(nombre) || false,
  }));
  const propios = listaActual.filter((i) => i.manual && !nombres.has(i.nombre));
  return [...deRecetas, ...propios];
}

// Acepta el formato nuevo ({ items, recetas }) y el viejo (solo una lista)
function leerDatos(bruto) {
  const items = Array.isArray(bruto) ? bruto : bruto?.items;
  const ids = Array.isArray(bruto) ? [] : bruto?.recetas || [];
  if (
    !Array.isArray(items) ||
    items.some((i) => typeof i?.nombre !== "string" || typeof i?.comprado !== "boolean")
  ) {
    throw new Error("La lista guardada no tiene un formato válido.");
  }
  // Una lista vieja no sabe de qué recetas viene: se conserva como ingredientes propios
  const conservar = ids.length === 0 && items.some((i) => !i.manual);
  return {
    items: conservar ? items.map((i) => ({ ...i, manual: true })) : items,
    ids,
  };
}

function ListaCompras() {
  const [recetasSeleccionadas, setRecetasSeleccionadas] = useState([]);
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [nuevoItem, setNuevoItem] = useState("");

  const usuario = auth.currentUser;

  useEffect(() => {
    const cargarLista = async () => {
      if (!usuario) {
        try {
          const guardada = localStorage.getItem(CLAVE_LISTA_INVITADO);
          if (!guardada) return;
          const { items, ids } = leerDatos(JSON.parse(guardada));
          setLista(items);
          setRecetasSeleccionadas(ids);
        } catch {
          setMensaje("No se pudo cargar la lista guardada en este dispositivo.");
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, "listaCompras", usuario.uid));
        if (snap.exists()) {
          const { items, ids } = leerDatos(snap.data());
          setLista(items);
          setRecetasSeleccionadas(ids);
        }
      } catch {
        setMensaje("No se pudo cargar tu lista de compras desde Firestore.");
      }
    };
    cargarLista();
  }, [usuario]);

  // Guarda en Firestore (con sesión) o en este dispositivo (invitado)
  const guardar = async (items, ids) => {
    if (!usuario) {
      try {
        localStorage.setItem(CLAVE_LISTA_INVITADO, JSON.stringify({ items, recetas: ids }));
        setMensaje("");
      } catch {
        setMensaje("La lista está disponible, pero no se pudo guardar en este dispositivo.");
      }
      return;
    }
    try {
      await setDoc(doc(db, "listaCompras", usuario.uid), { items, recetas: ids });
      setMensaje("");
    } catch {
      setMensaje("No se pudo guardar el cambio. Revisa tu conexión.");
    }
  };

  const aplicar = (items, ids) => {
    setLista(items);
    setRecetasSeleccionadas(ids);
    guardar(items, ids);
  };

  // Al marcar una receta, sus ingredientes entran a la lista al instante
  const toggleReceta = (id) => {
    const ids = recetasSeleccionadas.includes(id)
      ? recetasSeleccionadas.filter((r) => r !== id)
      : [...recetasSeleccionadas, id];
    aplicar(construirLista(ids, lista), ids);
  };

  const limpiarSeleccion = () => {
    aplicar(construirLista([], lista), []);
  };

  const marcarComprado = (nombre) => {
    const items = lista.map((item) =>
      item.nombre === nombre ? { ...item, comprado: !item.comprado } : item
    );
    setLista(items);
    guardar(items, recetasSeleccionadas);
  };

  const agregarPropio = (e) => {
    e.preventDefault();
    const nombre = nuevoItem.trim();
    if (!nombre) return;
    if (lista.some((i) => normalizar(i.nombre) === normalizar(nombre))) {
      setMensaje(`"${nombre}" ya está en tu lista.`);
      return;
    }
    const items = [...lista, { nombre, comprado: false, manual: true }];
    setNuevoItem("");
    setLista(items);
    guardar(items, recetasSeleccionadas);
  };

  const vaciarLista = async () => {
    if (!window.confirm("¿Vaciar la lista de compras? Esta acción no se puede deshacer.")) return;

    try {
      if (usuario) {
        await setDoc(doc(db, "listaCompras", usuario.uid), { items: [], recetas: [] });
      } else {
        localStorage.removeItem(CLAVE_LISTA_INVITADO);
      }
      setLista([]);
      setRecetasSeleccionadas([]);
      setMensaje("");
    } catch {
      setMensaje(
        usuario
          ? "No se pudo vaciar la lista en Firestore. Inténtalo de nuevo."
          : "No se pudo vaciar la lista guardada en este dispositivo."
      );
    }
  };

  const copiarLista = async () => {
    const pendientes = lista.filter((i) => !i.comprado).map((i) => `☐ ${i.nombre}`);
    const hechos = lista.filter((i) => i.comprado).map((i) => `☑ ${i.nombre}`);
    const texto = `🛒 Lista de compras — Charin Cook\n\n${[...pendientes, ...hechos].join("\n")}`;
    try {
      await navigator.clipboard.writeText(texto);
      setMensaje("Lista copiada 📋 Ya puedes pegarla en WhatsApp o donde quieras.");
    } catch {
      setMensaje("Tu navegador no permitió copiar la lista.");
    }
  };

  // Para cada ingrediente, en qué recetas se usa
  const usadoEn = useMemo(() => {
    const mapa = new Map();
    recetasSeleccionadas.forEach((id) => {
      const receta = recetas.find((r) => r.id === id);
      receta?.ingredientes.forEach((ing) => {
        mapa.set(ing, [...(mapa.get(ing) || []), receta.nombre]);
      });
    });
    return mapa;
  }, [recetasSeleccionadas]);

  const comprados = lista.filter((item) => item.comprado).length;
  const terminada = lista.length > 0 && comprados === lista.length;

  // Pendientes arriba, comprados abajo
  const listaOrdenada = [...lista].sort((a, b) => Number(a.comprado) - Number(b.comprado));

  const termino = normalizar(busqueda);
  const recetasVisibles = recetas.filter((r) => normalizar(r.nombre).includes(termino));

  return (
    <div className="lc">
      <p className="lc-intro">
        Marca las recetas que vas a preparar y tu lista se arma sola. También puedes agregar lo que
        quieras.
      </p>

      <div className="lc-grid">
        {/* Columna izquierda: elegir recetas */}
        <section className="lc-panel">
          <div className="lc-panel-top">
            <h3 className="lc-titulo">1. Elige tus recetas</h3>
            <span className="lc-contador">{recetasSeleccionadas.length} elegidas</span>
          </div>

          <input
            className="lc-buscar"
            type="search"
            placeholder="🔍 Buscar receta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar receta"
          />

          <div className="lc-recetas">
            {recetasVisibles.map((r) => {
              const activa = recetasSeleccionadas.includes(r.id);
              return (
                <label key={r.id} className={`lc-receta ${activa ? "lc-receta--on" : ""}`}>
                  <input type="checkbox" checked={activa} onChange={() => toggleReceta(r.id)} />
                  <span>
                    {r.emoji || "🍩"} {r.nombre}
                  </span>
                </label>
              );
            })}
            {recetasVisibles.length === 0 && (
              <p className="lc-vacio">No encontré recetas con ese nombre.</p>
            )}
          </div>

          <div className="lc-acciones">
            {recetasSeleccionadas.length > 0 && (
              <button type="button" onClick={limpiarSeleccion}>
                Quitar selección
              </button>
            )}
          </div>

          {mensaje && <p className="lc-mensaje">{mensaje}</p>}
        </section>

        {/* Columna derecha: la lista */}
        <section className="lc-panel">
          <div className="lc-panel-top">
            <h3 className="lc-titulo">2. Tu lista</h3>
            {lista.length > 0 && (
              <span className="lc-contador">
                {comprados} de {lista.length} comprados
              </span>
            )}
          </div>

          <form className="lc-agregar" onSubmit={agregarPropio}>
            <input
              type="text"
              placeholder="Agregar algo más (ej: servilletas)"
              value={nuevoItem}
              onChange={(e) => setNuevoItem(e.target.value)}
              maxLength={60}
              aria-label="Agregar ingrediente propio"
            />
            <button type="submit" disabled={!nuevoItem.trim()}>
              + Agregar
            </button>
          </form>

          {lista.length > 0 ? (
            <>
              <div className="lc-barra" aria-hidden="true">
                <span style={{ width: `${(comprados / lista.length) * 100}%` }} />
              </div>

              {terminada && <p className="lc-listo">🎉 ¡Listo! Ya compraste todo.</p>}

              <ul className="lc-lista">
                {listaOrdenada.map((item) => {
                  const recetasDe = usadoEn.get(item.nombre);
                  return (
                    <li key={item.nombre}>
                      <label className={item.comprado ? "lc-item lc-item--hecho" : "lc-item"}>
                        <input
                          type="checkbox"
                          checked={item.comprado}
                          onChange={() => marcarComprado(item.nombre)}
                        />
                        <span className="lc-item-texto">
                          <span className="lc-item-nombre">{item.nombre}</span>
                          <small className="lc-item-uso">
                            {item.manual && !recetasDe
                              ? "Agregado por ti"
                              : `Para: ${recetasDe?.join(", ")}`}
                          </small>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="lc-acciones">
                <button type="button" className="lc-principal" onClick={copiarLista}>
                  📋 Copiar lista
                </button>
                <button type="button" onClick={vaciarLista}>
                  Vaciar lista
                </button>
              </div>
            </>
          ) : (
            <p className="lc-vacio">
              Tu lista aparecerá aquí en cuanto marques una receta. 🛒
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default ListaCompras;