// Panel del organizador: crea y envía las invitaciones individuales, y muestra
// confirmaciones y votos. Cada invitación es una entrada private/<CÓDIGO> con
// una copia de los detalles del evento más el nombre del invitado (guest).

import { $, $$, busy, cleanName, formatDate, formatDayText, formatTimeText, nameKey, plural, safeUrl, store, zonedDateTime, zonedToMs } from "./util.js";
import { DEFAULT_TEXTS, DETAIL_LABELS, TEXT_LABELS } from "./invitation-texts.js";
import { DECK, icon, mapLinks } from "./invitation.js";
import { countdown, startCountdown } from "./countdown.js";
import { configTexts, SHELL } from "./app.js";
import { startCarousel } from "./carousel.js";
import { openRevealStage } from "./reveal-stage.js";

// Sin letras ni números que se confundan al leerlos (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const TAB_KEY = "admin:tab";

const LOGIN = `
  <section class="card">
    <h1>Panel del organizador</h1>
    <p class="muted">Entre con la cuenta de Google del organizador.</p>
    <button type="button" class="btn btn-primary admin-login">Entrar con Google</button>
    <p class="form-msg" role="status"></p>
  </section>
`;

const DENIED = `
  <section class="card">
    <h1>Cuenta sin permiso</h1>
    <p class="admin-denied-email"></p>
    <p class="muted">Envíe este código a un administrador para que le dé acceso. Después, recargue esta página.</p>
    <p class="admin-code"></p>
    <div class="admin-actions">
      <button type="button" class="btn btn-primary admin-denied-copy">Copiar código</button>
      <button type="button" class="btn btn-ghost admin-logout">Salir</button>
    </div>
  </section>
`;

const menuIcon = (path) => `<svg class="admin-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const voteShareCard = (panel) => `
  <section class="card" data-panel="${panel}">
    <h2>Enlace de votación</h2>
    <p class="muted">Para que cualquier persona vote, sin invitación individual.</p>
    <div class="admin-actions">
      <a class="btn btn-primary admin-vote-send" target="_blank" rel="noopener">Enviar WhatsApp</a>
      <button type="button" class="btn btn-ghost admin-vote-copy">Copiar enlace</button>
    </div>
  </section>
