import {
  state,
  colorFaseEco,
  REMATE_LABEL,
  MATERIAL_ECO_LABEL,
  TIPO_TRABAJO_ECO_LABEL,
  ecoEsSimple,
  descripcionMedidaEco,
  m2Eco,
  totalExtrasEco,
  totalEco,
  saldoEco,
  estaPagadoEco,
  fechaFaseActualEco,
} from "../state.js";
import { money, fmt, escapeHtml, fechaLegible, haceDias, ajustarAltoTablero, compararPorEntrega } from "../utils.js";
import { actualizarFaseEco, eliminarEco as apiEliminarEco } from "../api.js";
import { render } from "../render.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarEco } from "../modales/eco.js";

let filtroTextoEco = "";
let filtroPagoEco = "todos";

function badgesExtras(eco) {
  const badges = [];
  if (ecoEsSimple(eco)) {
    badges.push(TIPO_TRABAJO_ECO_LABEL[eco.tipoTrabajo] || "🏷️ Stickers");
    if (eco.llevaDiseno) badges.push("🎨 Diseño");
    return `<div class="impresion-extras">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>`;
  }
  badges.push(`📄 ${MATERIAL_ECO_LABEL[eco.material] || "Banner"}`);
  if (eco.remate && eco.remate !== "ninguno") badges.push(REMATE_LABEL[eco.remate] || eco.remate);
  if (eco.llevaDiseno) badges.push("🎨 Diseño");
  if (eco.llevaEstructura) badges.push("🏗️ Estructura");
  if (eco.llevaCuadroMadera) badges.push("🖼️ Cuadro madera");
  if (eco.clearModo && eco.clearModo !== "ninguno") badges.push("🧴 Clear");
  if (eco.transferModo && eco.transferModo !== "ninguno") badges.push("🔁 Transfer");
  if (eco.pvcModo && eco.pvcModo !== "ninguno") badges.push("🧱 PVC");
  return `<div class="impresion-extras">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>`;
}

export function renderEcoBoard() {
  const board = document.getElementById("ecoBoard");
  board.innerHTML = "";

  const texto = filtroTextoEco.trim().toLowerCase();
  const visibles = state.ecoSolvente
    .filter((e) => !texto || (e.cliente || "").toLowerCase().includes(texto))
    .filter((e) => {
      if (filtroPagoEco === "debe") return !estaPagadoEco(e);
      if (filtroPagoEco === "pagado") return estaPagadoEco(e);
      return true;
    });

  const fases = state.fasesEco;
  const idsConocidos = new Set(fases.map((f) => f.id));

  fases.forEach((fase, colIdx) => {
    const enFase = visibles
      .filter((e) => (e.estado || "Pedido") === fase.id || (colIdx === 0 && !idsConocidos.has(e.estado || "Pedido")))
      .sort(compararPorEntrega);
    const m2Fase = enFase.reduce((s, e) => s + m2Eco(e), 0);

    const col = document.createElement("div");
    col.className = "column";
    habilitarSoltarEco(col, fase.id);

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `
      <span class="column-title"><span class="dot" style="background:${fase.color}"></span>${escapeHtml(fase.nombre)}</span>
      <span class="column-counts"><span><b>${enFase.length}</b> ped.</span><span><b>${fmt(m2Fase)}</b> m²</span></span>
    `;
    col.appendChild(header);

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "cards";
    if (enFase.length === 0) {
      cardsWrap.innerHTML = `<div class="empty-col">Sin pedidos</div>`;
    } else {
      enFase.forEach((e) => cardsWrap.appendChild(renderEcoCard(e)));
    }
    col.appendChild(cardsWrap);
    board.appendChild(col);
  });
  ajustarAltoTablero(board);
}

function habilitarSoltarEco(col, faseId) {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    col.classList.add("drop-activo");
  });
  col.addEventListener("dragleave", (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove("drop-activo");
  });
  col.addEventListener("drop", (e) => {
    e.preventDefault();
    col.classList.remove("drop-activo");
    const id = e.dataTransfer.getData("text/plain");
    moverEcoAFase(id, faseId);
  });
}

