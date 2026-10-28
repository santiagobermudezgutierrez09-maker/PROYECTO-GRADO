import { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "./firebaseAuth";
import { db } from "./firebase";
import { mensajeErrorAuth } from "./mensajesAuth";

function Register({
  onRegistrationStart,
  onRegistrationEnd,
  onRegistrationCreated,
  onGoToLogin,
}) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [registroCorrecto, setRegistroCorrecto] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje("");
    setRegistroCorrecto(false);
    onRegistrationStart?.();
    let usuarioCreado = null;
    try {
      const resultado = await createUserWithEmailAndPassword(auth, correo, clave);
      const usuario = resultado.user;
      usuarioCreado = usuario;

      await setDoc(doc(db, "usuarios", usuario.uid), {
        nombre: nombre,
        correo: correo,
      });

      onRegistrationCreated?.(usuario.uid);
      await signOut(auth);
      setRegistroCorrecto(true);
    } catch (error) {
      if (usuarioCreado && auth.currentUser?.uid === usuarioCreado.uid) {
        try {
          await signOut(auth);
        } catch (errorCierre) {
          console.error("No se pudo cerrar la sesión temporal tras el registro.", errorCierre);
          setMensaje("La cuenta se creó, pero no pudimos cerrar la sesión automáticamente. Vuelve a iniciar sesión para continuar.");
          setTipoMensaje("error");
          return;
        }
      }
      setMensaje(mensajeErrorAuth(error));
      setTipoMensaje("error");
    } finally {
      onRegistrationEnd?.();
    }
  };

  const limpiarMensaje = () => setMensaje("");

  const handleCampoInvalido = () => {
    setMensaje("Completa los campos obligatorios con datos válidos.");
    setTipoMensaje("error");
  };

  if (registroCorrecto) {
    return (
      <div className="auth-form-content auth-register-success">
        <h2>Usuario creado correctamente</h2>
        <p>Tu cuenta está lista. Ahora puedes iniciar sesión con tu correo y contraseña.</p>
        <button className="auth-submit" type="button" onClick={onGoToLogin}>
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

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