`;

const PANEL = `
  <header class="admin-head">
    <button type="button" class="admin-menu-btn" aria-label="Abrir el menú" aria-expanded="false" aria-controls="admin-menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <h1 class="admin-current"></h1>
    ${countdown("countdown-inline")}
  </header>

  <div class="admin-backdrop" hidden></div>
  <nav class="admin-menu" id="admin-menu" aria-label="Menú del panel">
    <p class="admin-menu-title">Panel del organizador</p>
    <button type="button" data-tab="guests" data-title="Crear invitaciones">${menuIcon('<path d="M3 7l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>')}Crear invitaciones</button>
    <button type="button" data-tab="details" data-title="Detalles del gran día">${menuIcon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>')}Detalles del gran día</button>
    <button type="button" class="admin-menu-group" aria-expanded="false" aria-controls="admin-submenu">${menuIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')}Modificar textos${menuIcon('<path class="admin-chevron" d="M6 9l6 6 6-6"/>')}</button>
    <div class="admin-submenu" id="admin-submenu" hidden>
      <button type="button" data-tab="texts" data-title="Textos de la invitación">Invitación</button>
      <button type="button" data-tab="voting" data-title="Textos de la votación">Votación</button>
    </div>
    <button type="button" data-tab="votes" data-title="Ver votos">${menuIcon('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>')}Ver votos</button>
    <button type="button" data-tab="reveal" data-title="Revelación de sexo">${menuIcon('<path d="M12 21C5 15.4 2 12.2 2 8.4 2 5.4 4.4 3 7.3 3c1.9 0 3.6 1 4.7 2.6C13.1 4 14.8 3 16.7 3 19.6 3 22 5.4 22 8.4c0 3.8-3 7-10 12.6z"/>')}Revelación de sexo</button>
    <button type="button" data-tab="admins" data-title="Administradores">${menuIcon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>')}Administradores</button>
    <button type="button" class="admin-logout">${menuIcon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>')}Salir</button>
  </nav>

  <section class="card" data-panel="guests">
    <h2>Nueva invitación</h2>
    <form class="admin-create">
      <div class="admin-create-fields">
        <label class="field">
          <span>Nombre</span>
          <input name="guest" required maxlength="40" autocomplete="off" placeholder="María Pérez">
        </label>
        <label class="field">
          <span>Teléfono (opcional)</span>
          <input name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="8888-8888">
        </label>
      </div>
      <button class="btn btn-primary admin-create-btn" type="submit">Crear invitación</button>
      <p class="form-msg" role="status"></p>
    </form>
    <details class="admin-bulk">
      <summary>Agregar varias personas a la vez</summary>
      <form class="admin-bulk-form">
        <label class="field">
          <span>Una persona por línea: nombre, teléfono (opcional)</span>
          <textarea name="lines" rows="5" required placeholder="María Pérez, 8888-8888&#10;Juan Rojas"></textarea>
        </label>
        <button class="btn btn-ghost" type="submit">Crear invitaciones</button>
        <p class="form-msg" role="status"></p>
      </form>
    </details>
  </section>

  <section class="card" data-panel="guests">
    <h2>Invitaciones</h2>
    <div class="admin-stats">
      <div><b class="admin-stat-total">0</b><span>Total</span></div>
      <div><b class="admin-stat-done">0</b><span>Confirmaron</span></div>
      <div><b class="admin-stat-pending">0</b><span>Pendientes</span></div>
    </div>
    <p class="admin-summary muted"></p>
    <ul class="admin-list admin-invites"></ul>
  </section>

  <section class="card admin-others-card" data-panel="guests" hidden>
    <h2>Otras confirmaciones</h2>
    <p class="muted">Llegaron por el enlace general o por una invitación desactivada.</p>
    <ul class="admin-list admin-others"></ul>
  </section>

  <form class="card admin-details" data-panel="details">
    <p class="muted">Solo los ve quien tenga un enlace de invitación válido. Al guardar, se actualizan todas las invitaciones. Los campos vacíos no se muestran.</p>
    <p class="admin-no-master muted" hidden>Para editar estos datos, primero cárguelos en Firebase (private/&lt;CÓDIGO&gt;).</p>
    <div class="admin-when">
      <label class="field"><span>Fecha</span><input type="date" name="eventDate" required></label>
      <label class="field"><span>Hora</span><input type="time" name="eventTime" required></label>
    </div>
    <p class="muted admin-when-help">De esta fecha y hora dependen el contador, el cierre de la votación y la revelación de los resultados.</p>
    <label class="field"><span>Lugar</span><input data-d="place"></label>
    <label class="field"><span>Dirección</span><input data-d="address"></label>
    <div class="admin-link-field">
      <label class="field"><span>Enlace de Google Maps</span><input data-d="mapsUrl" inputmode="url" placeholder="https://…"></label>
      <label class="admin-check"><input type="checkbox" data-show="showMaps"> Mostrar en la invitación</label>
    </div>
    <div class="admin-link-field">
      <label class="field"><span>Enlace de Waze</span><input data-d="wazeUrl" inputmode="url" placeholder="https://waze.com/ul?…"></label>
      <label class="admin-check"><input type="checkbox" data-show="showWaze"> Mostrar en la invitación</label>
    </div>
    <label class="field"><span>Dress code</span><input data-d="dressCode"></label>
    <label class="field"><span>Indicaciones</span><textarea data-d="notes" rows="3"></textarea></label>
    <label class="field"><span>Fecha límite para confirmar</span><input data-d="rsvpBy" placeholder="1 de diciembre"></label>
    <a class="btn-link admin-preview" target="_blank" rel="noopener">Ver la invitación</a>
    <button class="btn btn-primary" type="submit">Guardar detalles</button>
    <p class="form-msg" role="status"></p>
  </form>

  <div class="admin-texts" data-panel="texts">
    <p class="muted">Toque cualquier texto marcado para cambiarlo. Si deja vacío un texto, se usa el original. Los cambios aplican a todas las invitaciones. La fecha, el lugar y los demás datos se cambian en «Detalles del gran día».</p>
    <a class="btn-link admin-preview" target="_blank" rel="noopener">Ver la invitación</a>
    <div class="inv-editor"></div>
    <section class="card">
      <h2>Mensaje de WhatsApp</h2>
      <label class="field">
        <span>{nombre} y {enlace} se reemplazan al enviar</span>
        <textarea data-t="inviteMessage" rows="4"></textarea>
      </label>
    </section>
    <div class="admin-save">
      <p class="form-msg" role="status"></p>
      <button class="btn btn-primary admin-save-btn" type="button">Guardar cambios</button>
    </div>
  </div>

  <div class="admin-texts" data-panel="voting">
    <p class="muted">Toque cualquier texto marcado para cambiarlo. Si deja vacío un texto, se usa el original.</p>
    <a class="btn-link admin-preview" target="_blank" rel="noopener">Ver la página de votación</a>
    <div class="vote-editor"></div>
    <section class="card">
      <h2>Mensaje de WhatsApp</h2>
      <label class="field">
        <span>{enlace} se reemplaza al enviar</span>
        <textarea data-t="voteShareMessage" rows="3"></textarea>
      </label>
    </section>
    <div class="admin-save">
      <p class="form-msg" role="status"></p>
      <button class="btn btn-primary admin-save-btn" type="button">Guardar cambios</button>
    </div>
  </div>

  <div class="admin-texts" data-panel="reveal">
    <section class="card">
      <h2>Pantalla para proyectar</h2>
      <p class="muted">Al abrirla, empieza sola con el latido, que sube poco a poco, y sigue con el ultrasonido y su agradecimiento. Luego usted toca «Ver quiénes votaron», que muestra los nombres sin indicar su voto, y «Revelar resultados» cuando lo decida. Revise el volumen antes de empezar.</p>
      <p class="muted">Solo se ve en esta pantalla: los invitados siguen viendo los resultados a la hora de revelación del evento. Si revela antes, la votación sigue abierta y los votos nuevos aparecen en vivo.</p>
      <button type="button" class="btn btn-primary admin-open-stage">Abrir pantalla de revelación</button>
    </section>
    <section class="card">
      <h2>Mensajes de la apertura</h2>
      <div class="admin-fields">
        <label class="field">
          <span>Frase de la primera pantalla</span>
          <textarea data-t="stageIntro" rows="2"></textarea>
        </label>
        <label class="field">
          <span>Agradecimiento (después de la imagen)</span>
          <textarea data-t="stageThanks" rows="3"></textarea>
        </label>
        <label class="field">
          <span>Frase con los nombres de quienes votaron</span>
          <textarea data-t="stageNames" rows="2"></textarea>
        </label>
      </div>
    </section>
    <div class="admin-save">
      <p class="form-msg" role="status"></p>
      <button class="btn btn-primary admin-save-btn" type="button">Guardar cambios</button>
    </div>
  </div>

  <div class="admin-texts" data-panel="admins">
    <section class="card">
      <h2>Enlace para administradores</h2>
      <p class="muted">Envíeselo a la persona. Al entrar con su cuenta de Google verá un código, y debe enviárselo a usted para agregarlo abajo.</p>
      <div class="admin-actions">
        <a class="btn btn-primary admin-panel-send" target="_blank" rel="noopener">Enviar WhatsApp</a>
        <button type="button" class="btn btn-ghost admin-panel-copy">Copiar enlace</button>
      </div>
    </section>
    <section class="card">
      <h2>Dar acceso</h2>
      <form class="admin-add-admin">
        <label class="field"><span>Nombre</span><input name="name" required maxlength="60" autocomplete="off" placeholder="Para reconocer a la persona"></label>
        <label class="field"><span>Código</span><input name="code" required autocomplete="off" spellcheck="false" placeholder="El código que le enviaron"></label>
        <button class="btn btn-primary" type="submit">Dar permiso</button>
        <p class="form-msg" role="status"></p>
      </form>
    </section>
    <section class="card">
      <h2>Con acceso</h2>
      <p class="muted">Cada administrador puede ver votos, teléfonos y confirmaciones, y dar o quitar acceso a otros. Agregue solo a personas de confianza.</p>
      <ul class="admin-list admin-admins"></ul>
    </section>
  </div>

  ${voteShareCard("votes")}

  <section class="card admin-secret" data-panel="votes">
    <p class="admin-votes-total"></p>
    <div class="admin-secret-closed">
      <svg class="admin-gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5zM12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5z"/></svg>
      <h2>Los votos son una sorpresa</h2>
      <p class="muted">Están ocultos para no arruinar el gran momento.</p>
      <button type="button" class="btn btn-ghost admin-secret-ask">Quiero ver los votos</button>
    </div>
    <div class="admin-secret-confirm" hidden>
      <h2>¿Seguro que quiere ver los votos?</h2>
      <p class="muted">Verá por qué opción votó cada persona, y ya no será una sorpresa para usted.</p>
      <div class="admin-actions">
        <button type="button" class="btn btn-primary admin-secret-keep">Mejor no</button>
        <button type="button" class="btn btn-ghost admin-secret-show">Sí, quiero verlos</button>
      </div>
    </div>
    <div class="admin-secret-open" hidden>
      <div class="names admin-votes">
        <div class="names-col nino"><h3>Niño</h3><ul></ul></div>
        <div class="names-col nina"><h3>Niña</h3><ul></ul></div>
      </div>
      <button type="button" class="btn btn-ghost admin-secret-hide">Ocultar de nuevo</button>
    </div>
  </section>
`;

export async function startAdmin({ config }) {
  const app = $("#app");
  const demo = new URLSearchParams(location.search).has("demo");
  let data;
  try {
    if (demo) {
      const { createDemoAdminData } = await import("./data-demo.js");
      data = createDemoAdminData();
    } else {
      const { createAdminData } = await import("./admin-firebase.js");
      data = await createAdminData(config);
    }
  } catch (err) {
    console.error(err);
    app.classList.remove("loading");
    app.innerHTML = `<section class="card"><h1>No se pudo cargar el panel</h1><p class="muted">Revise su conexión e inténtelo de nuevo.</p></section>`;
    return;
  }

  // Los escuchas de la sesión anterior se abandonan al recargar la página.
  data.onUser(async (user) => {
    app.classList.remove("loading");
    if (!user) return showLogin(app, data);
    let allowed = false;
    try {
      allowed = await data.isAdmin(user.uid);
    } catch (err) {
      console.error(err);
    }
    if (!allowed) return showDenied(app, data, user);
    showPanel(app, data, config, demo, user);
  });
}

function logoutButton(app, data) {
  $(".admin-logout", app).addEventListener("click", async () => {
    await data.signOut();
    location.reload();
  });
}

function showLogin(app, data) {
  app.innerHTML = LOGIN;
  const msg = $(".form-msg", app);
  $(".admin-login", app).addEventListener("click", async () => {
    msg.textContent = "";
    try {
      await data.signIn();
    } catch (err) {
      console.error(err);
      msg.textContent = err.code === "auth/unauthorized-domain"
        ? "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados)."
        : "No se pudo iniciar sesión. Permita las ventanas emergentes e inténtelo de nuevo.";
    }
  });
}

function showDenied(app, data, user) {
  app.innerHTML = DENIED;
  $(".admin-denied-email", app).textContent = `Entró como ${user.email}.`;
  $(".admin-code", app).textContent = user.uid;
  copyButton($(".admin-denied-copy", app), user.uid);
  logoutButton(app, data);
}

function showPanel(app, data, config, demo, user) {
  app.innerHTML = PANEL;
  logoutButton(app, data);
  setupAdmins($('[data-panel="admins"]', app), data, user);
  document.body.classList.add("admin-shell");
  // Los votos vuelven a ocultarse cada vez que se sale de esa sección.
  setupMenu(app, setupSecretVotes(app));

  let priv = {};
  let rsvps = [];
  let phones = {};
  const country = config.phoneCountry || "506";
  const baseTexts = { ...DEFAULT_TEXTS, ...config.texts };
  let savedTexts = {};
  const allTexts = () => ({ ...baseTexts, ...savedTexts });
  const inviteUrl = (code) => {
    const url = new URL(`../${config.invitePath}/${demo ? location.search : ""}`, location.href);
    url.hash = code;
    return url.href;
  };
  const voteUrl = new URL(`../${demo ? location.search : ""}`, location.href).href;
  const render = () => {
    renderInvites(app, data, allTexts(), priv, rsvps, phones, country, inviteUrl);
    const message = allTexts().voteShareMessage.replace("{enlace}", voteUrl);
    for (const link of $$(".admin-vote-send", app)) link.href = whatsappUrl("", message);
  };
  for (const button of $$(".admin-vote-copy", app)) copyButton(button, voteUrl);

  const inviteForm = $('[data-panel="texts"]', app);
  buildInvitationEditor($(".inv-editor", inviteForm));
  const inviteEditor = setupTextEditor(inviteForm, data, baseTexts, allTexts, {
    fill: () => showInviteDetails(inviteForm, priv, inviteUrl),
  });
  const timeZone = config.timeZone || "America/Costa_Rica";
  const stopCountdowns = [];
  function applyRevealAt(revealAt) {
    stopCountdowns.splice(0).forEach((stop) => stop());
    stopCountdowns.push(
      startCountdown({ serverNow: Date.now }, revealAt, [$(".admin-head .countdown", app)]),
      startCountdown({ serverNow: Date.now }, revealAt, [$(".vote-editor .countdown", app)]),
    );
    if (revealAt) $(".vote-date", app).textContent = formatDate(revealAt, timeZone);
  }
  const detailsEditor = setupDetailsForm($(".admin-details", app), data, () => priv, inviteUrl, timeZone, applyRevealAt);

  const voteForm = $('[data-panel="voting"]', app);
  buildVoteEditor($(".vote-editor", voteForm));
  $(".admin-preview", voteForm).href = voteUrl;
  const voteEditor = setupTextEditor(voteForm, data, baseTexts, allTexts);

  const stageEditor = setupTextEditor($('[data-panel="reveal"]', app), data, baseTexts, allTexts);
  // Se precarga para que no tarde en aparecer durante la apertura.
  const stageImage = config.stageImage ? new URL(`../${config.stageImage}`, location.href).href : null;
  if (stageImage) new Image().src = stageImage;

  const fillEditors = () => {
    inviteEditor.fill();
    detailsEditor.fill();
    voteEditor.fill();
    stageEditor.fill();
  };

  // El título y el subtítulo vienen de la configuración del evento hasta que se editen.
  data.getConfig().then((cfg) => {
    Object.assign(baseTexts, configTexts(cfg));
    const revealAt = Number(cfg.revealAt);
    applyRevealAt(revealAt);
    detailsEditor.setRevealAt(revealAt);
    fillEditors();
  }).catch((err) => console.error(err));

  const onError = (err) => {
    console.error(err);
    $(".admin-summary", app).textContent = "No se pudieron leer los datos. Revise que las reglas nuevas estén publicadas.";
  };
  data.watchPrivate((value) => { priv = value; render(); fillEditors(); }, onError);
  data.watchTexts((value) => { savedTexts = value; render(); fillEditors(); }, onError);
  data.watchRsvps((value) => { rsvps = value; render(); }, onError);
  data.watchPhones((value) => { phones = value; render(); }, onError);

  let votes = [];
  const voteListeners = new Set();
  data.watchVotes((value) => {
    votes = value;
    renderVotes(app, votes);
    voteListeners.forEach((fn) => fn(votes));
  }, onError);

  $(".admin-open-stage", app).addEventListener("click", () => {
    const texts = allTexts();
    openRevealStage({
      title: texts.voteTitle,
      intro: texts.stageIntro,
      thanks: texts.stageThanks,
      namesThanks: texts.stageNames,
      image: stageImage,
      votes,
      subscribe(fn) {
        voteListeners.add(fn);
        return () => voteListeners.delete(fn);
      },
    });
  });

  const NO_DETAILS = "Primero cargue en Firebase los detalles del evento (private/<CÓDIGO>).";

  // Una persona: con teléfono, la invitación sale de una vez por WhatsApp.
  const form = $(".admin-create", app);
  const submit = $(".admin-create-btn", form);
  form.elements.phone.addEventListener("input", () => {
    submit.textContent = form.elements.phone.value.trim() ? "Crear y enviar por WhatsApp" : "Crear invitación";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $(".form-msg", form);
    const details = masterDetails(priv);
    if (!details) {
      msg.textContent = NO_DETAILS;
      return;
    }
    const guest = cleanName(form.elements.guest.value);
    const rawPhone = form.elements.phone.value.trim();
    const phone = rawPhone ? normalizePhone(rawPhone, country) : "";
    if (!nameKey(guest)) {
      msg.textContent = "Escriba el nombre.";
      return;
    }
    if (phone === null) {
      msg.textContent = "Revise el teléfono: use 8 dígitos o el número completo con su código de país.";
      form.elements.phone.focus();
      return;
    }
    if (inviteNames(priv).has(nameKey(guest))) {
      msg.textContent = `Ya existe una invitación para ${guest}. Búsquela en la lista o agregue su apellido.`;
      return;
    }

    // La ventana se abre aquí, durante el clic; después el navegador la bloquearía.
    const whatsapp = phone ? open("", "_blank") : null;
    if (whatsapp) whatsapp.opener = null;
    busy(form, true);
    msg.textContent = "";
    try {
      const code = newCode();
      await data.updateEvent(inviteChanges(code, guest, phone, details));
      if (whatsapp) whatsapp.location.href = whatsappUrl(phone, inviteMessage(allTexts(), guest, inviteUrl(code)));
      form.reset();
      submit.textContent = "Crear invitación";
      msg.textContent = phone && !whatsapp
        ? `Invitación creada para ${guest}. Su navegador bloqueó WhatsApp: use el botón de la lista.`
        : `Invitación creada para ${guest}.`;
      busy(form, false);
      form.elements.guest.focus();
    } catch (err) {
      console.error(err);
      whatsapp?.close();
      msg.textContent = "No se pudo crear la invitación. Inténtelo de nuevo.";
      busy(form, false);
    }
  });

  const bulkForm = $(".admin-bulk-form", app);
  bulkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $(".form-msg", bulkForm);
    const details = masterDetails(priv);
    if (!details) {
      msg.textContent = NO_DETAILS;
      return;
    }
    const { changes, created, repeated, badPhones } = buildInvites(bulkForm.elements.lines.value, priv, details, country);
    if (!created && !repeated.length && !badPhones.length) {
      msg.textContent = "Escriba al menos un nombre.";
      return;
    }
    busy(bulkForm, true);
    msg.textContent = "";
    try {
      if (created) await data.updateEvent(changes);
      // Quedan en el cuadro las líneas por corregir.
      bulkForm.elements.lines.value = badPhones.join("\n");
      const skipped = repeated.length ? ` Ya existían: ${repeated.join(", ")}.` : "";
      const bad = badPhones.length ? ` Revise el teléfono de las líneas que quedaron en el cuadro.` : "";
      msg.textContent = `${plural(created, "invitación creada", "invitaciones creadas")}.${skipped}${bad}`;
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudieron crear las invitaciones. Inténtelo de nuevo.";
    }
    busy(bulkForm, false);
  });
}

// Deja solo dígitos con el código de país, como los pide WhatsApp. Los números
// de 8 dígitos se toman como locales. Devuelve null si no parece un teléfono.
function normalizePhone(raw, country) {
  const text = String(raw).trim();
  if (/[^\d\s()+.-]/.test(text)) return null;
  const digits = text.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 8 && !text.startsWith("+")) return country + digits;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

function formatPhone(phone, country) {
  return phone.startsWith(country) && phone.length === country.length + 8
    ? `+${country} ${phone.slice(country.length, -4)}-${phone.slice(-4)}`
    : `+${phone}`;
}

function inviteMessage(texts, guest, url) {
  return texts.inviteMessage.replace("{nombre}", guest.split(" ")[0]).replace("{enlace}", url);
}

// Sin teléfono, WhatsApp pide elegir el contacto.
function whatsappUrl(phone, message) {
  return `https://wa.me/${phone || ""}?text=${encodeURIComponent(message)}`;
}

function inviteNames(priv) {
  return new Set(Object.values(priv).filter((v) => v.guest).map((v) => nameKey(v.guest)));
}

// El teléfono va aparte de la invitación: quien tenga el enlace puede leer
// private/<CÓDIGO>, y guestPhones solo lo leen los administradores.
function inviteChanges(code, guest, phone, details) {
  const changes = { [`private/${code}`]: { ...details, guest } };
  if (phone) changes[`guestPhones/${code}`] = phone;
  return changes;
}

// En computadora el menú queda fijo a un lado; en tabletas y teléfonos se abre
// con el botón de hamburguesa (el ancho de corte está en base.css).
function setupMenu(app, onSelect) {
  const button = $(".admin-menu-btn", app);
  const menu = $(".admin-menu", app);
  const backdrop = $(".admin-backdrop", app);
  const items = $$("[data-tab]", menu);
  const group = $(".admin-menu-group", menu);
  const submenu = $(".admin-submenu", menu);
  const isOpen = () => menu.classList.contains("open");

  function expandGroup(open) {
    submenu.hidden = !open;
    group.setAttribute("aria-expanded", String(open));
  }

  function toggle(open) {
    if (open === isOpen()) return;
    menu.classList.toggle("open", open);
    backdrop.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) (items.find((i) => i.hasAttribute("aria-current")) || items[0]).focus();
    else button.focus();
  }

  const select = (name) => {
    for (const item of items) item.toggleAttribute("aria-current", item.dataset.tab === name);
    $(".admin-current", app).textContent = items.find((i) => i.dataset.tab === name).dataset.title;
    // Con "Otras confirmaciones" vacía, su tarjeta sigue oculta (.admin-others-card).
    for (const panel of $$("[data-panel]", app)) panel.classList.toggle("admin-off", panel.dataset.panel !== name);
    if (submenu.contains(items.find((i) => i.dataset.tab === name))) expandGroup(true);
    store.set(TAB_KEY, name);
    onSelect();
  };

  button.addEventListener("click", () => toggle(!isOpen()));
  backdrop.addEventListener("click", () => toggle(false));
  group.addEventListener("click", () => expandGroup(submenu.hidden));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggle(false);
  });
  // Si la ventana se agranda con el menú abierto, no debe quedar bloqueada.
  matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) toggle(false);
  });
  for (const item of items) {
    item.addEventListener("click", () => {
      select(item.dataset.tab);
      toggle(false);
      scrollTo(0, 0);
    });
  }
  select(items.some((i) => i.dataset.tab === store.get(TAB_KEY)) ? store.get(TAB_KEY) : "guests");
}

