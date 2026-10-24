// Traduce los errores de Firebase Authentication a mensajes claros en español
export function mensajeErrorAuth(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet.";
    default:
      console.error("Error inesperado de Firebase Authentication:", error);
      return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
}