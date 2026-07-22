import { state, TIPO_IMPRESION_LABEL, impresionCobraDinero, m2Impresion, totalImpresion, saldoImpresion, estaPagadaImpresion } from "../state.js";
import { money, fmt, escapeHtml, fechaLegible, haceDias } from "../utils.js";
import { eliminarImpresion as apiEliminarImpresion } from "../api.js";
import { render } from "../render.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarImpresion } from "../modales/impresion.js";

let filtroTextoImpresiones = "";
let filtroPagoImpresiones = "todos";

export function renderImpresionesList() {
  const el = document.getElementById("impresionesList");
  el.innerHTML = "";
  const texto = filtroTextoImpresiones.trim().toLowerCase();
  const visibles = state.impresiones
    .filter((i) => !texto || (i.cliente || "").toLowerCase().includes(texto))
    .filter((i) => {
      if (filtroPagoImpresiones === "debe") return !estaPagadaImpresion(i);
      if (filtroPagoImpresiones === "pagado") return estaPagadaImpresion(i);
      return true;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (visibles.length === 0) {
    el.innerHTML = `<div class="empty-state">Todavía no hay impresiones registradas.</div>`;
    return;
  }
  visibles.forEach((imp) => el.appendChild(renderImpresionCard(imp)));
}

function renderImpresionCard(imp) {
  const card = document.createElement("div");
  card.className = "card impresion-card";

  const m2 = m2Impresion(imp);
  const total = totalImpresion(imp);
  const saldo = saldoImpresion(imp);
  const pagada = estaPagadaImpresion(imp);
  const tipo = imp.tipo || "otros";
  const cobra = impresionCobraDinero(tipo);

  card.innerHTML = `
    <div class="impresion-top">
      <div>
        <div class="impresion-cliente">${escapeHtml(imp.cliente)}</div>
        <div class="impresion-fecha">${fechaLegible(imp.fecha)} · ${haceDias(imp.fecha)}</div>
      </div>
      <span class="badge tipo-${tipo}">${TIPO_IMPRESION_LABEL[tipo] || tipo}</span>
    </div>
    ${imp.descripcion ? `<div class="impresion-desc">${escapeHtml(imp.descripcion)}</div>` : ""}
    <div class="impresion-mid">
      <span>📐 <b>${fmt(m2)} m²</b> (${fmt(imp.ancho)}×${fmt(imp.alto)} m)</span>
      <span>💵 <b>${cobra ? money(total) : "No se cobra aparte"}</b></span>
    </div>
    ${cobra ? `<div class="impresion-mid"><span class="badge ${pagada ? "pagado" : "debe"}">${pagada ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span></div>` : ""}
    <div class="impresion-actions">
      <button class="neu-btn icon" data-action="abonar" title="Registrar abono" ${!cobra || pagada ? "disabled" : ""}>💰</button>
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="abonar"]').addEventListener("click", () => abrirModalAbono("impresion", imp.id));
  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarImpresion(imp.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => eliminarImpresion(imp.id));

  return card;
}

async function eliminarImpresion(id) {
  const imp = state.impresiones.find((x) => x.id === id);
  if (!imp) return;
  if (!confirm(`¿Eliminar la impresión de "${imp.cliente}" del ${fechaLegible(imp.fecha)}? Esta acción no se puede deshacer.`)) return;
  await apiEliminarImpresion(id);
  render();
}

document.getElementById("buscadorImpresiones").addEventListener("input", (e) => {
  filtroTextoImpresiones = e.target.value;
  renderImpresionesList();
});

function activarFiltroPago(grupoEl, valor) {
  grupoEl.querySelectorAll(".filtro-pago-btn").forEach((b) => b.classList.toggle("active", b.dataset.filtro === valor));
}

document.getElementById("filtroPagoImpresiones").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  filtroPagoImpresiones = btn.dataset.filtro;
  activarFiltroPago(document.getElementById("filtroPagoImpresiones"), filtroPagoImpresiones);
  renderImpresionesList();
});
