// Invitación completa: secciones a pantalla completa que se recorren con los
// botones de subir y bajar (o deslizando). Entre una y otra pasa una ola de
// globos que tapa la vista mientras se carga la siguiente.

import { $, $$, busy, cleanName, normalizeCode, safeUrl, store } from "./util.js";
import { carouselSVG, startCarousel } from "./carousel.js";
import { balloonWave } from "./balloons.js";
import { HORSE_ART } from "./horse-art.js";
import { startSparkles } from "./sparkles.js";

// Textos por defecto; cada evento los reemplaza con "texts" en su config.js.
const DEFAULT_TEXTS = {
  kicker: "¡Una dulce sorpresa está por llegar!",
  title: "¿Niño o niña?",
  subtitle: "",
  cta: "",
  welcome: "",
  teaser: "",
  detailsTitle: "Detalles del evento",
  rsvp: "",
  farewell: "",
  farewellClosing: "",
};

const ICONS = {
  date: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  place: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  dress: '<path d="M9 3h6l-1.5 5L18 21H6l4.5-13z"/><path d="M9.5 8h5"/>',
  notes: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

// Adorno de las secciones de texto: el caballito del carrusel con estrellitas.
// El dibujo se define una sola vez (HORSE_DEFS) y cada adorno lo reutiliza.
const HORSE_DEFS = `<svg class="defs-only" width="0" height="0" aria-hidden="true"><defs>
  <g id="orn-horse" fill-rule="evenodd">
    <path d="${HORSE_ART.silhouette}" fill="#fffdf8"/>
    <path d="${HORSE_ART.mane}" style="fill:var(--dorado)"/>
    <path d="${HORSE_ART.pink}" style="fill:var(--cafe-claro)"/>
    <path d="${HORSE_ART.gold}" style="fill:var(--dorado)"/>
    <path d="${HORSE_ART.outline}" fill="#5c4a3a"/>
  </g>
</defs></svg>`;

const ORNAMENT = `<svg class="ornament" viewBox="0 0 140 76" aria-hidden="true">
  <g transform="translate(36 -6) scale(.12)"><g class="orn-bob"><use href="#orn-horse"/></g></g>
  <path d="M120,14l2.4,5 5.4.6-4,3.7 1.1,5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" style="fill:var(--dorado)"/>
  <path d="M18,40l1.8,3.7 4,.4-3,2.8.8,4-3.6-2-3.6,2 .8-4-3-2.8 4-.4z" style="fill:var(--dorado)" opacity=".85"/>
  <path d="M128,50l1.2,2.5 2.7.3-2,1.9.6,2.7-2.5-1.4-2.5,1.4.6-2.7-2-1.9 2.7-.3z" style="fill:var(--dorado)" opacity=".7"/>
</svg>`;

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15.4 2 12.2 2 8.4 2 5.4 4.4 3 7.3 3c1.9 0 3.6 1 4.7 2.6C13.1 4 14.8 3 16.7 3 19.6 3 22 5.4 22 8.4c0 3.8-3 7-10 12.6z"/></svg>';
const ARROW = '<svg class="btn-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// Contador hasta el gran día (se usa arriba, fijo, y al final de la última sección).
const countdown = (extra = "") => `
  <div class="countdown ${extra}" role="timer" aria-label="Tiempo para el gran día" hidden>
    <span><b data-cd="d">00</b><small>días</small></span>
    <span><b data-cd="h">00</b><small>hrs</small></span>
    <span><b data-cd="m">00</b><small>min</small></span>
    <span><b data-cd="s">00</b><small>seg</small></span>
    <p class="countdown-today" hidden>¡Hoy es el gran día!</p>
  </div>`;

const CHEVRON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

const DECK = `
  ${HORSE_DEFS}
  <div class="deck">
    <section class="slide slide-cover" aria-label="Portada">
      <div class="slide-inner">
        <div class="cover-art reveal">${carouselSVG()}</div>
        <p class="hero-guest reveal" hidden></p>
        <p class="hero-kicker reveal" data-t="kicker"></p>
        <h1 class="hero-title reveal" data-t="title"></h1>
        <p class="hero-subtitle reveal" data-t="subtitle"></p>
        <p class="hero-cta reveal" data-t="cta"></p>
      </div>
    </section>

    <section class="slide slide-text" aria-label="Bienvenida" hidden>
      <div class="slide-inner">
        <div class="reveal">${ORNAMENT}</div>
        <p class="welcome-text reveal" data-t="welcome"></p>
      </div>
    </section>

    <section class="slide slide-text" aria-label="Nuestro mayor regalo" hidden>
      <div class="slide-inner">
        <blockquote class="teaser reveal"><p class="teaser-text" data-t="teaser"></p></blockquote>
      </div>
    </section>

    <section class="slide slide-rsvp" aria-label="Detalles y confirmación" hidden>
      <div class="slide-inner">
        <div class="env-wrap reveal">
          <div class="envelope" role="button" tabindex="0" aria-label="Abrir la carta para confirmar su asistencia">
            <div class="env-back"></div>
            <div class="env-paper"><span data-t="detailsTitle"></span></div>
            <div class="env-pocket"><i></i></div>
            <div class="env-flap"><i></i></div>
            <div class="env-seal">${HEART}</div>
          </div>
        </div>
        <p class="env-hint reveal">Toque la carta para abrirla</p>

        <div class="letter" hidden>
          <div class="letter-inner">
            <div class="face front">
              <h2 class="slide-title" data-t="detailsTitle"></h2>
              <ul class="detail-list"></ul>
              <a class="btn btn-ghost details-map" target="_blank" rel="noopener" hidden>Abrir en el mapa</a>
              <button type="button" class="btn btn-primary btn-big flip-to-back">Confirmar asistencia ${ARROW}</button>
            </div>
            <div class="face back">
              <h2 class="slide-title">Confirmación de asistencia</h2>
              <p class="rsvp-intro" data-t="rsvp"></p>
              <p class="rsvp-deadline" hidden></p>
              <form class="rsvp-form">
                <label class="field">
                  <span>Su nombre</span>
                  <input name="name" autocomplete="name" required maxlength="60" placeholder="Nombre y apellido">
                </label>
                <button class="btn btn-primary btn-big" type="submit">Confirmar asistencia</button>
                <p class="form-msg" role="status"></p>
              </form>
              <div class="rsvp-done" hidden>
                <p class="rsvp-done-title"></p>
                <p class="muted">Su asistencia ya está confirmada.</p>
                <button type="button" class="btn-link rsvp-edit">Corregir el nombre</button>
              </div>
              <button type="button" class="btn-link flip-to-front">Ver los detalles del día</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="slide slide-text" aria-label="Gracias" hidden>
      <div class="slide-inner">
        <div class="reveal">${ORNAMENT}</div>
        <h2 class="thanks-title reveal">¡Gracias por su confirmación!</h2>
        <p class="farewell-text reveal" data-t="farewell"></p>
        <p class="farewell-closing reveal" data-t="farewellClosing"></p>
        <div class="thanks-actions reveal">
          <a class="btn btn-ghost thanks-map" target="_blank" rel="noopener" hidden>Ver la ubicación en el mapa</a>
          <a class="btn btn-primary thanks-poll">¿Niño o niña? Participe en la encuesta</a>
        </div>
        <div class="reveal">${countdown("countdown-inline")}</div>
      </div>
    </section>
  </div>

  <nav class="deck-nav" aria-label="Secciones">
    ${countdown()}
    <ol class="deck-dots"></ol>
    <p class="deck-hint">Toque para continuar</p>
    <button type="button" class="deck-down" aria-label="Siguiente sección">${CHEVRON_DOWN}</button>
  </nav>
`;

export async function startInvitation({ app, data, config, demo }) {
  const texts = { ...DEFAULT_TEXTS, ...config.texts };
  const codeKey = `inv:${config.eventId}:code`;

  // Por ahora no se pide el código en pantalla: se toma del final del enlace
  // (…/#CODIGO, que nunca viaja al servidor) o del que quedó guardado.
  const code = normalizeCode(decodeURIComponent(location.hash.slice(1)))
    || store.get(codeKey) || (demo ? "DEMO" : "");
  const details = code ? await data.getPrivate(code) : null;
  if (details) store.set(codeKey, code);

  document.body.classList.add("deck-mode");
  app.classList.remove("loading");
  app.innerHTML = DECK;
  startCarousel($(".carousel", app));
  startSparkles(document.body);

  $$("[data-t]", app).forEach((el) => {
    el.textContent = texts[el.dataset.t] || "";
    el.hidden = !el.textContent;
  });

  if (details?.guest) {
    $(".hero-guest").textContent = `Invitación para ${details.guest}`;
    $(".hero-guest").hidden = false;
  }

  renderDetails(details);
  // La encuesta es la página de solo votación (carpeta del evento); en la
  // demostración se conserva ?demo para probarla igual.
  $(".thanks-poll").href = new URL(`../${demo ? location.search : ""}`, location.href).href;
  data.getConfig().then((cfg) => startCountdown(data, Number(cfg.revealAt))).catch(() => {});
  // La última sección (agradecimiento) solo se abre después de confirmar.
  const state = { confirmed: false };
  const deck = setupDeck(() => state.confirmed);
  setupRsvp(data, code, details, deck, state);
}

// Contador fijo hasta el gran día (hora del servidor, no la del teléfono).
function startCountdown(data, target) {
  if (!target) return;
  const boxes = $$(".countdown");
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

function renderDetails(d) {
  const pending = "Por confirmar";
  const items = [
    ["date", "Fecha", d?.date || pending],
    ["time", "Hora", d?.time || pending],
    ["place", "Lugar", d?.place || pending, d?.address],
    ["dress", "Dress code", d?.dressCode],
    ["notes", "Indicaciones", d?.notes],
  ].filter(([, , value]) => value);

  $(".detail-list").replaceChildren(...items.map(([name, label, value, sub]) => {
    const li = document.createElement("li");
    li.className = "detail";
    li.innerHTML = `<span class="detail-icon">${icon(name)}</span><span class="detail-label"></span><span class="detail-value"></span>`;
    $(".detail-label", li).textContent = label;
    $(".detail-value", li).textContent = value;
    if (sub) {
      const s = document.createElement("span");
      s.className = "detail-sub";
      s.textContent = sub;
      li.append(s);
    }
    return li;
  }));

  const map = safeUrl(d?.mapsUrl);
  if (map) {
    for (const link of $$(".details-map, .thanks-map")) {
      link.href = map;
      link.hidden = false;
    }
  }
}

async function setupRsvp(data, code, details, deck, state) {
  const envelope = $(".envelope");
  const hint = $(".env-hint");
  const letter = $(".letter");
  const form = $(".rsvp-form");
  const msg = $(".form-msg", form);
  const done = $(".rsvp-done");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (details?.rsvpBy) {
    $(".rsvp-deadline").textContent = `Confirme su asistencia antes del ${details.rsvpBy}.`;
    $(".rsvp-deadline").hidden = false;
  }

  // Sobre cerrado → se abre la solapa y asoma la hoja → la hoja sale del
  // sobre, pasa al frente y crece hasta ser la carta con el formulario.
  const wrap = envelope.parentElement;
  let opened = false;

  function showLetter() {
    wrap.hidden = true;
    hint.hidden = true;
    letter.hidden = false;
  }

  function sheetToFront() {
    const paper = $(".env-paper", envelope);
    const from = paper.getBoundingClientRect();
    // El sobre sale del flujo sin moverse, para que la carta ocupe su lugar.
    wrap.style.top = `${wrap.offsetTop}px`;
    wrap.classList.add("lifted");
    hint.hidden = true;
    letter.hidden = false;
    const to = letter.getBoundingClientRect();
    paper.style.visibility = "hidden";

    // La hoja conserva su proporción (escala uniforme, sin deformar el texto)
    // y se despliega hacia abajo con un recorte, mientras sube un poco y
    // viene al frente antes de asentarse.
    const k = from.width / to.width;
    const hide = Math.max(0, to.height - from.height / k);
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    letter.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${k})`, clipPath: `inset(0 0 ${hide}px 0 round 14px)` },
      { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 36}px) scale(1.04) rotate(-1.5deg)`,
        clipPath: `inset(0 0 ${hide * 0.35}px 0 round 15px)`, offset: 0.5 },
      { transform: "none", clipPath: "inset(0 0 0 0 round 16px)" },
    ], { duration: 1100, easing: "cubic-bezier(.3,.7,.2,1)" });
    // El título viaja visible (es el mismo de la hoja del sobre); el resto del
    // texto aparece cuando la hoja ya está casi al frente.
    [...$(".front", letter).children].slice(1).forEach((el) => el.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 1000 }));
    wrap.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translateY(90px) scale(.92)", opacity: 0 }],
      { duration: 700, easing: "ease-in", fill: "forwards" },
    ).finished.then(() => { wrap.hidden = true; });
  }

  function openLetter(instant = false) {
    if (opened) return;
    opened = true;
    if (instant || reduced) return showLetter();
    envelope.classList.add("open");
    setTimeout(sheetToFront, 1300);
  }
  // Frente: detalles del día. Atrás: formulario. Se le da vuelta con botones.
  const flip = (toBack) => {
    letter.classList.toggle("flipped", toBack);
    $(".front", letter).inert = toBack;
    $(".back", letter).inert = !toBack;
    $(".slide-rsvp").scrollTop = 0;
  };
  flip(false);
  $(".flip-to-back").addEventListener("click", () => flip(true));
  $(".flip-to-front").addEventListener("click", () => flip(false));

  envelope.addEventListener("click", () => openLetter());
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLetter(); }
  });

  function confirmedAs(name) {
    state.confirmed = true;
    $(".rsvp-done-title").textContent = `¡Gracias, ${name}!`;
    $(".thanks-title").textContent = `¡Gracias por su confirmación, ${name.split(" ")[0]}!`;
    form.hidden = true;
    done.hidden = false;
    deck.refresh();
  }

  $(".rsvp-edit").addEventListener("click", () => {
    done.hidden = true;
    form.hidden = false;
    msg.textContent = "";
    form.name.focus();
  });

  // Invitación individual: el nombre ya viene escrito (se puede corregir).
  const inviteCode = details?.guest ? code : null;
  if (inviteCode) form.name.value = details.guest;

  const prev = await data.getMyRsvp(inviteCode).catch(() => null);
  if (prev) {
    form.name.value = prev.name;
    confirmedAs(prev.name);
    openLetter(true);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = cleanName(form.name.value);
    if (!name) {
      msg.textContent = "Escriba su nombre, por favor.";
      return;
    }
    busy(form, true);
    msg.textContent = "";
    try {
      await data.saveRsvp({ name, attending: true, guests: 1, message: "", code }, inviteCode);
      form.name.blur();
      confirmedAs(name);
      setTimeout(() => deck.go(1), 500);
    } catch {
      msg.textContent = "No se pudo confirmar. Revise su conexión e inténtelo de nuevo.";
    }
    busy(form, false);
  });
}

