import { lazy, memo, Suspense, useState, useEffect, useRef } from "react";
import "./App.css";
import { useCierreSesionInactividad } from "./useCierreSesionInactividad";
import MascotaCarga from "./MascotaCarga";
import logoDona from "./assets/logo-dona.png";

const Login = lazy(() => import("./Login"));
const LandingInfo = lazy(() => import("./LandingInfo"));
const Mascota = lazy(() => import("./Mascota"));
const Register = lazy(() => import("./Register"));
const Home = lazy(() => import("./Home"));
const Recetas = lazy(() => import("./Recetas"));
const Favoritos = lazy(() => import("./Favoritos"));
const GeneradorIngredientes = lazy(() => import("./GeneradorIngredientes"));
const ModoCocina = lazy(() => import("./ModoCocina"));
const Chatbot = lazy(() => import("./Chatbot"));
const ListaCompras = lazy(() => import("./ListaCompras"));
const RecetasPorFecha = lazy(() => import("./RecetasPorFecha"));
const RecetasAPI = lazy(() => import("./RecetasAPI"));
const AsistenteDona = lazy(() => import("./AsistenteDona"));

// Menú lateral agrupado por secciones.
// "titulo" y "descripcion" se muestran en la barra superior de cada pantalla.
const GRUPOS_MENU = [
  {
    nombre: "Cocinar",
    items: [
      { vista: "home", icono: "home", texto: "Inicio", titulo: "Bienvenido a la cocina", descripcion: "Tu punto de partida" },
      { vista: "recetas", icono: "quick-desserts", texto: "Postres rápidos", titulo: "Postres rápidos", descripcion: "Encuentra tu próximo postre" },
      { vista: "favoritos", icono: "favorites", texto: "Mis favoritos", titulo: "Mis favoritos", descripcion: "Tus recetas guardadas" },
      { vista: "generador", icono: "ingredients", texto: "¿Qué puedo cocinar?", titulo: "¿Qué puedo cocinar?", descripcion: "Dinos qué ingredientes tienes" },
      { vista: "cocina", icono: "cooking", texto: "Modo cocina", titulo: "Modo cocina", descripcion: "Paso a paso, con las manos libres" },
    ],
  },
  {
    nombre: "Ayuda",
    items: [
      { vista: "chatbot", icono: "chatbot", texto: "Chatbot", titulo: "Chatbot", descripcion: "Pregunta lo que quieras sobre cocina" },
      { vista: "compras", icono: "shopping-cart", texto: "Lista de compras", titulo: "Lista de compras", descripcion: "Todo lo que te falta comprar" },
    ],
  },
  {
    nombre: "Descubrir",
    items: [
      { vista: "fechas", icono: "calendar-dessert", texto: "Fechas y eventos", titulo: "Fechas y eventos", descripcion: "Recetas para cada ocasión" },
      { vista: "api", icono: "world-dessert", texto: "Postres del mundo", etiqueta: "Top", titulo: "Postres del mundo", descripcion: "Ideas dulces de todo el mundo" },
    ],
  },
];

const TODOS_LOS_ITEMS = GRUPOS_MENU.flatMap((g) => g.items);

