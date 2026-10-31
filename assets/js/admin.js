// Panel del organizador: crea y envía las invitaciones individuales, y muestra
// confirmaciones y votos. Cada invitación es una entrada private/<CÓDIGO> con
// una copia de los detalles del evento más el nombre del invitado (guest).

import { $, busy, cleanName, nameKey, plural } from "./util.js";

// Sin letras ni números que se confundan al leerlos (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const DEFAULT_MESSAGE = "¡Hola, {nombre}! Queremos invitarle a nuestra revelación. Esta es su invitación personal: {enlace}";

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
    <p class="muted">Para autorizarla, en la consola de Firebase cree <code class="admin-denied-path"></code> con el valor <code>true</code>.</p>
    <button type="button" class="btn btn-ghost admin-logout">Salir</button>
  </section>
`;

const PANEL = `
  <header class="admin-head">
    <h1>Panel del organizador</h1>
    <button type="button" class="btn-link admin-logout">Salir</button>
  </header>

  <section class="card">
    <h2>Crear invitaciones</h2>
    <form class="admin-create">
      <label class="field">
        <span>Nombres de los invitados, uno por línea</span>
        <textarea name="names" rows="6" required></textarea>
      </label>
      <button class="btn btn-primary" type="submit">Crear invitaciones</button>
      <p class="form-msg" role="status"></p>
    </form>
  </section>

  <section class="card">
    <h2>Invitaciones</h2>
    <p class="admin-summary muted"></p>
    <ul class="admin-list admin-invites"></ul>
    <button type="button" class="btn-link admin-sync">Copiar los detalles del evento a todas las invitaciones</button>
    <p class="form-msg admin-sync-msg" role="status"></p>
  </section>

  <section class="card admin-others-card" hidden>
    <h2>Otras confirmaciones</h2>
    <p class="muted">Llegaron por el enlace general o por una invitación desactivada.</p>
    <ul class="admin-list admin-others"></ul>
  </section>

  <section class="card">
    <h2>Votos</h2>
    <p class="admin-votes-total"></p>
    <div class="names admin-votes">
      <div class="names-col nino"><h3>Niño</h3><ul></ul></div>
      <div class="names-col nina"><h3>Niña</h3><ul></ul></div>
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
    if (!allowed) return showDenied(app, data, user, config);
    showPanel(app, data, config, demo);
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

function showDenied(app, data, user, config) {
  app.innerHTML = DENIED;
  $(".admin-denied-email", app).textContent = `Entró como ${user.email}.`;
  $(".admin-denied-path", app).textContent = `events/${config.eventId}/admins/${user.uid}`;
  logoutButton(app, data);
}

function showPanel(app, data, config, demo) {
  app.innerHTML = PANEL;
  logoutButton(app, data);

  let priv = {};
  let rsvps = [];
  const inviteUrl = (code) => {
    const url = new URL(`../${config.invitePath}/${demo ? location.search : ""}`, location.href);
    url.hash = code;
    return url.href;
  };
  const render = () => renderInvites(app, data, config, priv, rsvps, inviteUrl);

  const onError = (err) => {
    console.error(err);
    $(".admin-summary", app).textContent = "No se pudieron leer los datos. Revise que las reglas nuevas estén publicadas.";
  };
  data.watchPrivate((value) => { priv = value; render(); }, onError);
  data.watchRsvps((value) => { rsvps = value; render(); }, onError);
  data.watchVotes((votes) => renderVotes(app, votes), onError);

  const form = $(".admin-create", app);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $(".form-msg", form);
    const details = masterDetails(priv);
    if (!details) {
      msg.textContent = "Primero cargue en Firebase los detalles del evento (private/<CÓDIGO>).";
      return;
    }
    const { changes, created, repeated } = buildInvites(form.names.value, priv, details);
    if (!created && !repeated.length) {
      msg.textContent = "Escriba al menos un nombre.";
      return;
    }
    busy(form, true);
    msg.textContent = "";
    try {
      if (created) await data.updatePrivate(changes);
      form.names.value = "";
      const skipped = repeated.length ? ` Ya existían: ${repeated.join(", ")}.` : "";
      msg.textContent = `${plural(created, "invitación creada", "invitaciones creadas")}.${skipped}`;
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudieron crear las invitaciones. Inténtelo de nuevo.";
    }
    busy(form, false);
  });

  // Los detalles se editan en la entrada general de Firebase; este botón los
  // copia a las invitaciones, conservando el nombre de cada una.
  $(".admin-sync", app).addEventListener("click", async () => {
    const msg = $(".admin-sync-msg", app);
    const details = masterDetails(priv);
    const invites = Object.entries(priv).filter(([, v]) => v.guest);
    if (!details || !invites.length) {
      msg.textContent = "No hay nada que copiar todavía.";
      return;
    }
    try {
      await data.updatePrivate(Object.fromEntries(invites.map(([code, v]) => [code, { ...details, guest: v.guest }])));
      msg.textContent = `Detalles actualizados en ${plural(invites.length, "invitación", "invitaciones")}.`;
    } catch (err) {
      console.error(err);
      msg.textContent = "No se pudieron actualizar los detalles. Inténtelo de nuevo.";
    }
  });
}