// Ver votos: los nombres quedan ocultos hasta confirmar. Devuelve cómo ocultarlos.
function setupSecretVotes(app) {
  const closed = $(".admin-secret-closed", app);
  const confirmBox = $(".admin-secret-confirm", app);
  const opened = $(".admin-secret-open", app);
  const show = (view) => {
    closed.hidden = view !== closed;
    confirmBox.hidden = view !== confirmBox;
    opened.hidden = view !== opened;
  };
  $(".admin-secret-ask", app).addEventListener("click", () => show(confirmBox));
  $(".admin-secret-keep", app).addEventListener("click", () => show(closed));
  $(".admin-secret-show", app).addEventListener("click", () => show(opened));
  $(".admin-secret-hide", app).addEventListener("click", () => show(closed));
  return () => show(closed);
}

// Campo editable sobre la propia invitación, con el mismo estilo que el original.
function makeEditable(el, label) {
  el.contentEditable = "plaintext-only";
  el.classList.add("inv-edit");
  el.setAttribute("role", "textbox");
  el.setAttribute("aria-label", label);
  el.dataset.placeholder = label;
}

// Un texto editable no funciona bien dentro de un <button>.
function buttonToDiv(button) {
  const div = document.createElement("div");
  div.className = button.className;
  div.innerHTML = button.innerHTML;
  if (button.dataset.t) div.dataset.t = button.dataset.t;
  button.replaceWith(div);
}

