import { lazy, Suspense, useState, useEffect } from "react";
import "./App.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseAuth";
import { useCierreSesionInactividad } from "./useCierreSesionInactividad";

import Login from "./Login";
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
      { vista: "home", icono: "🏠", texto: "Inicio", titulo: "Bienvenido a la cocina", descripcion: "Tu punto de partida" },
      { vista: "recetas", icono: "🔍", texto: "Buscar postres", titulo: "Buscar postres", descripcion: "Encuentra tu próximo postre" },
      { vista: "favoritos", icono: "❤️", texto: "Mis favoritos", titulo: "Mis favoritos", descripcion: "Tus recetas guardadas" },
      { vista: "generador", icono: "🥕", texto: "¿Qué puedo cocinar?", titulo: "¿Qué puedo cocinar?", descripcion: "Dinos qué ingredientes tienes" },
      { vista: "cocina", icono: "🔥", texto: "Modo cocina", titulo: "Modo cocina", descripcion: "Paso a paso, con las manos libres" },
    ],
  },
  {
    nombre: "Ayuda",
    items: [
      { vista: "chatbot", icono: "💬", texto: "Chatbot", titulo: "Chatbot", descripcion: "Pregunta lo que quieras sobre cocina" },
      { vista: "compras", icono: "🛒", texto: "Lista de compras", titulo: "Lista de compras", descripcion: "Todo lo que te falta comprar" },
    ],
  },
  {
    nombre: "Descubrir",
    items: [
      { vista: "fechas", icono: "📅", texto: "Fechas y eventos", titulo: "Fechas y eventos", descripcion: "Recetas para cada ocasión" },
      { vista: "api", icono: "🍰", texto: "Más postres", titulo: "Más postres", descripcion: "Ideas dulces de todo el mundo" },
    ],
  },
];

const TODOS_LOS_ITEMS = GRUPOS_MENU.flatMap((g) => g.items);

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
    <circle cx="20" cy="20" r="17" fill="#F4A98C" />
    <circle cx="20" cy="20" r="14" fill="#F7C6C7" />
    <circle cx="20" cy="20" r="5.5" fill="#FFF8EC" />
    <g strokeLinecap="round" strokeWidth="2">
      <line x1="10" y1="14" x2="13" y2="12" stroke="#BFE3C8" />
      <line x1="28" y1="11" x2="31" y2="14" stroke="#FFF8EC" />
      <line x1="9" y1="24" x2="12" y2="26" stroke="#F4A98C" />
      <line x1="29" y1="27" x2="31" y2="24" stroke="#BFE3C8" />
      <line x1="19" y1="31" x2="22" y2="32" stroke="#FFF8EC" />
    </g>
  </svg>
);

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [invitado, setInvitado] = useState(false); // true = entró sin cuenta
  const [menuAbierto, setMenuAbierto] = useState(false); // solo se usa en celular
  const [busquedaRecetas, setBusquedaRecetas] = useState("");
  const [recetaParaCocinar, setRecetaParaCocinar] = useState("");

  // Cierra sesión sola tras un rato sin actividad (solo si hay sesión iniciada)
  useCierreSesionInactividad();

  // Escucha en tiempo real si hay un usuario logueado o no
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioActual) => {
      setUsuario(usuarioActual);
      setCargandoSesion(false);

      if (usuarioActual) {
        setInvitado(false); // si inicia sesión de verdad, ya no es invitado
        setVista("home");

        // Busca el nombre guardado en Firestore (colección "usuarios")
        try {
          const [{ doc, getDoc }, { db }] = await Promise.all([
            import("firebase/firestore"),
            import("./firebase"),
          ]);
          const snap = await getDoc(doc(db, "usuarios", usuarioActual.uid));
          if (snap.exists() && snap.data().nombre) {
            setNombreUsuario(snap.data().nombre);
          } else {
            setNombreUsuario(""); // si no encuentra nombre, usamos el correo como respaldo
          }
        } catch {
          setNombreUsuario("");
        }
      } else {
        setNombreUsuario("");
      }
    });
    return () => unsubscribe();
  }, []);

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
    setVista(nuevaVista);
    setBusquedaRecetas(nuevaVista === "recetas" ? extra : "");
    setRecetaParaCocinar(nuevaVista === "cocina" ? extra : "");
    setMenuAbierto(false); // en celular, al elegir una opción se cierra el menú
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setInvitado(false);
    setMenuAbierto(false);
    setVista("login");
  };

  const entrarComoInvitado = () => {
    setInvitado(true);
    setVista("home");
  };

  if (cargandoSesion) {
    return <p style={{ textAlign: "center", marginTop: "40px" }}>Cargando...</p>;
  }

  // true si el usuario puede ver las pantallas de la app (logueado o invitado)
  const tieneAcceso = !!usuario || invitado;

  // Lo que se muestra como identificación: el nombre si existe, si no, el correo, si no, "Invitado"
  const nombreParaMostrar = usuario ? nombreUsuario || usuario.email : "Invitado";
  const inicial = nombreParaMostrar.trim().charAt(0).toUpperCase() || "I";

  // Nombre para que Charin salude (vacío si es invitado o solo hay correo)
  const nombreParaChat = usuario && nombreUsuario ? nombreUsuario : "";

  const itemActual = TODOS_LOS_ITEMS.find((i) => i.vista === vista) || TODOS_LOS_ITEMS[0];

  /* ============================================================
     PANTALLAS SIN SESIÓN: login / registro / invitado
     (se mantiene el fondo animado y el diseño centrado)
     ============================================================ */
  if (!tieneAcceso) {
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
              <Suspense fallback={null}>
                <Mascota
                  variante="en-formulario"
                  mensaje={
                    vista === "register"
                      ? "¡Qué bueno que te unas a Charin Cook! 🎉"
                      : "¡Bienvenido a Charin Cook! 🍩 Inicia sesión para empezar a cocinar."
                  }
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
            {vista === "login" && <Login />}
            {vista === "register" && <Register />}

            <div className="auth-divider"><span>o</span></div>
            <button className="auth-guest" type="button" onClick={entrarComoInvitado}>
              Entrar como invitado
            </button>
          </section>
        </div>
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
            <span className="sidebar-logo" aria-hidden="true">🍳</span>
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
                    <span className="side-icono">{item.icono}</span>
                    <span className="side-texto">{item.texto}</span>
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
          <header className="topbar">
            <button
              className="menu-btn"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <div className="topbar-textos">
              <h2 className="topbar-titulo">{itemActual.titulo}</h2>
              <p className="topbar-desc">{itemActual.descripcion}</p>
            </div>
          </header>

          <main className="vista">
            <Suspense fallback={<p style={{ textAlign: "center" }}>Cargando...</p>}>
              {vista === "home" && <Home irA={irA} correoUsuario={nombreParaMostrar} />}
              {vista === "recetas" && <Recetas busquedaInicial={busquedaRecetas} irA={irA} />}
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
              {vista === "api" && <RecetasAPI />}
            </Suspense>
          </main>
        </div>
      </div>

      {/* 🍩 Dona asistente con chat IA: Inicio, ¿Qué puedo cocinar?, Modo cocina, Más postres y Fechas */}
      <Suspense fallback={null}>
        <AsistenteDona
          vista={vista}
          visible={VISTAS_CON_DONA.includes(vista)}
          nombreUsuario={nombreParaChat}
        />
      </Suspense>
    </>
  );
}

export default App;