const ImagenIconoMenu = memo(function ImagenIconoMenu({ nombre, alt }) {
  const icono64 = `/assets/icons/3d/${nombre}-64.png`;
  const icono128 = `/assets/icons/3d/${nombre}-128.png`;

  return (
    <img
      src={icono64}
      srcSet={`${icono64} 1x, ${icono128} 2x`}
      width="40"
      height="40"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
});

// 🍩 Pantallas donde aparece la dona asistente
const VISTAS_CON_DONA = ["home", "generador", "cocina", "api", "fechas"];

const DonaO = ({ sidebar = false }) => (
  <svg
    viewBox="0 0 40 40"
    width={sidebar ? "0.9em" : "0.8em"}
    height={sidebar ? "0.9em" : "0.8em"}
    style={{ display: "inline-block", verticalAlign: "-0.05em", margin: "0 1px" }}
    aria-hidden="true"
  >
    <circle cx="20" cy="20" r="17" fill="var(--color-primary)" />
    <circle cx="20" cy="20" r="14" fill="var(--color-secondary)" />
    <circle cx="20" cy="20" r="5.5" fill="var(--bg-surface)" />
    <g strokeLinecap="round" strokeWidth="2">
      <line x1="10" y1="14" x2="13" y2="12" stroke="var(--color-teal)" />
      <line x1="28" y1="11" x2="31" y2="14" stroke="var(--bg-surface)" />
      <line x1="9" y1="24" x2="12" y2="26" stroke="var(--color-primary-hover)" />
      <line x1="29" y1="27" x2="31" y2="24" stroke="var(--color-teal)" />
      <line x1="19" y1="31" x2="22" y2="32" stroke="var(--bg-surface)" />
    </g>
  </svg>
);

function PantallaCarga({ mensaje = "Preparando tu cocina..." }) {
  return (
    <div className="pantalla-carga" role="status" aria-live="polite">
      <img className="pantalla-carga-dona" src={logoDona} alt="" />
      <p className="pantalla-carga-texto">{mensaje}</p>
      <div className="pantalla-carga-barra" aria-hidden="true"><span /></div>
    </div>
  );
}

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [invitado, setInvitado] = useState(false); // true = entró sin cuenta
  const [conservarHome, setConservarHome] = useState(false);
  const [avisoSesion, setAvisoSesion] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false); // solo se usa en celular
  const [busquedaRecetas, setBusquedaRecetas] = useState("");
  const [filtrosRecetasIniciales, setFiltrosRecetasIniciales] = useState([]);
  const [recetaParaCocinar, setRecetaParaCocinar] = useState("");
  const [postreAPIInicial, setPostreAPIInicial] = useState("");
  const registroEnCurso = useRef(false);
  const usuarioRegistroIgnorado = useRef(null);

  // Cierra sesión sola tras un rato sin actividad (solo si hay sesión iniciada)
  useCierreSesionInactividad();

  // Escucha en tiempo real si hay un usuario logueado o no
  useEffect(() => {
    let activo = true;
    let unsubscribe;
    Promise.all([import("firebase/auth"), import("./firebaseAuth")])
      .then(([{ onAuthStateChanged }, { auth }]) => {
        if (!activo) return;
        unsubscribe = onAuthStateChanged(auth, async (usuarioActual) => {
          if (
            usuarioActual &&
            (registroEnCurso.current ||
              usuarioActual.uid === usuarioRegistroIgnorado.current)
          ) {
            return;
          }
          setUsuario(usuarioActual);
          setCargandoSesion(false);

          if (usuarioActual) {
            setInvitado(false);
            setVista("home");

            try {
              const [{ doc, getDoc }, { db }] = await Promise.all([
                import("firebase/firestore"),
                import("./firebase"),
              ]);
              const snap = await getDoc(doc(db, "usuarios", usuarioActual.uid));
              if (snap.exists() && snap.data().nombre) {
                const nombre = snap.data().nombre;
                setNombreUsuario(nombre);
                setAvisoSesion(`Sesión iniciada como ${nombre}.`);
              } else {
                setNombreUsuario("");
                setAvisoSesion(`Sesión iniciada como ${usuarioActual.email}.`);
              }
            } catch (error) {
              console.warn("No se pudo cargar el nombre del usuario desde Firestore.", error);
              setNombreUsuario("");
              setAvisoSesion(`Sesión iniciada como ${usuarioActual.email}.`);
            }
          } else {
            setNombreUsuario("");
          }
        });
      })
      .catch((error) => {
        console.error("No se pudo inicializar la sesión de Firebase.", error);
        setCargandoSesion(false);
      });
    return () => {
      activo = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!avisoSesion) return undefined;
    const timeoutId = window.setTimeout(() => setAvisoSesion(""), 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [avisoSesion]);

  // Activa la textura de grano (solo dentro de la app, no en login/registro)
  useEffect(() => {
    document.body.classList.toggle("modo-lujo", !!usuario || invitado);
  }, [usuario, invitado]);

  // Cierra el menú lateral con la tecla Escape (celular / teclado)
  useEffect(() => {
    const alPulsar = (e) => e.key === "Escape" && setMenuAbierto(false);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  // "extra" cambia según la pantalla: en "recetas" es una búsqueda,
  // en "cocina" es el id de la receta que se quiere cocinar
  const irA = (nuevaVista, extra = "") => {
    if (vista === "home" && nuevaVista !== "home") setConservarHome(true);
    setVista(nuevaVista);
    const opcionesReceta = typeof extra === "object" && extra !== null ? extra : null;
    setBusquedaRecetas(
      nuevaVista === "recetas" ? opcionesReceta ? opcionesReceta.busqueda || "" : extra : ""
    );
    setFiltrosRecetasIniciales(nuevaVista === "recetas" ? opcionesReceta?.filtros || [] : []);
    setRecetaParaCocinar(nuevaVista === "cocina" ? extra : "");
    setPostreAPIInicial(nuevaVista === "api" ? extra : "");
    setMenuAbierto(false); // en celular, al elegir una opción se cierra el menú
  };

  const cerrarSesion = async () => {
    const [{ signOut }, { auth }] = await Promise.all([
      import("firebase/auth"),
      import("./firebaseAuth"),
    ]);
    await signOut(auth);
    setInvitado(false);
    setMenuAbierto(false);
    setVista("login");
  };

  const entrarComoInvitado = () => {
    setInvitado(true);
    setVista("home");
  };

  const comenzarRegistro = () => {
    registroEnCurso.current = true;
  };

  const terminarRegistro = () => {
    registroEnCurso.current = false;
  };

  const iniciarSesion = () => {
    usuarioRegistroIgnorado.current = null;
  };

  if (cargandoSesion) {
    return <PantallaCarga />;
  }

  // true si el usuario puede ver las pantallas de la app (logueado o invitado)
  const tieneAcceso = !!usuario || invitado;

  // Lo que se muestra como identificación: el nombre si existe, si no, el correo, si no, "Invitado"
  const nombreParaMostrar = usuario ? nombreUsuario || usuario.email : "Invitado";
  const inicial = nombreParaMostrar.trim().charAt(0).toUpperCase() || "I";

  // Nombre para que Charin salude (vacío si es invitado o solo hay correo)
  const nombreParaChat = usuario && nombreUsuario ? nombreUsuario : "";

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const primerNombre = nombreParaMostrar.split(/[\s@]/)[0];
  const itemActual = TODOS_LOS_ITEMS.find((i) => i.vista === vista) || TODOS_LOS_ITEMS[0];

  /* ============================================================
     PANTALLAS SIN SESIÓN: login / registro / invitado
     (se mantiene el fondo animado y el diseño centrado)
     ============================================================ */
  if (!tieneAcceso) {
    const mensajeMascotaLogin =
      vista === "register"
        ? "¡Qué bueno que te unas a Charin Cook! 🎉"
        : "¡Bienvenido a Charin Cook! 🍩 Inicia sesión para empezar a cocinar.";

    return (
      <>
        <div className="fondo-login" aria-hidden="true" />

        <div className="app-shell auth-layout">
          <section className="auth-brand" aria-label="Charin Cook">
            <div className="auth-brand-lockup">
              <h1 className="marca-titulo">
                CHARIN <span className="marca-cook">C<DonaO sidebar />OK</span>
              </h1>
              <p className="marca-lema">Cocina con calma</p>
            </div>

            <div className="zona-formulario auth-mascota">
              <Suspense
                fallback={
                  <MascotaCarga
                    variante="en-formulario"
                    mensaje={mensajeMascotaLogin}
                  />
                }
              >
                <Mascota
                  variante="en-formulario"
                  mensaje={mensajeMascotaLogin}
                />
              </Suspense>
            </div>
          </section>

          <section className="auth-panel card">
            <nav className="auth-tabs" aria-label="Acceso a la cuenta">
              <button
                type="button"
                className={vista === "login" ? "activo" : ""}
                onClick={() => setVista("login")}
                aria-current={vista === "login" ? "page" : undefined}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={vista === "register" ? "activo" : ""}
                onClick={() => setVista("register")}
                aria-current={vista === "register" ? "page" : undefined}
              >
                Registrarme
              </button>
            </nav>
            <Suspense fallback={<p role="status">Cargando formulario…</p>}>
              {vista === "login" && <Login onLoginStart={iniciarSesion} />}
              {vista === "register" && (
                <Register
                  onRegistrationStart={comenzarRegistro}
                  onRegistrationEnd={terminarRegistro}
                  onRegistrationCreated={(uid) => {
                    usuarioRegistroIgnorado.current = uid;
                  }}
                  onGoToLogin={() => setVista("login")}
                />
              )}
            </Suspense>

            <div className="auth-divider"><span>o</span></div>
            <button className="auth-guest" type="button" onClick={entrarComoInvitado}>
              Entrar como invitado
            </button>
          </section>
        </div>
        <Suspense fallback={null}><LandingInfo /></Suspense>
      </>
    );
  }

  /* ============================================================
     APP CON SESIÓN: barra lateral a la izquierda + contenido a la derecha
     ============================================================ */
  return (
    <>
      <div className="fondo-cocina" />

      <div className="layout-app tema-cocina">
        {/* Capa oscura detrás del menú en celular */}
        <div
          className={`sidebar-overlay ${menuAbierto ? "visible" : ""}`}
          onClick={() => setMenuAbierto(false)}
        />

        {/* ---------- BARRA LATERAL ---------- */}
        <aside className={`sidebar ${menuAbierto ? "abierta" : ""}`} aria-label="Menú principal">
          <div className="sidebar-marca">
            <img className="sidebar-logo" src={logoDona} alt="" />
            <div>
              <div className="sidebar-nombre marca-titulo">
                CHARIN <span className="marca-cook">C<DonaO />OK</span>
              </div>
              <div className="sidebar-lema marca-lema">Cocina con calma</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {GRUPOS_MENU.map((grupo) => (
              <div className="sidebar-grupo" key={grupo.nombre}>
                <div className="sidebar-grupo-titulo">{grupo.nombre}</div>
                {grupo.items.map((item) => (
                  <button
                    key={item.vista}
                    className={`side-item ${vista === item.vista ? "activo" : ""}`}
                    onClick={() => irA(item.vista)}
                    aria-current={vista === item.vista ? "page" : undefined}
                  >
                    <span className="side-icono">
                      <ImagenIconoMenu nombre={item.icono} alt="" />
                    </span>
                    <span className="side-texto">{item.texto}</span>
                    {item.etiqueta && <span className="side-etiqueta">{item.etiqueta}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Tarjeta de usuario al final del menú */}
          <div className="sidebar-usuario">
            <div className="usuario-avatar">{inicial}</div>
            <div className="usuario-datos">
              <div className="usuario-nombre" title={nombreParaMostrar}>
                {nombreParaMostrar}
              </div>
              <div className="usuario-estado">
                {usuario ? "Sesión iniciada" : "Navegando como invitado"}
              </div>
            </div>
          </div>

          {usuario ? (
            <button className="side-salir" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          ) : (
            <>
              <p className="side-aviso">
                <span className="side-aviso-icono" aria-hidden="true">🔒</span>
                Como invitado no puedes comentar, calificar ni guardar favoritos.
              </p>
              <button
                className="side-salir"
                onClick={() => {
                  setInvitado(false);
                  setMenuAbierto(false);
                  setVista("login");
                }}
              >
                Iniciar sesión
              </button>
            </>
          )}
        </aside>

        {/* ---------- ZONA DE CONTENIDO ---------- */}
        <div className="contenido-principal">
          {avisoSesion && (
            <div className="sesion-aviso" role="status">
              <span className="sesion-aviso-check" aria-hidden="true">✓</span>
              {avisoSesion}
            </div>
          )}
          <header className="topbar">
            <button
              className="menu-btn"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
            <div className="topbar-textos">
              <h2 className="topbar-titulo">{itemActual.titulo}</h2>
              <p className="topbar-desc">{vista === "home" ? `${saludo}, ${primerNombre}` : itemActual.descripcion}</p>
            </div>
          </header>

          <main className="vista">
            <Suspense fallback={<PantallaCarga mensaje="Cargando..." />}>
              {(vista === "home" || conservarHome) && (
                <div hidden={vista !== "home"}>
                  <Home
                    irA={irA}
                    correoUsuario={nombreParaMostrar}
                    activa={vista === "home"}
                  />
                </div>
              )}
              {vista === "recetas" && (
                <Recetas
                  busquedaInicial={busquedaRecetas}
                  filtrosIniciales={filtrosRecetasIniciales}
                  irA={irA}
                />
              )}
              {vista === "favoritos" && <Favoritos irA={irA} />}
              {vista === "generador" && <GeneradorIngredientes irA={irA} />}
              {vista === "cocina" && (
                <ModoCocina
                  key={recetaParaCocinar || "selector"}
                  nombreUsuario={nombreParaChat}
                  recetaInicialId={recetaParaCocinar}
                />
              )}
              {vista === "chatbot" && <Chatbot nombreUsuario={nombreParaChat} />}
              {vista === "compras" && <ListaCompras />}
              {vista === "fechas" && <RecetasPorFecha irA={irA} />}
              {vista === "api" && <RecetasAPI postreInicialId={postreAPIInicial} />}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Dona asistente con chat IA en las pantallas de cocina, postres y fechas */}
      <Suspense
        fallback={
          VISTAS_CON_DONA.includes(vista) && vista !== "home" ? (
            <MascotaCarga
              variante={vista === "home" ? "en-inicio" : ""}
              mensaje="Pregúntame lo que quieras"
            />
          ) : null
        }
      >
        <AsistenteDona
          vista={vista}
          visible={VISTAS_CON_DONA.includes(vista) && vista !== "home"}
          nombreUsuario={nombreParaChat}
        />
      </Suspense>
    </>
  );
}

export default App;