// Traduce los errores de Firebase Authentication a mensajes claros en español
export function mensajeErrorAuth(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El correo no es válido. Revisa que esté bien escrito.";
    case "auth/missing-email":
      return "Escribe tu correo electrónico.";
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta. Prueba iniciando sesión.";
    case "auth/weak-password":
      return "La contraseña es muy débil: usa al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión a internet. Revísala e inténtalo de nuevo.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    default:
      return "No se pudo completar la acción. Inténtalo de nuevo.";
  }
}