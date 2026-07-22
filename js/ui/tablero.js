import { state, FASES, CLAVE_FECHA, COLOR_FASE, totalCamisas, totalPedidoMonto, saldoPendiente, estaPagado, fechaFaseActual } from "../state.js";
import { money, escapeHtml, fechaLegible, haceDias } from "../utils.js";
import { actualizarFasePedido, eliminarPedido as apiEliminarPedido } from "../api.js";
import { render } from "../render.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarPedido } from "../modales/pedido.js";

let filtroTexto = "";
let filtroPagoPedidos = "todos";

export function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  const texto = filtroTexto.trim().toLowerCase();
  const visibles = state.pedidos
    .filter((p) => !texto || p.cliente.nombre.toLowerCase().includes(texto))
    .filter((p) => {
      if (filtroPagoPedidos === "debe") return !estaPagado(p);
      if (filtroPagoPedidos === "pagado") return estaPagado(p);
      return true;
    });

  FASES.forEach((fase) => {
    const enFase = visibles.filter((p) => p.estado === fase);
    const totalPedidosFase = enFase.length;
    const totalCamisasFase = enFase.reduce((s, p) => s + totalCamisas(p), 0);

    const col = document.createElement("div");
    col.className = "column";

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `
      <span class="column-title"><span class="dot" style="background:${COLOR_FASE[fase]}"></span>${fase}</span>
      <span class="column-counts"><span><b>${totalPedidosFase}</b> ped.</span><span><b>${totalCamisasFase}</b> cam.</span></span>
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
}

function renderCard(p) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.borderLeftColor = COLOR_FASE[p.estado];

  const camisas = totalCamisas(p);
  const total = totalPedidoMonto(p);
  const saldo = saldoPendiente(p);
  const pagado = estaPagado(p);
  const idxActual = FASES.indexOf(p.estado);
  const puedeAvanzar = idxActual < FASES.length - 1;
  const puedeRetroceder = idxActual > 0;

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
  const idx = FASES.indexOf(p.estado);
  if (idx >= FASES.length - 1) return;
  const nuevaFase = FASES[idx + 1];
  const campoFecha = "fecha_" + CLAVE_FECHA[nuevaFase];
  await actualizarFasePedido(id, nuevaFase, campoFecha, new Date().toISOString());
  render();
}

async function retrocederFase(id) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  const idx = FASES.indexOf(p.estado);
  if (idx <= 0) return;
  const faseActual = p.estado;
  const campoFecha = "fecha_" + CLAVE_FECHA[faseActual];
  await actualizarFasePedido(id, FASES[idx - 1], campoFecha, null);
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
