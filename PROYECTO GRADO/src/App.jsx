import { useState } from "react";
import Register from "./Register";
import Login from "./Login";
import Recetas from "./Recetas";

function App() {
  const [vista, setVista] = useState("login");

  return (
    <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Charin Cook</h1>
      <div>
        <button onClick={() => setVista("login")}>Iniciar sesión</button>
        <button onClick={() => setVista("register")}>Registrarme</button>
        <button onClick={() => setVista("recetas")}>Ver recetas</button>
      </div>

      {vista === "login" && <Login />}
      {vista === "register" && <Register />}
      {vista === "recetas" && <Recetas />}
    </div>
  );
}

export default App;