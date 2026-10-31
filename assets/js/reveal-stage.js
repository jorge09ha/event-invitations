// Pantalla de revelación para proyectar, al estilo de los juegos en vivo:
// apertura automática con latido, ultrasonido y agradecimiento → sala con los
// nombres que van llegando (sin mostrar su voto) → cuenta regresiva → barras
// que suben, nombres por opción y confeti. Sigue en tiempo real.

import { $, plural } from "./util.js";
import { balloonWave } from "./balloons.js";
import { confetti, percentages, tally, winnerOf } from "./portal.js";

const LABEL = { nino: "Niño", nina: "Niña" };
const BAR_MS = 2600;
const COUNTDOWN_FROM = 3;
const MAX_FLOATERS = 40;
const ORBIT_MS = 36000; // una vuelta completa de los nombres
const EXPAND_MS = 1800; // del centro a su lugar en la órbita
const GOLDEN_ANGLE = 2.39996; // reparte los nombres parejo, aunque lleguen más
const STEP_MS = { 0: 7000, 1: 7000, 2: 7000 }; // duración de cada paso de la apertura
const SOUND_FADE_IN_MS = 7000;
const SOUND_FADE_OUT_MS = 1200;

// Línea de latido: se repite a lo ancho y se desplaza con CSS.
const ECG_BEAT = "h34l6,-6 6,6h10l5,10 8,-46 8,50 5,-14h12l8,-8 8,8h30";
const ECG = `<svg class="stage-ecg" viewBox="0 0 700 80" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0,50${ECG_BEAT.repeat(6)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`;

const toolIcon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const TEMPLATE = `
  <div class="stage-tools">
    <button type="button" class="stage-tool stage-sound" aria-pressed="false" aria-label="Activar el sonido" title="Activar el sonido">${toolIcon('<path d="M4 9v6h4l5 4V5L8 9z"/><path class="stage-sound-on" d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/><path class="stage-sound-off" d="M17 10l4 4M21 10l-4 4"/>')}</button>
    <button type="button" class="stage-tool stage-fullscreen" aria-label="Pantalla completa" title="Pantalla completa">${toolIcon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>
    <button type="button" class="stage-tool stage-close" aria-label="Cerrar" title="Cerrar">${toolIcon('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
  </div>

  <section class="stage-opening" data-step="0">
    <canvas class="stage-static" width="320" height="180" aria-hidden="true"></canvas>
    <ul class="stage-floaters" aria-hidden="true"></ul>
    <h1 class="stage-intro"></h1>
    <div class="stage-scan" hidden><img class="stage-image" alt="Ultrasonido del bebé"><i class="stage-scan-line"></i></div>
    <p class="stage-thanks" hidden></p>
    <p class="stage-names-thanks" hidden></p>
    ${ECG}
    <button type="button" class="stage-btn stage-next" hidden>Ver quiénes votaron</button>
  </section>

  <section class="stage-lobby" hidden>
    <h1 class="stage-title"></h1>
    <p class="stage-count"><b></b><span></span></p>
    <ul class="stage-chips"></ul>
    <button type="button" class="stage-btn stage-go">Revelar resultados</button>
  </section>

  <section class="stage-countdown" hidden aria-live="assertive"><span></span></section>

  <section class="stage-results" hidden aria-live="polite">
    <h2 class="stage-winner"></h2>
    <div class="stage-columns">
      <div class="stage-col nino" data-choice="nino">
        <div class="stage-track"><div class="stage-bar"><b class="stage-n">0</b></div></div>
        <h3>Niño</h3>
        <p class="stage-pct"></p>
        <ul class="stage-names"></ul>
      </div>
      <div class="stage-col nina" data-choice="nina">
        <div class="stage-track"><div class="stage-bar"><b class="stage-n">0</b></div></div>
        <h3>Niña</h3>
        <p class="stage-pct"></p>
        <ul class="stage-names"></ul>
      </div>
    </div>
  </section>

  <canvas class="confetti" aria-hidden="true"></canvas>
`;

