import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseAuth";
import { mensajeErrorAuth } from "./mensajesAuth";

function Login({ onLoginStart }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    onLoginStart?.();
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
      setMensaje("¡Sesión iniciada!");
      setTipoMensaje("success");
    } catch (error) {
      setMensaje(mensajeErrorAuth(error));
      setTipoMensaje("error");
    }
  };

  const limpiarMensaje = () => setMensaje("");

  const handleCampoInvalido = () => {
    setMensaje("Completa los campos obligatorios con datos válidos.");
    setTipoMensaje("error");
  };

  // RF04 - Recuperación de contraseña
  const handleRecuperar = async () => {
    setMensaje("");
    setTipoMensaje("error");
    if (!correo) {
      setMensaje("Escribe tu correo arriba primero, y luego dale clic a este enlace.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, correo);
      setMensaje("Te enviamos un correo a " + correo + " con un enlace para restablecer tu contraseña.");
      setTipoMensaje("success");
    } catch (error) {
      setMensaje(mensajeErrorAuth(error));
      setTipoMensaje("error");
    }
  };

  return (
    <div className="auth-form-content">
      <h2>Iniciar sesión</h2>
      <form className="auth-form" onSubmit={handleLogin} onInvalid={handleCampoInvalido}>
        <div className="auth-field">
          <label>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              limpiarMensaje();
            }}
            required
          />
        </div>
        <div className="auth-field">
          <label>Contraseña</label>
          <input
            type="password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value);
              limpiarMensaje();
            }}
            required
          />
          <p className="auth-forgot-wrap">
            <button
              type="button"
              onClick={handleRecuperar}
              className="auth-forgot"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        </div>
        {mensaje && (
          <p className={`auth-message ${tipoMensaje}`} role="alert">
            {mensaje}
          </p>
        )}
        <button className="auth-submit" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;