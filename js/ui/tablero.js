import {
  state,
  colorFaseCamisas,
  totalCamisas,
  totalPedidoMonto,
  saldoPendiente,
  estaPagado,
  fechaFaseActual,
} from "../state.js";
import { money, escapeHtml, fechaLegible, haceDias, ajustarAltoTablero } from "../utils.js";
import { actualizarFasePedido, eliminarPedido as apiEliminarPedido } from "../api.js";
import { render } from "../render.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarPedido } from "../modales/pedido.js";

let filtroTexto = "";
let filtroPagoPedidos = "todos";

export function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  const fases = state.fasesCamisas;
  const idsConocidos = new Set(fases.map((f) => f.id));

  const texto = filtroTexto.trim().toLowerCase();
  const visibles = state.pedidos
    .filter((p) => !texto || p.cliente.nombre.toLowerCase().includes(texto))
    .filter((p) => {
      if (filtroPagoPedidos === "debe") return !estaPagado(p);
      if (filtroPagoPedidos === "pagado") return estaPagado(p);
      return true;
    });

  fases.forEach((fase, colIdx) => {
    // Los pedidos con una fase desconocida (renombrada/borrada) caen en la 1ra columna.
    const enFase = visibles.filter((p) => p.estado === fase.id || (colIdx === 0 && !idsConocidos.has(p.estado)));
    const totalCamisasFase = enFase.reduce((s, p) => s + totalCamisas(p), 0);

    const col = document.createElement("div");
    col.className = "column";
    habilitarSoltar(col, fase.id);

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `
      <span class="column-title"><span class="dot" style="background:${fase.color}"></span>${escapeHtml(fase.nombre)}</span>
      <span class="column-counts"><span><b>${enFase.length}</b> ped.</span><span><b>${totalCamisasFase}</b> cam.</span></span>
    `;
    col.appendChild(header);

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "cards";
    if (enFase.length === 0) {
      cardsWrap.innerHTML = `<div class="empty-col">Sin pedidos</div>`;
    } else {
      enFase.forEach((p) => cardsWrap.appendChild(renderCard(p)));
    }
    col.appendChild(cardsWrap);
    board.appendChild(col);
  });
  ajustarAltoTablero(board);
}

function habilitarSoltar(col, faseId) {
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
    moverPedidoAFase(id, faseId);
  });
}

async function moverPedidoAFase(id, faseId) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p || p.estado === faseId) return;
  await actualizarFasePedido(id, faseId);
  render();
}

function renderCard(p) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.borderLeftColor = colorFaseCamisas(p.estado);
  card.draggable = true;
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", p.id);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("arrastrando");
  });
  card.addEventListener("dragend", () => card.classList.remove("arrastrando"));

  const fases = state.fasesCamisas;
  const camisas = totalCamisas(p);
  const total = totalPedidoMonto(p);
  const saldo = saldoPendiente(p);
  const pagado = estaPagado(p);
  let idx = fases.findIndex((f) => f.id === p.estado);
  if (idx < 0) idx = 0;
  const puedeAvanzar = idx < fases.length - 1;
  const puedeRetroceder = idx > 0;

  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-cliente">${escapeHtml(p.cliente.nombre)}</div>
        <div class="card-tel">${escapeHtml(p.cliente.telefono || "Sin teléfono")}</div>
      </div>
      <span class="badge ${pagado ? "pagado" : "debe"}">${pagado ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
    </div>
    ${p.descripcion ? `<div class="impresion-desc">${escapeHtml(p.descripcion)}</div>` : ""}
    <div class="card-mid">
      <span>👕 <b>${camisas}</b> camisas</span>
      <span>💵 <b>${money(total)}</b></span>
    </div>
    <div class="card-fecha">${fechaLegible(fechaFaseActual(p))} · ${haceDias(fechaFaseActual(p))}</div>
    <div class="card-actions">
      <button class="neu-btn icon" data-action="retroceder" title="Retroceder fase" ${!puedeRetroceder ? "disabled" : ""}>◀</button>
      <button class="neu-btn icon" data-action="avanzar" title="Avanzar fase" ${!puedeAvanzar ? "disabled" : ""}>▶</button>
      <button class="neu-btn icon" data-action="abonar" title="Registrar abono" ${pagado ? "disabled" : ""}>💰</button>
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="retroceder"]').addEventListener("click", () => retrocederFase(p.id));
  card.querySelector('[data-action="avanzar"]').addEventListener("click", () => avanzarFase(p.id));
  card.querySelector('[data-action="abonar"]').addEventListener("click", () => abrirModalAbono("pedido", p.id));
  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarPedido(p.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => eliminarPedido(p.id));

  return card;
}

async function avanzarFase(id) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  const fases = state.fasesCamisas;
  let idx = fases.findIndex((f) => f.id === p.estado);
  if (idx < 0) idx = 0;
  if (idx >= fases.length - 1) return;
  await actualizarFasePedido(id, fases[idx + 1].id);
  render();
}

async function retrocederFase(id) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  const fases = state.fasesCamisas;
  let idx = fases.findIndex((f) => f.id === p.estado);
  if (idx < 0) idx = 0;
  if (idx <= 0) return;
  await actualizarFasePedido(id, fases[idx - 1].id);
  render();
}

async function eliminarPedido(id) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar el pedido de "${p.cliente.nombre}"? Esta acción no se puede deshacer.`)) return;
  await apiEliminarPedido(id);
  render();
}

document.getElementById("buscador").addEventListener("input", (e) => {
  filtroTexto = e.target.value;
  renderBoard();
});

function activarFiltroPago(grupoEl, valor) {
  grupoEl.querySelectorAll(".filtro-pago-btn").forEach((b) => b.classList.toggle("active", b.dataset.filtro === valor));
}

document.getElementById("filtroPagoPedidos").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  filtroPagoPedidos = btn.dataset.filtro;
  activarFiltroPago(document.getElementById("filtroPagoPedidos"), filtroPagoPedidos);
  renderBoard();
});
