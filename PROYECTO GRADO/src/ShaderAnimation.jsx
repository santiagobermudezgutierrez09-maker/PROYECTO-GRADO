import { useEffect, useRef } from "react";
import * as THREE from "three";

// Fondo animado de luces (arcos concéntricos que brillan, tipo "wow").
// speed: velocidad de la animación (1 = normal).
// lineWidth: grosor de las líneas de luz.
// dispersion: separación de color (efecto arcoíris azul/blanco/ámbar).
// tint: si se pasa un color [r,g,b] entre 0 y 1, el efecto se pinta de ese color.
// brightness: qué tan brillante se ve todo.
export function ShaderAnimation({
  speed = 1,
  lineWidth = 0.002,
  dispersion = 0.01,
  tint = null,
  brightness = 1,
  className = "shader-fondo",
  style,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const vertexShader = `
      void main() { gl_Position = vec4(position, 1.0); }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float uLineWidth;
      uniform float uDispersion;
      uniform vec3 uTint;
      uniform float uUseTint;
      uniform float uBrightness;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += uLineWidth * float(i * i) /
              abs(fract(t - uDispersion * float(j) + float(i) * 0.01) * 5.0
                  - length(uv) + mod(uv.x + uv.y, 0.2));
          }
        }
        float mono = (color.r + color.g + color.b) / 3.0;
        vec3 finalColor = mix(color, mono * uTint, uUseTint);
        gl_FragColor = vec4(finalColor * uBrightness, 1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
      uLineWidth: { value: lineWidth },
      uDispersion: { value: dispersion },
      uTint: { value: new THREE.Vector3(...(tint ?? [1, 1, 1])) },
      uUseTint: { value: tint ? 1.0 : 0.0 },
      uBrightness: { value: brightness },
    };

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener("resize", onResize);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05 * speed;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [speed, lineWidth, dispersion, tint, brightness]);

  return <div ref={containerRef} className={className} style={{ background: "#000", ...style }} />;
}

export default ShaderAnimation;