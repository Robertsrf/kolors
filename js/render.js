import { state } from "./state.js";
import { escapeHtml, capturarScroll, restaurarScroll } from "./utils.js";
import { renderBoard } from "./ui/tablero.js";
import { renderImpresionesList } from "./ui/impresiones.js";
import { renderEcoBoard } from "./ui/ecoSolvente.js";
import { renderPerdidasList } from "./ui/perdidas.js";
import { renderSesionesFoto } from "./ui/sesionesFoto.js";
import { renderClientesGrid, abrirDetalleCliente, getClienteSeleccionado } from "./ui/clientes.js";
import { renderStats } from "./ui/stats.js";
import { refrescarNotificaciones } from "./ui/notificaciones.js";
import { renderMetas } from "./ui/metas.js";
import { renderHistorialMetas } from "./ui/historialMetas.js";
import { revisarEtapaFinal } from "./ui/avisoEtapaFinal.js";

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
  // Dónde estaba mirando cada quien antes de repintar. La pantalla se refresca
  // sola cuando otro usuario cambia algo: sin esto, a quien estaba leyendo una
  // tarjeta se le iba de la vista cada vez.
  const sitio = capturarScroll();

  // Antes de pintar: ¿alguna tarjeta acaba de llegar a la última etapa? (venga
  // el cambio de esta pantalla o de otro usuario).
  revisarEtapaFinal();
  renderBoard();
  actualizarListaClientes();
  refrescarNotificaciones();
  if (document.getElementById("modalMetasOverlay").classList.contains("active")) renderMetas();
  const activeTab = document.querySelector(".tab-btn.active");
  const tab = activeTab ? activeTab.dataset.tab : "tablero";
  if (tab === "stats") renderStats();
  if (tab === "metashist") renderHistorialMetas();
  if (tab === "impresiones") renderImpresionesList();
  if (tab === "ecosolvente") renderEcoBoard();
  if (tab === "perdidas") renderPerdidasList();
  if (tab === "fotos") renderSesionesFoto();
  if (tab === "clientes") {
    const sel = getClienteSeleccionado();
    if (sel) abrirDetalleCliente(sel);
    else renderClientesGrid();
  }

  restaurarScroll(sitio);
}