function detailRow(iconName, key, subKey) {
  const li = document.createElement("li");
  li.className = "detail";
  li.innerHTML = `<span class="detail-icon">${icon(iconName)}</span><span class="detail-label"></span><span class="detail-value" data-d="${key}"></span>`;
  $(".detail-label", li).textContent = DETAIL_LABELS[key];
  if (subKey) {
    const sub = document.createElement("span");
    sub.className = "detail-sub";
    sub.dataset.d = subKey;
    li.append(sub);
  }
  return li;
}

// Muestra toda la invitación en una sola página, sin globos ni cambios de
// sección: la carta queda abierta, con sus dos caras una después de la otra.
function buildInvitationEditor(root) {
  root.innerHTML = DECK;
  $(".deck-nav", root).remove();
  for (const slide of $$(".slide", root)) slide.hidden = false;
  $(".letter", root).hidden = false;
  $(".flip-to-front", root).remove();

  const envelope = $(".envelope", root);
  envelope.removeAttribute("role");
  envelope.removeAttribute("tabindex");
  envelope.removeAttribute("aria-label");

  buttonToDiv($(".flip-to-back", root));

  $(".detail-list", root).replaceChildren(
    detailRow("date", "date"),
    detailRow("time", "time"),
    detailRow("place", "place", "address"),
    detailRow("dress", "dressCode"),
    detailRow("notes", "notes"),
  );

  const form = $(".rsvp-form", root);
  form.addEventListener("submit", (e) => e.preventDefault());
  for (const control of form.querySelectorAll("input, button")) control.disabled = true;

  // Estos repiten un texto que se edita en otra parte de la invitación.
  const copies = $$(".env-paper [data-t], .rsvp-form [data-t]", root);
  for (const el of $$("[data-t]", root)) {
    if (!copies.includes(el)) makeEditable(el, TEXT_LABELS[el.dataset.t]);
  }

  startCarousel($(".carousel", root));
}

