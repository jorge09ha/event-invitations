# event-invitations

Invitaciones web estáticas para eventos, publicadas en GitHub Pages y con datos en Firebase Realtime Database (plan gratuito Spark). Cada evento vive en su propia carpeta, con un nombre aleatorio.

## Estructura

```
assets/                    Código compartido por todos los eventos
  css/base.css             Estilos y paleta (variables de :root), mobile first
  js/app.js                Arranque de las páginas y página de solo votación (fases y portal)
  js/invitation.js         Invitación por secciones: carta, confirmación, contador, agradecimiento
  js/carousel.js           Carrusel giratorio con caballitos (SVG animado)
  js/horse-art.js          Caballito vectorizado (capas de color)
  js/balloons.js           Globos que suben al pasar de sección
  js/sparkles.js           Estrellitas al azar en el fondo
  js/portal.js             Portal de revelación: cuenta regresiva, resultados y confeti
  js/data-firebase.js      Lectura y escritura en Firebase
  js/data-demo.js          Datos simulados (?demo) para probar sin Firebase
database.rules.json        Reglas de seguridad de la base de datos
firebase/seed-ejemplo.json Datos iniciales de ejemplo para importar en Firebase
tests/                     Pruebas automáticas de las reglas (emulador de Firebase)

pa2puwypy8/                Evento actual (nombre aleatorio)
  config.js                ID del evento, configuración web de Firebase y textos de la invitación
  index.html               Enlace SOLO DE VOTACIÓN
  s25rfxdcespmayzjfizc6had/index.html   Enlace de INVITACIÓN COMPLETA
```

Enlaces una vez publicado (reemplace el usuario y el repositorio si cambian):

- Solo votación: `https://jorge09ha.github.io/event-invitations/pa2puwypy8/`
- Invitación completa: `https://jorge09ha.github.io/event-invitations/pa2puwypy8/s25rfxdcespmayzjfizc6had/#CODIGO`

**El código de acceso va al final del enlace de invitación, después de `#`** (por ejemplo `…/s25rfxdcespmayzjfizc6had/#LUNA-7K4P-29`). Esa parte nunca se envía al servidor de GitHub; la página la usa para leer los detalles del evento en Firebase y para permitir la confirmación. Sin el código, los detalles aparecen como “Por confirmar” y la confirmación no se guarda.

## La invitación

Secciones a pantalla completa que se recorren con el botón de bajar (o deslizando):

1. **Portada** con el carrusel girando.
2. **Bienvenida.**
3. **Frase** para crear expectativa.
4. **Carta:** un sobre que se abre al tocarlo. Al frente, los detalles del gran día y el mapa; al darle vuelta, el formulario para confirmar asistencia (solo el nombre).
5. **Agradecimiento** (solo después de confirmar), con botones para ver el mapa y participar en la encuesta, y el contador.

Arriba hay un contador regresivo hasta el gran día (`revealAt`, con la hora del servidor). Los textos se editan en `pa2puwypy8/config.js` (`texts`); los datos del lugar, en Firebase.

## Cómo funciona la seguridad

El repositorio es público (requisito de GitHub Pages gratuito), así que **nada sensible va en el código**. Cualquier persona puede ver los nombres de las carpetas navegando el repositorio en GitHub: la URL larga solo evita que alguien la adivine; la protección real está en Firebase.

| Dato | Ruta en Firebase | Quién puede leer | Quién puede escribir |
|---|---|---|---|
| Fecha de revelación, título público | `events/<id>/config` | Cualquiera | Solo usted (consola) |
| Lugar, dirección, hora, dress code | `events/<id>/private/<CÓDIGO>` | Solo quien conozca el código exacto (no se puede listar) | Solo usted (consola) |
| Votos (nombre + opción) | `events/<id>/votes/<uid>` | Cada persona el suyo; todos **solo a partir de `revealAt`** (hora del servidor) | Un voto por usuario anónimo, antes de `revealAt`, sin poder modificarlo ni borrarlo |
| Nombres que ya votaron | `events/<id>/voterNames/<nombre>` | Consulta puntual de un nombre (no se puede listar) | Se reserva junto con el voto; un voto por nombre |
| Contador de votos | `events/<id>/voteCount` | Cualquiera | Solo +1, y solo junto con un voto nuevo |
| Confirmaciones de asistencia | `events/<id>/rsvps/<uid>` | Cada persona la suya; usted ve todas en la consola | Solo con el código de acceso correcto |

El límite de un voto por persona usa el usuario anónimo de Firebase (por navegador) y el nombre normalizado (sin tildes ni mayúsculas). No es infalible: alguien podría votar desde otro navegador con otro nombre. La votación cierra automáticamente a la hora de revelación.

## Paso 1: crear el proyecto de Firebase

