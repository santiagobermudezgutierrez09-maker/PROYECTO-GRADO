import { useEffect, useState } from "react";
import { obtenerDetallePostre, obtenerPostres } from "./mealDbService";
import { traducirNombres } from "./traductorNombres";
import MascotaCarga from "./MascotaCarga";
import "./Home.css";

function Icono({ nombre }) {
  const id = `home-clay-${nombre}`;

  return (
    <svg
      className="home-icono-svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-terracotta`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f8b18d" />
          <stop offset="1" stopColor="#c7684e" />
        </linearGradient>
        <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff9e9" />
          <stop offset="1" stopColor="#e9cda6" />
        </linearGradient>
        <linearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c6df9d" />
          <stop offset="1" stopColor="#6d9662" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffe39a" />
          <stop offset="1" stopColor="#e9a34e" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-25%" y="-25%" width="150%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#8e5741" floodOpacity=".22" />
        </filter>
      </defs>
      {nombre === "generador" && (
        <g filter={`url(#${id}-shadow)`}>
          <path d="M18 37h28l-3 17H21l-3-17Z" fill={`url(#${id}-terracotta)`} />
          <ellipse cx="32" cy="37" rx="14" ry="4" fill="#e69a72" />
          <path d="M32 37V22" fill="none" stroke="#71905b" strokeWidth="3" strokeLinecap="round" />
          <path d="M31 29c-9 0-13-5-13-12 9 0 14 4 14 12Z" fill={`url(#${id}-green)`} />
          <path d="M33 25c0-8 5-12 13-12 0 8-4 13-13 13Z" fill="#a9ca7f" />
          <path d="M22 40h20" stroke="#ffd1ad" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <ellipse cx="32" cy="57" rx="18" ry="3" fill="#a8765d" opacity=".13" />
        </g>
      )}
      {nombre === "recetas" && (
        <g filter={`url(#${id}-shadow)`}>
          <path d="M10 16c8-3 15-1 22 4v34c-7-5-14-6-22-3V16Z" fill={`url(#${id}-terracotta)`} />
          <path d="M54 16c-8-3-15-1-22 4v34c7-5 14-6 22-3V16Z" fill={`url(#${id}-cream)`} />
          <path d="M32 20v33" stroke="#b75e49" strokeWidth="2" />
          <path d="M15 22c5-1 9 0 13 3M15 29c5-1 9 0 13 3M49 22c-5-1-9 0-13 3M49 29c-5-1-9 0-13 3" fill="none" stroke="#fff1d7" strokeWidth="2" strokeLinecap="round" opacity=".9" />
          <path d="M14 18c5-1 9 0 12 2" fill="none" stroke="#ffd2b2" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="32" cy="57" rx="24" ry="3" fill="#a8765d" opacity=".13" />
        </g>
      )}
      {nombre === "cocina" && (
        <g filter={`url(#${id}-shadow)`}>
          <path d="M17 33c-4-1-6-5-4-9 1-3 4-5 7-5 1-7 6-11 13-10 5 1 8 4 9 9 6 0 10 4 10 9 0 4-3 7-7 8v5H18l-1-7Z" fill={`url(#${id}-cream)`} />
          <path d="M16 36h33v9c0 3-2 5-5 5H21c-3 0-5-2-5-5v-9Z" fill={`url(#${id}-terracotta)`} />
          <path d="M22 39h21" stroke="#ffd5b5" strokeWidth="2" strokeLinecap="round" opacity=".85" />
          <path d="M25 29c1-3 3-4 6-4" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
          <ellipse cx="32" cy="55" rx="21" ry="3" fill="#a8765d" opacity=".13" />
        </g>
      )}
      {nombre === "compras" && (
        <g filter={`url(#${id}-shadow)`}>
          <path d="m13 16 5 2 5 24h24l5-18H22" fill="none" stroke="#b86a4e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M23 27h25l-3 11H25l-2-11Z" fill={`url(#${id}-terracotta)`} />
          <path d="m28 26 3-8h8l4 8" fill={`url(#${id}-green)`} />
          <path d="M31 24v-5M38 24v-5" stroke="#e9f0c4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="29" cy="49" r="4" fill="#8f5845" />
          <circle cx="44" cy="49" r="4" fill="#8f5845" />
          <circle cx="29" cy="48" r="1.5" fill="#f8d7b6" />
          <circle cx="44" cy="48" r="1.5" fill="#f8d7b6" />
          <path d="M25 29h19" stroke="#ffd5b5" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <ellipse cx="37" cy="57" rx="19" ry="2.5" fill="#a8765d" opacity=".13" />
        </g>
      )}
      {nombre === "chatbot" && (
        <g filter={`url(#${id}-shadow)`}>
          <path d="M12 15c0-4 3-7 7-7h27c4 0 7 3 7 7v24c0 4-3 7-7 7H29l-12 8v-9c-3-1-5-4-5-7V15Z" fill={`url(#${id}-terracotta)`} />
          <path d="M18 16c0-2 2-4 4-4h23c3 0 5 2 5 5v17c0 3-2 5-5 5H29l-8 5v-6c-2-1-3-3-3-5V16Z" fill="#ffd7b7" />
          <circle cx="27" cy="26" r="2.6" fill="#795042" />
          <circle cx="39" cy="26" r="2.6" fill="#795042" />
          <path d="M26 32c3 4 11 4 14 0" fill="none" stroke="#a95745" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M21 16h13" stroke="#fff1d9" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <ellipse cx="33" cy="57" rx="19" ry="3" fill="#a8765d" opacity=".13" />
        </g>
      )}
      {nombre === "fechas" && (
        <g filter={`url(#${id}-shadow)`}>
          <rect x="11" y="15" width="42" height="39" rx="8" fill={`url(#${id}-cream)`} />
          <path d="M11 23c0-4 3-8 8-8h26c5 0 8 4 8 8v4H11v-4Z" fill={`url(#${id}-terracotta)`} />
          <path d="M22 12v8M42 12v8" stroke="#a85b47" strokeWidth="4" strokeLinecap="round" />
          <path d="M23 44h18v5H23z" fill="#e9a65f" />
          <path d="M26 44c0-5 3-8 6-8s6 3 6 8H26Z" fill="#f5a985" />
          <path d="M32 32v3" stroke="#e69b4e" strokeWidth="2" strokeLinecap="round" />
          <path d="m47 33 1.4 2.8 3.1.4-2.2 2.2.5 3.1-2.8-1.5-2.8 1.5.5-3.1-2.2-2.2 3.1-.4 1.4-2.8Z" fill={`url(#${id}-gold)`} />
          <path d="M17 24h15" stroke="#ffd6bc" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <ellipse cx="32" cy="57" rx="23" ry="3" fill="#a8765d" opacity=".13" />
        </g>
      )}
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
  const [nombresTraducidos, setNombresTraducidos] = useState({});
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
        traducirNombres(cargados.map((postre) => postre.strMeal))
          .then((nombres) => {
            if (activo) setNombresTraducidos((actuales) => ({ ...actuales, ...nombres }));
          });
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
          <button type="button" className="home-cta" onClick={() => irA("generador")}>
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
                    <strong title={postre.strMeal}>
                      {nombresTraducidos[postre.strMeal] || postre.strMeal}
                    </strong>
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