// Sección 🏁 Historial de metas: cómo quedó cada semana y cada mes ya cerrado.
import { SEMANAS_HISTORIAL, MESES_HISTORIAL, periodosCerrados, guardarPeriodosCerrados } from "../metasCalc.js";
import { fmtNum, escapeHtml, statCardHtml } from "../utils.js";

// Colores: el mismo tono en dos intensidades (seguro para daltonismo, a
// diferencia de verde/rojo). El "cumplida" nunca depende solo del color: va
// también el ✅ sobre la barra, en el tooltip y en las tarjetas de abajo.
const COLOR_CUMPLIDA = "#0d9488";
const COLOR_FALLA = "#7fd8cd";
const COLOR_META = "#475569";
const COLOR_GRID = "#eef0f8";

let periodoActivo = "semana";
const charts = {};

const resumenEl = document.getElementById("metasHistResumen");
const graficosEl = document.getElementById("metasHistGraficos");
const listaEl = document.getElementById("metasHistLista");
const vacioEl = document.getElementById("metasHistVacio");

// Dibuja un ✅ encima de las barras que alcanzaron la meta (para no depender del color).
const marcaCumplida = {
  id: "marcaCumplida",
  afterDatasetsDraw(chart, args, opts) {
    const cumplidas = opts.cumplidas || [];
    const meta = chart.getDatasetMeta(0);
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "12px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    meta.data.forEach((barra, i) => {
      if (!cumplidas[i]) return;
      ctx.fillText("✅", barra.x, barra.y - 6);
    });
    ctx.restore();
  },
};

function pintarGrafico(canvasId, filas, metrica) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const labels = filas.map((f) => f.tituloCorto);
  const actuales = filas.map((f) => Number((f.items.find((it) => it.clave === metrica.clave)?.actual || 0).toFixed(2)));
  const metas = filas.map((f) => {
    const it = f.items.find((x) => x.clave === metrica.clave);
    return it ? Number(it.meta.toFixed(2)) : null;
  });
  const cumplidas = actuales.map((v, i) => metas[i] != null && metas[i] > 0 && v >= metas[i]);

  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Logrado",
          data: actuales,
          backgroundColor: cumplidas.map((ok) => (ok ? COLOR_CUMPLIDA : COLOR_FALLA)),
          borderRadius: 6,
          maxBarThickness: 38,
          order: 2,
        },
        {
          type: "line",
          label: "Meta",
          data: metas,
          borderColor: COLOR_META,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          spanGaps: false,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } }, // espacio para el ✅
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: {
          callbacks: {
            afterBody(ctx) {
              const i = ctx[0].dataIndex;
              if (metas[i] == null || metas[i] <= 0) return "Sin meta puesta";
              return cumplidas[i] ? "✅ Meta cumplida" : `❌ Faltaron ${fmtNum(metas[i] - actuales[i])} ${metrica.unidad}`;
            },
          },
        },
        marcaCumplida: { cumplidas },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: COLOR_GRID } },
      },
    },
    plugins: [marcaCumplida],
  });
}

function tarjetaPeriodo(fila) {
  if (!fila.total) return "";
  const todas = fila.cumplidas === fila.total;
  const chips = fila.items
    .map(
      (it) =>
        `<span class="hist-chip ${it.actual >= it.meta ? "ok" : "falla"}">${it.label} <b>${fmtNum(it.actual)}</b>/${fmtNum(it.meta)} ${it.unidad}</span>`
    )
    .join("");
  return `<div class="hist-fila ${todas ? "ok" : ""}">
    <div class="hist-cab">
      <span class="hist-periodo">${escapeHtml(fila.titulo)}${fila.congelada ? "" : ` <span class="hist-nota">meta actual</span>`}</span>
      <span class="hist-resumen">${todas ? "✅" : fila.cumplidas ? "⚠️" : "❌"} ${fila.cumplidas}/${fila.total} · ${Math.round(fila.promedio)}%</span>
    </div>
    <div class="hist-chips">${chips}</div>
  </div>`;
}

// Períodos seguidos (desde el más reciente) en los que se cumplió todo.
function rachaActual(filas) {
  let n = 0;
  for (const f of filas) {
    if (!f.total || f.cumplidas < f.total) break;
    n++;
  }
  return n;
}

