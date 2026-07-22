import {
  obtenerClientesAgregados,
  totalPedidoMonto,
  totalAbonadoPedido,
  saldoPendiente,
  estaPagado,
  totalCamisas,
  impresionCobraDinero,
  m2Impresion,
  totalImpresion,
  totalAbonadoImpresion,
  saldoImpresion,
  estaPagadaImpresion,
  TIPO_IMPRESION_LABEL,
  m2Eco,
  totalEco,
  totalAbonadoEco,
  saldoEco,
  estaPagadoEco,
  historialPagosPedido,
  historialPagosImpresion,
  historialPagosEco,
} from "../state.js";
import { money, fmt, escapeHtml, fechaLegible, statCardHtml, pagosListaHtml } from "../utils.js";
import { abrirModalAbono } from "../modales/abono.js";
import { abrirModalEditarPedido } from "../modales/pedido.js";
import { abrirModalEditarImpresion } from "../modales/impresion.js";
import { abrirModalEditarEco } from "../modales/eco.js";

let clienteSeleccionado = null;

export function getClienteSeleccionado() {
  return clienteSeleccionado;
}
export function setClienteSeleccionado(key) {
  clienteSeleccionado = key;
}

function detalleItemPedidoHtml(p) {
  const total = totalPedidoMonto(p);
  const saldo = saldoPendiente(p);
  const pagado = estaPagado(p);
  return `
    <div class="detalle-item neu-raised">
      <div class="detalle-item-top">
        <div>
          <div class="detalle-item-titulo">${p.estado} · ${totalCamisas(p)} camisas</div>
          <div class="detalle-item-sub">Pedido el ${fechaLegible(p.fechas.pedido)}</div>
        </div>
        <span class="badge ${pagado ? "pagado" : "debe"}">${pagado ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
      </div>
      ${p.descripcion ? `<div class="impresion-desc">${escapeHtml(p.descripcion)}</div>` : ""}
      <div class="impresion-mid"><span>Total: <b>${money(total)}</b></span><span>Abonado: <b>${money(totalAbonadoPedido(p))}</b></span></div>
      ${pagosListaHtml(historialPagosPedido(p))}
      <div class="impresion-actions">
        <button type="button" class="neu-btn small" data-pedido-abonar="${p.id}" ${pagado ? "disabled" : ""}>💰 Abonar</button>
        <button type="button" class="neu-btn small" data-pedido-editar="${p.id}">✏️ Editar</button>
      </div>
    </div>
  `;
}

