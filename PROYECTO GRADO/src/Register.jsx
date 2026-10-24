import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "./firebaseAuth";
import { db } from "./firebase";
import { mensajeErrorAuth } from "./mensajesAuth";

function Register() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const resultado = await createUserWithEmailAndPassword(auth, correo, clave);
      const usuario = resultado.user;


      await setDoc(doc(db, "usuarios", usuario.uid), {
        nombre: nombre,
        correo: correo,
      });

      setMensaje("¡Cuenta creada con éxito!");
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

  return (
    <div className="auth-form-content">
      <h2>Crear cuenta</h2>
      <form
        className="auth-form auth-register-form"
        onSubmit={handleRegister}
        onInvalid={handleCampoInvalido}
      >
        <div className="auth-field">
          <label>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              limpiarMensaje();
            }}
            required
          />
        </div>
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
        <div className="auth-field auth-field-password">
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
        </div>
        {mensaje && (
          <p className={`auth-message ${tipoMensaje}`} role="alert">
            {mensaje}
          </p>
        )}
        <button className="auth-submit" type="submit">
          Registrarme
        </button>
      </form>
    </div>
  );
}

export default Register;