// La página de votación en sus tres estados: para votar, después de votar y
// con la votación cerrada, uno debajo del otro.
function buildVoteEditor(root) {
  root.innerHTML = SHELL;
  const form = $(".vote-form", root);
  form.addEventListener("submit", (e) => e.preventDefault());
  for (const control of form.querySelectorAll("input")) control.disabled = true;
  buttonToDiv($(".vote-submit", root));

  const done = $(".vote-done", root);
  done.hidden = false;
  done.dataset.state = "Después de votar";
  $(".vote-done-title", root).textContent = "Gracias, María. Usted votó: Niña.";
  const closed = $(".vote-closed", root);
  closed.hidden = false;
  closed.dataset.state = "Con la votación cerrada";

  $(".info-reveal", root).innerHTML = '<span data-t="voteRevealLabel"></span>: <span class="vote-date"></span>';
  $(".info-count", root).textContent = "Aquí se muestra cuántas personas han votado.";

  for (const el of $$("[data-t]", root)) makeEditable(el, TEXT_LABELS[el.dataset.t]);
  startCarousel($(".carousel", root));
}

const readField = (el) => (el.value ?? el.textContent).trim();

function writeField(el, text) {
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = text;
  else el.textContent = text;
}

// Editor sobre la propia página. Lo público se guarda en texts/; "extra" agrega
// lo que cada pestaña necesite además de los textos.
function setupTextEditor(form, data, baseTexts, getTexts, extra = {}) {
  const msg = $(".admin-save .form-msg", form);
  const keys = [...new Set($$("[data-t]", form).map((el) => el.dataset.t))];
  const textEls = (key) => $$(`[data-t="${key}"]`, form);
  const textValue = (key) => readField(textEls(key).find((el) => el.isContentEditable || el.tagName === "TEXTAREA"));

  // No se reemplaza lo que la persona está escribiendo si llegan datos nuevos.
  let dirty = false;
  form.addEventListener("input", (e) => {
    dirty = true;
    msg.textContent = "";
    const el = e.target;
    if (el.isContentEditable && !el.textContent) el.replaceChildren(); // para que se vea el nombre del campo
    if (el.dataset.t) {
      for (const copy of textEls(el.dataset.t)) if (copy !== el) writeField(copy, readField(el));
    }
  });

  // Cada texto es de un solo párrafo: Enter termina de editarlo.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.isContentEditable) {
      e.preventDefault();
      e.target.blur();
    }
  });

  function fill() {
    extra.fill?.(dirty);
    if (dirty) return;
    const texts = getTexts();
    for (const key of keys) {
      for (const el of textEls(key)) writeField(el, texts[key] || "");
    }
  }

  $(".admin-save-btn", form).addEventListener("click", async () => {
    const error = extra.validate?.();
    if (error) {
      msg.textContent = error;
      return;
    }

    const textChanges = {};
    for (const key of keys) {
      const text = textValue(key);
      textChanges[key] = !text || text === baseTexts[key] ? null : text;
    }

    busy(form, true);
    msg.textContent = "";
    try {
      await data.updateTexts(textChanges);
      await extra.save?.();
      dirty = false;
      msg.textContent = "Cambios guardados.";
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudieron guardar los cambios. Inténtelo de nuevo.";
    }
    busy(form, false);
    fill();
  });

  return { fill };
}

