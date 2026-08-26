import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

function Register() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");

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
    } catch (error) {
      setMensaje("Error: " + error.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "320px", margin: "40px auto" }}>
      <h2>Crear cuenta</h2>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: "10px" }}>
          <label>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
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
          Registrarme
        </button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}

export default Register;