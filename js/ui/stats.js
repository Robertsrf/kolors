import {
  state,
  FASES,
  GENEROS,
  PALETA_GENERO,
  REMATE_LABEL,
  MATERIAL_ECO_LABEL,
  totalCamisas,
  totalPedidoMonto,
  totalAbonadoPedido,
  saldoPendiente,
  diasProduccion,
  m2Impresion,
  totalImpresion,
  totalAbonadoImpresion,
  saldoImpresion,
  m2Eco,
  totalEco,
  totalAbonadoEco,
  saldoEco,
  costoRemateEco,
  costoDisenoEco,
  costoEstructuraEco,
  costoCuadroMaderaEco,
  costoClearEco,
  costoTransferEco,
  costoPvcEco,
  m2Perdida,
  totalPerdida,
} from "../state.js";
import { money, fmt, statCard } from "../utils.js";

export function renderStats() {
  const valorTotal = state.pedidos.reduce((s, p) => s + totalPedidoMonto(p), 0);
  const cobrado = state.pedidos.reduce((s, p) => s + totalAbonadoPedido(p), 0);
  const porCobrar = state.pedidos.reduce((s, p) => s + Math.max(saldoPendiente(p), 0), 0);
  const facturadoEntregados = state.pedidos.filter((p) => p.estado === "Entregado").reduce((s, p) => s + totalPedidoMonto(p), 0);

  const statsMoney = document.getElementById("statsMoney");
  statsMoney.innerHTML = "";
  [
    ["💰 Valor total", money(valorTotal)],
    ["✅ Cobrado", money(cobrado)],
    ["⚠️ Por cobrar", money(porCobrar)],
    ["📦 Facturado en entregados", money(facturadoEntregados)],
  ].forEach(([label, value]) => statsMoney.appendChild(statCard(label, value)));

  const totalCam = state.pedidos.reduce((s, p) => s + totalCamisas(p), 0);
  const totalPed = state.pedidos.length;

  const statsCantidad = document.getElementById("statsCantidad");
  statsCantidad.innerHTML = "";
  [
    ["👕 Total de camisas", totalCam],
    ["📋 Total de pedidos", totalPed],
  ].forEach(([label, value]) => statsCantidad.appendChild(statCard(label, value)));

  const camisasPorEstado = {};
  const pedidosPorEstado = {};
  FASES.forEach((f) => {
    camisasPorEstado[f] = 0;
    pedidosPorEstado[f] = 0;
  });
  state.pedidos.forEach((p) => {
    camisasPorEstado[p.estado] += totalCamisas(p);
    pedidosPorEstado[p.estado] += 1;
  });

  const camisasPorGenero = {};
  GENEROS.forEach((g) => (camisasPorGenero[g] = 0));
  state.pedidos.forEach((p) =>
    p.items.forEach((it) => {
      camisasPorGenero[it.genero] = (camisasPorGenero[it.genero] || 0) + Number(it.cantidad);
    })
  );

  const camisasPorTalla = {};
  state.pedidos.forEach((p) =>
    p.items.forEach((it) => {
      camisasPorTalla[it.talla] = (camisasPorTalla[it.talla] || 0) + Number(it.cantidad);
    })
  );
  const topTallas = Object.entries(camisasPorTalla).sort((a, b) => b[1] - a[1]).slice(0, 8);

  renderChartEstado(FASES, FASES.map((f) => camisasPorEstado[f]), FASES.map((f) => pedidosPorEstado[f]));
  renderChartGenero(GENEROS, GENEROS.map((g) => camisasPorGenero[g] || 0));
  renderChartTallas(topTallas.length ? topTallas.map((t) => t[0]) : ["Sin datos"], topTallas.length ? topTallas.map((t) => t[1]) : [0]);
  renderChartDinero(cobrado, porCobrar);

  const entregados = state.pedidos.filter((p) => p.estado === "Entregado" && p.fechas.entregado);
  const promDias = entregados.length ? Math.round(entregados.reduce((s, p) => s + diasProduccion(p), 0) / entregados.length) : null;
  statsCantidad.appendChild(statCard("⏱️ Tiempo prom. producción", promDias === null ? "N/A" : promDias + " días"));

  // === Sublimación ===
  const m2Total = state.impresiones.reduce((s, i) => s + m2Impresion(i), 0);
  const facturadoImpresiones = state.impresiones.reduce((s, i) => s + totalImpresion(i), 0);
  const cobradoImpresiones = state.impresiones.reduce((s, i) => s + totalAbonadoImpresion(i), 0);
  const porCobrarImpresiones = state.impresiones.reduce((s, i) => s + Math.max(saldoImpresion(i), 0), 0);

  const m2PorTipo = { camisa: 0, taller: 0, otros: 0 };
  state.impresiones.forEach((i) => {
    const tipo = i.tipo || "otros";
    m2PorTipo[tipo] = (m2PorTipo[tipo] || 0) + m2Impresion(i);
  });
  const promedioM2Precio = m2PorTipo.otros > 0 ? facturadoImpresiones / m2PorTipo.otros : 0;

  const statsImpresiones = document.getElementById("statsImpresiones");
  statsImpresiones.innerHTML = "";
  [
    ["📐 m² impresos (total)", fmt(m2Total) + " m²"],
    ["🖨️ Facturado sublimación", money(facturadoImpresiones)],
    ["✅ Cobrado sublimación", money(cobradoImpresiones)],
    ["⚠️ Por cobrar sublimación", money(porCobrarImpresiones)],
    ["💲 Precio prom. por m² (otros)", money(promedioM2Precio)],
  ].forEach(([label, value]) => statsImpresiones.appendChild(statCard(label, value)));

  const statsImpresionesTipo = document.getElementById("statsImpresionesTipo");
  statsImpresionesTipo.innerHTML = "";
  [
    ["👕 m² en camisas (no se cobra aparte)", fmt(m2PorTipo.camisa) + " m²"],
    ["🧵 m² en artículos del taller (no se cobra aparte)", fmt(m2PorTipo.taller) + " m²"],
    ["💵 m² en otros (se cobra aparte)", fmt(m2PorTipo.otros) + " m²"],
  ].forEach(([label, value]) => statsImpresionesTipo.appendChild(statCard(label, value)));

  const m2PorCliente = {};
  state.impresiones.forEach((i) => {
    const key = (i.cliente || "Sin cliente").trim() || "Sin cliente";
    m2PorCliente[key] = (m2PorCliente[key] || 0) + m2Impresion(i);
  });
  const topClientesImpresion = Object.entries(m2PorCliente).sort((a, b) => b[1] - a[1]).slice(0, 8);
  renderChartImpresionesCliente(
    topClientesImpresion.length ? topClientesImpresion.map((t) => t[0]) : ["Sin datos"],
    topClientesImpresion.length ? topClientesImpresion.map((t) => Number(t[1].toFixed(2))) : [0]
  );

  // === Eco solvente ===
  const m2TotalEco = state.ecoSolvente.reduce((s, e) => s + m2Eco(e), 0);
  const facturadoEco = state.ecoSolvente.reduce((s, e) => s + totalEco(e), 0);
  const cobradoEco = state.ecoSolvente.reduce((s, e) => s + totalAbonadoEco(e), 0);
  const porCobrarEco = state.ecoSolvente.reduce((s, e) => s + Math.max(saldoEco(e), 0), 0);
  const promedioM2Eco = m2TotalEco > 0 ? state.ecoSolvente.reduce((s, e) => s + m2Eco(e) * Number(e.precioM2), 0) / m2TotalEco : 0;

  const statsEco = document.getElementById("statsEco");
  statsEco.innerHTML = "";
  [
    ["📐 m² eco solvente (total)", fmt(m2TotalEco) + " m²"],
    ["🏳️ Facturado eco solvente", money(facturadoEco)],
    ["✅ Cobrado eco solvente", money(cobradoEco)],
    ["⚠️ Por cobrar eco solvente", money(porCobrarEco)],
    ["💲 Precio prom. impresión por m²", money(promedioM2Eco)],
  ].forEach(([label, value]) => statsEco.appendChild(statCard(label, value)));

  const totalRemates = state.ecoSolvente.reduce((s, e) => s + costoRemateEco(e), 0);
  const totalDisenos = state.ecoSolvente.reduce((s, e) => s + costoDisenoEco(e), 0);
  const totalEstructuras = state.ecoSolvente.reduce((s, e) => s + costoEstructuraEco(e), 0);
  const totalCuadros = state.ecoSolvente.reduce((s, e) => s + costoCuadroMaderaEco(e), 0);
  const totalClear = state.ecoSolvente.reduce((s, e) => s + costoClearEco(e), 0);
  const totalTransfer = state.ecoSolvente.reduce((s, e) => s + costoTransferEco(e), 0);
  const totalPvc = state.ecoSolvente.reduce((s, e) => s + costoPvcEco(e), 0);

  const statsEcoExtras = document.getElementById("statsEcoExtras");
  statsEcoExtras.innerHTML = "";
  [
    ["🪧 Generado por remates", money(totalRemates)],
    ["🎨 Generado por diseño", money(totalDisenos)],
    ["🏗️ Generado por estructura", money(totalEstructuras)],
    ["🖼️ Generado por cuadro de madera", money(totalCuadros)],
    ["🧴 Generado por clear", money(totalClear)],
    ["🔁 Generado por transfer", money(totalTransfer)],
    ["🧱 Generado por PVC", money(totalPvc)],
  ].forEach(([label, value]) => statsEcoExtras.appendChild(statCard(label, value)));

  const m2PorClienteEco = {};
  state.ecoSolvente.forEach((e) => {
    const key = (e.cliente || "Sin cliente").trim() || "Sin cliente";
    m2PorClienteEco[key] = (m2PorClienteEco[key] || 0) + m2Eco(e);
  });
  const topClientesEco = Object.entries(m2PorClienteEco).sort((a, b) => b[1] - a[1]).slice(0, 8);
  renderChartEcoCliente(
    topClientesEco.length ? topClientesEco.map((t) => t[0]) : ["Sin datos"],
    topClientesEco.length ? topClientesEco.map((t) => Number(t[1].toFixed(2))) : [0]
  );

  const pedidosPorRemate = { ninguno: 0, palos: 0, tubos: 0 };
  state.ecoSolvente.forEach((e) => {
    const r = e.remate || "ninguno";
    pedidosPorRemate[r] = (pedidosPorRemate[r] || 0) + 1;
  });
  renderChartEcoRemate(
    ["ninguno", "palos", "tubos"].map((r) => REMATE_LABEL[r]),
    ["ninguno", "palos", "tubos"].map((r) => pedidosPorRemate[r])
  );

  // m² por material (solo impresión; los stickers no tienen material)
  const MATERIALES = ["vinil", "banner", "vinil_tornasol", "papel_bond", "clear"];
  const m2PorMaterial = {};
  MATERIALES.forEach((m) => (m2PorMaterial[m] = 0));
  state.ecoSolvente.forEach((e) => {
    if ((e.tipoTrabajo || "impresion") === "stickers") return;
    const m = e.material || "banner";
    m2PorMaterial[m] = (m2PorMaterial[m] || 0) + m2Eco(e);
  });
  renderChartEcoMaterial(
    MATERIALES.map((m) => MATERIAL_ECO_LABEL[m]),
    MATERIALES.map((m) => Number(m2PorMaterial[m].toFixed(2)))
  );

  // Impresión vs Stickers (m²)
  const m2Impresiones = state.ecoSolvente.filter((e) => (e.tipoTrabajo || "impresion") !== "stickers").reduce((s, e) => s + m2Eco(e), 0);
  const m2Stickers = state.ecoSolvente.filter((e) => e.tipoTrabajo === "stickers").reduce((s, e) => s + m2Eco(e), 0);
  renderChartEcoTipoTrabajo(["🖨️ Impresión", "🏷️ Stickers"], [Number(m2Impresiones.toFixed(2)), Number(m2Stickers.toFixed(2))]);

  // === Pérdidas y pruebas ===
  const m2TotalPerdidas = state.perdidas.reduce((s, p) => s + m2Perdida(p), 0);
  const totalPerdidas = state.perdidas.reduce((s, p) => s + totalPerdida(p), 0);
  const m2Perdidasola = state.perdidas.filter((p) => (p.tipo || "perdida") === "perdida").reduce((s, p) => s + m2Perdida(p), 0);
  const m2Pruebas = state.perdidas.filter((p) => p.tipo === "prueba").reduce((s, p) => s + m2Perdida(p), 0);

  const statsPerdidas = document.getElementById("statsPerdidas");
  statsPerdidas.innerHTML = "";
  [
    ["📐 m² perdidos (total)", fmt(m2TotalPerdidas) + " m²"],
    ["🗑️ m² en pérdidas de material", fmt(m2Perdidasola) + " m²"],
    ["🧪 m² en pruebas de impresión", fmt(m2Pruebas) + " m²"],
    ["💸 Total perdido en $", money(totalPerdidas)],
  ].forEach(([label, value]) => statsPerdidas.appendChild(statCard(label, value)));
}

