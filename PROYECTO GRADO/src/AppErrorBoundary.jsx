import { Component } from "react";

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("La aplicación encontró un error de interfaz.", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" role="alert">
          <h1>Algo salió mal</h1>
          <p>La aplicación encontró un problema inesperado. Vuelve a cargar para intentarlo de nuevo.</p>
          <button type="button" onClick={() => globalThis.location.reload()}>
            Volver a cargar
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
