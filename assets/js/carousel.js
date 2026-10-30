// Ilustración principal: carrusel giratorio con caballitos y arcos de fondo.
// Es un SVG en línea generado con código; los colores salen de las
// variables de base.css (--verde, --crema, --arena, --cafe, --dorado, --oliva…).
//
// El giro es un pseudo‑3D: cada caballito recorre una elipse alrededor de la
// columna central. startCarousel() calcula en cada cuadro su posición, tamaño
// (más grande adelante), hacia dónde mira, su sube‑y‑baja y si va delante o
// detrás de la columna.

import { HORSE_ART } from "./horse-art.js";

const mix = (color, pct, other) => `color-mix(in srgb, var(--${color}) ${pct}%, ${other})`;
const f = (n) => +n.toFixed(1);
const GOLD_EDGE = "#9c7a3a";

// Geometría del carrusel (coordenadas de la escena, 360 × 470).
const CX = 180;
const RIM = { y: 150, rx: 134, ry: 18 };      // borde inferior del techo (mismo ancho que la base)
const DECK = { y: 386, rx: 134, ry: 20 };     // plataforma
const ORBIT = 104;                            // radio de giro de los caballitos
const HORSES = 6;
const TURN_SECONDS = 18;                      // una vuelta completa

// --- Piezas reutilizables ---