1. Entre a <https://console.firebase.google.com> y cree un proyecto (puede desactivar Google Analytics). Quédese en el plan **Spark** (gratuito, sin tarjeta).
2. **Authentication** → Comenzar → Método de acceso → active **Anónimo**.
3. **Realtime Database** → Crear base de datos → elija la ubicación (por ejemplo `us-central1`) → inicie en **modo bloqueado**.
4. En la pestaña **Reglas**, pegue el contenido de `database.rules.json` y publique.
5. **Configuración del proyecto** (engranaje) → Sus apps → agregue una **app web** (no necesita Hosting). Copie los valores de `firebaseConfig` en `pa2puwypy8/config.js` (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`). Estos valores no son secretos.

## Paso 2: cargar los datos del evento

1. Edite una copia de `firebase/seed-ejemplo.json` (no suba al repositorio la versión con datos reales):
   - `revealAt`: fecha y hora del gran día en milisegundos (la usan el contador y la revelación). Para obtenerla, abra la consola del navegador (F12) y ejecute, ajustando la fecha (Costa Rica es UTC−6):
     ```js
     new Date("2026-12-12T15:00:00-06:00").getTime()
     ```
   - `countdownSeconds`: segundos de cuenta regresiva del portal de revelación (10 por defecto).
   - Cambie la clave `CAMBIE-ESTE-CODIGO` por el código de acceso real: **mayúsculas, números y guiones**, de al menos 8 caracteres y difícil de adivinar (por ejemplo `LUNA-7K4P-29`).
   - Complete los datos del lugar: `place`, `address`, `mapsUrl` (enlace de Google Maps que empiece con `https://`), `date`, `time`, `dressCode` y `rsvpBy` (fecha límite para confirmar). Los campos vacíos no se muestran.
   - `voteCount` debe existir con valor `0`.
2. En **Realtime Database → Datos**, use el menú ⋮ → **Importar JSON**. Atención: importar en la raíz reemplaza todo lo que haya; si ya tiene otros eventos, importe solo el contenido del evento dentro de `events/<id>`.

Para ver las confirmaciones de asistencia y los votos en cualquier momento, revise `events/pa2puwypy8/rsvps` y `votes` en la misma pestaña de Datos.

## Paso 3: publicar en GitHub Pages

1. Suba los cambios a GitHub (rama `main`).
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → Save.
3. Espere uno o dos minutos y abra los enlaces de arriba (el de invitación con `#CODIGO` al final).

Opcional pero recomendado: en Google Cloud Console → APIs y servicios → Credenciales, restrinja la API key del proyecto a los referentes HTTP `https://jorge09ha.github.io/*` (y `http://localhost:*` para pruebas).

## Probar antes de compartir

- **Modo demostración (sin Firebase):** agregue `?demo` a cualquiera de los dos enlaces. Usa datos simulados y la fecha queda a 7 días. Para probar el portal de revelación en la página de votación, indique los segundos: `?demo=30` lo abre a los 30 segundos.
  - Localmente: `python -m http.server 8765` en la raíz del repositorio y abra `http://localhost:8765/pa2puwypy8/s25rfxdcespmayzjfizc6had/?demo`.
- **Prueba real:** abra la invitación con su código (`#CODIGO`), confirme con un nombre de prueba y revise que aparezca en `rsvps`. Para la votación, ponga temporalmente `revealAt` unos minutos en el futuro, vote desde dos teléfonos y espere el portal. Después restaure la fecha real, borre `rsvps`, `votes` y `voterNames`, y vuelva a poner `voteCount` en `0`.
- **Pruebas de las reglas** (requiere Node.js y Java):
  ```bash
  cd tests && npm install && npm test
  ```

## Página de votación: fases

1. **Antes de la revelación:** votación, fecha de revelación, tiempo restante y cuántas personas han votado (sin indicar por qué opción).
2. **Últimos `countdownSeconds` segundos:** la página cambia sola al portal con cuenta regresiva, sincronizada con la hora del servidor de Firebase.
3. **Revelación:** el portal se abre y muestra marcador, porcentajes, nombres por opción y confeti. Los resultados se actualizan en tiempo real.

## Límites del plan gratuito

- Realtime Database Spark: **100 conexiones simultáneas** (personas con la página abierta al mismo tiempo, no visitantes totales), 1 GB guardado y 10 GB de descarga al mes. Si se esperan más de 100 personas conectadas en el momento de la revelación, conviene pedir que solo una pantalla por grupo la tenga abierta, o proyectarla.
- GitHub Pages: gratuito para repositorios públicos.
- Verifique los límites vigentes en <https://firebase.google.com/pricing> antes de publicar.

## Nuevo evento

1. Genere dos nombres aleatorios (10 y 24 caracteres), por ejemplo:
   ```bash
   node -e "const c=require('crypto'),a='abcdefghijkmnpqrstuvwxyz23456789',r=n=>Array.from(c.randomBytes(n),b=>a[b%32]).join('');console.log(r(10),r(24))"
   ```
2. Copie la carpeta `pa2puwypy8` con el primer nombre, renombre la subcarpeta con el segundo y cambie `eventId` y `texts` en `config.js`.
3. Cargue en Firebase un nuevo nodo `events/<nuevo-id>` como en el paso 2.
