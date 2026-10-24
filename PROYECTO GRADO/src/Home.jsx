import "./Home.css";

// Tarjeta clickable. Está fuera de Home para que React no la vuelva a crear
// en cada render. "variante" cambia su forma: "destacada", "normal" o "compacta".
function Tarjeta({ item, irA, variante = "normal" }) {
  return (
    <div
      className={`card home-tarjeta home-tarjeta--${variante}`}
      style={{ "--acento": item.color }}
      onClick={() => irA(item.vista)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          irA(item.vista);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="home-icono">{item.emoji}</div>
      <div className="home-tarjeta-cuerpo">
        <h3>{item.titulo}</h3>
        <p>{item.texto}</p>
        {variante === "destacada" && (
          <span className="home-cta">Probar ahora</span>
        )}
      </div>
    </div>
  );
}

function Home({ irA, correoUsuario }) {
  const nombrePresentacion = correoUsuario
    ? correoUsuario.includes("@")
      ? correoUsuario
      : correoUsuario.charAt(0).toLocaleUpperCase("es") +
        correoUsuario.slice(1).toLocaleLowerCase("es")
    : "";

  const accionPrincipal = {
    vista: "generador",
    emoji: "🥕",
    color: "var(--color-teal)",
    titulo: "¿Qué puedo cocinar?",
    texto: "Escribe los ingredientes que tienes y te decimos qué postre puedes preparar ahora mismo.",
  };

  const accesosRapidos = [
    {
      vista: "recetas",
      emoji: "🍲",
      color: "var(--color-pink)",
      titulo: "Ver recetas",
      texto: "Explora el catálogo de postres: tradicionales, fitness y para fechas especiales.",
    },
    {
      vista: "cocina",
      emoji: "👩‍🍳",
      color: "var(--color-yellow)",
      titulo: "Modo cocina",
      texto: "Guía paso a paso con letra grande y temporizador, ideal mientras cocinas.",
    },
    {
      vista: "compras",
      emoji: "🛒",
      color: "var(--color-secondary)",
      titulo: "Lista de compras",
      texto: "Elige tus recetas y arma automáticamente tu lista de ingredientes.",
    },
  ];

  const masOpciones = [
    {
      vista: "api",
      emoji: "🌐",
      color: "var(--color-secondary)",
      titulo: "Más postres",
      texto: "Descubre postres de todo el mundo, traídos en vivo desde TheMealDB.",
    },
    {
      vista: "chatbot",
      emoji: "💬",
      color: "var(--color-lavender)",
      titulo: "Chatbot asistente",
      texto: "Pregúntale por tiempos, ingredientes o sustitutos de cualquier receta.",
    },
    {
      vista: "fechas",
      emoji: "🎉",
      color: "var(--color-primary)",
      titulo: "Fechas y eventos",
      texto: "Recetas sugeridas según la fecha, y planifica próximos eventos.",
    },
  ];

  return (
    <div className="home">
      {/* Bienvenida */}
      <section className="card home-hero">
        <h1>
          {correoUsuario ? `Hola, ${nombrePresentacion} 👋` : "Bienvenido a Charin Cook 🍳"}
        </h1>
        <p>¿Qué postre quieres preparar hoy?</p>
      </section>

      {/* Acción principal: la más importante, ocupa todo el ancho */}
      <section className="home-seccion">
        <Tarjeta item={accionPrincipal} irA={irA} variante="destacada" />
      </section>

      {/* Accesos rápidos */}
      <section className="home-seccion">
        <h2>Accesos rápidos</h2>
        <div className="home-grid home-grid--3">
          {accesosRapidos.map((item) => (
            <Tarjeta key={item.vista} item={item} irA={irA} />
          ))}
        </div>
      </section>

      {/* Más opciones: tarjetas más compactas, de menor jerarquía */}
      <section className="home-seccion">
        <h2>Más opciones</h2>
        <div className="home-grid home-grid--3">
          {masOpciones.map((item) => (
            <Tarjeta key={item.vista} item={item} irA={irA} variante="compacta" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;