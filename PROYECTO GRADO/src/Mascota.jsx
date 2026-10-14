import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./Mascota.css";

const FRASES = [
  "¡Hola! Soy Charin 🍩 ¿Qué cocinamos hoy?",
  "¡Vamos a hornear algo delicioso! 🧁",
  "¡Los postres son mi especialidad! 🍰",
  "¿Tienes hambre? ¡Yo siempre! 😋",
  "¡Cocinar con calma es lo mejor! ✨",
];

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });

// 🍩 NUEVO: se agrega la prop alClic
export default function Mascota({ mensaje: mensajeExterno, hablando = false, alClic }) {
  const mountRef = useRef(null);
  const saltoRef = useRef(0);
  const saludoRef = useRef(0);
  const hablandoRef = useRef(hablando);
  const [frase, setFrase] = useState(FRASES[0]);
  const [verBurbuja, setVerBurbuja] = useState(true);

  const textoBurbuja = mensajeExterno ?? frase;

  useEffect(() => {
    hablandoRef.current = hablando;
  }, [hablando]);

  // La burbuja se muestra unos segundos y se esconde sola
  useEffect(() => {
    setVerBurbuja(true);
    const t = setTimeout(() => setVerBurbuja(false), 6000);
    return () => clearTimeout(t);
  }, [textoBurbuja]);

  useEffect(() => {
    const el = mountRef.current;
    const w0 = el.clientWidth || 140;
    const h0 = el.clientHeight || 160;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0);
    el.appendChild(renderer.domElement);

    // ---------- Luces ----------
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const sol = new THREE.DirectionalLight(0xffffff, 1.7);
    sol.position.set(2, 4, 6);
    scene.add(sol);
    const dorada = new THREE.PointLight(0xd4a640, 14, 14);
    dorada.position.set(-3, 1, 4);
    scene.add(dorada);

    // ---------- Personaje ----------
    const personaje = new THREE.Group();
    scene.add(personaje);

    const R = 0.95; // radio de la dona
    const r = 0.55; // grosor de la masa
    const rg = 0.53; // grosor del glaseado

    // Masa
    personaje.add(
      new THREE.Mesh(
        new THREE.TorusGeometry(R, r, 32, 64),
        mat(0xe3a857, { roughness: 0.8 })
      )
    );

    // Glaseado
    const glaseado = new THREE.Mesh(
      new THREE.TorusGeometry(R, rg, 32, 64),
      mat(0xff7eb6, { roughness: 0.25 })
    );
    glaseado.scale.z = 0.9;
    glaseado.position.z = 0.1;
    personaje.add(glaseado);

    // Chispitas (solo arriba y a los lados, para no tapar la cara)
    const coloresChispas = [0xffffff, 0xffe066, 0x6ee7b7, 0x7dd3fc, 0xc4b5fd, 0xff6b6b];
    const geoChispa = new THREE.CapsuleGeometry(0.022, 0.09, 4, 8);
    for (let i = 0; i < 38; i++) {
      const u = -0.3 + Math.random() * (Math.PI + 0.6);
      const v = 0.5 + Math.random() * (Math.PI - 1);
      const radial = R + rg * Math.cos(v);
      const chispa = new THREE.Mesh(
        geoChispa,
        mat(coloresChispas[i % coloresChispas.length], { roughness: 0.4 })
      );
      chispa.position.set(
        radial * Math.cos(u),
        radial * Math.sin(u),
        0.1 + 0.9 * rg * Math.sin(v) + 0.01
      );
      chispa.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      personaje.add(chispa);
    }

    // ---------- Cara ----------
    const ojos = [];
    const miradas = [];
    [-1, 1].forEach((lado) => {
      const ojo = new THREE.Group();
      ojo.position.set(lado * 0.32, -0.74, 0.52);

      const blanco = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 24, 24),
        mat(0xffffff, { roughness: 0.2 })
      );
      blanco.scale.set(1, 1.2, 0.6);
      ojo.add(blanco);

      const mirada = new THREE.Group();
      const pupila = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 24, 24),
        mat(0x1b1b1b, { roughness: 0.15 })
      );
      pupila.scale.set(1, 1.25, 0.5);
      pupila.position.z = 0.08;
      mirada.add(pupila);

      const brillo = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      brillo.position.set(0.035, 0.06, 0.14);
      mirada.add(brillo);

      ojo.add(mirada);
      personaje.add(ojo);
      ojos.push(ojo);
      miradas.push(mirada);
    });

    // Mejillas
    [-1, 1].forEach((lado) => {
      const mejilla = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        mat(0xff5c8a, { roughness: 0.6 })
      );
      mejilla.scale.set(1.2, 0.7, 0.3);
      mejilla.position.set(lado * 0.62, -1.0, 0.5);
      personaje.add(mejilla);
    });

    // Boca (media luna abierta + lengüita)
    const boca = new THREE.Group();
    boca.position.set(0, -0.98, 0.575);
    const bocaForma = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 24, Math.PI, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x5a1a1a })
    );
    boca.add(bocaForma);
    const lengua = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0xff6b8a })
    );
    lengua.position.set(0, -0.12, 0.002);
    boca.add(lengua);
    personaje.add(boca);

    // ---------- Brazos con guantes ----------
    const brazos = [];
    [-1, 1].forEach((lado) => {
      const hombro = new THREE.Group();
      hombro.position.set(lado * 1.38, -0.15, 0.12);

      const brazo = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.4, 4, 8),
        mat(0x4a2c1d)
      );
      brazo.position.y = -0.28;
      hombro.add(brazo);

      const mano = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 20, 20),
        mat(0xffffff, { roughness: 0.3 })
      );
      mano.position.y = -0.64;
      hombro.add(mano);

      hombro.rotation.z = lado * 0.35;
      personaje.add(hombro);
      brazos.push({ grupo: hombro, lado });
    });

    // ---------- Zapatitos ----------
    [-1, 1].forEach((lado) => {
      const zapato = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 20),
        mat(0x4a2c1d)
      );
      zapato.scale.set(1.2, 0.6, 1.5);
      zapato.position.set(lado * 0.45, -1.62, 0.15);
      personaje.add(zapato);
    });

    // ---------- Mouse: la dona te mira ----------
    const mira = { x: 0, y: 0 };
    const alMover = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mira.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
      mira.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
    };
    window.addEventListener("pointermove", alMover);

    // ---------- Responsive ----------
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    // ---------- Animación ----------
    const reloj = new THREE.Clock();
    let frame;
    let parpadeo = 1;
    const angulos = { "-1": 0.35, "1": 0.35 };

    const animar = () => {
      const t = reloj.getElapsedTime();

      // Flotar + respirar (aplastarse y estirarse)
      let y = Math.sin(t * 2) * 0.1;
      const respira = Math.sin(t * 4) * 0.02;
      personaje.scale.set(1 + respira, 1 - respira, 1);
      personaje.rotation.z = Math.sin(t * 1.5) * 0.04;

      // Mirar al mouse
      let giro = mira.x * 0.35;
      personaje.rotation.x += (mira.y * 0.2 - personaje.rotation.x) * 0.1;

      // Salto al hacer clic
      if (saltoRef.current > 0) {
        const p = 1 - saltoRef.current;
        y += Math.sin(p * Math.PI) * 0.9;
        giro += p * Math.PI * 2;
        const estira = Math.sin(p * Math.PI) * 0.1;
        personaje.scale.set(1 - estira * 0.5, 1 + estira, 1);
        saltoRef.current = Math.max(0, saltoRef.current - 0.025);
      }
      personaje.rotation.y = giro;
      personaje.position.y = y;

      // Parpadeo
      const cicloParpadeo = t % 3.6;
      const objetivoParpadeo = cicloParpadeo > 3.45 ? 0.1 : 1;
      parpadeo += (objetivoParpadeo - parpadeo) * 0.5;
      ojos.forEach((o) => (o.scale.y = parpadeo));

      // Pupilas siguen al mouse
      miradas.forEach((m) => {
        m.position.x += (mira.x * 0.04 - m.position.x) * 0.15;
        m.position.y += (-mira.y * 0.04 - m.position.y) * 0.15;
      });

      // Brazos: el derecho saluda de vez en cuando; al hacer clic saludan los dos
      if (saludoRef.current > 0) saludoRef.current -= 0.016;
      const saludando = saludoRef.current > 0;
      brazos.forEach(({ grupo, lado }) => {
        const saludaEste = saludando || (lado === 1 && t % 8 < 1.8);
        const objetivo = saludaEste
          ? 2.5 + Math.sin(t * 12) * 0.25
          : 0.35 + Math.sin(t * 2 + lado) * 0.05;
        angulos[lado] += (objetivo - angulos[lado]) * 0.15;
        grupo.rotation.z = lado * angulos[lado];
      });

      // Boca: se abre y cierra al hablar
      const abertura = hablandoRef.current
        ? 0.5 + 0.5 * Math.abs(Math.sin(t * 14))
        : saludando
        ? 1.2
        : 0.8;
      boca.scale.y += (abertura - boca.scale.y) * 0.3;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animar);
    };
    animar();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", alMover);
      ro.disconnect();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const alHacerClic = () => {
    saltoRef.current = 1;
    saludoRef.current = 1.6;
    setFrase(FRASES[Math.floor(Math.random() * FRASES.length)]);
    alClic?.(); // 🍩 NUEVO: avisa al asistente para abrir/cerrar el chat
  };

  return (
    <div className="mascota-wrap">
      <div ref={mountRef} className="mascota-canvas" onClick={alHacerClic} />
      <div className={`mascota-burbuja ${verBurbuja ? "" : "oculta"}`}>
        {textoBurbuja}
      </div>
    </div>
  );
}