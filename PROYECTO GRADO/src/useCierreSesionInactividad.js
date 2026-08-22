// Hook que cierra la sesión automáticamente si el usuario no
// interactúa con la app durante un tiempo (RNF03: sesiones seguras).
// Detecta movimientos de mouse, clics y teclas para saber si sigue activo.

import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

const MINUTOS_INACTIVIDAD = 10; // Cambia este número si quieres más o menos tiempo

export function useCierreSesionInactividad() {
  const temporizadorRef = useRef(null);

  useEffect(() => {
    const reiniciarTemporizador = () => {
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);

      temporizadorRef.current = setTimeout(async () => {
        if (auth.currentUser) {
          await signOut(auth);
          alert("Tu sesión se cerró automáticamente por inactividad.");
        }
      }, MINUTOS_INACTIVIDAD * 60 * 1000);
    };

    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));

    reiniciarTemporizador(); // arranca el contador apenas carga la app

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    };
  }, []);
}