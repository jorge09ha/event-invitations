// Acceso a Firebase para el panel del organizador (inicio de sesión con Google).
// Lo que cada cuenta puede leer o escribir lo deciden las reglas
// (database.rules.json); ocultar la página no protegería nada.

import { SDK } from "./data-firebase.js";

export async function createAdminData(cfg) {
  const [{ initializeApp }, authMod, dbMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-database.js`),
  ]);
  const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } = authMod;
  const { getDatabase, ref, get, onValue, update } = dbMod;

  // App con nombre propio: así la sesión de Google no se mezcla con el usuario
  // anónimo de las invitaciones abiertas en este mismo navegador.
  const app = initializeApp(cfg.firebase, "admin");
  const auth = getAuth(app);
  const db = getDatabase(app);
  const r = (path) => ref(db, `events/${cfg.eventId}/${path}`);

  return {
    onUser: (cb) => onAuthStateChanged(auth, cb),
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signOut: () => signOut(auth),

    async isAdmin(uid) {
      const snap = await get(r(`admins/${uid}`));
      return snap.val() === true;
    },

    async getConfig() {
      const snap = await get(r("config"));
      return snap.val() || {};
    },

    watchPrivate: (cb, onError) => onValue(r("private"), (snap) => cb(snap.val() || {}), onError),
    watchRsvps: (cb, onError) => onValue(r("rsvps"), (snap) => cb(Object.values(snap.val() || {})), onError),
    watchVotes: (cb, onError) => onValue(r("votes"), (snap) => cb(Object.values(snap.val() || {})), onError),

    watchAdmins: (cb, onError) => onValue(r("admins"), (snap) => cb(snap.val() || {}), onError),
    watchAdminNames: (cb, onError) => onValue(r("adminNames"), (snap) => cb(snap.val() || {}), onError),
    watchPhones: (cb, onError) => onValue(r("guestPhones"), (snap) => cb(snap.val() || {}), onError),
    watchTexts: (cb, onError) => onValue(r("texts"), (snap) => cb(snap.val() || {}), onError),

    // Crea o reemplaza invitaciones; un valor null desactiva esa invitación.
    updatePrivate: (changes) => update(r("private"), changes),
    // Varias rutas del evento a la vez: se guardan todas o ninguna.
    updateEvent: (changes) => update(ref(db, `events/${cfg.eventId}`), changes),
    // Un valor null vuelve al texto original.
    updateTexts: (changes) => update(r("texts"), changes),
  };
}
