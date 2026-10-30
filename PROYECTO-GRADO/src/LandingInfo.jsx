import { useEffect, useRef, useState } from "react";
import Mascota from "./Mascota";
import "./LandingInfo.css";
import { obtenerPostres } from "./mealDbService";
import videoPoster from "./assets/hero.png";

const VIDEO_SRC = "/videos/Sticky.mp4";

const beneficios = [
  { icono: "🍰", titulo: "Postres para todos", texto: "Ideas dulces para cada antojo, ocasión y nivel de experiencia." },
  { icono: "🎬", titulo: "Aprende viendo", texto: "Videos paso a paso para cocinar con confianza y a tu ritmo." },
  { icono: "🍩", titulo: "Tu dona te ayuda", texto: "Una compañera de cocina lista para resolver tus dudas." },
];

const preguntasDemo = [
  {
    pregunta: "¿Puedo cambiar la mantequilla por aceite?",
    respuesta: "¡Sí! En muchos bizcochos puedes usar aceite, que los deja muy jugosos. Como guía, prueba con unas ¾ partes de la cantidad de mantequilla. En galletas, mejor no: la mantequilla ayuda a que mantengan su forma.",
  },
  {
    pregunta: "¿Por qué se me bajó el bizcocho?",
    respuesta: "Suele pasar por abrir el horno antes de tiempo, batir de más al añadir la harina o sacar el bizcocho antes de que esté listo. La próxima vez, espera al menos ¾ del horneado antes de abrir y comprueba el centro con un palillo.",
  },
  {
    pregunta: "¿Cómo sé que el flan ya está listo?",
    respuesta: "Mueve suavemente el molde: los bordes deben estar firmes y el centro temblar un poquito, como gelatina. Se terminará de asentar al enfriarse. ¡Evita esperar a que quede completamente rígido en el horno!",
  },
  {
    pregunta: "¿Cómo decoro un cupcake fácil?",
    respuesta: "Deja que el cupcake se enfríe por completo. Pon crema en una bolsa, corta una puntita (o usa una cuchara) y haz un espiral desde afuera hacia el centro. Termina con fruta, chispitas o un poquito de ralladura.",
  },
];

const respuestaLibre = "¡Qué buena pregunta! Esta es solo una probadita de lo que sé 😊 Crea tu cuenta o entra como invitado y pregúntame lo que quieras mientras cocinas.";
const postresDecorativos = ["Una sorpresa dulce", "Tu próximo antojo", "Un clásico por descubrir", "Algo rico está por llegar"];
const confites = ["#c97b57", "#c5923b", "#3d6652", "#e8a583", "#d8b8a1", "#bd8426", "#9d7657", "#d89272", "#698673", "#e5bf83", "#aa6b52", "#d9a77f", "#718d79", "#bf8b58", "#e6b29a", "#8d755c"];

