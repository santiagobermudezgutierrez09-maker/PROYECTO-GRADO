import { useEffect, useState } from "react";
import { obtenerDetallePostre, obtenerPostres } from "./mealDbService";
import MascotaCarga from "./MascotaCarga";
import "./Home.css";

const ICONOS = {
  recetas: (
    <>
      <path d="M4 5.5h11.5a3 3 0 0 1 3 3V20H7a3 3 0 0 1-3-3V5.5Z" />
      <path d="M7 20a3 3 0 0 1-3-3V7.5M8 9h7M8 13h7" />
    </>
  ),
  generador: (
    <>
      <path d="M12 20V9" />
      <path d="M12 12C6 12 4 9 4 5c5 0 8 2 8 7Zm0 3c0-5 3-8 8-8 0 5-2 8-8 8Z" />
    </>
  ),
  cocina: (
    <>
      <path d="M5 10h14l-1.2 9H6.2L5 10Z" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M9 14h6" />
    </>
  ),
  compras: (
    <>
      <path d="M4 5h2l2 11h9l2-8H7" />
      <circle cx="10" cy="19" r="1.2" />
      <circle cx="17" cy="19" r="1.2" />
    </>
  ),
  chatbot: (
    <>
      <path d="M4 5h16v12H9l-5 3V5Z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  fechas: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 10h16M8 14h2M14 14h2" />
    </>
  ),
};