function sparkle(x, y, s, i) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path class="cz-sparkle" style="--i:${i};fill:var(--dorado)"
    d="M0,-6Q.8,-.8 6,0Q.8,.8 0,6Q-.8,.8 -6,0Q-.8,-.8 0,-6Z"/></g>`;
}

const onEllipse = (e, a) => [e.rx * Math.cos(a) + CX, e.ry * Math.sin(a) + e.y];

// --- Caballito de carrusel (vectorizado de la referencia; ver horse-art.js) ---

// Las capas se colorean con variables CSS que pone cada caballito: --body,
// --mane (crin y cola), --pink (montura, banda y cascos) y --line (contorno).
const HORSE_DEF = `
  <g id="cz-horse" fill-rule="evenodd">
    <path d="${HORSE_ART.silhouette}" style="fill:var(--body)"/>
    <path d="${HORSE_ART.mane}" style="fill:var(--mane)"/>
    <path d="${HORSE_ART.pink}" style="fill:var(--pink)"/>
    <path d="${HORSE_ART.gold}" style="fill:var(--dorado)"/>
    <path d="${HORSE_ART.outline}" style="fill:var(--line)"/>
  </g>`;

// Tres crines que se alternan con la paleta.
const HORSE_LOOKS = ["var(--dorado)", "var(--verde)", "var(--cafe)"];
const HORSE_CENTER_Y = 310;

function rider(i) {
  return `<g class="cz-rider" style="--body:#fffdf8;--mane:${HORSE_LOOKS[i % HORSE_LOOKS.length]};--pink:var(--cafe-claro);--line:#5c4a3a">
    <line class="cz-pole" style="stroke:var(--dorado)" stroke-linecap="round"/>
    <g class="cz-steed"><use href="#cz-horse"/></g>
  </g>`;
}

// --- Techo: cono a rayas, corona de pétalos con luces y guirnaldas ---

// Techo bajo y del mismo ancho que la base, para que el carrusel se vea
// proporcionado (no un cono alto y empinado).
const APEX_Y = 86;
const ROOF_Y = 130;
const PETAL_H = 26;

function roof() {
  const L = CX - RIM.rx - 4;
  const R = CX + RIM.rx + 4;
  const dome = `M${CX},${APEX_Y}C${CX - 34},${APEX_Y + 5} ${L + 34},${ROOF_Y - 16} ${L},${ROOF_Y}L${R},${ROOF_Y}C${R - 34},${ROOF_Y - 16} ${CX + 34},${APEX_Y + 5} ${CX},${APEX_Y}Z`;
  const xs = Array.from({ length: 8 }, (_, k) => f(L + ((R - L) * k) / 7));
  const fills = ["var(--surface)", mix("arena", 70, "#fff"), "var(--surface)", mix("verde", 60, "#fff"),
    "var(--surface)", mix("arena", 70, "#fff"), "var(--surface)"];
  const ctrl = (x) => `${f(CX + (x - CX) * 0.62)},${f((APEX_Y + ROOF_Y) / 2 + 2)}`;
  const segments = fills.map((fill, i) =>
    `<path d="M${CX},${APEX_Y}Q${ctrl(xs[i])} ${xs[i]},${ROOF_Y}L${xs[i + 1]},${ROOF_Y}Q${ctrl(xs[i + 1])} ${CX},${APEX_Y}Z" style="fill:${fill}"/>`).join("");
  return `
    <clipPath id="cz-dome"><path d="${dome}"/></clipPath>
    <g clip-path="url(#cz-dome)">${segments}</g>
    <path d="${dome}" fill="none" style="stroke:var(--dorado)" stroke-width="2" stroke-linejoin="round"/>`;
}

function crown() {
  // Altura del borde trasero del techo en cada x (arco superior de la elipse).
  const base = (x) => RIM.y - RIM.ry * Math.sqrt(Math.max(0, 1 - ((x - CX) / RIM.rx) ** 2));
  const x0 = CX - RIM.rx;
  const petals = 8;
  const w = (RIM.rx * 2) / petals;
  let d = `M${x0},${RIM.y}L${x0},${f(base(x0) - 8)}`;
  const peaks = [];
  for (let i = 0; i < petals; i++) {
    const a = x0 + w * i;
    const b = a + w;
    const m = a + w / 2;
    const py = base(m) - PETAL_H;
    peaks.push([m, py]);
    d += `Q${f(a + 1)},${f(py + 6)} ${f(m)},${f(py)}Q${f(b - 1)},${f(py + 6)} ${f(b)},${f(base(b) - 8)}`;
  }
  d += `L${CX + RIM.rx},${RIM.y}A${RIM.rx},${RIM.ry} 0 0 0 ${x0},${RIM.y}Z`;

  const flames = peaks.map(([x, y], i) =>
    `<ellipse class="cz-flame" style="--i:${i}" cx="${f(x)}" cy="${f(y + 12)}" rx="3.6" ry="6"/>`).join("");
  const garlands = peaks.map(([x, y], i) =>
    `<path class="cz-garland" style="--i:${i}" d="M${CX},${APEX_Y + 2}Q${f((CX + x) / 2)},${f((APEX_Y + y) / 2 + 8)} ${f(x)},${f(y)}"/>`).join("");
  const tips = peaks.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="2.4"/>`).join("");

  return `
    <g class="cz-garlands" fill="none">${garlands}</g>
    <path d="${d}" fill="url(#cz-crown)" style="stroke:var(--dorado)" stroke-width="1.8" stroke-linejoin="round"/>
    <g class="cz-glow">${flames}</g>
    <g style="fill:var(--dorado)">${tips}</g>
    <path d="M${x0},${RIM.y}A${RIM.rx},${RIM.ry} 0 0 1 ${CX + RIM.rx},${RIM.y}" fill="none" style="stroke:var(--dorado)" stroke-width="3.5"/>`;
}

function rimBulbs(e, count, cls) {
  return Array.from({ length: count }, (_, k) => {
    const [x, y] = onEllipse(e, (Math.PI * 2 * k) / count);
    return `<circle class="${cls}" style="--i:${k}" cx="${f(x)}" cy="${f(y)}" r="2.4"/>`;
  }).join("");
}

// --- Plataforma: disco con una banda decorada que gira con el carrusel ---

// La onda y los puntos de la banda se calculan en cada cuadro sobre la curva
// del cilindro (ver bandWave), así siguen la forma redonda de la base.
const BAND = { top: DECK.y, height: 22, waves: 26, amp: 4 };

