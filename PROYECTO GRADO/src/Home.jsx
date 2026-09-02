// Página de inicio: funciona como panel de control de Chain Cook.
// Estructura: saludo -> acción principal -> accesos rápidos -> más opciones.
// (Usa exactamente los mismos estilos/colores que ya existían, solo cambia el orden y la agrupación)

function Home({ irA, correoUsuario }) {
  // Acción principal: la entrada más "inteligente", pensada para
  // alguien que no sabe qué cocinar y quiere que la app le resuelva.
  const accionPrincipal = {
    vista: "generador",
    emoji: "🥕",
    color: "var(--color-teal)",
    titulo: "¿Qué puedo cocinar?",
    texto: "Escribe los ingredientes que tienes y te decimos qué postre puedes preparar ahora mismo.",
  };

  // Accesos rápidos: las funciones que más se usan día a día.
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

  // Más opciones: funciones de apoyo, igual de completas pero de uso puntual.
  const masOpciones = [
    {
      vista: "api",
      emoji: "🌐",
      color: "var(--color-secondary)",
      titulo: "Más postres (API)",
      texto: "Descubre postres de todo el mundo, traídos en vivo desde una API de recetas.",
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

  // Tarjeta reutilizable (misma estructura y estilos que ya existían)
  const Tarjeta = ({ item }) => (
    <div
      key={item.vista}
      className="card"
      onClick={() => irA(item.vista)}
      style={{ cursor: "pointer", textAlign: "left" }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          backgroundColor: item.color,
          border: "2px solid #111111",
          borderRadius: "50%",
          boxShadow: "3px 3px 0px 0px #111111",
          marginBottom: "12px",
        }}
      >
        {item.emoji}
      </div>
      <h3 style={{ margin: "0 0 6px" }}>{item.titulo}</h3>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>{item.texto}</p>
    </div>
  );

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 12px 40px" }}>
      {/* 1. Saludo: quién es el usuario y qué puede hacer aquí */}
      <div
        className="card"
        style={{
          textAlign: "center",
          backgroundColor: "var(--color-lavender)",
          marginBottom: "24px",
          padding: "40px 20px",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>
          {correoUsuario ? `Hola, ${correoUsuario} 👋` : "Bienvenido a Charin Cook 🍳"}
        </h1>
        <p style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
          ¿Qué postre quieres preparar hoy?
        </p>
      </div>

      {/* 2. Acción principal: la más rápida para alguien nuevo */}
      <div style={{ ...grid, gridTemplateColumns: "1fr", marginBottom: "28px" }}>
        <Tarjeta item={accionPrincipal} />
      </div>

      {/* 3. Accesos rápidos: lo que más se usa */}
      <h2 style={{ textAlign: "left", marginBottom: "12px" }}>Accesos rápidos</h2>
      <div style={{ ...grid, marginBottom: "28px" }}>
        {accesosRapidos.map((item) => (
          <Tarjeta key={item.vista} item={item} />
        ))}
      </div>

      {/* 4. Más opciones: funciones de apoyo */}
      <h2 style={{ textAlign: "left", marginBottom: "12px" }}>Más opciones</h2>
      <div style={grid}>
        {masOpciones.map((item) => (
          <Tarjeta key={item.vista} item={item} />
        ))}
      </div>
    </div>
  );
}

export default Home;