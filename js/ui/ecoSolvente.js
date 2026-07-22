import {
  state,
  REMATE_LABEL,
  m2Eco,
  baseEco,
  totalExtrasEco,
  totalEco,
  saldoEco,
  estaPagadoEco,
} from "../state.js";
import { money, fmt, escapeHtml, fechaLegible, haceDias } from "../utils.js";
import { eliminarEco as apiEliminarEco } from "../api.js";
import { render } from "../render.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarEco } from "../modales/eco.js";

let filtroTextoEco = "";
let filtroPagoEco = "todos";

function badgesExtras(eco) {
  const badges = [];
  if (eco.remate && eco.remate !== "ninguno") badges.push(REMATE_LABEL[eco.remate] || eco.remate);
  if (eco.llevaDiseno) badges.push("🎨 Diseño");
  if (eco.llevaEstructura) badges.push("🏗️ Estructura");
  if (eco.clearModo && eco.clearModo !== "ninguno") badges.push("🧴 Clear");
  if (eco.transferModo && eco.transferModo !== "ninguno") badges.push("🔁 Transfer");
  if (!badges.length) return "";
  return `<div class="impresion-extras">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>`;
}

export function renderEcoList() {
  const el = document.getElementById("ecoList");
  el.innerHTML = "";
  const texto = filtroTextoEco.trim().toLowerCase();
  const visibles = state.ecoSolvente
    .filter((e) => !texto || (e.cliente || "").toLowerCase().includes(texto))
    .filter((e) => {
      if (filtroPagoEco === "debe") return !estaPagadoEco(e);
      if (filtroPagoEco === "pagado") return estaPagadoEco(e);
      return true;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (visibles.length === 0) {
    el.innerHTML = `<div class="empty-state">Todavía no hay pedidos de eco solvente registrados.</div>`;
    return;
  }
  visibles.forEach((eco) => el.appendChild(renderEcoCard(eco)));
}

function renderEcoCard(eco) {
  const card = document.createElement("div");
  card.className = "card impresion-card eco-solvente";

  const m2 = m2Eco(eco);
  const total = totalEco(eco);
  const saldo = saldoEco(eco);
  const pagado = estaPagadoEco(eco);

  card.innerHTML = `
    <div class="impresion-top">
      <div>
        <div class="impresion-cliente">${escapeHtml(eco.cliente)}</div>
        <div class="impresion-fecha">${fechaLegible(eco.fecha)} · ${haceDias(eco.fecha)}</div>
      </div>
      <span class="badge ${pagado ? "pagado" : "debe"}">${pagado ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
    </div>
    ${eco.descripcion ? `<div class="impresion-desc">${escapeHtml(eco.descripcion)}</div>` : ""}
    ${badgesExtras(eco)}
    <div class="impresion-mid">
      <span>📐 <b>${fmt(m2)} m²</b> (${fmt(eco.ancho)}×${fmt(eco.alto)} m)</span>
      <span>💵 <b>${money(total)}</b></span>
    </div>
    <div class="impresion-mid">
      <span>Base: ${money(baseEco(eco))}</span>
      <span>Extras: ${money(totalExtrasEco(eco))}</span>
    </div>
    <div class="impresion-actions">
      <button class="neu-btn icon" data-action="abonar" title="Registrar abono" ${pagado ? "disabled" : ""}>💰</button>
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="abonar"]').addEventListener("click", () => abrirModalAbono("eco_solvente", eco.id));
  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarEco(eco.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => eliminarEco(eco.id));

  return card;
}

async function eliminarEco(id) {
  const eco = state.ecoSolvente.find((x) => x.id === id);
  if (!eco) return;
  if (!confirm(`¿Eliminar el pedido eco solvente de "${eco.cliente}" del ${fechaLegible(eco.fecha)}? Esta acción no se puede deshacer.`)) return;
  await apiEliminarEco(id);
  render();
}

document.getElementById("buscadorEco").addEventListener("input", (e) => {
  filtroTextoEco = e.target.value;
  renderEcoList();
});

function activarFiltroPago(grupoEl, valor) {
  grupoEl.querySelectorAll(".filtro-pago-btn").forEach((b) => b.classList.toggle("active", b.dataset.filtro === valor));
}

document.getElementById("filtroPagoEco").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  filtroPagoEco = btn.dataset.filtro;
  activarFiltroPago(document.getElementById("filtroPagoEco"), filtroPagoEco);
  renderEcoList();
});