function bandWave(turn) {
  const { rx, ry } = DECK;
  const mid = BAND.top + BAND.height * 0.6;
  // Coordenada propia de la banda: gira junto con los caballitos.
  const at = (a) => {
    const phi = a - turn;
    return [CX + rx * Math.sin(a), mid + ry * Math.cos(a) + BAND.amp * Math.sin(BAND.waves * phi)];
  };
  const steps = 120;
  let d = "";
  for (let k = 0; k <= steps; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / steps;
    const [x, y] = at(a);
    d += `${k ? "L" : "M"}${f(x)},${f(y)}`;
  }
  // Un punto dorado sobre cada cresta de la onda, solo en la cara visible.
  const dots = [];
  for (let m = 0; m < BAND.waves; m++) {
    const a = turn + (Math.PI * 2 * m) / BAND.waves - Math.PI / (2 * BAND.waves);
    const wrapped = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.cos(wrapped) < 0.05) continue;
    const x = CX + rx * Math.sin(wrapped);
    const y = BAND.top + BAND.height * 0.25 + ry * Math.cos(wrapped);
    dots.push([x, y, 0.8 + 0.9 * Math.cos(wrapped)]);
  }
  return { d, dots };
}

function deck() {
  const { y, rx, ry } = DECK;
  const L = CX - rx;
  const R = CX + rx;
  const h = BAND.height;
  const band = `M${L},${y}V${y + h}A${rx},${ry} 0 0 0 ${R},${y + h}V${y}A${rx},${ry} 0 0 1 ${L},${y}Z`;
  return `
    <ellipse cx="${CX}" cy="${y + 40}" rx="${rx + 34}" ry="${ry + 8}" style="fill:${mix("arena", 40, "var(--crema)")}"/>
    <clipPath id="cz-band"><path d="${band}"/></clipPath>
    <path d="${band}" fill="url(#cz-band-fill)"/>
    <g clip-path="url(#cz-band)">
      <path class="cz-band-wave" fill="none" style="stroke:var(--surface)" stroke-width="2.4" stroke-linejoin="round"/>
      <g class="cz-band-dots" style="fill:var(--dorado)"></g>
    </g>
    <path d="M${L},${y + 22}A${rx},${ry} 0 0 0 ${R},${y + 22}" fill="none" style="stroke:var(--dorado)" stroke-width="2"/>
    <ellipse cx="${CX}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#cz-deck-top)" style="stroke:var(--dorado)" stroke-width="2"/>
    <g class="cz-glow">${rimBulbs({ y, rx: rx - 4, ry: ry - 1 }, 32, "cz-bulb")}</g>`;
}

function column() {
  return `
    <rect x="166" y="${RIM.y + 4}" width="28" height="${DECK.y - RIM.y - 4}" fill="url(#cz-column)"/>
    <rect x="163" y="${RIM.y + 6}" width="34" height="8" rx="3" fill="url(#cz-gold-h)"/>
    <rect x="163" y="${DECK.y - 12}" width="34" height="8" rx="3" fill="url(#cz-gold-h)"/>
    <ellipse cx="180" cy="${(RIM.y + DECK.y) / 2}" rx="8" ry="16" style="fill:var(--surface);stroke:var(--dorado)" stroke-width="2"/>
    <path d="M180,${(RIM.y + DECK.y) / 2 + 5}c-6,-5 -4,-11 0,-8c4,-3 6,3 0,8z" style="fill:var(--dorado)"/>`;
}

