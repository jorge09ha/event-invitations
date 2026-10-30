// Controlador principal. Cada página de evento llama a start() con:
//   mode: "full" (invitación completa, ver invitation.js) o "vote" (solo votación)
//   config: contenido del config.js de la carpeta del evento

import { $, busy, cleanName, nameKey, plural, formatRemaining, formatDate } from "./util.js";
import { createPortal } from "./portal.js";
import { carouselSVG, startCarousel } from "./carousel.js";
import { startSparkles } from "./sparkles.js";

const LABEL = { nino: "Niño", nina: "Niña" };

const SHELL = `
  <header class="hero">
    <div class="hero-art">${carouselSVG()}</div>
    <p class="hero-kicker">Revelación</p>
    <h1 class="hero-title"></h1>
    <p class="hero-subtitle"></p>
  </header>

  <section class="card vote">
    <h2>¿Niño o niña?</h2>
    <form class="vote-form">
      <label class="field">
        <span>Su nombre</span>
        <input name="name" autocomplete="name" required maxlength="40">
      </label>
      <div class="vote-options" role="radiogroup" aria-label="Su voto">
        <label class="vote-option nino"><input type="radio" name="choice" value="nino" required><span>Niño</span></label>
        <label class="vote-option nina"><input type="radio" name="choice" value="nina"><span>Niña</span></label>
      </div>
      <button class="btn btn-primary" type="submit">Votar</button>
      <p class="form-msg" role="status"></p>
    </form>
    <div class="vote-done" hidden>
      <p class="vote-done-title"></p>
      <p class="muted">Su voto quedó registrado. Los resultados se revelan el día del evento.</p>
    </div>
    <p class="vote-closed muted" hidden>La votación ya cerró.</p>
  </section>

  <section class="card info">
    <p class="info-reveal"></p>
    <p class="info-remaining"></p>
    <p class="info-count muted"></p>
    <button type="button" class="btn btn-primary info-results" hidden>Ver resultados</button>
  </section>
`;

export async function start({ mode, config }) {
  const app = $("#app");
  const params = new URLSearchParams(location.search);
  const demo = params.has("demo");

  let data;
  try {
    if (demo) {
      const { createDemoData } = await import("./data-demo.js");
      data = createDemoData(Number(params.get("demo")) || 7 * 24 * 3600);
    } else {
      if (!config.firebase?.apiKey || config.firebase.apiKey.startsWith("REEMPLACE")) {
        throw new Error("Falta la configuración de Firebase en config.js.");
      }
      const { createFirebaseData } = await import("./data-firebase.js");
      data = await createFirebaseData(config);
    }
  } catch (err) {
    return fatal(app, err);
  }

  if (mode === "full") {
    const { startInvitation } = await import("./invitation.js");
    return startInvitation({ app, data, config, demo });
  }

  let cfg;
  try {
    cfg = await data.getConfig();
  } catch (err) {
    return fatal(app, err);
  }

  app.innerHTML = SHELL;
  startCarousel($(".carousel", app));
  startSparkles(document.body);
  app.classList.remove("loading");

  const revealAt = Number(cfg.revealAt);
  const countdownMs = (Number(cfg.countdownSeconds) || 10) * 1000;
  const timeZone = config.timeZone || "America/Costa_Rica";

  $(".hero-title").textContent = cfg.publicTitle || "¿Niño o niña?";
  $(".hero-subtitle").textContent = cfg.publicSubtitle || "";
  $(".info-reveal").textContent = `Revelación de resultados: ${formatDate(revealAt, timeZone)}`;

  data.watchVoteCount((n) => {
    $(".info-count").textContent = n ? `${plural(n, "persona ha", "personas han")} votado.` : "Aún nadie ha votado. ¡Sea la primera persona!";
  });

  const vote = setupVote(data);

  // --- Fases: antes → cuenta regresiva (portal) → revelado ---
  const portal = createPortal({ onClose: () => { $(".info-results").hidden = false; } });
  $(".info-results").addEventListener("click", () => portal.reopen());

  let phase = null;
  let watching = false;

  function phaseAt(now) {
    if (now >= revealAt) return "revealed";
    if (now >= revealAt - countdownMs) return "countdown";
    return "before";
  }

  // El reloj del teléfono puede ir unos milisegundos adelantado respecto al
  // servidor; si las reglas todavía niegan la lectura, se reintenta.
  function watchResults() {
    if (watching) return;
    watching = true;
    data.watchVotes(
      (votes) => (portal.isOpen ? portal.update(votes) : portal.open(votes)),
      () => {
        watching = false;
        setTimeout(watchResults, 700);
      },
    );
  }

  function tick() {
    const now = data.serverNow();
    const next = phaseAt(now);

    if (next === "before") {
      $(".info-remaining").textContent = revealAt - now < 60000 ? "Falta menos de un minuto." : `Faltan ${formatRemaining(revealAt - now)}.`;
    } else if (next === "countdown") {
      portal.countdown(Math.ceil((revealAt - now) / 1000));
    }

    if (next !== phase) {
      phase = next;
      if (phase === "countdown") vote.close();
      if (phase === "revealed") {
        vote.close();
        $(".info-reveal").textContent = "¡Los resultados ya fueron revelados!";
        $(".info-remaining").textContent = "";
        $(".info-results").hidden = portal.isVisible;
        if (!portal.isOpen) portal.countdown(0);
        watchResults();
      }
    }
    if (phase !== "revealed") setTimeout(tick, 200);
  }
  tick();
}

function setupVote(data) {
  const card = $(".vote");
  const form = $(".vote-form", card);
  const msg = $(".form-msg", form);
  let closed = false;

  function showDone(v) {
    form.hidden = true;
    $(".vote-done-title", card).textContent = `Gracias, ${v.name}. Usted votó: ${LABEL[v.choice]}.`;
    $(".vote-done", card).hidden = false;
  }

  data.getMyVote().then((v) => v && showDone(v)).catch(() => {});

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (closed) return;
    const name = cleanName(form.name.value);
    const choice = form.choice.value;
    if (!nameKey(name)) {
      msg.textContent = "Escriba su nombre.";
      return;
    }
    if (!choice) {
      msg.textContent = "Elija niño o niña.";
      return;
    }
    busy(form, true);
    msg.textContent = "";
    try {
      if (await data.isNameTaken(name)) {
        msg.textContent = "Ya hay un voto con ese nombre. Si usted es otra persona, agregue su apellido.";
      } else {
        await data.castVote({ name, choice });
        showDone({ name, choice });
      }
    } catch {
      const mine = await data.getMyVote().catch(() => null);
      if (mine) showDone(mine);
      else msg.textContent = closed ? "La votación ya cerró." : "No se pudo registrar el voto. Inténtelo de nuevo.";
    }
    busy(form, false);
  });

  return {
    close() {
      closed = true;
      if (form.hidden) return;
      form.hidden = true;
      $(".vote-closed", card).hidden = false;
    },
  };
}

function fatal(app, err) {
  console.error(err);
  app.classList.remove("loading");
  app.innerHTML = `<section class="card"><h2>No se pudo cargar la página</h2><p class="muted"></p></section>`;
  $(".muted", app).textContent = `${String(err.message || err).replace(/\.$/, "")}. Revise su conexión e inténtelo de nuevo.`;
}
