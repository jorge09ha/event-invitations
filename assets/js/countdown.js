// Contador hasta el gran día, con el mismo diseño en todas las páginas.

import { $, $$ } from "./util.js";

// Por defecto va fijo arriba; "countdown-inline" lo deja en el flujo de la página.
export const countdown = (extra = "") => `
  <div class="countdown ${extra}" role="timer" aria-label="Tiempo para el gran día" hidden>
    <span><b data-cd="d">00</b><small>días</small></span>
    <span><b data-cd="h">00</b><small>hrs</small></span>
    <span><b data-cd="m">00</b><small>min</small></span>
    <span><b data-cd="s">00</b><small>seg</small></span>
    <p class="countdown-today" hidden>¡Hoy es el gran día!</p>
  </div>`;

// Usa la hora del servidor (data.serverNow), no la del teléfono.
export function startCountdown(data, target, boxes = $$(".countdown")) {
  if (!target) return;
  const pad = (n) => String(n).padStart(2, "0");
  boxes.forEach((box) => { box.hidden = false; });
  function tick() {
    const left = Math.max(0, target - data.serverNow());
    const s = Math.floor(left / 1000);
    const values = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    for (const box of boxes) {
      box.classList.toggle("today", !left);
      $(".countdown-today", box).hidden = Boolean(left);
      $$("[data-cd]", box).forEach((el) => { el.textContent = pad(values[el.dataset.cd]); });
    }
    if (left) setTimeout(tick, 1000 - (data.serverNow() % 1000));
  }
  tick();
}
