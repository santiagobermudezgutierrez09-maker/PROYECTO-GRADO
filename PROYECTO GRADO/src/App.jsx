import { useState, useEffect } from "react";
import "./App.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useCierreSesionInactividad } from "./useCierreSesionInactividad";
import { ShaderAnimation } from "./ShaderAnimation";

import Home from "./Home";
import Register from "./Register";
import Login from "./Login";
import Recetas from "./Recetas";
import GeneradorIngredientes from "./GeneradorIngredientes";
import ModoCocina from "./ModoCocina";
import Chatbot from "./Chatbot";
import ListaCompras from "./ListaCompras";
import RecetasPorFecha from "./RecetasPorFecha";
import RecetasAPI from "./RecetasAPI";
import AsistenteDona from "./AsistenteDona"; // 🍩 dona con chat IA (dentro de la app)
import Mascota from "./Mascota"; // 🍩 dona de bienvenida (login y registro)

// Menú lateral agrupado por secciones.
// "titulo" y "descripcion" se muestran en la barra superior de cada pantalla.
const GRUPOS_MENU = [
  {
    nombre: "Cocinar",
    items: [
      { vista: "home", icono: "🏠", texto: "Inicio", titulo: "Bienvenido a la cocina", descripcion: "Tu punto de partida" },
      { vista: "recetas", icono: "📖", texto: "Ver recetas", titulo: "Recetas", descripcion: "Explora el catálogo completo" },
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

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [invitado, setInvitado] = useState(false); // true = entró sin cuenta
  const [menuAbierto, setMenuAbierto] = useState(false); // solo se usa en celular

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
          const snap = await getDoc(doc(db, "usuarios", usuarioActual.uid));
          if (snap.exists() && snap.data().nombre) {
            setNombreUsuario(snap.data().nombre);
          } else {
            setNombreUsuario(""); // si no encuentra nombre, usamos el correo como respaldo
          }
        } catch (error) {
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

  const irA = (nuevaVista) => {
    setVista(nuevaVista);
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

  const itemActual = TODOS_LOS_ITEMS.find((i) => i.vista === vista) || TODOS_LOS_ITEMS[0];

  /* ============================================================
     PANTALLAS SIN SESIÓN: login / registro / invitado
     (se mantiene el fondo animado y el diseño centrado)
     ============================================================ */
  if (!tieneAcceso) {
    return (
      <>
        <ShaderAnimation dispersion={0.01} speed={1} lineWidth={0.002} brightness={1} />

        <div className="app-shell">
          <div className="app-header">
            <h1 className="app-titulo">🍳 CHARIN COOK</h1>
            <div className="barra-sesion">No has iniciado sesión.</div>
          </div>

          <nav className="nav">
            <button onClick={() => setVista("login")}>Iniciar sesión</button>
            <button onClick={() => setVista("register")}>Registrarme</button>
            <button onClick={entrarComoInvitado}>Entrar como invitado</button>
          </nav>

          {/* 🍩 La dona vive junto al formulario */}
          <div className="zona-formulario">
            <Mascota
              variante="en-formulario"
              mensaje={
                vista === "register"
                  ? "¡Qué bueno que te unas a Charin Cook! 🎉"
                  : "¡Bienvenido a Charin Cook! 🍩 Inicia sesión para empezar a cocinar."
              }
            />

            {vista === "login" && <Login />}
            {vista === "register" && <Register />}
          </div>
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
            <span className="sidebar-logo">🍳</span>
            <div>
              <div className="sidebar-nombre">CHARIN COOK</div>
              <div className="sidebar-lema">Cocina con calma</div>
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
            {vista === "home" && <Home irA={irA} correoUsuario={nombreParaMostrar} />}
            {vista === "recetas" && <Recetas />}
            {vista === "generador" && <GeneradorIngredientes />}
            {vista === "cocina" && <ModoCocina />}
            {vista === "chatbot" && <Chatbot />}
            {vista === "compras" && <ListaCompras />}
            {vista === "fechas" && <RecetasPorFecha />}
            {vista === "api" && <RecetasAPI />}
          </main>
        </div>
      </div>

      {/* 🍩 Dona asistente con chat IA: solo en Inicio, ¿Qué puedo cocinar?, Modo cocina y Más postres */}
      <AsistenteDona
        vista={vista}
        visible={["home", "generador", "cocina", "api"].includes(vista)}
      />
    </>
  );
}

export default App;