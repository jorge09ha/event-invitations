// Script clásico, aparte de los módulos: si la página no logra arrancar (archivos
// viejos en caché, un módulo que no carga, sin conexión), avisa en lugar de
// quedarse en «Cargando…» para siempre.
(function () {
  function fail(detail) {
    var app = document.getElementById("app");
    if (!app || !app.classList.contains("loading")) return;
    app.classList.remove("loading");
    app.innerHTML = '<section class="card"><h1>No se pudo cargar la página</h1>'
      + '<p class="muted">Revise su conexión y vuelva a cargarla. En una computadora, presione Ctrl+F5.</p>'
      + '<button type="button" class="btn btn-primary">Volver a cargar</button>'
      + '<p class="muted load-detail"></p></section>';
    app.querySelector("button").addEventListener("click", function () { location.reload(); });
    // Detalle técnico, para poder diagnosticar el problema si alguien lo reporta.
    app.querySelector(".load-detail").textContent = detail;
  }

  // Se captura para ver también cuando un <script> no carga; los errores de
  // otros recursos (fuentes, imágenes) no impiden que la página funcione.
  addEventListener("error", function (e) {
    if (e.target === window) fail(e.message);
    else if (e.target.tagName === "SCRIPT") fail("No cargó un archivo de la página: " + (e.target.src || "módulo"));
  }, true);
  setTimeout(function () { fail("La página tardó más de 20 segundos en arrancar."); }, 20000);
})();
