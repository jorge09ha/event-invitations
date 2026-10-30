// Acceso a Firebase (autenticación anónima + Realtime Database).
// Toda la seguridad real está en database.rules.json; este módulo solo
// traduce las operaciones de la página a lecturas y escrituras.

import { nameKey } from "./util.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

export async function createFirebaseData(cfg) {
  const [{ initializeApp }, authMod, dbMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-database.js`),
  ]);
  const { getAuth, signInAnonymously } = authMod;
  const { getDatabase, ref, get, onValue, update, set, increment, serverTimestamp } = dbMod;

  const app = initializeApp(cfg.firebase);
  const db = getDatabase(app);
  const eventPath = `events/${cfg.eventId}`;
  const r = (path) => ref(db, path ? `${eventPath}/${path}` : eventPath);

  // Diferencia entre el reloj del teléfono y el del servidor de Firebase.
  let offset = 0;
  const offsetReady = new Promise((resolve) => {
    onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
      offset = snap.val() || 0;
      resolve();
    });
    setTimeout(resolve, 3000);
  });

  // Si el navegador ya tiene un usuario anónimo, Firebase devuelve el mismo.
  const { user } = await signInAnonymously(getAuth(app));
  const uid = user.uid;
  await offsetReady;

  return {
    serverNow: () => Date.now() + offset,

    async getConfig() {
      const snap = await get(r("config"));
      if (!snap.exists()) throw new Error("No existe la configuración del evento en Firebase.");
      return snap.val();
    },

    watchVoteCount(cb) {
      return onValue(r("voteCount"), (snap) => cb(snap.val() || 0));
    },

    async getMyVote() {
      const snap = await get(r(`votes/${uid}`));
      return snap.val();
    },

    async isNameTaken(name) {
      const snap = await get(r(`voterNames/${nameKey(name)}`));
      return snap.exists() && snap.val() !== uid;
    },

    async castVote({ name, choice }) {
      const key = nameKey(name);
      await update(r(""), {
        [`votes/${uid}`]: { name, nameKey: key, choice, ts: serverTimestamp() },
        [`voterNames/${key}`]: uid,
        voteCount: increment(1),
      });
    },

    // Las reglas solo permiten leer esta lista a partir de la hora de revelación.
    watchVotes(cb, onError) {
      return onValue(r("votes"), (snap) => cb(Object.values(snap.val() || {})), onError);
    },

    // El código es parte de la ruta: sin el código exacto no hay forma de leer
    // (ni de listar) los datos del evento.
    async getPrivate(code) {
      try {
        const snap = await get(r(`private/${code}`));
        return snap.val();
      } catch {
        return null;
      }
    },

    async getMyRsvp() {
      const snap = await get(r(`rsvps/${uid}`));
      return snap.val();
    },

    async saveRsvp({ name, attending, guests, message, code }) {
      await set(r(`rsvps/${uid}`), { name, attending, guests, message, code, ts: serverTimestamp() });
    },
  };
}
