// Utilidades compartidas por todas las páginas.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Nombre visible: espacios colapsados y longitud máxima que aceptan las reglas.
export function cleanName(name) {
  return String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
}

// Clave para detectar nombres repetidos: sin tildes, minúsculas y solo letras
// y números, de modo que "José  Pérez" y "jose perez" cuenten como el mismo.
// El resultado nunca contiene caracteres prohibidos en claves de Firebase.
export function nameKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);
}

// Código de acceso: mayúsculas, sin espacios; solo letras, números y guiones.
export function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function safeUrl(url) {
  return /^https:\/\//i.test(String(url || "")) ? url : null;
}

// localStorage puede fallar (modo privado, almacenamiento bloqueado).
export const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  },
};

// Deshabilita (o habilita) los controles de un formulario mientras se envía.
export function busy(form, on) {
  form.querySelectorAll("button, input, textarea").forEach((el) => { el.disabled = on; });
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// Fecha y hora de un instante en una zona horaria, como las usan los campos
// <input type="date"> y <input type="time">.
export function zonedDateTime(ms, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Lo contrario: el instante que corresponde a esa fecha y hora en la zona horaria.
export function zonedToMs(date, time, timeZone) {
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  const shown = zonedDateTime(asUtc, timeZone);
  return asUtc - (Date.parse(`${shown.date}T${shown.time}:00Z`) - asUtc);
}

export function formatDayText(ms, timeZone) {
  const text = new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", timeZone })
    .format(new Date(ms)).replace(",", "");
  return text[0].toUpperCase() + text.slice(1);
}

export function formatTimeText(ms, timeZone) {
  return new Intl.DateTimeFormat("es-CR", { hour: "numeric", minute: "2-digit", timeZone })
    .format(new Date(ms)).replace(/\s/g, " ");
}

export function formatDate(ms, timeZone) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone,
  }).format(new Date(ms));
}
