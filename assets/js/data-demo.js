// Datos simulados para probar el diseño y el portal sin Firebase.
// Se activa agregando ?demo a la URL (revelación a 7 días; ?demo=30 revela en 30 segundos).
// Código de acceso de la demostración: DEMO (general) o DEMO-MARIA (individual).

import { nameKey, store } from "./util.js";

const SAMPLE = [
  ["Ana", "nina"], ["Carlos", "nino"], ["María José", "nina"], ["Luis", "nino"],
  ["Sofía", "nina"], ["Diego", "nino"], ["Valeria", "nina"], ["Andrés", "nino"],
  ["Daniela", "nina"], ["Pablo", "nino"], ["Gabriela", "nina"],
];

const DETAILS = {
  title: "Revelación de sexo del bebé",
  place: "Salón de ejemplo",
  address: "100 m norte del parque central, San José",
  mapsUrl: "https://maps.google.com/?q=9.9333,-84.0833",
  wazeUrl: "https://waze.com/ul?ll=9.9333,-84.0833&navigate=yes",
  date: "Sábado 12 de diciembre",
  time: "3:00 p. m.",
  dressCode: "Asistir con camisa blanca.",
  rsvpBy: "1 de diciembre",
};

// Lo que se cambia en el panel de demostración queda en este navegador, para
// poder verlo después en la invitación de demostración.
const PRIVATE_KEY = "demo:private";
const TEXTS_KEY = "demo:texts";
const PHONES_KEY = "demo:phones";

function readDemo(key, fallback) {
  try {
    return JSON.parse(store.get(key)) || fallback;
  } catch {
    return fallback;
  }
}

const demoPrivate = () => readDemo(PRIVATE_KEY, {
  DEMO: DETAILS,
  "DEMO-MARIA": { ...DETAILS, guest: "María Pérez" },
  "DEMO-JUAN": { ...DETAILS, guest: "Juan Rojas" },
});

// Panel del organizador sin Firebase: sesión simulada.
export function createDemoAdminData() {
  let priv = demoPrivate();
  let texts = readDemo(TEXTS_KEY, {});
  let phones = readDemo(PHONES_KEY, { "DEMO-MARIA": "50688887777" });
  let onPhones = () => {};
  let admins = { demo: true };
  let adminNames = {};
  let onAdmins = () => {};
  let onAdminNames = () => {};
  const rsvps = [
    { name: "María Pérez", attending: true, code: "DEMO-MARIA" },
    { name: "Laura Mora", attending: true, code: "DEMO" },
  ];
  const votes = SAMPLE.slice(0, 6).map(([name, choice]) => ({ name, choice }));
  let onPrivate = () => {};
  let onTexts = () => {};

  return {
    onUser(cb) { cb({ uid: "demo", email: "demo@ejemplo.com" }); },
    async signIn() {},
    async signOut() {},
    // ?demo=sinpermiso muestra lo que ve una cuenta que aún no tiene acceso.
    async isAdmin() { return new URLSearchParams(location.search).get("demo") !== "sinpermiso"; },
    async getConfig() {
      return {
        publicTitle: "¿Niño o niña?",
        publicSubtitle: "Vote por lo que usted cree que será el bebé",
        revealAt: Date.now() + 7 * 24 * 3600 * 1000,
      };
    },
    watchPrivate(cb) { onPrivate = cb; cb(priv); },
    watchRsvps(cb) { cb(rsvps); },
    // Llegan votos nuevos poco a poco, para ver la pantalla de revelación en vivo.
    watchVotes(cb) {
      cb([...votes]);
      let next = votes.length;
      const timer = setInterval(() => {
        if (next >= SAMPLE.length) return clearInterval(timer);
        const [name, choice] = SAMPLE[next++];
        votes.push({ name, choice });
        cb([...votes]);
      }, 3000);
    },
    watchTexts(cb) { onTexts = cb; cb(texts); },
    watchPhones(cb) { onPhones = cb; cb(phones); },
    watchAdmins(cb) { onAdmins = cb; cb(admins); },
    watchAdminNames(cb) { onAdminNames = cb; cb(adminNames); },
    async updatePrivate(changes) {
      priv = { ...priv, ...changes };
      for (const code of Object.keys(changes)) if (!changes[code]) delete priv[code];
      store.set(PRIVATE_KEY, JSON.stringify(priv));
      onPrivate(priv);
    },
    async updateEvent(changes) {
      const privChanges = {};
      phones = { ...phones };
      admins = { ...admins };
      adminNames = { ...adminNames };
      const nodes = { guestPhones: phones, admins, adminNames };
      for (const [path, value] of Object.entries(changes)) {
        const [node, code] = path.split("/");
        if (node === "private") privChanges[code] = value;
        else if (value) nodes[node][code] = value;
        else delete nodes[node][code];
      }
      store.set(PHONES_KEY, JSON.stringify(phones));
      onPhones(phones);
      onAdmins(admins);
      onAdminNames(adminNames);
      if (Object.keys(privChanges).length) await this.updatePrivate(privChanges);
    },
    async updateTexts(changes) {
      texts = { ...texts, ...changes };
      for (const key of Object.keys(changes)) if (!changes[key]) delete texts[key];
      store.set(TEXTS_KEY, JSON.stringify(texts));
      onTexts(texts);
    },
  };
}

export function createDemoData(secondsToReveal) {
  const revealAt = Date.now() + secondsToReveal * 1000;
  const votes = SAMPLE.slice(0, 6).map(([name, choice]) => ({ name, nameKey: nameKey(name), choice }));
  const listeners = new Set();
  let myVote = null;
  let rsvp = null;
  const emit = () => listeners.forEach((fn) => fn());

  // Llegan votos nuevos poco a poco, como pasaría en el evento real.
  let next = 6;
  const timer = setInterval(() => {
    if (next >= SAMPLE.length || Date.now() >= revealAt) return clearInterval(timer);
    const [name, choice] = SAMPLE[next++];
    votes.push({ name, nameKey: nameKey(name), choice });
    emit();
  }, 4000);

  const subscribe = (fn) => {
    listeners.add(fn);
    fn();
    return () => listeners.delete(fn);
  };
  const wait = (ms = 400) => new Promise((res) => setTimeout(res, ms));

  return {
    serverNow: () => Date.now(),
    async getConfig() {
      return {
        publicTitle: "¿Niño o niña?",
        publicSubtitle: "Vote por lo que usted cree que será el bebé",
        revealAt,
        countdownSeconds: 10,
      };
    },
    watchVoteCount: (cb) => subscribe(() => cb(votes.length)),
    async getMyVote() { return myVote; },
    async isNameTaken(name) {
      await wait();
      return votes.some((v) => v.nameKey === nameKey(name));
    },
    async castVote({ name, choice }) {
      await wait();
      if (Date.now() >= revealAt) throw new Error("PERMISSION_DENIED");
      myVote = { name, nameKey: nameKey(name), choice };
      votes.push(myVote);
      emit();
    },
    watchVotes(cb, onError) {
      if (Date.now() < revealAt) {
        setTimeout(() => onError(new Error("PERMISSION_DENIED")), 50);
        return () => {};
      }
      return subscribe(() => cb([...votes]));
    },
    async getPrivate(code) {
      await wait();
      return demoPrivate()[code] || null;
    },
    async getTexts() { return readDemo(TEXTS_KEY, null); },
    async getMyRsvp() { return rsvp; },
    async saveRsvp(data) {
      await wait();
      rsvp = data;
    },
  };
}
