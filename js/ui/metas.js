import { state, MATERIALES_ECO, MATERIAL_ECO_LABEL, faseFinalCamisas, faseFinalEco, totalCamisas, m2Eco } from "../state.js";
import { guardarMetas } from "../api.js";
import { fmt } from "../utils.js";

const overlay = document.getElementById("modalMetasOverlay");
const contenido = document.getElementById("metasContenido");
const overlayEditar = document.getElementById("modalEditarMetasOverlay");
const camposEditar = document.getElementById("editarMetasCampos");

function claveSemana(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}
function mismaSemana(iso, hoy) {
  return claveSemana(new Date(iso)) === claveSemana(hoy);
}
function mismoMes(iso, hoy) {
  const d = new Date(iso);
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
}

// Progreso: cuenta lo que llegó a la fase final (entregado) en la semana / mes actual.
export function calcularProgreso() {
  const hoy = new Date();
  const finalCam = faseFinalCamisas();
  const finalEco = faseFinalEco();
  let camSem = 0;
  let camMes = 0;
  state.pedidos.forEach((p) => {
    if (p.estado !== finalCam || !p.fechaEstado) return;
    const c = totalCamisas(p);
    if (mismaSemana(p.fechaEstado, hoy)) camSem += c;
    if (mismoMes(p.fechaEstado, hoy)) camMes += c;
  });
  const matSem = {};
  const matMes = {};
  MATERIALES_ECO.forEach((m) => {
    matSem[m] = 0;
    matMes[m] = 0;
  });
  state.ecoSolvente.forEach((e) => {
    if (e.estado !== finalEco || !e.fechaEstado) return;
    if ((e.tipoTrabajo || "impresion") === "stickers") return;
    const m = e.material || "banner";
    const a = m2Eco(e);
    if (mismaSemana(e.fechaEstado, hoy)) matSem[m] += a;
    if (mismoMes(e.fechaEstado, hoy)) matMes[m] += a;
  });
  return { camSem, camMes, matSem, matMes };
}

function barra(label, actual, meta, unidad) {
  const pct = meta > 0 ? Math.min(100, (actual / meta) * 100) : 0;
  const cumplida = actual >= meta && meta > 0;
  return `<div class="meta-item ${cumplida ? "cumplida" : ""}">
    <div class="meta-top">
      <span class="meta-label">${label}</span>
      <span class="meta-cifra">${fmt(actual)} / ${fmt(meta)} ${unidad}${cumplida ? " ✅" : ""}</span>
    </div>
    <div class="meta-barra"><div class="meta-relleno" style="width:${pct}%"></div></div>
  </div>`;
}

function bloque(titulo, metasCam, actualCam, matMetaKey, matActual) {
  const items = [];
  if (metasCam > 0) items.push(barra("👕 Camisas", actualCam, metasCam, "cam."));
  MATERIALES_ECO.forEach((m) => {
    const meta = state.metas.materiales[m][matMetaKey];
    if (meta > 0) items.push(barra("📄 " + MATERIAL_ECO_LABEL[m], matActual[m], meta, "m²"));
  });
  if (!items.length) return "";
  return `<div class="metas-bloque"><h4>${titulo}</h4>${items.join("")}</div>`;
}

export function renderMetas() {
  const p = calcularProgreso();
  const m = state.metas;
  const semana = bloque("📅 Esta semana", m.camisasSemana, p.camSem, "semana", p.matSem);
  const mes = bloque("🗓️ Este mes", m.camisasMes, p.camMes, "mes", p.matMes);
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

document.getElementById("btnMetas").addEventListener("click", () => {
  renderMetas();
  overlay.classList.add("active");
});
document.getElementById("btnCerrarMetas").addEventListener("click", () => overlay.classList.remove("active"));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});
document.getElementById("btnEditarMetas").addEventListener("click", abrirEditar);
document.getElementById("btnCerrarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnCancelarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnGuardarMetas").addEventListener("click", guardar);
