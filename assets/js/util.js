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

// "Faltan 3 días, 4 h y 12 min" a partir de milisegundos restantes.
export function formatRemaining(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days) parts.push(plural(days, "día", "días"));
  if (hours) parts.push(`${hours} h`);
  if (mins || !parts.length) parts.push(`${mins} min`);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
}

export function formatDate(ms, timeZone) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone,
  }).format(new Date(ms));
}
