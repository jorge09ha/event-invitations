// Pantalla del portal: cuenta regresiva, apertura animada, resultados y confeti.

import { $, plural } from "./util.js";

const LABEL = { nino: "Niño", nina: "Niña" };

const TEMPLATE = `
  <div class="portal-stage">
    <p class="portal-caption">El portal se abre en</p>
    <div class="portal-ring">
      <div class="portal-core"><span class="portal-count"></span></div>
    </div>
    <p class="portal-hint">Mantenga esta pantalla abierta</p>
  </div>
  <div class="portal-flash"></div>
  <section class="results" aria-live="polite">
    <p class="results-kicker">Resultados de la votación</p>
    <h2 class="results-winner"></h2>
    <div class="score">
      <div class="side nino"><span class="pct">0%</span><span class="label">Niño</span><span class="n"></span></div>
      <div class="side nina"><span class="pct">0%</span><span class="label">Niña</span><span class="n"></span></div>
    </div>
    <div class="bar"><span class="bar-nino"></span><span class="bar-nina"></span></div>
    <div class="names">
      <div class="names-col nino"><h3>Votaron niño</h3><ul></ul></div>
      <div class="names-col nina"><h3>Votaron niña</h3><ul></ul></div>
    </div>
    <button type="button" class="btn btn-ghost results-close">Volver a la invitación</button>
  </section>
  <canvas class="confetti" aria-hidden="true"></canvas>
`;

export function createPortal({ onClose }) {
  const root = document.createElement("div");
  root.className = "portal";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Revelación");
  root.innerHTML = TEMPLATE;
  document.body.append(root);

  const count = $(".portal-count", root);
  const results = $(".results", root);
  $(".results-close", root).addEventListener("click", () => {
    root.hidden = true;
    document.body.classList.remove("no-scroll");
    onClose?.();
  });

  let opened = false;
  let lastShown = null;

  function show() {
    root.hidden = false;
    document.body.classList.add("no-scroll");
  }

  return {
    get isOpen() { return opened; },
    get isVisible() { return !root.hidden; },

    // Muestra el portal en modo cuenta regresiva.
    countdown(seconds) {
      show();
      if (seconds === lastShown) return;
      lastShown = seconds;
      count.textContent = String(Math.max(0, seconds));
      // Reinicia la animación de pulso en cada segundo.
      count.classList.remove("tick");
      void count.offsetWidth;
      count.classList.add("tick");
      root.classList.toggle("final", seconds <= 3);
    },

    // Abre el portal (animación) y muestra los resultados.
    open(votes) {
      show();
      if (opened) return this.update(votes);
      opened = true;
      count.textContent = "0";
      root.classList.add("opening");
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => {
        root.classList.add("opened");
        renderResults(results, votes, true);
        const winner = winnerOf(votes);
        if (!reduced) confetti($(".confetti", root), winner);
      }, reduced ? 0 : 1400);
    },

    update(votes) {
      if (opened && root.classList.contains("opened")) renderResults(results, votes, false);
    },

    reopen() {
      show();
    },
  };
}

function tally(votes) {
  const nino = votes.filter((v) => v.choice === "nino");
  const nina = votes.filter((v) => v.choice === "nina");
  return { nino, nina, total: nino.length + nina.length };
}

function winnerOf(votes) {
  const { nino, nina } = tally(votes);
  if (nino.length === nina.length) return "empate";
  return nino.length > nina.length ? "nino" : "nina";
}

function percentages(a, b) {
  const total = a + b;
  if (!total) return [0, 0];
  const pa = Math.round((a / total) * 100);
  return [pa, 100 - pa];
}

function renderResults(root, votes, animate) {
  const { nino, nina, total } = tally(votes);
  const [pNino, pNina] = percentages(nino.length, nina.length);
  const winner = winnerOf(votes);

  $(".results-winner", root).textContent = !total
    ? "No se registraron votos"
    : winner === "empate"
      ? "¡Empate!"
      : `La mayoría votó ${LABEL[winner].toLowerCase()}`;
  root.dataset.winner = winner;

  setSide($(".side.nino", root), pNino, nino.length, animate);
  setSide($(".side.nina", root), pNina, nina.length, animate);
  $(".bar-nino", root).style.width = `${total ? pNino : 50}%`;
  $(".bar-nina", root).style.width = `${total ? pNina : 50}%`;

  fillNames($(".names-col.nino ul", root), nino);
  fillNames($(".names-col.nina ul", root), nina);
}

function setSide(el, pct, n, animate) {
  $(".n", el).textContent = plural(n, "voto", "votos");
  const pctEl = $(".pct", el);
  if (!animate) {
    pctEl.textContent = `${pct}%`;
    return;
  }
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / 1200);
    pctEl.textContent = `${Math.round(pct * (1 - (1 - k) ** 3))}%`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function fillNames(ul, votes) {
  const sorted = [...votes].sort((a, b) => a.name.localeCompare(b.name, "es"));
  ul.replaceChildren(...sorted.map((v) => {
    const li = document.createElement("li");
    li.textContent = v.name;
    return li;
  }));
  if (!sorted.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nadie";
    ul.append(li);
  }
}

function confetti(canvas, winner) {
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const [nino, nina, dorado, crema] = ["--nino", "--nina", "--dorado", "--crema"].map(color);
  const colors = winner === "nino" ? [nino, nino, nino, dorado, crema]
    : winner === "nina" ? [nina, nina, nina, dorado, crema]
      : [nino, nina, dorado, crema];

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  resize();
  addEventListener("resize", resize);

  const W = () => canvas.width;
  const H = () => canvas.height;
  const pieces = Array.from({ length: 180 }, () => ({
    x: W() / 2 + (Math.random() - 0.5) * W() * 0.2,
    y: H() * 0.45,
    vx: (Math.random() - 0.5) * 18 * dpr,
    vy: (-Math.random() * 18 - 6) * dpr,
    w: (6 + Math.random() * 6) * dpr,
    h: (8 + Math.random() * 10) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const end = performance.now() + 5000;
  const frame = (t) => {
    ctx.clearRect(0, 0, W(), H());
    for (const p of pieces) {
      p.vy += 0.45 * dpr;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    }
    if (t < end) requestAnimationFrame(frame);
    else {
      ctx.clearRect(0, 0, W(), H());
      removeEventListener("resize", resize);
    }
  };
  requestAnimationFrame(frame);
}
