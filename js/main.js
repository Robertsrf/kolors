import { initAuth } from "./auth.js";
import { cargarTodo } from "./api.js";
import { iniciarSync, detenerSync } from "./sync.js";
import { reiniciarAvisoEtapaFinal } from "./ui/avisoEtapaFinal.js";
import { render } from "./render.js";
import { ajustarAltoTablero } from "./utils.js";
import { setClienteSeleccionado, renderClientesGrid } from "./ui/clientes.js";
import { renderStats } from "./ui/stats.js";
import { renderImpresionesList } from "./ui/impresiones.js";
import { renderEcoBoard } from "./ui/ecoSolvente.js";
import { renderPerdidasList } from "./ui/perdidas.js";
import { renderSesionesFoto } from "./ui/sesionesFoto.js";
import { aplicarHerramientasPorPestana } from "./ui/herramientas.js";
import "./modales/sesionFoto.js";
import "./ui/datos.js";
import "./modales/precios.js";
import "./modales/fases.js";
import "./ui/metas.js";
import { abrirHistorialMetas } from "./ui/historialMetas.js";
import "./ui/logros.js";
import "./ui/notificaciones.js";
import "./ui/calendario.js";
import "./ui/calculadora.js";
import { initNotas } from "./ui/notas.js";
import { initListas } from "./ui/listas.js";
import { initChat } from "./ui/chat.js";
import { initLog, renderLog } from "./ui/log.js";
import "./ui/exportarPdf.js";
import "./ui/herramientas.js";

// === TABS ===
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById("section-" + tab).classList.add("active");
    // Las herramientas de la izquierda (metas, calculadora, chat...) son del
    // taller: en sesiones fotográficas no pintan nada y se esconden.
    aplicarHerramientasPorPestana(tab);
    if (tab === "stats") renderStats();
    if (tab === "fotos") renderSesionesFoto();
    if (tab === "impresiones") renderImpresionesList();
    if (tab === "ecosolvente") renderEcoBoard();
    if (tab === "perdidas") renderPerdidasList();
    if (tab === "metashist") abrirHistorialMetas();
    if (tab === "log") renderLog();
    if (tab === "clientes") {
      setClienteSeleccionado(null);
      renderClientesGrid();
    }
    if (tab === "tablero") ajustarAltoTablero(document.getElementById("board"));
  });
});

// Al escribir/cambiar en un campo marcado en rojo, se le quita el resaltado.
document.addEventListener("input", (e) => {
  if (e.target && e.target.classList) e.target.classList.remove("campo-invalido");
});
document.addEventListener("change", (e) => {
  if (e.target && e.target.classList) e.target.classList.remove("campo-invalido");
});

// Si una operación contra la base de datos falla y nadie la atrapa, hasta ahora
// no pasaba nada visible: el usuario creía que la app "no hacía caso". Ahora se
// avisa, distinguiendo el caso de permisos.
window.addEventListener("unhandledrejection", (e) => {
  const err = e.reason || {};
  const mensaje = err.message || String(err);
  console.error("Kolors · error no atrapado:", err);
  if (/row-level security|permission denied|not authorized|violates policy/i.test(mensaje)) {
    alert(
      "Tu cuenta no tiene permiso para hacer ese cambio en la base de datos.\n\n" +
        "Avísale al administrador: hay que revisar los permisos de tu usuario.\n\n" +
        "Detalle técnico: " + mensaje
    );
  } else {
    alert("No se pudo completar la acción.\n\nDetalle: " + mensaje);
  }
});

// Mantener la altura de los tableros al cambiar el tamaño de la ventana.
window.addEventListener("resize", () => {
  ajustarAltoTablero(document.getElementById("board"));
  ajustarAltoTablero(document.getElementById("ecoBoard"));
});

// === AUTENTICACIÓN + CARGA INICIAL ===
initAuth({
  onLogin: async (rol) => {
    // Se parte de cero: lo que ya estaba entregado no genera avisos.
    reiniciarAvisoEtapaFinal();
    await cargarTodo();
    render();
    initNotas();
    initListas();
    initChat();
    initLog(rol);
    // Tiempo real + repaso periódico + reconexión automática.
    iniciarSync();
  },
  onLogout: () => {
    detenerSync();
    reiniciarAvisoEtapaFinal();
  },
});
