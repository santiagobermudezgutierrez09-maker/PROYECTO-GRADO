// Página de inicio: lo primero que ve el usuario al entrar.
// Muestra tarjetas grandes que llevan a cada sección de la app.

function Home({ irA, correoUsuario }) {
  const secciones = [
    {
      vista: "recetas",
      emoji: "🍲",
      color: "var(--color-pink)",
      titulo: "ver recetas",
      texto: "Explora el catálogo completo: tradicionales, fitness y de fechas especiales.",
    },
    {
      vista: "generador",
      emoji: "🥕",
      color: "var(--color-teal)",
      titulo: "¿qué puedo cocinar?",
      texto: "Escribe los ingredientes que tienes y te decimos qué puedes preparar.",
    },
    {
      vista: "cocina",
      emoji: "👩‍🍳",
      color: "var(--color-yellow)",
      titulo: "modo cocina",
      texto: "Guía paso a paso con letra grande y temporizador, ideal mientras cocinas.",
    },
    {
      vista: "chatbot",
      emoji: "💬",
      color: "var(--color-lavender)",
      titulo: "chatbot asistente",
      texto: "Pregúntale por tiempos, ingredientes o sustitutos de cualquier receta.",
    },
    {
      vista: "compras",
      emoji: "🛒",
      color: "var(--color-secondary)",
      titulo: "lista de compras",
      texto: "Elige tus recetas y arma automáticamente tu lista de ingredientes.",
    },
    {
      vista: "fechas",
      emoji: "🎉",
      color: "var(--color-primary)",
      titulo: "fechas y eventos",
      texto: "Recetas sugeridas según la fecha, y planifica próximos eventos.",
    },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 12px 40px" }}>
      {/* Hero / bienvenida */}
      <div
        className="card"
        style={{
          textAlign: "center",
          backgroundColor: "var(--color-lavender)",
          marginBottom: "32px",
          padding: "40px 20px",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>BIENVENIDO A CHARIN COOK 🍳</h1>
        <p style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
          {correoUsuario ? `Hola, ${correoUsuario}. ` : ""}
          ¿Qué quieres hacer hoy?
        </p>
      </div>

      {/* Grid de tarjetas de navegación */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
        }}
      >
        {secciones.map((s) => (
          <div
            key={s.vista}
            className="card"
            onClick={() => irA(s.vista)}
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
                backgroundColor: s.color,
                border: "2px solid #111111",
                borderRadius: "50%",
                boxShadow: "3px 3px 0px 0px #111111",
                marginBottom: "12px",
              }}
            >
              {s.emoji}
            </div>
            <h3 style={{ margin: "0 0 6px" }}>{s.titulo}</h3>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{s.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;