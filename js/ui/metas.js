import { state, MATERIALES_ECO, MATERIAL_ECO_LABEL } from "../state.js";
import { calcularProgreso, metricasConMeta, guardarPeriodosCerrados } from "../metasCalc.js";
import { guardarMetas } from "../api.js";
import { fmtNum } from "../utils.js";

const overlay = document.getElementById("modalMetasOverlay");
const contenido = document.getElementById("metasContenido");
const overlayEditar = document.getElementById("modalEditarMetasOverlay");
const camposEditar = document.getElementById("editarMetasCampos");

function barra(item) {
  const pct = item.meta > 0 ? Math.min(100, (item.actual / item.meta) * 100) : 0;
  const cumplida = item.actual >= item.meta && item.meta > 0;
  return `<div class="meta-item ${cumplida ? "cumplida" : ""}">
    <div class="meta-top">
      <span class="meta-label">${item.label}</span>
      <span class="meta-cifra">${fmtNum(item.actual)} / ${fmtNum(item.meta)} ${item.unidad}${cumplida ? " ✅" : ""}</span>
    </div>
    <div class="meta-barra"><div class="meta-relleno" style="width:${pct}%"></div></div>
  </div>`;
}

function bloque(titulo, periodo, totales) {
  const items = metricasConMeta(state.metas, periodo, totales);
  if (!items.length) return "";
  return `<div class="metas-bloque"><h4>${titulo}</h4>${items.map(barra).join("")}</div>`;
}

export function renderMetas() {
  const p = calcularProgreso();
  const semana = bloque("📅 Esta semana", "semana", p.semana);
  const mes = bloque("🗓️ Este mes", "mes", p.mes);
  contenido.innerHTML =
    semana + mes || `<div class="empty-state">Todavía no hay metas configuradas.<br>El admin o el jefe pueden establecerlas con "✏️ Editar metas".</div>`;
}

// ---- Editar metas ----
function renderCamposEditar() {
  const m = state.metas;
  let html = `
    <div class="meta-edit-row meta-edit-head"><span></span><span>Semana</span><span>Mes</span></div>
    <div class="meta-edit-row">
      <span>👕 Camisas</span>
      <input type="number" min="0" step="1" id="metaCamSemana" value="${m.camisasSemana || 0}">
      <input type="number" min="0" step="1" id="metaCamMes" value="${m.camisasMes || 0}">
    </div>
    <div class="meta-edit-row">
      <span>🏷️ Stickers (m²)</span>
      <input type="number" min="0" step="0.01" id="metaStickSemana" value="${m.stickersSemana || 0}">
      <input type="number" min="0" step="0.01" id="metaStickMes" value="${m.stickersMes || 0}">
    </div>`;
  MATERIALES_ECO.forEach((mat) => {
    html += `<div class="meta-edit-row">
      <span>📄 ${MATERIAL_ECO_LABEL[mat]} (m²)</span>
      <input type="number" min="0" step="0.01" data-mat="${mat}" data-per="semana" value="${m.materiales[mat].semana || 0}">
      <input type="number" min="0" step="0.01" data-mat="${mat}" data-per="mes" value="${m.materiales[mat].mes || 0}">
    </div>`;
  });
  camposEditar.innerHTML = html;
}

function abrirEditar() {
  renderCamposEditar();
  overlayEditar.classList.add("active");
}
function cerrarEditar() {
  overlayEditar.classList.remove("active");
}

async function guardar() {
  const nuevas = {
    camisasSemana: Number(document.getElementById("metaCamSemana").value) || 0,
    camisasMes: Number(document.getElementById("metaCamMes").value) || 0,
    stickersSemana: Number(document.getElementById("metaStickSemana").value) || 0,
    stickersMes: Number(document.getElementById("metaStickMes").value) || 0,
    materiales: {},
  };
  MATERIALES_ECO.forEach((mat) => (nuevas.materiales[mat] = { semana: 0, mes: 0 }));
  camposEditar.querySelectorAll("input[data-mat]").forEach((inp) => {
    nuevas.materiales[inp.dataset.mat][inp.dataset.per] = Number(inp.value) || 0;
  });
  try {
    await guardarMetas(nuevas);
    cerrarEditar();
    renderMetas();
  } catch (e) {
    alert("No se pudieron guardar las metas: " + e.message);
  }
}

function cerrarPanel() {
  overlay.classList.remove("active");
}

document.getElementById("btnMetas").addEventListener("click", () => {
  renderMetas();
  overlay.classList.add("active");
  guardarPeriodosCerrados();
});
document.getElementById("btnCerrarMetas").addEventListener("click", cerrarPanel);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrarPanel();
});
// El registro completo vive en su propia sección (pestaña 🏁 Historial de metas).
document.getElementById("btnVerHistorialMetas").addEventListener("click", () => {
  cerrarPanel();
  document.querySelector('.tab-btn[data-tab="metashist"]').click();
});
document.getElementById("btnEditarMetas").addEventListener("click", abrirEditar);
document.getElementById("btnCerrarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnCancelarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnGuardarMetas").addEventListener("click", guardar);
