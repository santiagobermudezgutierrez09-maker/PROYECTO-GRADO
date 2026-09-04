import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";

function Login() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
      setMensaje("¡Sesión iniciada!");
    } catch (error) {
      setMensaje("Error: " + error.message);
    }
  };

  // RF04 - Recuperación de contraseña
  const handleRecuperar = async () => {
    setMensaje("");
    if (!correo) {
      setMensaje("Escribe tu correo arriba primero, y luego dale clic a este enlace.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, correo);
      setMensaje("Te enviamos un correo a " + correo + " con un enlace para restablecer tu contraseña.");
    } catch (error) {
      setMensaje("Error: " + error.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "320px", margin: "40px auto" }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "10px" }}>
          <label>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button type="submit" style={{ padding: "8px 16px" }}>
          Entrar
        </button>
      </form>

      <p style={{ marginTop: "10px" }}>
        <button
          type="button"
          onClick={handleRecuperar}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            textDecoration: "underline",
            cursor: "pointer",
            color: "var(--color-teal)",
            fontSize: "0.85rem",
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>

      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}

export default Login;