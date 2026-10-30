// Globos que suben entre una sección y otra. Cada globo es independiente:
// sale en su propio momento, con su tamaño, velocidad, vaivén y cuerdita
// ondulante, y se va abriendo hacia los lados mientras sube. A mitad del
// recorrido un velo color crema tapa el contenido para cambiar de sección.

// Tonos neutros; el rosa aparece apenas, para no inclinar hacia niña ni niño.
const COLORS = ["verde", "crema", "arena", "dorado", "cafe-claro", "verde", "crema", "arena", "rosa", "dorado"];

// Globo en coordenadas 60 × 140: cuerpo arriba, nudo y cuerdita hacia abajo.
const BODY = "M30,2C46,2 58,15 58,32C58,50 44,63 32,69L28,69C16,63 2,50 2,32C2,15 14,2 30,2Z";
const KNOT = "M25.5,75L34.5,75L30,68.5Z";
const STRING_A = "M30,75C23,89 37,101 30,115C25,125 33,131 30,139";
const STRING_B = "M30,75C37,89 23,101 30,115C35,125 27,131 30,139";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function gradients() {
  const stops = (c) => `<stop offset="0" style="stop-color:color-mix(in srgb, var(--${c}) 30%, #fff)"/>
    <stop offset=".55" style="stop-color:var(--${c})"/>
    <stop offset="1" style="stop-color:color-mix(in srgb, var(--${c}) 78%, #000)"/>`;
  const unique = [...new Set(COLORS)];
  return `<svg class="wave-defs" width="0" height="0" aria-hidden="true"><defs>${unique.map((c) =>
    `<radialGradient id="wv-${c}" cx="35%" cy="28%" r="75%">${stops(c)}</radialGradient>`).join("")}</defs></svg>`;
}

function balloonSVG(color, withString) {
  const wave = rand(0.9, 1.6).toFixed(2);
  const begin = (-rand(0, 1.5)).toFixed(2);
  const string = withString
    ? `<path d="${STRING_A}" fill="none" stroke="#b3a487" stroke-width="1.3" stroke-linecap="round">
        <animate attributeName="d" dur="${wave}s" begin="${begin}s" repeatCount="indefinite"
          values="${STRING_A};${STRING_B};${STRING_A}" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
      </path>`
    : "";
  return `<svg viewBox="0 0 60 140">${string}
    <path d="${KNOT}" fill="url(#wv-${color})"/>
    <path d="${BODY}" fill="url(#wv-${color})"/>
    <ellipse cx="19" cy="21" rx="5.5" ry="10" fill="#fff" opacity=".45" transform="rotate(28 19 21)"/>
  </svg>`;
}

/**
 * @param {object} opts
 * @param {() => void} [opts.onCovered] se llama cuando el contenido está tapado
 * @param {boolean} [opts.cover] false = solo festejo, sin tapar el contenido
 * @returns {Promise<void>} se resuelve cuando ya se puede volver a navegar
 */
export function balloonWave({ onCovered, cover = true } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onCovered?.();
    return Promise.resolve();
  }

  const w = innerWidth;
  const h = innerHeight;
  const count = cover ? 34 : 20;
  const spread = cover ? 800 : 1300; // ms durante los que van saliendo globos

  const layer = document.createElement("div");
  layer.className = "wave";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = gradients();
  const veil = document.createElement("div");
  veil.className = "wave-veil";
  if (cover) layer.append(veil);

  // Posiciones repartidas a lo ancho (con algo de azar) para que no se
  // amontonen, y en orden aleatorio para que salgan desordenados.
  const slots = Array.from({ length: count }, (_, i) => (i + rand(0.1, 0.9)) / count)
    .sort(() => Math.random() - 0.5);

  const rides = slots.map((slot) => {
    const size = Math.round(rand(58, 128) * Math.min(1.25, Math.max(0.85, w / 390)));
    const height = size * (140 / 60);
    const x0 = slot * (w * 1.1) - w * 0.05 - size / 2;
    // Salen desde distintas alturas bajo la pantalla para que no suban en fila.
    const y0 = h + rand(10, 240);
    const y1 = -height - rand(40, 160);

    const el = document.createElement("div");
    el.className = "wb";
    el.style.width = `${size}px`;
    el.style.height = `${height}px`;
    const sway = document.createElement("div");
    sway.className = "wb-sway";
    sway.innerHTML = balloonSVG(pick(COLORS), Math.random() < 0.8);
    el.append(sway);
    layer.append(el);

    const timing = {
      duration: rand(2200, 3400),
      // Pocos al inicio y cada vez más: así van saliendo de a poquitos.
      delay: spread * Math.pow(Math.random(), 0.75),
      // "both": antes de salir espera bajo la pantalla y, al terminar, se queda
      // arriba fuera de la vista (sin esto vuelve a la esquina superior).
      fill: "both",
    };

    // Subida: un solo tramo continuo que arranca suave y va ganando un poco de
    // velocidad hasta salir por arriba; nunca frena ni se detiene.
    const rise = el.animate([
      { transform: `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)` },
      { transform: `translate(${x0.toFixed(1)}px, ${y1.toFixed(1)}px)` },
    ], { ...timing, easing: "cubic-bezier(.3, .2, .8, .8)" });

    // Vaivén: una onda suave (muestreada en muchos puntos para que no haya
    // tirones) más un desvío gradual hacia el lado donde nació el globo.
    const away = Math.sign(x0 + size / 2 - w / 2) || 1;
    const amp = rand(10, 26);
    const cycles = rand(0.7, 1.4);
    const phase = rand(0, Math.PI * 2);
    const drift = away * rand(15, 90);
    const frames = Array.from({ length: 25 }, (_, k) => {
      const t = k / 24;
      const a = phase + t * cycles * Math.PI * 2;
      const x = amp * Math.sin(a) + drift * t * t * (3 - 2 * t);
      const r = -Math.cos(a) * amp * 0.35;
      return { transform: `translateX(${x.toFixed(1)}px) rotate(${r.toFixed(1)}deg)`, offset: t };
    });
    sway.animate(frames, { ...timing, easing: "linear" });

    return rise.finished.then(() => el.remove());
  });

  document.body.append(layer);
  Promise.all(rides).then(() => layer.remove());

  if (!cover) return Promise.resolve();

  // El cambio de sección coincide con el momento en que la mayoría de los
  // globos va por la mitad de la pantalla (≈1,7 s).
  veil.animate(
    [{ opacity: 0 }, { opacity: 0, offset: 0.44 }, { opacity: 1, offset: 0.64 }, { opacity: 1, offset: 0.76 }, { opacity: 0 }],
    { duration: 2500, fill: "forwards" },
  );
  setTimeout(() => onCovered?.(), 1700);
  return new Promise((resolve) => setTimeout(resolve, 2500));
}
