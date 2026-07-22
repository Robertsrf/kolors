import { state } from "./state.js";
import { escapeHtml } from "./utils.js";
import { renderBoard } from "./ui/tablero.js";
import { renderImpresionesList } from "./ui/impresiones.js";
import { renderEcoBoard } from "./ui/ecoSolvente.js";
import { renderPerdidasList } from "./ui/perdidas.js";
import { renderClientesGrid, abrirDetalleCliente, getClienteSeleccionado } from "./ui/clientes.js";
import { renderStats } from "./ui/stats.js";

function actualizarListaClientes() {
  const nombres = new Set();
  state.pedidos.forEach((p) => {
    if (p.cliente.nombre) nombres.add(p.cliente.nombre.trim());
  });
  state.impresiones.forEach((i) => {
    if (i.cliente) nombres.add(i.cliente.trim());
  });
  state.ecoSolvente.forEach((e) => {
    if (e.cliente) nombres.add(e.cliente.trim());
  });
  const datalist = document.getElementById("listaClientes");
  datalist.innerHTML = Array.from(nombres)
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((n) => `<option value="${escapeHtml(n)}"></option>`)
    .join("");
}

export function render() {
  renderBoard();
  actualizarListaClientes();
  const activeTab = document.querySelector(".tab-btn.active");
  const tab = activeTab ? activeTab.dataset.tab : "tablero";
  if (tab === "stats") renderStats();
  if (tab === "impresiones") renderImpresionesList();
  if (tab === "ecosolvente") renderEcoBoard();
  if (tab === "perdidas") renderPerdidasList();
  if (tab === "clientes") {
    const sel = getClienteSeleccionado();
    if (sel) abrirDetalleCliente(sel);
    else renderClientesGrid();
  }
}
