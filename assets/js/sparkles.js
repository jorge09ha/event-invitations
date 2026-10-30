// Estrellitas doradas que aparecen y desaparecen en lugares al azar de la
// pantalla. Cada una, al terminar su destello, salta a otro sitio, así que el
// cielo nunca se repite. Es solo decoración: no recibe toques ni clics.

const STAR = "M12,0C12.8,7.2 16.8,11.2 24,12C16.8,12.8 12.8,16.8 12,24C11.2,16.8 7.2,12.8 0,12C7.2,11.2 11.2,7.2 12,0Z";
const COLORS = ["var(--dorado)", "var(--dorado)", "#e9c98a", "var(--cafe-claro)"];

const rand = (a, b) => a + Math.random() * (b - a);

function place(el) {
  el.style.left = `${rand(2, 96).toFixed(1)}%`;
  el.style.top = `${rand(2, 94).toFixed(1)}%`;
  const size = rand(7, 18);
  el.style.width = el.style.height = `${size.toFixed(1)}px`;
  el.style.setProperty("--spin", `${Math.round(rand(-90, 90))}deg`);
}

/**
 * @param {HTMLElement} host contenedor (se llena entero)
 * @param {number} count cantidad de estrellitas visibles a la vez
 */
export function startSparkles(host, count = 22) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const sky = document.createElement("div");
  sky.className = "sky";
  sky.setAttribute("aria-hidden", "true");
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "sky-star";
    star.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR}" style="fill:${COLORS[i % COLORS.length]}"/></svg>`;
    star.style.animationDuration = `${rand(2.2, 4.2).toFixed(2)}s`;
    star.style.animationDelay = `${(-rand(0, 4)).toFixed(2)}s`;
    place(star);
    star.addEventListener("animationiteration", () => place(star));
    sky.append(star);
  }
  host.append(sky);
}
