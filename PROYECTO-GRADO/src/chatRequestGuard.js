const INTERVALO_MINIMO_MS = 1_000;

export function permitirMensajeChat(ultimoEnvioRef) {
  const ahora = Date.now();
  if (ahora - ultimoEnvioRef.current < INTERVALO_MINIMO_MS) return false;
  ultimoEnvioRef.current = ahora;
  return true;
}
