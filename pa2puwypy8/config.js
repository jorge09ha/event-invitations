// Configuración de este evento. Los valores de "firebase" se copian desde
// Firebase > Configuración del proyecto > Sus apps > App web. No son secretos:
// la protección de los datos está en las reglas de la base de datos.
// Los textos de "texts" también son públicos: no ponga aquí lugar, dirección
// ni nada sensible (eso va en Firebase, bajo private/<CÓDIGO>).
export default {
  eventId: "pa2puwypy8",
  timeZone: "America/Costa_Rica",
  // Carpeta de la invitación completa, para que el panel arme los enlaces.
  invitePath: "s25rfxdcespmayzjfizc6had",
  // Imagen de la pantalla de revelación, dentro de la carpeta del evento. Es
  // pública, como todo el repositorio.
  stageImage: "imagen.jpg",
  // Código de país para los teléfonos de 8 dígitos que se escriben en el panel.
  phoneCountry: "506",
  firebase: {
    apiKey: "AIzaSyAV_usLV_i2GN_LdMO0arenOOl-dPojG3g",
    authDomain: "invitacion-revelacion-b4b59.firebaseapp.com",
    databaseURL: "https://invitacion-revelacion-b4b59-default-rtdb.firebaseio.com",
    projectId: "invitacion-revelacion-b4b59",
    appId: "1:484536059106:web:9a5dee125e2bddfb3bcabb",
  },
  texts: {
    // 1. Portada
    kicker: "¡Una dulce sorpresa está por llegar!",
    title: "¿Niño o niña?",
    subtitle: "Dos posibilidades, un amor infinito y una noticia que llenará nuestros corazones de felicidad.",
    cta: "¡Acompáñenos a descubrirlo!",
    // 2. Mensaje de bienvenida
    welcome: "Hay momentos en la vida que merecen ser compartidos con las personas que más queremos. Hoy queremos invitarlos a ser parte de uno de los momentos más especiales de nuestra historia: descubrir si la personita que viene en camino será nuestro príncipe o nuestra princesa.",
    // 3. Frase para crear expectativa
    teaser: "¡Nuestro mayor regalo está en camino y queremos descubrirlo junto a ustedes!",
    // 4. Información del evento (los datos van en Firebase)
    detailsTitle: "Detalles de nuestro gran día",
    // 5. Confirmación de asistencia (la fecha límite va en Firebase: rsvpBy)
    rsvp: "Su presencia hará este momento aún más especial. Nos encantaría contar con usted para compartir esta hermosa sorpresa.",
    // 6. Despedida
    farewell: "Gracias por formar parte de esta aventura tan bonita. No importa si es niño o niña, ya sabemos que llegará a llenar nuestras vidas de amor, alegría y muchísima felicidad.",
    farewellClosing: "¡Nos vemos para descubrir la sorpresa!",
  },
};
