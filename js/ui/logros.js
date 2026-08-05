import {
  state,
  faseFinalCamisas,
  faseFinalEco,
  totalCamisas,
  totalPedidoMonto,
  totalAbonadoPedido,
  m2Impresion,
  totalImpresion,
  totalAbonadoImpresion,
  m2Eco,
  totalEco,
  totalAbonadoEco,
} from "../state.js";
import { money, fmt } from "../utils.js";

const overlay = document.getElementById("modalLogrosOverlay");
const grid = document.getElementById("logrosGrid");
const resumen = document.getElementById("logrosResumen");

// Categorías de logros (los umbrales suman 100 en total).
const CATEGORIAS = [
  { key: "camEnt", icono: "👕", desc: "camisas entregadas", dinero: false, metas: [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000] },
  { key: "pedCamEnt", icono: "📋", desc: "pedidos de camisa entregados", dinero: false, metas: [1, 5, 10, 20, 35, 50, 75, 100, 150, 200] },
  { key: "ecoM2Ent", icono: "🏳️", desc: "m² de eco solvente entregados", dinero: false, metas: [1, 5, 10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500] },
  { key: "pedEcoEnt", icono: "🖼️", desc: "pedidos eco entregados", dinero: false, metas: [1, 5, 10, 20, 35, 50, 75, 100, 150, 200] },
  { key: "subM2", icono: "🖨️", desc: "m² de sublimación", dinero: false, metas: [1, 5, 10, 25, 50, 100, 150, 200, 300, 500, 750, 1000] },
  { key: "facturado", icono: "💵", desc: "facturados", dinero: true, metas: [50, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000, 35000, 50000] },
  { key: "clientes", icono: "🤝", desc: "clientes atendidos", dinero: false, metas: [1, 3, 5, 10, 15, 20, 30, 40, 60, 80] },
  { key: "cobrado", icono: "💰", desc: "cobrados", dinero: true, metas: [100, 500, 1000, 2500, 5000, 10000, 20000, 35000] },
  { key: "stickers", icono: "🏷️", desc: "pedidos de stickers", dinero: false, metas: [1, 5, 10, 25, 50, 100] },
];

function metricasAnio() {
  const anio = new Date().getFullYear();
  const enAnio = (iso) => iso && new Date(iso).getFullYear() === anio;
  const finalCam = faseFinalCamisas();
  const finalEco = faseFinalEco();
  const met = { camEnt: 0, pedCamEnt: 0, ecoM2Ent: 0, pedEcoEnt: 0, subM2: 0, facturado: 0, cobrado: 0, stickers: 0 };
  const clientes = new Set();

  state.pedidos.forEach((p) => {
    const fecha = p.fechaInicio || (p.fechas && p.fechas.pedido) || p.creado;
    if (enAnio(fecha)) {
      met.facturado += totalPedidoMonto(p);
      met.cobrado += totalAbonadoPedido(p);
      if (p.cliente.nombre) clientes.add(p.cliente.nombre.trim().toLowerCase());
    }
    if (p.estado === finalCam && enAnio(p.fechaEstado)) {
      met.camEnt += totalCamisas(p);
      met.pedCamEnt += 1;
    }
  });
  state.impresiones.forEach((i) => {
    const fecha = i.fechaInicio || i.fecha || i.creado;
    if (enAnio(fecha)) {
      met.subM2 += m2Impresion(i);
      met.facturado += totalImpresion(i);
      met.cobrado += totalAbonadoImpresion(i);
      if (i.cliente) clientes.add(i.cliente.trim().toLowerCase());
    }
  });
  state.ecoSolvente.forEach((e) => {
    const fecha = e.fechaInicio || e.fecha || e.creado;
    if (enAnio(fecha)) {
      met.facturado += totalEco(e);
      met.cobrado += totalAbonadoEco(e);
      if (e.cliente) clientes.add(e.cliente.trim().toLowerCase());
      if ((e.tipoTrabajo || "impresion") === "stickers") met.stickers += 1;
    }
    if (e.estado === finalEco && enAnio(e.fechaEstado)) {
      met.ecoM2Ent += m2Eco(e);
      met.pedEcoEnt += 1;
    }
  });
  met.clientes = clientes.size;
  return met;
}

export function renderLogros() {
  const met = metricasAnio();
  const anio = new Date().getFullYear();
  const logros = [];
  CATEGORIAS.forEach((cat) => {
    const actual = met[cat.key];
    cat.metas.forEach((meta) => {
      const nombre = cat.dinero ? `${money(meta)} ${cat.desc}` : `${meta} ${cat.desc}`;
      const desbloqueado = actual >= meta;
      const pct = Math.min(100, meta > 0 ? (actual / meta) * 100 : 0);
      logros.push({ icono: cat.icono, nombre, desbloqueado, pct, actual, meta, dinero: cat.dinero });
    });
  });

  const cumplidos = logros.filter((l) => l.desbloqueado).length;
  resumen.innerHTML = `<div class="logros-resumen">🏆 ${cumplidos} / ${logros.length} logros · Año ${anio}</div>
    <p class="abono-contexto" style="text-align:center">Se cuentan los del año en curso; el 1 de enero se reinician.</p>`;

  grid.innerHTML = logros
    .map(
      (l) => `<div class="logro ${l.desbloqueado ? "desbloqueado" : ""}">
        <div class="ic">${l.desbloqueado ? l.icono : "🔒"}</div>
        <div class="nom">${l.nombre}</div>
        <div class="prog">${l.dinero ? money(l.actual) : fmt(l.actual)} / ${l.dinero ? money(l.meta) : fmt(l.meta)}</div>
        <div class="mini-barra"><div class="mini-relleno" style="width:${l.pct}%"></div></div>
      </div>`
    )
    .join("");
}

document.getElementById("btnLogros").addEventListener("click", () => {
  renderLogros();
  overlay.classList.add("active");
});
document.getElementById("btnCerrarLogros").addEventListener("click", () => overlay.classList.remove("active"));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});
