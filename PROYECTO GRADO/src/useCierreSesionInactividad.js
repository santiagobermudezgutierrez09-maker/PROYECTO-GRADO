



import { useEffect, useRef } from "react";

const MINUTOS_INACTIVIDAD = 10;

export function useCierreSesionInactividad() {
  const temporizadorRef = useRef(null);

  useEffect(() => {
    const reiniciarTemporizador = () => {
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);

      temporizadorRef.current = setTimeout(async () => {
        try {
          const [{ signOut }, { auth }] = await Promise.all([
            import("firebase/auth"),
            import("./firebaseAuth"),
          ]);
          if (auth.currentUser) {
            await signOut(auth);
            alert("Tu sesión se cerró automáticamente por inactividad.");
          }
        } catch (error) {
          console.error("No se pudo cerrar la sesión por inactividad.", error);
        }
      }, MINUTOS_INACTIVIDAD * 60 * 1000);
    };

    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));

    reiniciarTemporizador();

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    };
  }, []);
}