function Icono({ nombre, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

function Tarjeta({ item, irA }) {
  return (
    <button
      type="button"
      className="home-tarjeta"
      onClick={() => irA(item.vista)}
    >
      <span className="home-icono"><Icono nombre={item.vista} /></span>
      <div className="home-tarjeta-cuerpo">
        <h3>{item.titulo}</h3>
        <p>{item.texto}</p>
      </div>
      <span className="home-flecha" aria-hidden="true">↗</span>
    </button>
  );
}

function Home({ irA, correoUsuario, activa = true }) {
  const [postres, setPostres] = useState([]);
  const [cargandoPostres, setCargandoPostres] = useState(true);
  const [errorPostres, setErrorPostres] = useState("");
  const [intentoPostres, setIntentoPostres] = useState(0);
  const [MascotaHome, setMascotaHome] = useState(null);

  useEffect(() => {
    let activo = true;
    import("./Mascota")
      .then(({ default: ComponenteMascota }) => {
        if (activo) setMascotaHome(() => ComponenteMascota);
      })
      .catch((error) => {
        console.warn("No se pudo cargar la mascota 3D del inicio.", error);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarPostresDestacados() {
      setCargandoPostres(true);
      setErrorPostres("");
      try {
        const lista = await obtenerPostres();
        const respuestas = await Promise.allSettled(
          lista.slice(0, 4).map((postre) => obtenerDetallePostre(postre.idMeal))
        );
        if (!activo) return;

        const cargados = respuestas
          .filter((respuesta) => respuesta.status === "fulfilled")
          .map((respuesta) => respuesta.value);
        setPostres(cargados);
        if (cargados.length === 0) {
          setErrorPostres("No pudimos cargar los postres del mundo ahora mismo.");
        } else if (cargados.length < respuestas.length) {
          setErrorPostres("Algunos postres no están disponibles por ahora.");
        }
      } catch {
        if (activo) setErrorPostres("No pudimos conectar con los postres del mundo. Inténtalo otra vez.");
      } finally {
        if (activo) setCargandoPostres(false);
      }
    }

    cargarPostresDestacados();
    return () => {
      activo = false;
    };
  }, [intentoPostres]);

  const nombrePresentacion =
    correoUsuario && correoUsuario !== "Invitado" && !correoUsuario.includes("@")
      ? correoUsuario.charAt(0).toLocaleUpperCase("es") +
        correoUsuario.slice(1).toLocaleLowerCase("es")
      : "";

  const accesos = [
    {
      vista: "generador",
      titulo: "Cocina con lo que tienes",
      texto: "Cuéntanos qué ingredientes hay en tu despensa y encuentra una receta.",
    },
    {
      vista: "recetas",
      titulo: "Explora el recetario",
      texto: "Postres tradicionales, opciones fitness y favoritos para celebrar.",
    },
    {
      vista: "cocina",
      titulo: "Modo cocina",
      texto: "Sigue cada preparación paso a paso, con temporizador y manos libres.",
    },
    {
      vista: "compras",
      titulo: "Lista de compras",
      texto: "Reúne en un solo lugar lo que necesitas para tus próximas recetas.",
    },
    {
      vista: "chatbot",
      titulo: "Pregúntale al asistente",
      texto: "Consulta sobre cocina, recetas o cualquier otro tema.",
    },
    {
      vista: "fechas",
      titulo: "Fechas y eventos",
      texto: "Encuentra algo especial para celebrar cada ocasión.",
    },
  ];

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">
            {nombrePresentacion ? `Una cocina hecha para ti, ${nombrePresentacion}` : "Tu cocina dulce empieza aquí"}
          </span>
          <h1>Un antojo.<br />Una idea deliciosa.</h1>
          <p>Encuentra tu próximo postre favorito y prepáralo a tu manera.</p>
          <button type="button" className="home-cta" onClick={() => irA("api")}>
            Descubrir qué puedo cocinar <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-halo" />
          <span className="home-confeti home-confeti--uno" />
          <span className="home-confeti home-confeti--dos" />
          <span className="home-confeti home-confeti--tres" />
          {activa && MascotaHome ? (
            <MascotaHome
              variante="en-home-hero"
              mensaje=""
              alClic={() => irA("chatbot")}
            />
          ) : activa ? (
            <MascotaCarga variante="en-home-hero" />
          ) : null}
        </div>
      </section>

      <section className="home-seccion home-seccion-mundo">
        <div className="home-seccion-heading">
          <div>
            <span className="home-etiqueta">Inspiración internacional</span>
            <h2>Postres del mundo</h2>
            <p>Descubre algo nuevo en nuestra selección de TheMealDB.</p>
          </div>
          <button type="button" className="home-enlace" onClick={() => irA("api")}>
            Ver todos <span aria-hidden="true">→</span>
          </button>
        </div>
        {errorPostres && (
          <p className="home-api-error" role="status">
            {errorPostres}
            {postres.length === 0 && (
              <button type="button" onClick={() => setIntentoPostres((n) => n + 1)}>
                Reintentar
              </button>
            )}
          </p>
        )}
        {cargandoPostres ? (
          <div className="home-postres-grid" aria-label="Cargando postres">
            {Array.from({ length: 4 }, (_, i) => <div className="home-postre-skeleton" key={i} />)}
          </div>
        ) : postres.length > 0 ? (
          <div className="home-postres-grid">
            {postres.map((postre) => {
              const ingredientes = Array.from({ length: 20 }, (_, i) => postre[`strIngredient${i + 1}`])
                .filter((ingrediente) => ingrediente?.trim());
              const pasos = (postre.strInstructions || "")
                .split(/\r?\n/)
                .flatMap((parrafo) => parrafo.split(/[.!?]\s+/))
                .filter(Boolean);
              const minutos = Math.max(20, Math.ceil(pasos.length * 4));
              const dificultad = ingredientes.length > 10 || pasos.length > 9
                ? "Avanzada"
                : ingredientes.length > 6 || pasos.length > 5
                  ? "Intermedia"
                  : "Sencilla";
              return (
                <button
                  type="button"
                  className="home-postre-card"
                  key={postre.idMeal}
                  onClick={() => irA("api")}
                >
                  <img
                    src={postre.strMealThumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="320"
                    height="240"
                  />
                  <span className="home-postre-info">
                    <strong>{postre.strMeal}</strong>
                    <span className="home-postre-meta">
                      <span>≈ {minutos} min</span>
                      <span>Nivel {dificultad.toLowerCase()}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : !errorPostres ? (
          <p className="home-api-error">Todavía no hay postres disponibles.</p>
        ) : null}
      </section>

      <section className="home-seccion">
        <div className="home-seccion-heading">
          <div>
            <span className="home-etiqueta">Todo lo que necesitas</span>
            <h2>Explora Charin Cook</h2>
          </div>
        </div>
        <div className="home-grid">
          {accesos.map((item) => <Tarjeta key={item.vista} item={item} irA={irA} />)}
        </div>
      </section>
    </div>
  );
}

export default Home;