const voteId = (v) => v.nameKey || v.name;
const byArrival = (a, b) => (a.ts || 0) - (b.ts || 0);

// Agrega al final solo los nombres nuevos (ellos traen la animación) y quita
// los que ya no estén, sin volver a dibujar los demás.
function syncNames(list, votes, items, delayFor) {
  const ids = new Set(votes.map(voteId));
  for (const [id, li] of items) {
    if (!ids.has(id)) {
      li.remove();
      items.delete(id);
    }
  }
  [...votes].sort(byArrival).forEach((vote) => {
    const id = voteId(vote);
    if (items.has(id)) return;
    const li = document.createElement("li");
    li.textContent = vote.name;
    if (delayFor) li.style.animationDelay = `${delayFor(items.size)}ms`;
    items.set(id, li);
    list.append(li);
  });
}

// Estática de monitor: ruido gris en baja resolución. Devuelve cómo detenerla.
function startStatic(canvas, reduced) {
  const ctx = canvas.getContext("2d");
  const frame = ctx.createImageData(canvas.width, canvas.height);
  const draw = () => {
    for (let i = 0; i < frame.data.length; i += 4) {
      const v = Math.random() * 255;
      frame.data[i] = frame.data[i + 1] = frame.data[i + 2] = v;
      frame.data[i + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
  };
  draw();
  if (reduced) return () => {};
  const id = setInterval(draw, 80);
  return () => clearInterval(id);
}

// Latido sintetizado (no hay archivo de audio) cuyo volumen sube poco a poco.
// Devuelve cómo apagarlo, también de forma gradual. El navegador lo permite
// porque la pantalla se abre con un clic.
function startHeartbeat(fadeInMs) {
  const ctx = new AudioContext();
  ctx.resume();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeInMs / 1000);
  master.connect(ctx.destination);

  const thump = (at, volume) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(70, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.14);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + 0.18);
  };
  const beat = () => {
    thump(ctx.currentTime + 0.02, 0.9);
    thump(ctx.currentTime + 0.26, 0.6);
  };
  beat();
  const id = setInterval(beat, 1000);
  return () => {
    clearInterval(id);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + SOUND_FADE_OUT_MS / 1000);
    setTimeout(() => ctx.close(), SOUND_FADE_OUT_MS + 100);
  };
}

