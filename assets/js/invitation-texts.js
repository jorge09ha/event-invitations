// Textos editables de la invitación y de la página de votación. El orden final
// es: estos valores, luego "texts" del config.js del evento y, por encima, lo
// guardado desde el panel.

import { $$ } from "./util.js";

// Pone cada texto en su elemento [data-t]; los que quedan vacíos no se muestran.
export function applyTexts(root, texts) {
  for (const el of $$("[data-t]", root)) {
    el.textContent = texts[el.dataset.t] || "";
    el.hidden = !el.textContent;
  }
}

export const DEFAULT_TEXTS = {
  kicker: "¡Una dulce sorpresa está por llegar!",
  title: "¿Niño o niña?",
  subtitle: "",
  cta: "",
  welcome: "",
  teaser: "",
  detailsTitle: "Detalles del evento",
  envHint: "Toque la carta para abrirla",
  rsvpTitle: "Confirmación de asistencia",
  rsvp: "",
  confirmButton: "Confirmar asistencia",
  farewell: "",
  farewellClosing: "",
  pollButton: "¿Niño o niña? Participe en la encuesta",
  inviteMessage: "¡Hola, {nombre}! Queremos invitarle a nuestra revelación. Esta es su invitación personal: {enlace}",
  // Página de votación
  voteKicker: "Revelación",
  voteTitle: "¿Niño o niña?",
  voteSubtitle: "",
  voteQuestion: "¿Niño o niña?",
  voteNameLabel: "Su nombre",
  voteButton: "Votar",
  voteDoneNote: "Su voto quedó registrado. Los resultados se revelan el día del evento.",
  voteClosed: "La votación ya cerró.",
  voteRevealLabel: "Revelación de resultados",
  voteShareMessage: "¡Hola! ¿Niño o niña? Participe en nuestra votación: {enlace}",
  // Pantalla de revelación en vivo
  stageIntro: "Un pequeño latido lo cambió todo",
  stageThanks: "Gracias por acompañarnos en este momento tan especial. Esta personita ya nos une a todos.",
  stageNames: "Gracias a todos ustedes",
};

// Nombre de cada texto en el editor del panel (se ve cuando el texto está vacío).
export const TEXT_LABELS = {
  kicker: "Frase superior",
  title: "Título",
  subtitle: "Subtítulo",
  cta: "Frase final de la portada",
  welcome: "Mensaje de bienvenida",
  teaser: "Frase de expectativa",
  detailsTitle: "Título de los detalles",
  envHint: "Indicación para abrir la carta",
  rsvpTitle: "Título de la confirmación",
  rsvp: "Mensaje de la confirmación",
  confirmButton: "Botón de confirmar",
  farewell: "Mensaje de agradecimiento",
  farewellClosing: "Frase de cierre",
  pollButton: "Botón de la encuesta",
  voteKicker: "Frase superior",
  voteTitle: "Título",
  voteSubtitle: "Subtítulo",
  voteQuestion: "Pregunta",
  voteNameLabel: "Etiqueta del nombre",
  voteButton: "Botón de votar",
  voteDoneNote: "Mensaje después de votar",
  voteClosed: "Mensaje de votación cerrada",
  voteRevealLabel: "Texto antes de la fecha",
};

// Filas de los detalles en la vista de la invitación.
export const DETAIL_LABELS = {
  date: "Fecha",
  time: "Hora",
  place: "Lugar",
  dressCode: "Dress code",
  notes: "Indicaciones",
};