function detalleItemImpresionHtml(imp) {
  const total = totalImpresion(imp);
  const saldo = saldoImpresion(imp);
  const pagada = estaPagadaImpresion(imp);
  const tipo = imp.tipo || "otros";
  const cobra = impresionCobraDinero(tipo);
  return `
    <div class="detalle-item neu-raised">
      <div class="detalle-item-top">
        <div>
          <div class="detalle-item-titulo">${fmt(m2Impresion(imp))} m²${imp.descripcion ? " · " + escapeHtml(imp.descripcion) : ""}</div>
          <div class="detalle-item-sub">Impreso el ${fechaLegible(imp.fecha)} · ${fmt(imp.ancho)}×${fmt(imp.alto)} m</div>
        </div>
        <span class="badge tipo-${tipo}">${TIPO_IMPRESION_LABEL[tipo] || tipo}</span>
      </div>
      ${
        cobra
          ? `<div class="impresion-mid"><span>Total: <b>${money(total)}</b></span><span>Abonado: <b>${money(totalAbonadoImpresion(imp))}</b></span></div>
             <span class="badge ${pagada ? "pagado" : "debe"}">${pagada ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
             ${pagosListaHtml(historialPagosImpresion(imp))}`
          : `<div class="impresion-mid"><span><i>No se cobra aparte (incluido en el precio de la camisa/artículo)</i></span></div>`
      }
      <div class="impresion-actions">
        <button type="button" class="neu-btn small" data-impresion-abonar="${imp.id}" ${!cobra || pagada ? "disabled" : ""}>💰 Abonar</button>
        <button type="button" class="neu-btn small" data-impresion-editar="${imp.id}">✏️ Editar</button>
      </div>
    </div>
  `;
}

function detalleItemEcoHtml(eco) {
  const total = totalEco(eco);
  const saldo = saldoEco(eco);
  const pagado = estaPagadoEco(eco);
  return `
    <div class="detalle-item neu-raised">
      <div class="detalle-item-top">
        <div>
          <div class="detalle-item-titulo">${fmt(m2Eco(eco))} m²${eco.descripcion ? " · " + escapeHtml(eco.descripcion) : ""}</div>
          <div class="detalle-item-sub">Pedido el ${fechaLegible(eco.fecha)} · ${fmt(eco.ancho)}×${fmt(eco.alto)} m</div>
        </div>
        <span class="badge ${pagado ? "pagado" : "debe"}">${pagado ? "✔ Pagado" : "⚠️ Debe " + money(saldo)}</span>
      </div>
      <div class="impresion-mid"><span>Total: <b>${money(total)}</b></span><span>Abonado: <b>${money(totalAbonadoEco(eco))}</b></span></div>
      ${pagosListaHtml(historialPagosEco(eco))}
      <div class="impresion-actions">
        <button type="button" class="neu-btn small" data-eco-abonar="${eco.id}" ${pagado ? "disabled" : ""}>💰 Abonar</button>
        <button type="button" class="neu-btn small" data-eco-editar="${eco.id}">✏️ Editar</button>
      </div>
    </div>
  `;
}

export function renderClientesGrid() {
  document.getElementById("clientesListaVista").style.display = "";
  document.getElementById("clienteDetalleVista").style.display = "none";

  const grid = document.getElementById("clientesGrid");
  grid.innerHTML = "";
  const texto = (document.getElementById("buscadorClientes").value || "").trim().toLowerCase();
  const clientes = obtenerClientesAgregados().filter((c) => !texto || c.nombre.toLowerCase().includes(texto));

  if (clientes.length === 0) {
    grid.innerHTML = `<div class="empty-state">Todavía no hay clientes registrados.</div>`;
    return;
  }

  clientes.forEach((c) => {
    const deudaCamisas = c.pedidos.reduce((s, p) => s + Math.max(saldoPendiente(p), 0), 0);
    const deudaImpresiones = c.impresiones.reduce((s, i) => s + Math.max(saldoImpresion(i), 0), 0);
    const deudaEco = c.ecoSolvente.reduce((s, e) => s + Math.max(saldoEco(e), 0), 0);
    const deudaTotal = deudaCamisas + deudaImpresiones + deudaEco;

    const card = document.createElement("div");
    card.className = "cliente-card neu-raised";
    card.innerHTML = `
      <div class="cliente-nombre">${escapeHtml(c.nombre)}</div>
      <div class="cliente-resumen"><span>👕 ${c.pedidos.length} pedido(s)</span><span>🖨️ ${c.impresiones.length} sublimación(es)</span><span>🏳️ ${c.ecoSolvente.length} eco solvente</span></div>
      <div class="cliente-resumen"><span>Saldo pendiente total</span><b class="cliente-deuda ${deudaTotal > 0 ? "debe" : "al-dia"}">${deudaTotal > 0 ? money(deudaTotal) : "✔ Al día"}</b></div>
      <div class="cliente-deuda-desglose">
        <div class="cliente-deuda-fila"><span>👕 Camisas</span><b class="${deudaCamisas > 0 ? "debe" : "al-dia"}">${deudaCamisas > 0 ? money(deudaCamisas) : "Al día"}</b></div>
        <div class="cliente-deuda-fila"><span>🖨️ Sublimación</span><b class="${deudaImpresiones > 0 ? "debe" : "al-dia"}">${deudaImpresiones > 0 ? money(deudaImpresiones) : "Al día"}</b></div>
        <div class="cliente-deuda-fila"><span>🏳️ Eco solvente</span><b class="${deudaEco > 0 ? "debe" : "al-dia"}">${deudaEco > 0 ? money(deudaEco) : "Al día"}</b></div>
      </div>
    `;
    card.addEventListener("click", () => abrirDetalleCliente(c.key));
    grid.appendChild(card);
  });
}

export function abrirDetalleCliente(key) {
  const c = obtenerClientesAgregados().find((x) => x.key === key);
  if (!c) {
    clienteSeleccionado = null;
    renderClientesGrid();
    return;
  }
  clienteSeleccionado = key;

  document.getElementById("clientesListaVista").style.display = "none";
  document.getElementById("clienteDetalleVista").style.display = "";

  const totalCamisasFacturado = c.pedidos.reduce((s, p) => s + totalPedidoMonto(p), 0);
  const totalCamisasAbonado = c.pedidos.reduce((s, p) => s + totalAbonadoPedido(p), 0);
  const totalImpresionesFacturado = c.impresiones.reduce((s, i) => s + totalImpresion(i), 0);
  const totalImpresionesAbonado = c.impresiones.reduce((s, i) => s + totalAbonadoImpresion(i), 0);
  const totalEcoFacturado = c.ecoSolvente.reduce((s, e) => s + totalEco(e), 0);
  const totalEcoAbonado = c.ecoSolvente.reduce((s, e) => s + totalAbonadoEco(e), 0);

  const saldoCamisas = Math.max(totalCamisasFacturado - totalCamisasAbonado, 0);
  const saldoImpresiones = Math.max(totalImpresionesFacturado - totalImpresionesAbonado, 0);
  const saldoEcoTotal = Math.max(totalEcoFacturado - totalEcoAbonado, 0);
  const saldoTotal = saldoCamisas + saldoImpresiones + saldoEcoTotal;

  const pedidosOrdenados = [...c.pedidos].sort((a, b) => new Date(b.fechas.pedido) - new Date(a.fechas.pedido));
  const impresionesOrdenadas = [...c.impresiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const ecoOrdenados = [...c.ecoSolvente].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  document.getElementById("clienteDetalleContenido").innerHTML = `
    <div class="detalle-header">
      <h2>${escapeHtml(c.nombre)}</h2>
      ${c.telefono ? `<span class="card-tel">📞 ${escapeHtml(c.telefono)}</span>` : ""}
    </div>
    <div class="detalle-resumen-grid">
      ${statCardHtml("💵 Facturado total", money(totalCamisasFacturado + totalImpresionesFacturado + totalEcoFacturado))}
      ${statCardHtml("✅ Abonado total", money(totalCamisasAbonado + totalImpresionesAbonado + totalEcoAbonado))}
      ${statCardHtml("⚠️ Saldo pendiente total", money(saldoTotal))}
    </div>
    <div class="detalle-resumen-grid">
      ${statCardHtml("👕 Debe en camisas", money(saldoCamisas))}
      ${statCardHtml("🖨️ Debe en sublimación", money(saldoImpresiones))}
      ${statCardHtml("🏳️ Debe en eco solvente", money(saldoEcoTotal))}
    </div>
    <div class="detalle-seccion">
      <h3>👕 Camisas (${pedidosOrdenados.length})</h3>
      ${pedidosOrdenados.length ? pedidosOrdenados.map(detalleItemPedidoHtml).join("") : '<div class="sin-pagos">Sin pedidos de camisas.</div>'}
    </div>
    <div class="detalle-seccion">
      <h3>🖨️ Sublimación (${impresionesOrdenadas.length})</h3>
      ${impresionesOrdenadas.length ? impresionesOrdenadas.map(detalleItemImpresionHtml).join("") : '<div class="sin-pagos">Sin impresiones registradas.</div>'}
    </div>
    <div class="detalle-seccion">
      <h3>🏳️ Eco solvente (${ecoOrdenados.length})</h3>
      ${ecoOrdenados.length ? ecoOrdenados.map(detalleItemEcoHtml).join("") : '<div class="sin-pagos">Sin pedidos de eco solvente.</div>'}
    </div>
  `;

  document.querySelectorAll("#clienteDetalleContenido [data-pedido-abonar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalAbono("pedido", btn.dataset.pedidoAbonar));
  });
  document.querySelectorAll("#clienteDetalleContenido [data-pedido-editar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEditarPedido(btn.dataset.pedidoEditar));
  });
  document.querySelectorAll("#clienteDetalleContenido [data-impresion-abonar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalAbono("impresion", btn.dataset.impresionAbonar));
  });
  document.querySelectorAll("#clienteDetalleContenido [data-impresion-editar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEditarImpresion(btn.dataset.impresionEditar));
  });
  document.querySelectorAll("#clienteDetalleContenido [data-eco-abonar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalAbono("eco_solvente", btn.dataset.ecoAbonar));
  });
  document.querySelectorAll("#clienteDetalleContenido [data-eco-editar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEditarEco(btn.dataset.ecoEditar));
  });
}

document.getElementById("buscadorClientes").addEventListener("input", renderClientesGrid);
document.getElementById("btnVolverClientes").addEventListener("click", () => {
  clienteSeleccionado = null;
  renderClientesGrid();
});
