import { state } from "../state.js";
import { cargarLogs, suscribirLogs } from "../api.js";
import { escapeHtml } from "../utils.js";
import { supabase } from "../supabaseClient.js";

let filtro = "";
let canal = null;
let puedeVerLog = false;

function fechaHora(iso) {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderLog() {
  const el = document.getElementById("logLista");
  const t = filtro.trim().toLowerCase();
  const visibles = state.logs.filter(
    (l) =>
      !t ||
      (l.descripcion || "").toLowerCase().includes(t) ||
      (l.usuario || "").toLowerCase().includes(t) ||
      (l.seccion || "").toLowerCase().includes(t)
  );
  if (!visibles.length) {
    el.innerHTML = `<div class="empty-state">No hay registros todavía.</div>`;
    return;
  }
  el.innerHTML = visibles
    .map(
      (l) => `<div class="log-item">
        <span class="log-fecha">${fechaHora(l.creado_at)}</span>
        <div class="log-cuerpo">
          <span class="log-usuario">${escapeHtml(l.usuario || "?")}</span>
          <span class="badge log-seccion">${escapeHtml(l.seccion || "")}</span>
          <span class="log-desc">${escapeHtml(l.descripcion)}</span>
        </div>
      </div>`
    )
    .join("");
}

document.getElementById("buscadorLog").addEventListener("input", (e) => {
  filtro = e.target.value;
  renderLog();
});

// Red de seguridad por si el aviso en vivo del log no llegó.
export async function refrescarLog() {
  if (!puedeVerLog) return;
  try {
    await cargarLogs();
    const activa = document.querySelector(".tab-btn.active");
    if (activa && activa.dataset.tab === "log") renderLog();
  } catch (e) {
    // El log es informativo: si falla, no se molesta al usuario.
  }
}

export async function initLog(rol) {
  // Solo admin y jefe pueden leer el log.
  puedeVerLog = rol === "admin" || rol === "jefe";
  if (!puedeVerLog) {
    state.logs = [];
    return;
  }
  await cargarLogs();
  renderLog();
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
  canal = suscribirLogs(() => {
    const activa = document.querySelector(".tab-btn.active");
    if (activa && activa.dataset.tab === "log") renderLog();
  });
}