export function renderHistorialMetas() {
  const n = periodoActivo === "semana" ? SEMANAS_HISTORIAL : MESES_HISTORIAL;
  const unidad = periodoActivo === "semana" ? "semana" : "mes";
  const plural = periodoActivo === "semana" ? "semanas" : "meses";
  // Cuentan los períodos que tenían metas puestas. Además, el registro arranca en
  // el período más viejo con entregas: antes de eso no había nada que medir y solo
  // ensuciaría el promedio y los gráficos con ceros.
  const conMeta = periodosCerrados(periodoActivo, n).filter((f) => f.total > 0);
  const masViejoConDatos = conMeta.map((f) => f.produjoAlgo).lastIndexOf(true);
  const filas = masViejoConDatos < 0 ? [] : conMeta.slice(0, masViejoConDatos + 1);

  Object.keys(charts).forEach((id) => {
    charts[id].destroy();
    delete charts[id];
  });

  if (!filas.length) {
    resumenEl.innerHTML = "";
    graficosEl.innerHTML = "";
    listaEl.innerHTML = "";
    vacioEl.style.display = "";
    vacioEl.innerHTML = `<div class="empty-state">Todavía no hay ${plural} cerrad${periodoActivo === "semana" ? "as" : "os"} con metas.<br>
      Pon una meta en el panel 🎯 Metas y el registro se irá llenando solo al cerrar cada ${unidad}.</div>`;
    return;
  }
  vacioEl.style.display = "none";

  // --- Tarjetas de resumen ---
  const perfectas = filas.filter((f) => f.cumplidas === f.total).length;
  const promedio = filas.reduce((s, f) => s + f.promedio, 0) / filas.length;
  const mejor = filas.reduce((a, b) => (b.promedio > a.promedio ? b : a));
  const racha = rachaActual(filas);
  resumenEl.innerHTML =
    statCardHtml(`✅ ${plural.charAt(0).toUpperCase() + plural.slice(1)} cumplid${periodoActivo === "semana" ? "as" : "os"} al 100%`, `${perfectas} de ${filas.length}`) +
    statCardHtml("📊 Cumplimiento promedio", `${Math.round(promedio)}%`) +
    statCardHtml("🔥 Racha (seguidos al 100%)", `${racha} ${racha === 1 ? unidad : plural}`) +
    statCardHtml("🏆 Mejor período", `${mejor.titulo} · ${Math.round(mejor.promedio)}%`);

  // --- Un gráfico por métrica que tenga meta ---
  const metricas = [];
  filas.forEach((f) => f.items.forEach((it) => {
    if (!metricas.some((m) => m.clave === it.clave)) metricas.push({ clave: it.clave, label: it.label, unidad: it.unidad });
  }));
  const orden = [...filas].reverse(); // en el gráfico, el tiempo va de izquierda a derecha
  graficosEl.innerHTML = metricas
    .map(
      (m, i) => `<div class="stats-block neu-raised">
        <h3>${m.label} · logrado vs. meta (${m.unidad})</h3>
        <div class="chart-wrap"><canvas id="chartMetaHist${i}"></canvas></div>
      </div>`
    )
    .join("");
  metricas.forEach((m, i) => pintarGrafico(`chartMetaHist${i}`, orden, m));

  // --- Detalle período por período ---
  listaEl.innerHTML = `<h2 class="stats-subtitle">📋 Detalle por ${unidad}</h2>
    <div class="hist-lista">${filas.map(tarjetaPeriodo).join("")}</div>`;
}

document.getElementById("filtroPeriodoMetas").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  periodoActivo = btn.dataset.periodo;
  document.querySelectorAll("#filtroPeriodoMetas .filtro-pago-btn").forEach((b) => b.classList.toggle("active", b.dataset.periodo === periodoActivo));
  renderHistorialMetas();
});

document.getElementById("btnEditarMetasHist").addEventListener("click", () => {
  document.getElementById("btnMetas").click();
});

// Al entrar a la sección se congelan los períodos cerrados que falten.
export async function abrirHistorialMetas() {
  renderHistorialMetas();
  if (await guardarPeriodosCerrados()) renderHistorialMetas();
}