// Los detalles dentro de la vista de la invitación: solo se muestran, como los
// vería un invitado. Se editan en la sección «Detalles del gran día».
function showInviteDetails(form, priv, inviteUrl) {
  const code = masterCode(priv);
  const link = $(".admin-preview", form);
  link.hidden = !code;
  if (code) link.href = inviteUrl(code);
  const master = code ? priv[code] : {};
  for (const el of $$("[data-d]", form)) {
    const required = ["date", "time", "place"].includes(el.dataset.d);
    el.textContent = master[el.dataset.d] || (required ? "Por confirmar" : "");
    if (!required) (el.closest(".detail-sub") || el.closest(".detail")).hidden = !el.textContent;
  }
  const deadline = $(".rsvp-deadline", form);
  deadline.textContent = `Confirme su asistencia antes del ${master.rsvpBy}.`;
  deadline.hidden = !master.rsvpBy;
  const { maps, waze } = mapLinks(master);
  for (const el of $$(".details-map, .thanks-map", form)) el.hidden = !maps;
  for (const el of $$(".details-waze, .thanks-waze", form)) el.hidden = !waze;
}

// Sección «Detalles del gran día»: se guardan en private/, tanto en la entrada
// general como en cada invitación.
function setupDetailsForm(form, data, getPriv, inviteUrl, timeZone, onRevealChange) {
  const msg = $(".form-msg", form);
  const fields = $$("[data-d]", form);
  const checks = $$("[data-show]", form);
  const dateInput = form.elements.eventDate;
  const timeInput = form.elements.eventTime;
  let revealAt = 0;
  let dirty = false;
  form.addEventListener("input", () => {
    dirty = true;
    msg.textContent = "";
  });

  function fill() {
    const priv = getPriv();
    const code = masterCode(priv);
    const link = $(".admin-preview", form);
    link.hidden = !code;
    if (code) link.href = inviteUrl(code);
    $(".admin-no-master", form).hidden = Boolean(code);
    if (dirty) return;
    const master = code ? priv[code] : {};
    for (const el of fields) {
      el.value = master[el.dataset.d] || "";
      el.disabled = !code;
    }
    // Marcadas salvo que se hayan desmarcado antes.
    for (const el of checks) {
      el.checked = master[el.dataset.show] !== false;
      el.disabled = !code;
    }
    if (revealAt) {
      const when = zonedDateTime(revealAt, timeZone);
      dateInput.value = when.date;
      timeInput.value = when.time;
    }
    dateInput.disabled = !code;
    timeInput.disabled = !code;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const priv = getPriv();
    const code = masterCode(priv);
    if (!code) return;
    for (const [key, name] of [["mapsUrl", "Google Maps"], ["wazeUrl", "Waze"]]) {
      const input = $(`[data-d="${key}"]`, form);
      if (input.value.trim() && !safeUrl(input.value.trim())) {
        msg.textContent = `El enlace de ${name} debe empezar con https://.`;
        input.focus();
        return;
      }
    }

    const nextReveal = zonedToMs(dateInput.value, timeInput.value, timeZone);
    const dateChanged = nextReveal !== revealAt;
    // Con una fecha pasada, los votos quedarían a la vista de cualquiera.
    if (dateChanged && nextReveal <= Date.now()) {
      msg.textContent = "La fecha y la hora deben estar en el futuro.";
      dateInput.focus();
      return;
    }
    if (dateChanged && !confirm(`¿Cambiar el gran día a ${formatDate(nextReveal, timeZone)}? También se moverán el contador, el cierre de la votación y la revelación de los resultados.`)) return;

    const details = { ...priv[code] };
    for (const el of fields) details[el.dataset.d] = el.value.trim() || null;
    for (const el of checks) details[el.dataset.show] = el.checked ? null : false;
    // Lo que leen los invitados sale de la misma fecha, para que siempre coincida.
    details.date = formatDayText(nextReveal, timeZone);
    details.time = formatTimeText(nextReveal, timeZone);
    const changes = { [`private/${code}`]: details };
    for (const [other, entry] of Object.entries(priv)) {
      if (entry.guest) changes[`private/${other}`] = { ...details, guest: entry.guest };
    }
    if (dateChanged) changes["config/revealAt"] = nextReveal;

    busy(form, true);
    msg.textContent = "";
    try {
      await data.updateEvent(changes);
      dirty = false;
      if (dateChanged) {
        revealAt = nextReveal;
        onRevealChange(revealAt);
      }
      msg.textContent = "Detalles guardados.";
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudieron guardar los detalles. Revise que las reglas nuevas estén publicadas.";
    }
    busy(form, false);
    fill();
  });

  return {
    fill,
    setRevealAt(value) {
      revealAt = value;
    },
  };
}

