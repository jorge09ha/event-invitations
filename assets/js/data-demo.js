// Datos simulados para probar el diseño y el portal sin Firebase.
// Se activa agregando ?demo a la URL (revelación a 7 días; ?demo=30 revela en 30 segundos).
// Código de acceso de la demostración: DEMO

import { nameKey } from "./util.js";

const SAMPLE = [
  ["Ana", "nina"], ["Carlos", "nino"], ["María José", "nina"], ["Luis", "nino"],
  ["Sofía", "nina"], ["Diego", "nino"], ["Valeria", "nina"], ["Andrés", "nino"],
  ["Daniela", "nina"], ["Pablo", "nino"], ["Gabriela", "nina"],
];

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
      if (code !== "DEMO") return null;
      return {
        title: "Revelación de sexo del bebé",
        place: "Salón de ejemplo",
        address: "100 m norte del parque central, San José",
        mapsUrl: "https://maps.google.com/?q=9.9333,-84.0833",
        date: "Sábado 12 de diciembre",
        time: "3:00 p. m.",
        dressCode: "Asistir con camisa blanca.",
        rsvpBy: "1 de diciembre",
      };
    },
    async getMyRsvp() { return rsvp; },
    async saveRsvp(data) {
      await wait();
      rsvp = data;
    },
  };
}