function flowers() {
  const y0 = DECK.y + 2;
  const roses = [[160, y0, 7, "cafe-claro"], [171, y0 - 6, 8, "surface"], [186, y0 - 5, 7.5, "cafe-claro"], [199, y0 + 1, 8, "surface"],
    [168, y0 + 6, 6, "surface"], [191, y0 + 7, 6, "cafe-claro"], [180, y0 + 2, 7, "surface"]];
  const leaves = [[150, y0 + 4, -35], [210, y0 + 4, 35], [158, y0 - 7, -60], [203, y0 - 6, 60]];
  const ink = (c) => (c === "surface" ? "var(--arena)" : "var(--cafe)");
  return leaves.map(([x, y, a]) =>
    `<ellipse cx="${x}" cy="${y}" rx="8" ry="3.6" transform="rotate(${a} ${x} ${y})" style="fill:var(--verde);stroke:var(--oliva)" stroke-width="1"/>`).join("")
    + roses.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--${c});stroke:${ink(c)}" stroke-width="1"/>
      <path d="M${f(x - r * 0.45)},${y}C${f(x - r * 0.45)},${f(y - r * 0.5)} ${f(x + r * 0.45)},${f(y - r * 0.5)} ${f(x + r * 0.45)},${y}C${f(x + r * 0.45)},${f(y + r * 0.3)} ${x},${f(y + r * 0.3)} ${x},${y}"
        fill="none" style="stroke:${ink(c)}" stroke-width="1.1"/>`).join("");
}


export function carouselSVG() {
  const goldStops = `<stop offset="0" style="stop-color:${mix("dorado", 45, "#fff")}"/>
    <stop offset=".5" style="stop-color:var(--dorado)"/><stop offset="1" style="stop-color:${mix("dorado", 75, "#000")}"/>`;

  return `<svg class="carousel" viewBox="0 0 360 470" role="img" aria-label="Carrusel girando con caballitos">
  <defs>
    <linearGradient id="cz-gold-v" x1="0" y1="0" x2="0" y2="1">${goldStops}</linearGradient>
    <linearGradient id="cz-gold-h" x1="0" y1="0" x2="1" y2="0">${goldStops}</linearGradient>
    <radialGradient id="cz-gold-r" cx="35%" cy="30%" r="80%">${goldStops}</radialGradient>
    <linearGradient id="cz-crown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:${mix("arena", 45, "#fff")}"/><stop offset="1" style="stop-color:var(--arena)"/>
    </linearGradient>
    <radialGradient id="cz-under" cx="50%" cy="40%" r="60%">
      <stop offset="0" style="stop-color:${mix("cafe-claro", 55, "#fff")}"/><stop offset="1" style="stop-color:var(--cafe)"/>
    </radialGradient>
    <linearGradient id="cz-column" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--cafe-claro)"/><stop offset=".45" style="stop-color:${mix("arena", 45, "#fff")}"/>
      <stop offset="1" style="stop-color:var(--cafe-claro)"/>
    </linearGradient>
    <linearGradient id="cz-band-fill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--cafe)"/><stop offset=".5" style="stop-color:var(--cafe-claro)"/>
      <stop offset="1" style="stop-color:var(--cafe)"/>
    </linearGradient>
    <radialGradient id="cz-deck-top" cx="50%" cy="45%" r="60%">
      <stop offset="0" style="stop-color:var(--surface)"/><stop offset="1" style="stop-color:${mix("arena", 60, "#fff")}"/>
    </radialGradient>
    <filter id="cz-glow-f" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${HORSE_DEF}
  </defs>

  <g style="fill:${mix("arena", 55, "#fff")}">
    <path d="M14,440V213A53,53 0 0 1 120,213V440Z"/>
    <path d="M240,440V213A53,53 0 0 1 346,213V440Z"/>
  </g>
  <path d="M86,440V168A94,94 0 0 1 274,168V440Z" style="fill:${mix("verde", 50, "#fff")}"/>

  ${sparkle(30, 120, 1, 0)}${sparkle(334, 100, 0.8, 1)}${sparkle(40, 236, 0.7, 2)}${sparkle(322, 246, 0.8, 3)}

  ${deck()}

  <ellipse cx="${CX}" cy="${RIM.y}" rx="${RIM.rx}" ry="${RIM.ry}" fill="url(#cz-under)"/>
  <g class="cz-back"></g>
  ${column()}
  ${flowers()}
  <g class="cz-front">${Array.from({ length: HORSES }, (_, i) => rider(i)).join("")}</g>

  ${roof()}
  ${crown()}
  <g class="cz-glow">${rimBulbs(RIM, 30, "cz-bulb")}</g>
  <path d="M180,58L183.5,74H176.5Z" fill="url(#cz-gold-r)"/>
  <circle cx="180" cy="78" r="6" fill="url(#cz-gold-r)" stroke="${GOLD_EDGE}" stroke-width="1"/>
  <circle class="cz-flame cz-glow" cx="180" cy="56" r="2.8"/>

</svg>`;
}

