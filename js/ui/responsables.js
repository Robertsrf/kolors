import { RESPONSABLES, normalizarResponsables } from "../state.js";
import { escapeHtml } from "../utils.js";
import { actualizarResponsables } from "../api.js";
import { getUsuarioActual } from "../auth.js";
import { render } from "../render.js";

// ============================================================
// QUIÉN ESTÁ HACIENDO CADA TARJETA
//
// Al lado del encabezado de cada tarjeta van los 4 círculos de colores, uno por
// persona (Roberts, Dariana, Adalkleiver, María). Se encienden con un clic y se
// apagan con otro; pueden estar varios encendidos en la misma tarjeta.
// La leyenda de qué color es cada quien va arriba, en la barra de la sección.
// El equipo y sus colores se editan en un solo sitio: RESPONSABLES (state.js).
// ============================================================

// El jefe entra en modo solo lectura: ve los círculos, pero no los cambia.
function puedeAsignar() {
  const u = getUsuarioActual();
  return !u || u.rol !== "jefe";
}

/**
 * Los círculos de una tarjeta.
 * @param {string[]} responsables ids marcados en esa tarjeta
 */
export function responsablesHtml(responsables) {
  const marcados = new Set(normalizarResponsables(responsables));
  const puntos = RESPONSABLES.map((r) => {
    const activo = marcados.has(r.id);
    const titulo = `${r.nombre}: ${activo ? "lo está haciendo (clic para quitarlo)" : "no asignado (clic para asignarlo)"}`;
    return `<button type="button" class="resp-dot${activo ? " activo" : ""}" data-resp="${r.id}"
      style="--resp-color:${r.color}" draggable="false"
      title="${escapeHtml(titulo)}" aria-label="${escapeHtml(titulo)}" aria-pressed="${activo}"
    >${escapeHtml(r.inicial)}</button>`;
  }).join("");
  return `<div class="responsables" title="Quién está haciendo esta tarjeta">${puntos}</div>`;
}

/**
 * Deja los círculos de una tarjeta ya pintada listos para usarse.
 * @param {HTMLElement} card   la tarjeta
 * @param {string} tipo        'pedido' | 'impresion' | 'eco_solvente'
 * @param {object} entidad     el pedido / impresión / eco al que pertenece
 */
export function activarResponsables(card, tipo, entidad) {
  card.querySelectorAll(".resp-dot").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!puedeAsignar()) return;
      const id = btn.dataset.resp;
      const actuales = new Set(normalizarResponsables(entidad.responsables));
      if (actuales.has(id)) actuales.delete(id);
      else actuales.add(id);
      // Se enciende/apaga al instante; si el guardado falla, el repintado de
      // abajo lo devuelve a como está de verdad en la base de datos.
      btn.classList.toggle("activo");
      btn.setAttribute("aria-pressed", btn.classList.contains("activo"));
      try {
        await actualizarResponsables(tipo, entidad.id, Array.from(actuales));
      } catch (err) {
        alert("No se pudo guardar quién está haciendo la tarjeta.\n\n" + (err.message || err));
      }
      render();
    });
  });
}

/**
 * Pinta la leyenda (color → nombre) en todas las barras que la piden.
 * Se llama una sola vez al arrancar: la leyenda no cambia.
 */
export function initLeyendaResponsables() {
  const html = RESPONSABLES.map(
    (r) =>
      `<span class="resp-leyenda-item"><span class="resp-dot activo" style="--resp-color:${r.color}">${escapeHtml(
        r.inicial
      )}</span>${escapeHtml(r.nombre)}</span>`
  ).join("");
  document.querySelectorAll(".resp-leyenda").forEach((el) => {
    el.innerHTML = `<span class="resp-leyenda-titulo">👥 Quién lo hace:</span>${html}`;
  });
}