// La entrada sin invitado es la del enlace general: la fuente de los detalles.
function masterCode(priv) {
  return Object.keys(priv).sort().find((c) => !priv[c].guest);
}

function masterDetails(priv) {
  const code = masterCode(priv);
  return code ? priv[code] : null;
}

// Cada línea es "nombre" o "nombre, teléfono".
function buildInvites(text, priv, details, country) {
  const seen = inviteNames(priv);
  const changes = {};
  const repeated = [];
  const badPhones = [];
  let created = 0;
  for (const line of text.split("\n")) {
    const comma = line.lastIndexOf(",");
    const guest = cleanName(comma < 0 ? line : line.slice(0, comma));
    const rawPhone = comma < 0 ? "" : line.slice(comma + 1).trim();
    const key = nameKey(guest);
    if (!key) continue;
    const phone = rawPhone ? normalizePhone(rawPhone, country) : "";
    if (phone === null) {
      badPhones.push(line.trim());
      continue;
    }
    if (seen.has(key)) {
      repeated.push(guest);
      continue;
    }
    seen.add(key);
    Object.assign(changes, inviteChanges(newCode(), guest, phone, details));
    created++;
  }
  return { changes, created, repeated, badPhones };
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
  return chars.match(/.{4}/g).join("-");
}

function renderInvites(app, data, texts, priv, rsvps, phones, country, inviteUrl) {
  const confirmedCodes = new Set(rsvps.map((r) => r.code));
  const invites = Object.entries(priv)
    .filter(([, v]) => v.guest)
    .sort(([, a], [, b]) => a.guest.localeCompare(b.guest, "es"));
  const confirmed = invites.filter(([code]) => confirmedCodes.has(code)).length;

  $(".admin-stat-total", app).textContent = invites.length;
  $(".admin-stat-done", app).textContent = confirmed;
  $(".admin-stat-pending", app).textContent = invites.length - confirmed;
  $(".admin-summary", app).textContent = invites.length ? "" : "Todavía no hay invitaciones.";

  $(".admin-invites", app).replaceChildren(...invites.map(([code, invite]) =>
    inviteRow(data, texts, code, invite.guest, phones[code], country, confirmedCodes.has(code), inviteUrl(code))));

  const others = rsvps.filter((r) => !priv[r.code]?.guest);
  $(".admin-others-card", app).hidden = !others.length;
  $(".admin-others", app).replaceChildren(...others.map((r) => {
    const li = document.createElement("li");
    li.className = "admin-row";
    li.textContent = r.name;
    return li;
  }));
}

