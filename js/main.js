import { supabase } from "./supabaseClient.js";
import { initAuth } from "./auth.js";
import { cargarTodo, suscribirRealtime } from "./api.js";
import { render } from "./render.js";
import { setClienteSeleccionado, renderClientesGrid } from "./ui/clientes.js";
import { renderStats } from "./ui/stats.js";
import { renderImpresionesList } from "./ui/impresiones.js";
import { renderEcoList } from "./ui/ecoSolvente.js";
import { renderPerdidasList } from "./ui/perdidas.js";
import "./ui/datos.js";
import "./modales/precios.js";

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
    if (tab === "ecosolvente") renderEcoList();
    if (tab === "perdidas") renderPerdidasList();
    if (tab === "clientes") {
      setClienteSeleccionado(null);
      renderClientesGrid();
    }
  });
});

// === AUTENTICACIÓN + CARGA INICIAL ===
let canalRealtime = null;

initAuth({
  onLogin: async () => {
    await cargarTodo();
    render();
    if (canalRealtime) supabase.removeChannel(canalRealtime);
    canalRealtime = suscribirRealtime(render);
  },
  onLogout: () => {
    if (canalRealtime) {
      supabase.removeChannel(canalRealtime);
      canalRealtime = null;
    }
  },
});
