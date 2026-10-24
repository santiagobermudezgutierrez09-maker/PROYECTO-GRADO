import "./Mascota.css";

export default function MascotaCarga({
  variante = "",
  alClic,
  mensaje = "¡Tócame y pregúntame de cocina! 🍩",
}) {
  const activar = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      alClic?.();
    }
  };

  return (
    <div
      className={`mascota-wrap mascota-cargando ${variante}`}
      role={alClic ? "button" : undefined}
      tabIndex={alClic ? 0 : undefined}
      aria-label={alClic ? "Charin está cargando" : undefined}
      onClick={alClic}
      onKeyDown={alClic ? activar : undefined}
    >
      <svg
        className="mascota-placeholder"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle cx="32" cy="30" r="26" fill="#F4A98C" />
        <circle cx="32" cy="30" r="22" fill="#F29EAF" />
        <circle cx="32" cy="30" r="7" fill="#FFF8EC" />
        <g strokeLinecap="round" strokeWidth="2.5">
          <path d="m17 16 3 2" stroke="#BFE3C8" />
          <path d="m44 14 3 3" stroke="#FFF8EC" />
          <path d="m12 32 3 1" stroke="#F4A98C" />
          <path d="m48 34 3-2" stroke="#BFE3C8" />
          <path d="m20 45 3 1" stroke="#FFF8EC" />
          <path d="m41 45 3-2" stroke="#F4A98C" />
        </g>
        <ellipse cx="25" cy="39" rx="1.8" ry="2.6" fill="#4A3428" />
        <ellipse cx="39" cy="39" rx="1.8" ry="2.6" fill="#4A3428" />
        <path
          d="M28 45q4 4 8 0"
          fill="none"
          stroke="#4A3428"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
      <div className="mascota-burbuja">{mensaje}</div>
    </div>
  );
}
