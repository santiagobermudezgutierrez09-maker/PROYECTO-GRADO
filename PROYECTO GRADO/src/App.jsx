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

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [invitado, setInvitado] = useState(false); // true = entró sin cuenta

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

  const cerrarSesion = async () => {
    await signOut(auth);
    setInvitado(false);
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

  // Botones de la barra de navegación (cuando hay sesión o modo invitado)
  const botonesNav = [
    { vista: "home", texto: "🏠 Inicio" },
    { vista: "recetas", texto: "Ver recetas" },
    { vista: "generador", texto: "¿Qué puedo cocinar?" },
    { vista: "cocina", texto: "Modo cocina" },
    { vista: "chatbot", texto: "Chatbot" },
    { vista: "compras", texto: "Lista de compras" },
    { vista: "fechas", texto: "Fechas y eventos" },
    { vista: "api", texto: "🌐 Más postres (API)" },
  ];

  return (
    <>
      {/* Fondo animado oscuro SOLO en login/registro; dentro de la app, fondo cálido de cocina */}
      {tieneAcceso ? (
        <div className="fondo-cocina" />
      ) : (
        <ShaderAnimation dispersion={0.01} speed={1} lineWidth={0.002} brightness={1} />
      )}
      <div className={`app-shell ${tieneAcceso ? "tema-cocina" : ""}`}>
      <h1 className="app-titulo">🍳 CHARIN COOK</h1>

      {/* Barra de estado de sesión */}
      <div className="barra-sesion">
        {usuario ? (
          <>
            Sesión iniciada como: {nombreParaMostrar}{" "}
            <button onClick={cerrarSesion}>Cerrar sesión</button>
          </>
        ) : invitado ? (
          <>
            Estás navegando como invitado (no puedes comentar, calificar ni guardar favoritos){" "}
            <button onClick={() => { setInvitado(false); setVista("login"); }}>
              Iniciar sesión
            </button>
          </>
        ) : (
          "No has iniciado sesión."
        )}
      </div>

      {/* Menú: si NO hay acceso, solo se ofrece login/registro/invitado.
          Si SÍ hay acceso (logueado o invitado), se muestra el resto de la app. */}
      <nav className="nav">
        {!tieneAcceso && (
          <>
            <button onClick={() => setVista("login")}>Iniciar sesión</button>
            <button onClick={() => setVista("register")}>Registrarme</button>
            <button onClick={entrarComoInvitado}>Entrar como invitado</button>
          </>
        )}
        {tieneAcceso &&
          botonesNav.map((b) => (
            <button
              key={b.vista}
              className={vista === b.vista ? "nav-activo" : ""}
              onClick={() => setVista(b.vista)}
            >
              {b.texto}
            </button>
          ))}
      </nav>

      {vista === "login" && !tieneAcceso && <Login />}
      {vista === "register" && !tieneAcceso && <Register />}
      {tieneAcceso && vista === "home" && <Home irA={setVista} correoUsuario={nombreParaMostrar} />}
      {tieneAcceso && vista === "recetas" && <Recetas />}
      {tieneAcceso && vista === "generador" && <GeneradorIngredientes />}
      {tieneAcceso && vista === "cocina" && <ModoCocina />}
      {tieneAcceso && vista === "chatbot" && <Chatbot />}
      {tieneAcceso && vista === "compras" && <ListaCompras />}
      {tieneAcceso && vista === "fechas" && <RecetasPorFecha />}
      {tieneAcceso && vista === "api" && <RecetasAPI />}
      </div>
    </>
  );
}

export default App;