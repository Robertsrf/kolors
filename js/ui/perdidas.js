import { state, TIPO_PERDIDA_LABEL, m2Perdida, totalPerdida } from "../state.js";
import { money, fmt, escapeHtml, fechaLegible, haceDias } from "../utils.js";
import { eliminarPerdida as apiEliminarPerdida } from "../api.js";
import { render } from "../render.js";
import { abrirModalEditarPerdida } from "../modales/perdida.js";

let filtroTextoPerdidas = "";

export function renderPerdidasList() {
  const el = document.getElementById("perdidasList");
  el.innerHTML = "";
  const texto = filtroTextoPerdidas.trim().toLowerCase();
  const visibles = state.perdidas
    .filter((p) => !texto || (p.descripcion || "").toLowerCase().includes(texto))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (visibles.length === 0) {
    el.innerHTML = `<div class="empty-state">Todavía no hay pérdidas ni pruebas registradas.</div>`;
    return;
  }
  visibles.forEach((p) => el.appendChild(renderPerdidaCard(p)));
}

function renderPerdidaCard(p) {
  const card = document.createElement("div");
  card.className = "card impresion-card";

  const m2 = m2Perdida(p);
  const total = totalPerdida(p);
  const tipo = p.tipo || "perdida";

  card.innerHTML = `
    <div class="impresion-top">
      <div>
        <div class="impresion-cliente">${fechaLegible(p.fecha)}</div>
        <div class="impresion-fecha">${haceDias(p.fecha)}</div>
      </div>
      <span class="badge tipo-${tipo}">${TIPO_PERDIDA_LABEL[tipo] || tipo}</span>
    </div>
    ${p.descripcion ? `<div class="impresion-desc">${escapeHtml(p.descripcion)}</div>` : ""}
    <div class="impresion-mid">
      <span>📐 <b>${fmt(m2)} m²</b> (${fmt(p.ancho)}×${fmt(p.alto)} m)</span>
      <span>💵 <b>${money(total)}</b></span>
    </div>
    <div class="impresion-actions">
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarPerdida(p.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => eliminarPerdida(p.id));

  return card;
}

async function eliminarPerdida(id) {
  const p = state.perdidas.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar este registro de ${(TIPO_PERDIDA_LABEL[p.tipo] || p.tipo).toLowerCase()} del ${fechaLegible(p.fecha)}? Esta acción no se puede deshacer.`)) return;
  await apiEliminarPerdida(id);
  render();
}

document.getElementById("buscadorPerdidas").addEventListener("input", (e) => {
  filtroTextoPerdidas = e.target.value;
  renderPerdidasList();
});
