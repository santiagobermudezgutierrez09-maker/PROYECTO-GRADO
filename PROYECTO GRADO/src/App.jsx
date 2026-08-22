import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useCierreSesionInactividad } from "./useCierreSesionInactividad";

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
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Cierra sesión sola tras un rato sin actividad (solo si hay sesión iniciada)
  useCierreSesionInactividad();

  // Escucha en tiempo real si hay un usuario logueado o no
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioActual) => {
      setUsuario(usuarioActual);
      setCargandoSesion(false);
      // Si el usuario inicia sesión, lo llevamos directo al catálogo
      if (usuarioActual) setVista("recetas");
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

  return (
    <div style={{ textAlign: "center" }}>
      <header className="app-header">
        <h1>🍳 Charin Cook</h1>

        {/* Barra de estado de sesión */}
        {usuario ? (
          <p style={{ fontSize: "14px" }}>
            Sesión iniciada como: {usuario.email}{" "}
            <button onClick={cerrarSesion} style={{ marginLeft: "8px" }}>
              Cerrar sesión
            </button>
          </p>
        ) : (
          <p style={{ fontSize: "14px" }}>No has iniciado sesión.</p>
        )}
      </header>

      {/* Menú: si NO hay sesión, solo se ofrece login/registro.
          Si SÍ hay sesión, se muestra el resto de la app. */}
      <nav>
        {!usuario && (
          <>
            <button onClick={() => setVista("login")}>Iniciar sesión</button>
            <button onClick={() => setVista("register")}>Registrarme</button>
          </>
        )}
        {usuario && (
          <>
            <button onClick={() => setVista("recetas")}>Ver recetas</button>
            <button onClick={() => setVista("generador")}>¿Qué puedo cocinar?</button>
            <button onClick={() => setVista("cocina")}>Modo cocina</button>
            <button onClick={() => setVista("chatbot")}>Chatbot</button>
            <button onClick={() => setVista("compras")}>Lista de compras</button>
            <button onClick={() => setVista("fechas")}>Fechas y eventos</button>
          </>
        )}
      </nav>

      {vista === "login" && !usuario && <Login />}
      {vista === "register" && !usuario && <Register />}
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