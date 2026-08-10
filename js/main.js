import { supabase } from "./supabaseClient.js";
import { initAuth } from "./auth.js";
import { cargarTodo, suscribirRealtime } from "./api.js";
import { render } from "./render.js";
import { ajustarAltoTablero } from "./utils.js";
import { setClienteSeleccionado, renderClientesGrid } from "./ui/clientes.js";
import { renderStats } from "./ui/stats.js";
import { renderImpresionesList } from "./ui/impresiones.js";
import { renderEcoBoard } from "./ui/ecoSolvente.js";
import { renderPerdidasList } from "./ui/perdidas.js";
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
import { initChat } from "./ui/chat.js";
import { initLog, renderLog } from "./ui/log.js";
import "./ui/exportarPdf.js";
import "./ui/microperforado.js";

// === TABS ===
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById("section-" + tab).classList.add("active");
    if (tab === "stats") renderStats();
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

// Mantener la altura de los tableros al cambiar el tamaño de la ventana.
window.addEventListener("resize", () => {
  ajustarAltoTablero(document.getElementById("board"));
  ajustarAltoTablero(document.getElementById("ecoBoard"));
});

// === AUTENTICACIÓN + CARGA INICIAL ===
let canalRealtime = null;

initAuth({
  onLogin: async (rol) => {
    await cargarTodo();
    render();
    if (canalRealtime) supabase.removeChannel(canalRealtime);
    canalRealtime = suscribirRealtime(render);
    initNotas();
    initChat();
    initLog(rol);
  },
  onLogout: () => {
    if (canalRealtime) {
      supabase.removeChannel(canalRealtime);
      canalRealtime = null;
    }
  },
});