// === GRÁFICOS (Chart.js) ===
const chartInstances = {};
const CHART_FONT = "-apple-system, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.family = CHART_FONT;
Chart.defaults.color = "#94a0b8";

function pintarChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new Chart(canvas.getContext("2d"), config);
}

function renderChartEstado(labels, camisas, pedidosCount) {
  pintarChart("chartEstado", {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Camisas", data: camisas, backgroundColor: "#ff5c8a", borderRadius: 8, maxBarThickness: 28 },
        { label: "Pedidos", data: pedidosCount, backgroundColor: "#7c5cff", borderRadius: 8, maxBarThickness: 28 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef0f8" } },
      },
    },
  });
}

function renderChartGenero(labels, data) {
  pintarChart("chartGenero", {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: PALETA_GENERO, borderColor: "#ffffff", borderWidth: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } },
    },
  });
}

function renderChartTallas(labels, data) {
  pintarChart("chartTallas", {
    type: "bar",
    data: { labels, datasets: [{ label: "Camisas", data, backgroundColor: "#38bdf8", borderRadius: 8, maxBarThickness: 22 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef0f8" } },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderChartDinero(cobrado, porCobrar) {
  pintarChart("chartDinero", {
    type: "doughnut",
    data: {
      labels: ["Cobrado", "Por cobrar"],
      datasets: [{ data: [cobrado, porCobrar], backgroundColor: ["#34d399", "#fbbf24"], borderColor: "#ffffff", borderWidth: 3 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } },
      },
    },
  });
}

function renderChartImpresionesCliente(labels, data) {
  pintarChart("chartImpresionesCliente", {
    type: "bar",
    data: { labels, datasets: [{ label: "m²", data, backgroundColor: "#a78bfa", borderRadius: 8, maxBarThickness: 22 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: "#eef0f8" } },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderChartEcoCliente(labels, data) {
  pintarChart("chartEcoCliente", {
    type: "bar",
    data: { labels, datasets: [{ label: "m²", data, backgroundColor: "#14b8a6", borderRadius: 8, maxBarThickness: 22 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: "#eef0f8" } },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderChartEcoRemate(labels, data) {
  pintarChart("chartEcoRemate", {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#94a3b8", "#fbbf24", "#14b8a6"], borderColor: "#ffffff", borderWidth: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } },
    },
  });
}

function renderChartEcoMaterial(labels, data) {
  pintarChart("chartEcoMaterial", {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: ["#38bdf8", "#7c5cff", "#f472b6", "#fbbf24", "#34d399"], borderColor: "#ffffff", borderWidth: 3 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 12 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)} m²` } },
      },
    },
  });
}

function renderChartEcoTipoTrabajo(labels, data) {
  pintarChart("chartEcoTipoTrabajo", {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#14b8a6", "#ff5c8a"], borderColor: "#ffffff", borderWidth: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)} m²` } },
      },
    },
  });
}
