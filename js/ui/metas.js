import {
  state,
  MATERIALES_ECO,
  MATERIAL_ECO_LABEL,
  faseFinalCamisas,
  faseFinalEco,
  totalCamisas,
  m2Eco,
  ecoEsSimple,
  tieneAlgunaMeta,
} from "../state.js";
import { guardarMetas, guardarSnapshotMetas } from "../api.js";
import { fmtNum } from "../utils.js";

const overlay = document.getElementById("modalMetasOverlay");
const contenido = document.getElementById("metasContenido");
const historialEl = document.getElementById("metasHistorial");
const overlayEditar = document.getElementById("modalEditarMetasOverlay");
const camposEditar = document.getElementById("editarMetasCampos");

// Cuántos períodos ya cerrados se muestran (y se guardan) en el registro.
const SEMANAS_HISTORIAL = 8;
const MESES_HISTORIAL = 6;

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// ---- Períodos (la semana empieza el lunes) ----
function inicioSemana(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function sumarDias(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function inicioMes(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function claveSemana(d) {
  const s = inicioSemana(d);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
}
function claveMes(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function etiquetaSemana(ini) {
  const fin = sumarDias(ini, 6);
  const dm = (x) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
  return `${dm(ini)} – ${dm(fin)}`;
}
function etiquetaMes(ini) {
  return `${MESES_LARGOS[ini.getMonth()]} ${ini.getFullYear()}`;
}

// ---- Producción entregada dentro de un rango [desde, hasta) ----
function totalesEntre(desde, hasta) {
  const finalCam = faseFinalCamisas();
  const finalEco = faseFinalEco();
  const totales = { camisas: 0, stickers: 0, materiales: {} };
  MATERIALES_ECO.forEach((m) => (totales.materiales[m] = 0));
  const dentro = (iso) => {
    const f = new Date(iso);
    return f >= desde && f < hasta;
  };
  state.pedidos.forEach((p) => {
    if (p.estado !== finalCam || !p.fechaEstado || !dentro(p.fechaEstado)) return;
    totales.camisas += totalCamisas(p);
  });
  state.ecoSolvente.forEach((e) => {
    if (e.estado !== finalEco || !e.fechaEstado || !dentro(e.fechaEstado)) return;
    const a = m2Eco(e);
    if (e.tipoTrabajo === "stickers") {
      totales.stickers += a;
      return;
    }
    if (ecoEsSimple(e)) return; // vinil tornasol / papel bond / DTF: sin meta por material
    const m = e.material || "banner";
    if (m in totales.materiales) totales.materiales[m] += a;
  });
  return totales;
}

// Progreso: cuenta lo que llegó a la fase final (entregado) en la semana / mes actual.
export function calcularProgreso() {
  const hoy = new Date();
  const iniSem = inicioSemana(hoy);
  const iniMes = inicioMes(hoy);
  const sem = totalesEntre(iniSem, sumarDias(iniSem, 7));
  const mes = totalesEntre(iniMes, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
  return {
    camSem: sem.camisas,
    camMes: mes.camisas,
    matSem: sem.materiales,
    matMes: mes.materiales,
    stickSem: sem.stickers,
    stickMes: mes.stickers,
  };
}

// Metas configuradas para un período, ya emparejadas con lo producido.
function metricasDe(metas, periodo, totales) {
  const items = [];
  const meta = (semana, mes) => (periodo === "semana" ? metas[semana] : metas[mes]);
  items.push({ label: "👕 Camisas", unidad: "cam.", meta: meta("camisasSemana", "camisasMes"), actual: totales.camisas });
  items.push({ label: "🏷️ Stickers", unidad: "m²", meta: meta("stickersSemana", "stickersMes"), actual: totales.stickers });
  MATERIALES_ECO.forEach((m) => {
    items.push({ label: "📄 " + MATERIAL_ECO_LABEL[m], unidad: "m²", meta: metas.materiales[m][periodo], actual: totales.materiales[m] });
  });
  return items.filter((it) => it.meta > 0);
}

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
  const items = metricasDe(state.metas, periodo, totales);
  if (!items.length) return "";
  return `<div class="metas-bloque"><h4>${titulo}</h4>${items.map(barra).join("")}</div>`;
}

export function renderMetas() {
  const p = calcularProgreso();
  const semana = bloque("📅 Esta semana", "semana", { camisas: p.camSem, stickers: p.stickSem, materiales: p.matSem });
  const mes = bloque("🗓️ Este mes", "mes", { camisas: p.camMes, stickers: p.stickMes, materiales: p.matMes });
  contenido.innerHTML =
    semana + mes || `<div class="empty-state">Todavía no hay metas configuradas.<br>El admin o el jefe pueden establecerlas con "✏️ Editar metas".</div>`;
  renderHistorial();
}

// ============================================================
// REGISTRO (cómo quedó cada semana / cada mes ya cerrado)
// ============================================================

// Períodos ya cerrados, del más reciente al más antiguo.
function semanasCerradas(n) {
  const actual = inicioSemana(new Date());
  return Array.from({ length: n }, (_, i) => sumarDias(actual, -7 * (i + 1)));
}
function mesesCerrados(n) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() - (i + 1), 1));
}

function snapshotDe(periodo, clave) {
  return state.metasHistorial.find((h) => h.periodo === periodo && h.clave === clave) || null;
}

// Congela las metas vigentes en los períodos cerrados que todavía no tienen
// registro, para que un cambio de metas no reescriba el pasado.
async function guardarPeriodosCerrados() {
  if (!tieneAlgunaMeta(state.metas)) return;
  const pendientes = [
    ...semanasCerradas(SEMANAS_HISTORIAL).map((d) => ["semana", claveSemana(d)]),
    ...mesesCerrados(MESES_HISTORIAL).map((d) => ["mes", claveMes(d)]),
  ].filter(([periodo, clave]) => !snapshotDe(periodo, clave));
  if (!pendientes.length) return;
  for (const [periodo, clave] of pendientes) {
    // Si el primero falla (falta la migración o no hay permiso), no se insiste.
    if (!(await guardarSnapshotMetas(periodo, clave, state.metas))) return;
  }
  renderHistorial();
}

function filaHistorial(titulo, periodo, clave, desde, hasta) {
  const snap = snapshotDe(periodo, clave);
  const metas = snap ? snap.metas : state.metas;
  const items = metricasDe(metas, periodo, totalesEntre(desde, hasta));
  if (!items.length) return "";
  if (items.every((it) => it.actual <= 0)) return ""; // período sin nada entregado: no se lista
  const cumplidas = items.filter((it) => it.actual >= it.meta).length;
  const todas = cumplidas === items.length;
  const chips = items
    .map(
      (it) =>
        `<span class="hist-chip ${it.actual >= it.meta ? "ok" : "falla"}">${it.label} <b>${fmtNum(it.actual)}</b>/${fmtNum(it.meta)} ${it.unidad}</span>`
    )
    .join("");
  return `<div class="hist-fila ${todas ? "ok" : ""}">
    <div class="hist-cab">
      <span class="hist-periodo">${titulo}${snap ? "" : ` <span class="hist-nota">meta actual</span>`}</span>
      <span class="hist-resumen">${todas ? "✅" : cumplidas ? "⚠️" : "❌"} ${cumplidas}/${items.length}</span>
    </div>
    <div class="hist-chips">${chips}</div>
  </div>`;
}

function renderHistorial() {
  if (!historialEl) return;
  const semanas = semanasCerradas(SEMANAS_HISTORIAL)
    .map((ini) => filaHistorial(etiquetaSemana(ini), "semana", claveSemana(ini), ini, sumarDias(ini, 7)))
    .filter(Boolean)
    .join("");
  const meses = mesesCerrados(MESES_HISTORIAL)
    .map((ini) => filaHistorial(etiquetaMes(ini), "mes", claveMes(ini), ini, new Date(ini.getFullYear(), ini.getMonth() + 1, 1)))
    .filter(Boolean)
    .join("");
  if (!semanas && !meses) {
    historialEl.innerHTML = `<div class="metas-bloque"><h4>📜 Registro de metas</h4><div class="empty-state">Todavía no hay semanas ni meses cerrados con metas.<br>El registro se va llenando solo al cerrar cada período.</div></div>`;
    return;
  }
  historialEl.innerHTML =
    (semanas ? `<div class="metas-bloque"><h4>📜 Semanas anteriores</h4><div class="hist-lista">${semanas}</div></div>` : "") +
    (meses ? `<div class="metas-bloque"><h4>📜 Meses anteriores</h4><div class="hist-lista">${meses}</div></div>` : "");
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

document.getElementById("btnMetas").addEventListener("click", () => {
  renderMetas();
  overlay.classList.add("active");
  guardarPeriodosCerrados();
});
document.getElementById("btnCerrarMetas").addEventListener("click", () => overlay.classList.remove("active"));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});
document.getElementById("btnEditarMetas").addEventListener("click", abrirEditar);
document.getElementById("btnCerrarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnCancelarEditarMetas").addEventListener("click", cerrarEditar);
document.getElementById("btnGuardarMetas").addEventListener("click", guardar);