// Sección Administradores. El primero se crea en la consola de Firebase; desde
// ahí, cada uno da acceso a otros con el código (UID) de su cuenta de Google.
function setupAdmins(root, data, user) {
  const list = $(".admin-admins", root);
  const form = $(".admin-add-admin", root);
  const msg = $(".form-msg", form);
  let admins = {};
  let names = {};

  const panelUrl = location.href.split("#")[0];
  const message = `Hola. Entre a este enlace con su cuenta de Google y envíeme el código que le aparece, para darle acceso al panel: ${panelUrl}`;
  $(".admin-panel-send", root).href = whatsappUrl("", message);
  copyButton($(".admin-panel-copy", root), panelUrl);

  function adminRow(uid) {
    const li = document.createElement("li");
    li.className = "admin-row";
    li.innerHTML = `
      <div class="admin-row-main">
        <div>
          <span class="admin-name"></span>
          <span class="admin-phone"></span>
        </div>
        <button type="button" class="btn-link admin-remove"></button>
      </div>
    `;
    const mine = uid === user.uid;
    $(".admin-name", li).textContent = mine ? "Usted" : names[uid] || "Sin nombre";
    $(".admin-phone", li).textContent = uid;
    const remove = $(".admin-remove", li);
    remove.hidden = mine;
    remove.textContent = "Quitar acceso";
    remove.addEventListener("click", async () => {
      if (!confirm(`¿Quitarle el acceso a ${names[uid] || uid}?`)) return;
      try {
        await data.updateEvent({ [`admins/${uid}`]: null, [`adminNames/${uid}`]: null });
      } catch (err) {
        console.error(err);
        alert("No se pudo quitar el acceso. Inténtelo de nuevo.");
      }
    });
    return li;
  }

  const render = () => list.replaceChildren(...Object.keys(admins).map(adminRow));
  const onError = (err) => {
    console.error(err);
    msg.textContent = "No se pudo leer la lista. Revise que las reglas nuevas estén publicadas.";
  };
  data.watchAdmins((value) => { admins = value; render(); }, onError);
  data.watchAdminNames((value) => { names = value; render(); }, onError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = cleanName(form.elements.name.value);
    const uid = form.elements.code.value.replace(/\s/g, "");
    if (!/^[A-Za-z0-9]{20,40}$/.test(uid)) {
      msg.textContent = "Revise el código: debe copiarlo completo, sin cambiarlo.";
      return;
    }
    if (admins[uid]) {
      msg.textContent = "Esa persona ya tiene acceso.";
      return;
    }
    busy(form, true);
    msg.textContent = "";
    try {
      await data.updateEvent({ [`admins/${uid}`]: true, [`adminNames/${uid}`]: name });
      form.reset();
      msg.textContent = `Listo: ${name} ya tiene acceso. Pídale que recargue la página.`;
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudo dar el permiso. Revise que las reglas nuevas estén publicadas.";
    }
    busy(form, false);
  });
}

function copyButton(button, url) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "¡Copiado!";
    } catch {
      prompt("Copie el enlace:", url);
    }
  });
}

function inviteRow(data, texts, code, guest, phone, country, confirmed, url) {
  const li = document.createElement("li");
  li.className = "admin-row";
  li.innerHTML = `
    <div class="admin-row-main">
      <div>
        <span class="admin-name"></span>
        <span class="admin-phone"></span>
      </div>
      <span class="admin-status"></span>
    </div>
    <div class="admin-actions">
      <a class="btn btn-primary admin-send" target="_blank" rel="noopener">Enviar WhatsApp</a>
      <button type="button" class="btn btn-ghost admin-copy">Copiar enlace</button>
    </div>
    <div class="admin-row-links">
      <button type="button" class="btn-link admin-edit-phone"></button>
      <button type="button" class="btn-link admin-revoke">Desactivar</button>
    </div>
  `;
  $(".admin-name", li).textContent = guest;
  $(".admin-phone", li).textContent = phone ? formatPhone(phone, country) : "Sin teléfono";
  const status = $(".admin-status", li);
  status.textContent = confirmed ? "Confirmó" : "Pendiente";
  status.classList.toggle("done", confirmed);

  $(".admin-send", li).href = whatsappUrl(phone, inviteMessage(texts, guest, url));

  const editPhone = $(".admin-edit-phone", li);
  editPhone.textContent = phone ? "Cambiar teléfono" : "Agregar teléfono";
  editPhone.addEventListener("click", async () => {
    const raw = prompt(`Teléfono de ${guest} (déjelo vacío para quitarlo):`, phone ? formatPhone(phone, country) : "");
    if (raw === null) return;
    const next = raw.trim() ? normalizePhone(raw, country) : "";
    if (next === null) {
      alert("Revise el teléfono: use 8 dígitos o el número completo con su código de país.");
      return;
    }
    try {
      await data.updateEvent({ [`guestPhones/${code}`]: next || null });
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el teléfono. Inténtelo de nuevo.");
    }
  });

  copyButton($(".admin-copy", li), url);

  $(".admin-revoke", li).addEventListener("click", async () => {
    if (!confirm(`¿Desactivar la invitación de ${guest}? Su enlace dejará de funcionar.`)) return;
    try {
      await data.updateEvent({ [`private/${code}`]: null, [`guestPhones/${code}`]: null });
    } catch (err) {
      console.error(err);
      alert("No se pudo desactivar la invitación. Inténtelo de nuevo.");
    }
  });
  return li;
}

function renderVotes(app, votes) {
  $(".admin-votes-total", app).textContent = votes.length ? `${plural(votes.length, "voto", "votos")} en total.` : "Todavía no hay votos.";
  for (const choice of ["nino", "nina"]) {
    const names = votes.filter((v) => v.choice === choice).map((v) => v.name).sort((a, b) => a.localeCompare(b, "es"));
    $(`.admin-votes .${choice} h3`, app).textContent = `${choice === "nino" ? "Niño" : "Niña"} (${names.length})`;
    $(`.admin-votes .${choice} ul`, app).replaceChildren(...names.map((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      return li;
    }));
  }
}