function mostrarRegistro() {
  document.querySelector(".auth-layout .auth-tabs button:nth-child(2)")?.click();
  document.querySelector(".auth-layout")?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

function entrarInvitado() {
  document.querySelector(".auth-layout .auth-guest")?.click();
}

function descubrirLanding() {
  document.querySelector("#cc-que-es")?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

function LandingInfo() {
  const landingRef = useRef(null);
  const respuestaTimer = useRef(null);
  const tipeoTimer = useRef(null);
  const carruselRef = useRef(null);
  const videoSectionRef = useRef(null);
  const videoRef = useRef(null);
  const arrastreRef = useRef({ activo: false, x: 0, scroll: 0, movido: false });
  const pausaCarruselRef = useRef(false);
  const pausaAutoScrollHastaRef = useRef(0);
  const [invitacionVisible, setInvitacionVisible] = useState(
    () => typeof window !== "undefined" && window.scrollY <= 24
  );
  const [mensajeUsuario, setMensajeUsuario] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [estadoChat, setEstadoChat] = useState("¡Hola! Soy tu dona asistente 🍩 Pregúntame lo que quieras mientras cocinas.");
  const [escribiendo, setEscribiendo] = useState(false);
  const [reaccionar, setReaccionar] = useState(false);
  const [postres, setPostres] = useState([]);
  const [cargandoPostres, setCargandoPostres] = useState(true);
  const [errorPostres, setErrorPostres] = useState(false);
  const [posicionCarrusel, setPosicionCarrusel] = useState(0);
  const [maximoCarrusel, setMaximoCarrusel] = useState(0);
  const [errorVideo, setErrorVideo] = useState(false);
  const [errorReproduccion, setErrorReproduccion] = useState(false);
  const [videoIniciado, setVideoIniciado] = useState(false);
  const [videoReproduciendo, setVideoReproduciendo] = useState(false);
  const [videoTerminado, setVideoTerminado] = useState(false);

  useEffect(() => {
    const ocultarInvitacion = () => {
      if (window.scrollY > 24) setInvitacionVisible(false);
    };
    window.addEventListener("scroll", ocultarInvitacion, { passive: true });
    return () => window.removeEventListener("scroll", ocultarInvitacion);
  }, []);

  useEffect(() => {
    const root = landingRef.current;
    if (!root || !("IntersectionObserver" in window)) return undefined;
    root.classList.add("cc-observer-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("cc-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    root.querySelectorAll("[data-cc-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let activo = true;
    obtenerPostres()
      .then((resultado) => {
        if (!activo) return;
        if (!Array.isArray(resultado) || resultado.length === 0) {
          setErrorPostres(true);
          return;
        }
        setPostres(resultado.slice(0, 10));
      })
      .catch(() => {
        if (activo) setErrorPostres(true);
      })
      .finally(() => {
        if (activo) setCargandoPostres(false);
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const carrusel = carruselRef.current;
    if (!carrusel || cargandoPostres || errorPostres || videoReproduciendo || postres.length < 2) return undefined;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pantallaTactil = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (reducirMovimiento || pantallaTactil) return undefined;
    const timer = window.setInterval(() => {
      if (pausaCarruselRef.current || Date.now() < pausaAutoScrollHastaRef.current) return;
      const maximo = carrusel.scrollWidth - carrusel.clientWidth;
      if (maximo > 0 && carrusel.scrollLeft < maximo) {
        carrusel.scrollLeft = Math.min(maximo, carrusel.scrollLeft + 0.32);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [cargandoPostres, errorPostres, postres, videoReproduciendo]);

  useEffect(() => {
    const carrusel = carruselRef.current;
    if (!carrusel || cargandoPostres || errorPostres) {
      setPosicionCarrusel(0);
      setMaximoCarrusel(0);
      return undefined;
    }

    const actualizarPosicion = () => {
      const maximo = Math.max(0, carrusel.scrollWidth - carrusel.clientWidth);
      setMaximoCarrusel(maximo);
      setPosicionCarrusel(Math.min(carrusel.scrollLeft, maximo));
    };
    actualizarPosicion();
    carrusel.addEventListener("scroll", actualizarPosicion, { passive: true });
    const observer = new ResizeObserver(actualizarPosicion);
    observer.observe(carrusel);
    return () => {
      carrusel.removeEventListener("scroll", actualizarPosicion);
      observer.disconnect();
    };
  }, [cargandoPostres, errorPostres, postres]);

  useEffect(() => {
    const section = videoSectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return undefined;

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) video.pause();
      }, { threshold: 0.1 })
      : null;
    observer?.observe(section);

    return () => {
      observer?.disconnect();
      video.pause();
    };
  }, []);

  useEffect(() => () => {
    window.clearTimeout(respuestaTimer.current);
    window.clearInterval(tipeoTimer.current);
  }, []);

  const preguntar = (texto, respuestaLista = respuestaLibre) => {
    const pregunta = texto.trim();
    if (!pregunta || escribiendo) return;
    window.clearTimeout(respuestaTimer.current);
    window.clearInterval(tipeoTimer.current);
    setMensajeUsuario(pregunta);
    setRespuesta("");
    setEstadoChat("La dona está escribiendo...");
    setEscribiendo(true);
    setReaccionar(false);
    respuestaTimer.current = window.setTimeout(() => {
      setEscribiendo(false);
      setReaccionar(true);
      let indice = 0;
      tipeoTimer.current = window.setInterval(() => {
        indice += 3;
        if (videoRef.current?.paused !== false) {
          setRespuesta(respuestaLista.slice(0, indice));
        }
        if (indice >= respuestaLista.length) {
          window.clearInterval(tipeoTimer.current);
          setReaccionar(false);
          setRespuesta(respuestaLista);
          setEstadoChat(respuestaLista);
        }
      }, 18);
    }, 650);
  };

  const enviarPregunta = (event) => {
    event.preventDefault();
    const texto = event.currentTarget.elements.pregunta.value;
    event.currentTarget.reset();
    preguntar(texto);
  };

  const desplazarCarrusel = (direccion) => {
    const carrusel = carruselRef.current;
    const tarjeta = carrusel?.querySelector(".cc-dessert-card");
    if (!carrusel || !tarjeta) return;
    const estilos = window.getComputedStyle(carrusel);
    const espacio = Number.parseFloat(estilos.columnGap || estilos.gap) || 0;
    pausaAutoScrollHastaRef.current = Date.now() + 3000;
    carrusel.scrollBy({
      left: direccion * (tarjeta.getBoundingClientRect().width + espacio),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const ajustarPosicionCarrusel = (event) => {
    carruselRef.current?.scrollTo({ left: Number(event.currentTarget.value), behavior: "auto" });
  };

  const controlarArrastre = (event) => {
    const estado = arrastreRef.current;
    if (!estado.activo || !carruselRef.current) return;
    const desplazamiento = estado.x - event.clientX;
    if (Math.abs(desplazamiento) > 5) estado.movido = true;
    carruselRef.current.scrollLeft = estado.scroll + desplazamiento;
  };

  const seleccionarPostre = (event) => {
    if (arrastreRef.current.movido) {
      event.preventDefault();
      arrastreRef.current.movido = false;
      return;
    }
    mostrarRegistro();
  };

  const reproducirVideo = async () => {
    const video = videoRef.current;
    if (!video) {
      setErrorReproduccion(true);
      return;
    }

    setVideoIniciado(true);
    setVideoTerminado(false);
    setErrorReproduccion(false);
    try {
      await video.play();
    } catch {
      setVideoReproduciendo(false);
      setErrorReproduccion(true);
    }
  };

  const repetirVideo = () => {
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    reproducirVideo();
  };

  return (
    <main className="cc-landing" ref={landingRef}>
      <button
        className={`cc-scroll-invite ${invitacionVisible ? "" : "cc-scroll-invite-hidden"}`}
        type="button"
        onClick={descubrirLanding}
        aria-hidden={!invitacionVisible}
        tabIndex={invitacionVisible ? 0 : -1}
        disabled={!invitacionVisible}
      >
        <span>Descubre Charin Cook</span>
        <span className="cc-scroll-arrow" aria-hidden="true">↓</span>
      </button>

      <section className="cc-section cc-about" id="cc-que-es" aria-labelledby="cc-about-title">
        <div className="cc-section-heading" data-cc-reveal>
          <span className="cc-eyebrow">Un pequeño espacio para grandes antojos</span>
          <h2 id="cc-about-title">¿Qué es <em>Charin Cook</em>?</h2>
          <p>Tu recetario de postres para aprender, probar y disfrutar sin apuros.</p>
        </div>
        <div className="cc-benefits">
          {beneficios.map((beneficio, index) => (
            <article className="cc-benefit cc-reveal" data-cc-reveal key={beneficio.titulo} style={{ "--cc-delay": `${index * 100}ms` }}>
              <span className="cc-benefit-icon" aria-hidden="true">{beneficio.icono}</span>
              <h3>{beneficio.titulo}</h3>
              <p>{beneficio.texto}</p>
              <span className="cc-benefit-sparkle" aria-hidden="true">✦</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cc-section cc-assistant" aria-labelledby="cc-assistant-title">
        <div className="cc-section-heading" data-cc-reveal>
          <span className="cc-eyebrow">Consejitos con cariño</span>
          <h2 id="cc-assistant-title">Una mano extra, <em>siempre</em></h2>
          <p>La dona está cerquita para que cocinar se sienta más fácil.</p>
        </div>
        <div className="cc-chat-card" data-cc-reveal>
          <div className={`cc-donut ${reaccionar ? "cc-pop" : ""}`}>
            <span className="cc-donut-halo" aria-hidden="true" />
            {!videoReproduciendo && <Mascota variante="cc-landing-mascota" mensaje="Tu compañera dulce" />}
            <span className="cc-donut-caption">tu compañera dulce</span>
          </div>
          <div className="cc-chat">
            <div className="cc-chat-topline">
              <span className="cc-online-dot" aria-hidden="true" />
              <span>Dona asistente</span>
              <span className="cc-demo-badge">DEMO</span>
            </div>
            <div className="cc-chat-messages">
              <p className="cc-bubble cc-bubble-bot">¡Hola! Soy tu dona asistente 🍩 Pregúntame lo que quieras mientras cocinas.</p>
              {mensajeUsuario && <p className="cc-bubble cc-bubble-user">{mensajeUsuario}</p>}
              {escribiendo && (
                <p className="cc-bubble cc-bubble-bot cc-typing" aria-label="La dona está escribiendo">
                  <span /><span /><span />
                </p>
              )}
              {respuesta && <p className="cc-bubble cc-bubble-bot">{respuesta}</p>}
            </div>
            <p className="cc-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{estadoChat}</p>
            <div className="cc-chips" aria-label="Preguntas de ejemplo">
              {preguntasDemo.map(({ pregunta, respuesta: respuestaLista }) => (
                <button key={pregunta} type="button" disabled={escribiendo} onClick={() => preguntar(pregunta, respuestaLista)}>
                  {pregunta}
                </button>
              ))}
            </div>
            <form className="cc-chat-form" onSubmit={enviarPregunta}>
              <label className="cc-visually-hidden" htmlFor="cc-chat-question">Escribe una pregunta para la dona</label>
              <input id="cc-chat-question" name="pregunta" maxLength="240" placeholder="Escribe tu pregunta..." autoComplete="off" />
              <button type="submit" disabled={escribiendo} aria-label="Enviar pregunta">Enviar <span aria-hidden="true">↗</span></button>
            </form>
            <p className="cc-chat-note">Esta demo usa respuestas preparadas. Sin registro, solo una probadita ✨</p>
          </div>
        </div>
      </section>

      <section className="cc-section cc-desserts" aria-labelledby="cc-desserts-title">
        <div className="cc-section-heading" data-cc-reveal>
          <span className="cc-eyebrow">Una vitrina de inspiración</span>
          <h2 id="cc-desserts-title">Postres que te <em>esperan</em></h2>
          <p>Un vistazo a las delicias que puedes descubrir en tu recetario.</p>
        </div>
        <div className="cc-carousel-tools">
          <span className="cc-carousel-hint">Explora la vitrina de postres <span aria-hidden="true">→</span></span>
          <div className="cc-carousel-arrows">
            <button type="button" aria-label="Ver postres anteriores" onClick={() => desplazarCarrusel(-1)} disabled={cargandoPostres || errorPostres || posicionCarrusel <= 1}>←</button>
            <button type="button" aria-label="Ver más postres" onClick={() => desplazarCarrusel(1)} disabled={cargandoPostres || errorPostres || maximoCarrusel === 0 || posicionCarrusel >= maximoCarrusel - 1}>→</button>
          </div>
        </div>
        {cargandoPostres ? (
          <div className="cc-dessert-track cc-skeleton-track" aria-label="Cargando postres">
            {Array.from({ length: 5 }, (_, indice) => <div className="cc-dessert-skeleton" key={indice} />)}
          </div>
        ) : errorPostres ? (
          <div className="cc-dessert-track cc-fallback-track" role="status">
            <p className="cc-carousel-error">La vitrina está tomando aire. Mientras vuelve, guarda un espacio para algo rico ✨</p>
            {postresDecorativos.map((nombre, indice) => (
              <div className="cc-dessert-fallback" key={nombre} aria-hidden="true">
                <span>{["🍮", "🍓", "🍪", "🧁"][indice]}</span>
                <strong>{nombre}</strong>
                <small>Un antojo por descubrir</small>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="cc-dessert-track"
            ref={carruselRef}
            onMouseEnter={() => { pausaCarruselRef.current = true; }}
            onMouseLeave={() => {
              pausaCarruselRef.current = false;
              arrastreRef.current.activo = false;
              arrastreRef.current.movido = false;
            }}
            onFocusCapture={() => { pausaCarruselRef.current = true; }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) pausaCarruselRef.current = false;
            }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              arrastreRef.current = { activo: true, x: event.clientX, scroll: event.currentTarget.scrollLeft, movido: false };
              event.currentTarget.classList.add("cc-dragging");
            }}
            onMouseMove={controlarArrastre}
            onMouseUp={() => {
              arrastreRef.current.activo = false;
              carruselRef.current?.classList.remove("cc-dragging");
            }}
          >
            {postres.map((postre) => (
              <button
                type="button"
                className="cc-dessert-card"
                key={postre.idMeal}
                onClick={seleccionarPostre}
                aria-label={`Registrarse para ver la receta de ${postre.strMeal}`}
              >
                <span className="cc-dessert-image-wrap">
                  <img src={postre.strMealThumb} alt={postre.strMeal} loading="lazy" decoding="async" draggable="false" />
                  <span className="cc-dessert-cta">Regístrate para ver la receta</span>
                </span>
                <span className="cc-dessert-meta">
                  <strong>{postre.strMeal}</strong>
                  <small>{postre.strArea || "Postre"}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        {!cargandoPostres && !errorPostres && maximoCarrusel > 0 && (
          <input
            className="cc-carousel-progress"
            type="range"
            min="0"
            max={maximoCarrusel}
            step="1"
            value={Math.min(posicionCarrusel, maximoCarrusel)}
            onChange={ajustarPosicionCarrusel}
            style={{ "--cc-progress": `${(posicionCarrusel / maximoCarrusel) * 100}%` }}
            aria-label="Desplazamiento del carrusel de postres"
            aria-valuetext={`${Math.round((posicionCarrusel / maximoCarrusel) * 100)}% del carrusel`}
          />
        )}
      </section>

      <section className="cc-section cc-video" ref={videoSectionRef} aria-labelledby="cc-video-title">
        <div className="cc-section-heading" data-cc-reveal>
          <span className="cc-eyebrow">En la cocina, contigo</span>
          <h2 id="cc-video-title">Conoce <em>Charin Cook</em></h2>
          <p>Mira el video y descubre cómo cocinar postres con calma.</p>
        </div>
        <div className="cc-player" data-cc-reveal>
          <div className="cc-player-screen">
            <div className="cc-video-frame">
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                title="Presentación de Charin Cook"
                playsInline
                preload="metadata"
                poster={videoPoster}
                controls={videoIniciado}
                onPlay={() => {
                  landingRef.current?.classList.add("cc-video-playing");
                  setVideoReproduciendo(true);
                  setErrorReproduccion(false);
                }}
                onPause={() => {
                  landingRef.current?.classList.remove("cc-video-playing");
                  setVideoReproduciendo(false);
                }}
                onEnded={() => {
                  landingRef.current?.classList.remove("cc-video-playing");
                  setVideoReproduciendo(false);
                  setVideoTerminado(true);
                }}
                onError={() => {
                  landingRef.current?.classList.remove("cc-video-playing");
                  setErrorVideo(true);
                  setVideoReproduciendo(false);
                }}
              />
              {!errorVideo && !videoTerminado && (
                <div className={`cc-video-play-overlay ${videoIniciado ? "cc-video-paused" : ""} ${videoReproduciendo ? "cc-video-play-overlay-hidden" : ""}`} aria-hidden={videoReproduciendo}>
                  <button
                    className="cc-video-play-button"
                    type="button"
                    onClick={reproducirVideo}
                    aria-label={videoIniciado ? "Reanudar video de Charin Cook" : "Reproducir video de Charin Cook"}
                    disabled={videoReproduciendo}
                    tabIndex={videoReproduciendo ? -1 : 0}
                  >
                    <span className="cc-video-play-icon" aria-hidden="true" />
                    <span className="cc-video-play-label">
                      {videoIniciado ? "Reanudar video" : "Dale play y conoce Charin Cook"}
                    </span>
                  </button>
                </div>
              )}
              {videoTerminado && (
                <div className="cc-video-ended-overlay" role="group" aria-label="Video terminado">
                  <button className="cc-video-replay" type="button" onClick={repetirVideo}>
                    Ver otra vez
                  </button>
                </div>
              )}
            </div>
            {(errorVideo || errorReproduccion) && (
              <p className="cc-video-fallback" role="status">
                {errorVideo
                  ? "No pudimos cargar el video ahora. Puedes seguir explorando Charin Cook en las secciones de esta página."
                  : "No pudimos reproducir el video. Inténtalo de nuevo en un momento."}
              </p>
            )}
          </div>
          <aside className="cc-player-steps" aria-labelledby="cc-player-kicker">
            <h3 className="cc-player-kicker" id="cc-player-kicker">¿Qué es Charin Cook?</h3>
            <p className="cc-player-description">
              Charin Cook es tu recetario de postres, hecho para cocinar con calma. Encuentra recetas de todos los niveles, aprende con videos paso a paso y pregúntale a tu dona asistente lo que necesites mientras cocinas.
            </p>
            <ul className="cc-player-features">
              <li data-cc-reveal><span aria-hidden="true">🍰</span>Recetas de postres</li>
              <li data-cc-reveal><span aria-hidden="true">🍩</span>Tu dona te ayuda</li>
              <li data-cc-reveal><span aria-hidden="true">💛</span>Guarda y comparte</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="cc-section cc-process" aria-labelledby="cc-process-title">
        <div className="cc-section-heading" data-cc-reveal>
          <span className="cc-eyebrow">Así de sencillo</span>
          <h2 id="cc-process-title">Un antojo, tres <em>momentos</em></h2>
          <p>De la primera idea al último bocado, aquí te acompañamos.</p>
        </div>
        <div className="cc-process-steps" data-cc-reveal>
          <span className="cc-process-line" aria-hidden="true"><span /></span>
          {[
            ["01", "Elige tu postre", "Encuentra ese dulce que ya se te antojó."],
            ["02", "Cocina con el video", "Sigue cada paso, sin prisa y a tu manera."],
            ["03", "Pregúntale a la dona", "Resuelve dudas justo cuando aparecen."],
          ].map(([numero, titulo, texto], indice) => (
            <article className="cc-process-step" key={numero} style={{ "--cc-delay": `${indice * 140}ms` }}>
              <span className="cc-step-number">{numero}</span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cc-closing" aria-labelledby="cc-closing-title">
        <div className="cc-confetti" aria-hidden="true">
          {confites.map((color, indice) => (
            <span key={indice} style={{ "--cc-confetti-color": color, "--cc-confetti-left": `${(indice * 37 + 8) % 100}%`, "--cc-confetti-delay": `${(indice % 7) * -0.8}s`, "--cc-confetti-duration": `${5 + (indice % 5)}s` }} />
          ))}
        </div>
        <div className="cc-closing-content">
          <span className="cc-closing-doodle" aria-hidden="true">✦ &nbsp; 🍓 &nbsp; ✦</span>
          <p className="cc-eyebrow">La cocina ya huele rico</p>
          <h2 id="cc-closing-title">Tu próximo postre<br /><em>empieza aquí</em></h2>
          <p>Ven por la receta. Quédate por todo lo que vas a aprender.</p>
          <div className="cc-closing-actions">
            <button type="button" className="cc-cta-primary" onClick={mostrarRegistro}>Crear mi cuenta <span aria-hidden="true">↗</span></button>
            <button type="button" className="cc-cta-guest" onClick={entrarInvitado}>Pruébalo sin registrarte</button>
          </div>
          <span className="cc-closing-footnote">Hecho para cocinar con calma y disfrutar cada momento.</span>
        </div>
      </section>
    </main>
  );
}

export default LandingInfo;