/**
 * Pone a girar el carrusel. Devuelve una función para detenerlo.
 * @param {SVGSVGElement} svg
 */
export function startCarousel(svg) {
  const riders = [...svg.querySelectorAll(".cz-rider")];
  const back = svg.querySelector(".cz-back");
  const front = svg.querySelector(".cz-front");
  const wave = svg.querySelector(".cz-band-wave");
  const dotLayer = svg.querySelector(".cz-band-dots");
  const n = riders.length;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let raf = 0;

  function place(t) {
    // Los caballitos de adelante avanzan de izquierda a derecha, hacia donde
    // miran (el dibujo se voltea abajo con la escala negativa en x).
    const turn = (t / TURN_SECONDS) * Math.PI * 2;

    const band = bandWave(turn);
    wave.setAttribute("d", band.d);
    dotLayer.innerHTML = band.dots.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`).join("");

    const state = riders.map((g, i) => {
      const a = turn + (i * Math.PI * 2) / n;
      const z = Math.cos(a);                 // 1 = adelante, -1 = atrás
      const x = CX + ORBIT * Math.sin(a);
      const depth = (z + 1) / 2;
      const s = 0.21 * (0.74 + 0.26 * depth);
      // Cada caballito mira hacia donde avanza: adelante a la derecha y atrás a
      // la izquierda (se ve su otro costado). Al pasar por los lados se
      // angostan hasta voltearse, como al girar de verdad (el dibujo mira a la
      // derecha).
      const sx = Math.sign(z || 1) * Math.max(0.14, Math.abs(z));
      const bob = reduced ? 0 : 11 * Math.sin((t * Math.PI * 2) / 2.6 + i * 1.9);
      const y = 280 + 12 * z + bob;

      const pole = g.firstElementChild;
      pole.setAttribute("x1", f(x));
      pole.setAttribute("x2", f(x));
      pole.setAttribute("y1", f(RIM.y + RIM.ry * 0.8 * z));
      pole.setAttribute("y2", f(DECK.y + DECK.ry * 0.78 * z));
      pole.setAttribute("stroke-width", f(2 + 1.4 * depth));
      g.lastElementChild.setAttribute("transform",
        `translate(${f(x)} ${f(y)}) scale(${(sx * s).toFixed(3)} ${s.toFixed(3)}) translate(${-HORSE_ART.pole} ${-HORSE_CENTER_Y})`);
      g.style.opacity = (0.72 + 0.28 * depth).toFixed(2);
      return { g, z };
    });

    // Los de atrás van detrás de la columna; dentro de cada grupo, el más
    // cercano se dibuja al final.
    for (const [layer, list] of [[back, state.filter((r) => r.z < 0)], [front, state.filter((r) => r.z >= 0)]]) {
      list.sort((p, q) => p.z - q.z);
      const current = [...layer.children];
      if (list.some((r, k) => current[k] !== r.g) || current.length !== list.length) {
        list.forEach((r) => layer.append(r.g));
      }
    }
  }

  function frame(now) {
    if (!svg.isConnected) return;
    if (svg.getClientRects().length) place((now - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }

  place(reduced ? 1.2 : 0);
  if (!reduced) raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
