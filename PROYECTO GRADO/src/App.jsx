import { useState, useEffect } from "react";
import "./App.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useCierreSesionInactividad } from "./useCierreSesionInactividad";

import Home from "./Home";
import Register from "./Register";
import Login from "./Login";
import Recetas from "./Recetas";
import GeneradorIngredientes from "./GeneradorIngredientes";
import ModoCocina from "./ModoCocina";
import Chatbot from "./Chatbot";
import ListaCompras from "./ListaCompras";
import RecetasPorFecha from "./RecetasPorFecha";

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Cierra sesión sola tras un rato sin actividad (solo si hay sesión iniciada)
  useCierreSesionInactividad();

  // Escucha en tiempo real si hay un usuario logueado o no
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioActual) => {
      setUsuario(usuarioActual);
      setCargandoSesion(false);

      if (usuarioActual) {
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

  const cerrarSesion = async () => {
    await signOut(auth);
    setVista("login");
  };

  if (cargandoSesion) {
    return <p style={{ textAlign: "center", marginTop: "40px" }}>Cargando...</p>;
  }

  // Lo que se muestra como identificación: el nombre si existe, si no, el correo
  const nombreParaMostrar = nombreUsuario || usuario?.email;

  // Botones de la barra de navegación (solo cuando hay sesión iniciada)
  const botonesNav = [
    { vista: "home", texto: "🏠 Inicio" },
    { vista: "recetas", texto: "Ver recetas" },
    { vista: "generador", texto: "¿Qué puedo cocinar?" },
    { vista: "cocina", texto: "Modo cocina" },
    { vista: "chatbot", texto: "Chatbot" },
    { vista: "compras", texto: "Lista de compras" },
    { vista: "fechas", texto: "Fechas y eventos" },
  ];

  return (
    <div className="app-shell">
      <h1 className="app-titulo">🍳 CHARIN COOK</h1>

      {/* Barra de estado de sesión */}
      <div className="barra-sesion">
        {usuario ? (
          <>
            Sesión iniciada como: {nombreParaMostrar}{" "}
            <button onClick={cerrarSesion}>Cerrar sesión</button>
          </>
        ) : (
          "No has iniciado sesión."
        )}
      </div>

      {/* Menú: si NO hay sesión, solo se ofrece login/registro.
          Si SÍ hay sesión, se muestra el resto de la app. */}
      <nav className="nav">
        {!usuario && (
          <>
            <button onClick={() => setVista("login")}>Iniciar sesión</button>
            <button onClick={() => setVista("register")}>Registrarme</button>
          </>
        )}
        {usuario &&
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

      {vista === "login" && !usuario && <Login />}
      {vista === "register" && !usuario && <Register />}
      {usuario && vista === "home" && <Home irA={setVista} correoUsuario={nombreParaMostrar} />}
      {usuario && vista === "recetas" && <Recetas />}
      {usuario && vista === "generador" && <GeneradorIngredientes />}
      {usuario && vista === "cocina" && <ModoCocina />}
      {usuario && vista === "chatbot" && <Chatbot />}
      {usuario && vista === "compras" && <ListaCompras />}
      {usuario && vista === "fechas" && <RecetasPorFecha />}
    </div>
  );
}

export default App;