async function moverEcoAFase(id, faseId) {
  const e = state.ecoSolvente.find((x) => x.id === id);
  if (!e || (e.estado || "Pedido") === faseId) return;
  await actualizarFaseEco(id, faseId);
  render();
}

function renderEcoCard(eco) {
  const card = document.createElement("div");
  card.className = "card";
  const estado = eco.estado || "Pedido";
  card.style.borderLeftColor = colorFaseEco(estado);
  card.draggable = true;
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", eco.id);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("arrastrando");
  });
  card.addEventListener("dragend", () => card.classList.remove("arrastrando"));

  const fases = state.fasesEco;
  const total = totalEco(eco);
  const saldo = saldoEco(eco);
  const pagado = estaPagadoEco(eco);
  let idx = fases.findIndex((f) => f.id === estado);
  if (idx < 0) idx = 0;
  const puedeAvanzar = idx < fases.length - 1;
  const puedeRetroceder = idx > 0;

  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-cliente">${escapeHtml(eco.cliente)}</div>
        <div class="card-tel">${descripcionMedidaEco(eco)}</div>
      </div>
      <span class="badge ${pagado ? "pagado" : "debe"}">${pagado ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
    </div>
    ${eco.descripcion ? `<div class="impresion-desc">${escapeHtml(eco.descripcion)}</div>` : ""}
    ${badgesExtras(eco)}
    <div class="card-mid">
      <span>💵 <b>${money(total)}</b></span>
      <span>Extras: <b>${money(totalExtrasEco(eco))}</b></span>
    </div>
    <div class="card-fecha">${fechaLegible(fechaFaseActualEco(eco))} · ${haceDias(fechaFaseActualEco(eco))}</div>
    <div class="card-actions">
      <button class="neu-btn icon" data-action="retroceder" title="Retroceder fase" ${!puedeRetroceder ? "disabled" : ""}>◀</button>
      <button class="neu-btn icon" data-action="avanzar" title="Avanzar fase" ${!puedeAvanzar ? "disabled" : ""}>▶</button>
      <button class="neu-btn icon" data-action="abonar" title="Registrar abono" ${pagado ? "disabled" : ""}>💰</button>
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="retroceder"]').addEventListener("click", () => retrocederFaseEco(eco.id));
  card.querySelector('[data-action="avanzar"]').addEventListener("click", () => avanzarFaseEco(eco.id));
  card.querySelector('[data-action="abonar"]').addEventListener("click", () => abrirModalAbono("eco_solvente", eco.id));
  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarEco(eco.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => eliminarEco(eco.id));

  return card;
}

async function avanzarFaseEco(id) {
  const e = state.ecoSolvente.find((x) => x.id === id);
  if (!e) return;
  const fases = state.fasesEco;
  let idx = fases.findIndex((f) => f.id === (e.estado || "Pedido"));
  if (idx < 0) idx = 0;
  if (idx >= fases.length - 1) return;
  await actualizarFaseEco(id, fases[idx + 1].id);
  render();
}

async function retrocederFaseEco(id) {
  const e = state.ecoSolvente.find((x) => x.id === id);
  if (!e) return;
  const fases = state.fasesEco;
  let idx = fases.findIndex((f) => f.id === (e.estado || "Pedido"));
  if (idx < 0) idx = 0;
  if (idx <= 0) return;
  await actualizarFaseEco(id, fases[idx - 1].id);
  render();
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
  renderEcoBoard();
});

function activarFiltroPago(grupoEl, valor) {
  grupoEl.querySelectorAll(".filtro-pago-btn").forEach((b) => b.classList.toggle("active", b.dataset.filtro === valor));
}

document.getElementById("filtroPagoEco").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  filtroPagoEco = btn.dataset.filtro;
  activarFiltroPago(document.getElementById("filtroPagoEco"), filtroPagoEco);
  renderEcoBoard();
});