// subscribe(fn) avisa de cada cambio en los votos y devuelve cómo dejar de escuchar.
// image es opcional; sin ella, la apertura pasa directo al agradecimiento.
export function openRevealStage({ title, intro, thanks, namesThanks, image, votes, subscribe }) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div");
  root.className = "stage";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Revelación en vivo");
  root.innerHTML = TEMPLATE;
  document.body.append(root);
  document.body.classList.add("no-scroll");

  const lobby = $(".stage-lobby", root);
  const countdown = $(".stage-countdown", root);
  const results = $(".stage-results", root);
  const columns = ["nino", "nina"].map((choice) => ({
    choice,
    el: $(`[data-choice="${choice}"]`, root),
    items: new Map(),
  }));

  let current = votes;
  let phase = "opening";
  const chips = new Map();
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  $(".stage-title", root).textContent = title;

  // --- Apertura: avanza sola hasta el botón «Ver quiénes votaron» ---
  const opening = $(".stage-opening", root);
  const steps = image ? [0, 1, 2, 3] : [0, 2, 3];
  let stepIndex = 0;
  let stopStatic = startStatic($(".stage-static", root), reduced);
  let stopSound = null;
  const sound = $(".stage-sound", root);

  function setSound(on, fadeInMs = 1000) {
    stopSound?.();
    stopSound = null;
    if (on) {
      try {
        stopSound = startHeartbeat(fadeInMs);
      } catch (err) {
        console.error(err); // sin audio, la apertura sigue igual
      }
    }
    on = Boolean(stopSound);
    const label = on ? "Apagar el sonido" : "Activar el sonido";
    sound.setAttribute("aria-label", label);
    sound.title = label;
    sound.setAttribute("aria-pressed", String(on));
  }
  sound.addEventListener("click", () => setSound(!stopSound));

  // Nombres que salen del centro, se expanden y giran en óvalo alrededor de la
  // imagen. Los votos que lleguen después se suman a la órbita.
  const orbiters = new Map();
  let orbitFrame = null;

  function addOrbiters() {
    const list = $(".stage-floaters", root);
    const firstBatch = !orbiters.size;
    for (const vote of current.slice(0, MAX_FLOATERS)) {
      if (orbiters.has(voteId(vote))) continue;
      const i = orbiters.size;
      const li = document.createElement("li");
      li.textContent = vote.name;
      list.append(li);
      orbiters.set(voteId(vote), {
        li,
        angle: i * GOLDEN_ANGLE,
        ring: i % 2 ? 0.8 : 1, // dos carriles, para que no se amontonen
        born: performance.now() + (firstBatch ? i * 60 : 0),
        halfW: li.offsetWidth / 2,
        halfH: li.offsetHeight / 2,
      });
    }
  }

  function moveOrbiters(t) {
    const spin = reduced ? 0 : (t / ORBIT_MS) * Math.PI * 2;
    const halfW = opening.clientWidth / 2;
    const halfH = opening.clientHeight / 2;
    for (const o of orbiters.values()) {
      const k = reduced ? 1 : Math.min(1, Math.max(0, (t - o.born) / EXPAND_MS));
      const out = (1 - (1 - k) ** 3) * o.ring;
      const x = Math.cos(o.angle + spin) * (halfW - o.halfW - 6) * out;
      const y = Math.sin(o.angle + spin) * (halfH - o.halfH - 6) * out;
      o.li.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      o.li.style.opacity = String(Math.min(1, k * 4));
    }
    orbitFrame = requestAnimationFrame(moveOrbiters);
  }

  function startOrbit() {
    if (orbitFrame !== null) return;
    addOrbiters();
    orbitFrame = requestAnimationFrame(moveOrbiters);
  }

  function stopOrbit() {
    if (orbitFrame !== null) cancelAnimationFrame(orbitFrame);
    orbitFrame = null;
  }

  function showStep(step) {
    opening.dataset.step = step;
    $(".stage-intro", root).hidden = step > 0;
    if (step >= 1 && image) $(".stage-scan", root).hidden = false;
    $(".stage-thanks", root).hidden = step < 2;
    $(".stage-names-thanks", root).hidden = step < 3;
    if (step >= 2) {
      stopStatic?.();
      stopStatic = null;
    }
    // Salen junto con la imagen; sin imagen, junto con el agradecimiento.
    if (step >= 1) startOrbit();
    root.scrollTop = 0;
  }

  function leaveOpening() {
    stopStatic?.();
    stopStatic = null;
    stopOrbit();
    setSound(false);
    opening.hidden = true;
    sound.hidden = true;
    lobby.hidden = false;
    phase = "lobby";
    renderLobby();
    $(".stage-go", root).focus();
  }

  function runStep() {
    const step = steps[stepIndex];
    showStep(step);
    if (stepIndex < steps.length - 1) {
      later(() => {
        stepIndex++;
        runStep();
      }, STEP_MS[step]);
      return;
    }
    const next = $(".stage-next", root);
    next.hidden = false;
    next.focus();
  }

  $(".stage-next", root).addEventListener("click", () => {
    if (phase !== "opening") return;
    phase = "leaving";
    balloonWave({ parent: root, onCovered: () => { if (phase === "leaving") leaveOpening(); } });
  });

  if (image) $(".stage-image", root).src = image;
  $(".stage-intro", root).textContent = intro;
  $(".stage-thanks", root).textContent = thanks;
  $(".stage-names-thanks", root).textContent = namesThanks;

  function renderLobby() {
    const n = current.length;
    $(".stage-count b", root).textContent = n;
    $(".stage-count span", root).textContent = n === 1 ? "persona ha votado" : "personas han votado";
    syncNames($(".stage-chips", root), current, chips);
  }

  function countUp(el, target) {
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / BAR_MS);
      el.textContent = Math.round(target * (1 - (1 - k) ** 3));
      if (k < 1 && phase !== "closed") requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setWinner() {
    const { total } = tally(current);
    const winner = winnerOf(current);
    $(".stage-winner", root).textContent = !total
      ? "No se registraron votos"
      : winner === "empate"
        ? "¡Empate!"
        : `¡La mayoría votó ${LABEL[winner].toLowerCase()}!`;
    results.dataset.winner = winner;
    return winner;
  }

  // Sin animate, actualiza al instante lo que cambió después de revelar.
  function renderBars(animate) {
    const counts = tally(current);
    const top = Math.max(counts.nino.length, counts.nina.length, 1);
    const [pNino, pNina] = percentages(counts.nino.length, counts.nina.length);
    const pct = { nino: pNino, nina: pNina };
    for (const { choice, el } of columns) {
      const n = counts[choice].length;
      $(".stage-bar", el).style.height = `${(n / top) * 100}%`;
      $(".stage-pct", el).textContent = `${pct[choice]}% · ${plural(n, "voto", "votos")}`;
      if (animate) countUp($(".stage-n", el), n);
      else $(".stage-n", el).textContent = n;
    }
  }

  function renderNames(delayFor) {
    const counts = tally(current);
    for (const { choice, el, items } of columns) {
      syncNames($(".stage-names", el), counts[choice], items, delayFor);
    }
  }

  function showResults() {
    countdown.hidden = true;
    results.hidden = false;
    phase = "bars";
    root.scrollTop = 0;

    // Las barras parten de cero; el siguiente cuadro dispara la transición.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      renderBars(!reduced);
      later(() => {
        phase = "results";
        const winner = setWinner();
        results.classList.add("revealed");
        // Mismo orden de llegada; una lista larga no debe tardar demasiado.
        const gap = Math.min(90, 3000 / Math.max(current.length, 1));
        renderNames((i) => i * gap);
        renderBars(false);
        if (!reduced) confetti($(".confetti", root), winner);
        balloonWave({ cover: false, parent: root });
      }, reduced ? 0 : BAR_MS + 200);
    }));
  }

  function startCountdown() {
    lobby.hidden = true;
    if (reduced) return showResults();
    phase = "countdown";
    countdown.hidden = false;
    const number = $("span", countdown);
    const tick = (n) => {
      if (!n) return showResults();
      number.textContent = n;
      // Reinicia la animación de cada número.
      number.classList.remove("pop");
      void number.offsetWidth;
      number.classList.add("pop");
      later(() => tick(n - 1), 1000);
    };
    tick(COUNTDOWN_FROM);
  }

  function update(next) {
    current = next;
    if (orbitFrame !== null) addOrbiters();
    if (phase === "lobby") renderLobby();
    if (phase === "results") {
      setWinner();
      renderBars(false);
      renderNames();
    }
  }

  const unsubscribe = subscribe(update);

  function close() {
    phase = "closed";
    unsubscribe();
    stopStatic?.();
    stopSound?.();
    stopOrbit();
    timers.forEach(clearTimeout);
    removeEventListener("keydown", onKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.body.classList.remove("no-scroll");
    root.remove();
  }

  function onKey(e) {
    if (e.key === "Escape" && !document.fullscreenElement) close();
  }
  addEventListener("keydown", onKey);

  const go = $(".stage-go", root);
  go.addEventListener("click", () => {
    go.disabled = true;
    balloonWave({ parent: root, onCovered: () => { if (phase !== "closed") startCountdown(); } });
  });
  $(".stage-close", root).addEventListener("click", close);

  const fullscreen = $(".stage-fullscreen", root);
  fullscreen.hidden = !root.requestFullscreen;
  fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else root.requestFullscreen().catch(() => {});
  });

  // El foco sale del botón del panel, para que la barra espaciadora no vuelva a abrir.
  root.tabIndex = -1;
  root.focus();
  setSound(true, SOUND_FADE_IN_MS);
  runStep();
}
