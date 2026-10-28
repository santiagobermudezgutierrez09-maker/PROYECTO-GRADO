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
        <circle cx="32" cy="30" r="26" fill="var(--color-primary)" />
        <circle cx="32" cy="30" r="22" fill="var(--color-secondary)" />
        <circle cx="32" cy="30" r="7" fill="var(--bg-surface)" />
        <g strokeLinecap="round" strokeWidth="2.5">
          <path d="m17 16 3 2" stroke="var(--color-teal)" />
          <path d="m44 14 3 3" stroke="var(--bg-surface)" />
          <path d="m12 32 3 1" stroke="var(--color-primary-hover)" />
          <path d="m48 34 3-2" stroke="var(--color-teal)" />
          <path d="m20 45 3 1" stroke="var(--bg-surface)" />
          <path d="m41 45 3-2" stroke="var(--color-primary-hover)" />
        </g>
        <ellipse cx="25" cy="39" rx="1.8" ry="2.6" fill="var(--text-primary)" />
        <ellipse cx="39" cy="39" rx="1.8" ry="2.6" fill="var(--text-primary)" />
        <path
          d="M28 45q4 4 8 0"
          fill="none"
          stroke="var(--text-primary)"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
      <div className="mascota-burbuja">{mensaje}</div>
    </div>
  );
}