// isUnlocked(): si ya se puede pasar de la sección de confirmación a la final.
function setupDeck(isUnlocked) {
  const slides = $$(".slide");
  const gate = slides.findIndex((s) => s.classList.contains("slide-rsvp"));
  const blocked = (i) => i === gate && !isUnlocked();
  const down = $(".deck-down");
  const hint = $(".deck-hint");
  const dots = $(".deck-dots");
  let index = 0;
  let moving = false;

  dots.replaceChildren(...slides.map((s, i) => {
    const li = document.createElement("li");
    li.className = "deck-dot";
    li.setAttribute("aria-label", s.getAttribute("aria-label"));
    if (i === 0) li.setAttribute("aria-current", "step");
    return li;
  }));

  // Numera los elementos que entran con animación en cada sección.
  slides.forEach((s) => $$(".reveal", s).forEach((el, n) => el.style.setProperty("--n", n)));

  function show(i) {
    slides.forEach((s, k) => { s.hidden = k !== i; });
    const slide = slides[i];
    slide.scrollTop = 0;
    slide.classList.remove("enter");
    void slide.offsetWidth;
    slide.classList.add("enter");
    down.hidden = i === slides.length - 1 || blocked(i);
    hint.hidden = i !== 0;
    [...dots.children].forEach((d, k) => d.toggleAttribute("aria-current", k === i));
  }

  async function go(delta) {
    const next = index + delta;
    if (moving || next < 0 || next >= slides.length || (delta > 0 && blocked(index))) return;
    document.activeElement?.blur?.();
    // Los globos solo salen al avanzar; al regresar, la sección cambia directo
    // (con su animación de entrada).
    if (delta < 0) {
      index = next;
      show(index);
      return;
    }
    moving = true;
    await balloonWave({
      onCovered: () => {
        index = next;
        show(index);
      },
    });
    moving = false;
  }

  down.addEventListener("click", () => go(1));

  const typing = (el) => el?.matches?.("input, textarea");
  const atTop = () => slides[index].scrollTop <= 1;
  const atBottom = () => {
    const s = slides[index];
    return s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
  };

  addEventListener("keydown", (e) => {
    if (typing(e.target)) return;
    if (["ArrowDown", "PageDown"].includes(e.key)) { e.preventDefault(); go(1); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
  });

  // Rueda del ratón y deslizamiento: solo cambian de sección cuando el
  // contenido ya llegó al borde (si la sección es más alta que la pantalla).
  let wheelLock = 0;
  addEventListener("wheel", (e) => {
    if (moving || Date.now() < wheelLock || Math.abs(e.deltaY) < 30) return;
    if (e.deltaY > 0 && atBottom()) { wheelLock = Date.now() + 1200; go(1); }
    if (e.deltaY < 0 && atTop()) { wheelLock = Date.now() + 1200; go(-1); }
  }, { passive: true });

  let touchY = null;
  addEventListener("touchstart", (e) => { touchY = typing(e.target) ? null : e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (dy > 60 && atBottom()) go(1);
    if (dy < -60 && atTop()) go(-1);
  }, { passive: true });

  // Con el teclado del teléfono abierto, los botones estorban.
  addEventListener("focusin", (e) => { if (typing(e.target)) document.body.classList.add("typing"); });
  addEventListener("focusout", () => document.body.classList.remove("typing"));

  show(0);
  return {
    go,
    // Actualiza el botón de bajar (por ejemplo, al confirmar).
    refresh: () => { down.hidden = index === slides.length - 1 || blocked(index); },
  };
}