// La entrada sin invitado es la del enlace general: la fuente de los detalles.
function masterDetails(priv) {
  const code = Object.keys(priv).sort().find((c) => !priv[c].guest);
  return code ? priv[code] : null;
}

function buildInvites(text, priv, details) {
  const seen = new Set(Object.values(priv).filter((v) => v.guest).map((v) => nameKey(v.guest)));
  const changes = {};
  const repeated = [];
  for (const line of text.split("\n")) {
    const guest = cleanName(line);
    const key = nameKey(guest);
    if (!key) continue;
    if (seen.has(key)) {
      repeated.push(guest);
      continue;
    }
    seen.add(key);
    changes[newCode()] = { ...details, guest };
  }
  return { changes, created: Object.keys(changes).length, repeated };
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
  return chars.match(/.{4}/g).join("-");
}

function renderInvites(app, data, config, priv, rsvps, inviteUrl) {
  const confirmedCodes = new Set(rsvps.map((r) => r.code));
  const invites = Object.entries(priv)
    .filter(([, v]) => v.guest)
    .sort(([, a], [, b]) => a.guest.localeCompare(b.guest, "es"));
  const confirmed = invites.filter(([code]) => confirmedCodes.has(code)).length;

  $(".admin-summary", app).textContent = invites.length
    ? `${plural(invites.length, "invitación", "invitaciones")}: ${confirmed} ${confirmed === 1 ? "confirmada" : "confirmadas"}, ${invites.length - confirmed} ${invites.length - confirmed === 1 ? "pendiente" : "pendientes"}.`
    : "Todavía no hay invitaciones.";

  $(".admin-invites", app).replaceChildren(...invites.map(([code, invite]) =>
    inviteRow(data, config, code, invite.guest, confirmedCodes.has(code), inviteUrl(code))));

  const others = rsvps.filter((r) => !priv[r.code]?.guest);
  $(".admin-others-card", app).hidden = !others.length;
  $(".admin-others", app).replaceChildren(...others.map((r) => {
    const li = document.createElement("li");
    li.className = "admin-row";
    li.textContent = r.name;
    return li;
  }));
}

function inviteRow(data, config, code, guest, confirmed, url) {
  const li = document.createElement("li");
  li.className = "admin-row";
  li.innerHTML = `
    <div class="admin-row-main">
      <span class="admin-name"></span>
      <span class="admin-status"></span>
    </div>
    <div class="admin-actions">
      <a class="btn btn-primary admin-send" target="_blank" rel="noopener">WhatsApp</a>
      <button type="button" class="btn btn-ghost admin-copy">Copiar enlace</button>
      <button type="button" class="btn-link admin-revoke">Desactivar</button>
    </div>
  `;
  $(".admin-name", li).textContent = guest;
  const status = $(".admin-status", li);
  status.textContent = confirmed ? "Confirmó" : "Pendiente";
  status.classList.toggle("done", confirmed);

  const message = (config.texts?.inviteMessage || DEFAULT_MESSAGE)
    .replace("{nombre}", guest.split(" ")[0])
    .replace("{enlace}", url);
  $(".admin-send", li).href = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const copy = $(".admin-copy", li);
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      copy.textContent = "¡Copiado!";
    } catch {
      prompt("Copie el enlace:", url);
    }
  });

  $(".admin-revoke", li).addEventListener("click", async () => {
    if (!confirm(`¿Desactivar la invitación de ${guest}? Su enlace dejará de funcionar.`)) return;
    try {
      await data.updatePrivate({ [code]: null });
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
