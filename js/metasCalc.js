// Cálculos de metas: períodos (semanas / meses), lo producido en cada uno y la
// comparación contra la meta que estaba vigente. Lo usan el panel 🎯 Metas y la
// sección 🏁 Historial de metas.
import { state, MATERIALES_ECO, MATERIAL_ECO_LABEL, faseFinalCamisas, faseFinalEco, totalCamisas, m2Eco, ecoEsSimple, tieneAlgunaMeta } from "./state.js";
import { guardarSnapshotMetas } from "./api.js";

export const SEMANAS_HISTORIAL = 8;
export const MESES_HISTORIAL = 6;

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// === PERÍODOS (la semana empieza el lunes) ===
export function inicioSemana(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export function sumarDias(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function inicioMes(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function claveSemana(d) {
  const s = inicioSemana(d);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
}
export function claveMes(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dm(x) {
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
}

// === PRODUCCIÓN ENTREGADA EN UN RANGO [desde, hasta) ===
export function totalesEntre(desde, hasta) {
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

// Lo entregado en la semana y el mes en curso.
export function calcularProgreso() {
  const hoy = new Date();
  const iniSem = inicioSemana(hoy);
  const iniMes = inicioMes(hoy);
  return {
    semana: totalesEntre(iniSem, sumarDias(iniSem, 7)),
    mes: totalesEntre(iniMes, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)),
  };
}

// === MÉTRICAS (una fila por cosa que se mide) ===
export const METRICAS = [
  { clave: "camisas", label: "👕 Camisas", unidad: "cam.", meta: (m, p) => (p === "semana" ? m.camisasSemana : m.camisasMes), actual: (t) => t.camisas },
  { clave: "stickers", label: "🏷️ Stickers", unidad: "m²", meta: (m, p) => (p === "semana" ? m.stickersSemana : m.stickersMes), actual: (t) => t.stickers },
  ...MATERIALES_ECO.map((mat) => ({
    clave: "mat-" + mat,
    label: "📄 " + MATERIAL_ECO_LABEL[mat],
    unidad: "m²",
    meta: (m, p) => m.materiales[mat][p],
    actual: (t) => t.materiales[mat],
  })),
];

// Todas las métricas de un período (incluidas las que tienen meta 0).
export function metricasDe(metas, periodo, totales) {
  return METRICAS.map((m) => ({
    clave: m.clave,
    label: m.label,
    unidad: m.unidad,
    meta: m.meta(metas, periodo) || 0,
    actual: m.actual(totales) || 0,
  }));
}
// Solo las que tienen una meta puesta (son las que se muestran).
export function metricasConMeta(metas, periodo, totales) {
  return metricasDe(metas, periodo, totales).filter((it) => it.meta > 0);
}

// === PERÍODOS YA CERRADOS ===
export function snapshotDe(periodo, clave) {
  return state.metasHistorial.find((h) => h.periodo === periodo && h.clave === clave) || null;
}

// Devuelve los n períodos cerrados, del más reciente al más antiguo, ya resueltos:
// qué meta regía, qué se produjo y cuántas metas se cumplieron.
export function periodosCerrados(periodo, n) {
  const hoy = new Date();
  const filas = [];
  for (let i = 1; i <= n; i++) {
    let ini, fin, clave, titulo, tituloCorto;
    if (periodo === "semana") {
      ini = sumarDias(inicioSemana(hoy), -7 * i);
      fin = sumarDias(ini, 7);
      clave = claveSemana(ini);
      titulo = `${dm(ini)} – ${dm(sumarDias(ini, 6))}`;
      tituloCorto = dm(ini);
    } else {
      ini = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
      clave = claveMes(ini);
      titulo = `${MESES_LARGOS[ini.getMonth()]} ${ini.getFullYear()}`;
      tituloCorto = `${MESES_CORTOS[ini.getMonth()]} ${String(ini.getFullYear()).slice(2)}`;
    }
    const snap = snapshotDe(periodo, clave);
    const metas = snap ? snap.metas : state.metas;
    const items = metricasConMeta(metas, periodo, totalesEntre(ini, fin));
    const cumplidas = items.filter((it) => it.actual >= it.meta).length;
    filas.push({
      periodo,
      clave,
      ini,
      fin,
      titulo,
      tituloCorto,
      congelada: !!snap, // false = se está comparando contra la meta de hoy
      items,
      cumplidas,
      total: items.length,
      // % de avance promedio (cada métrica tope 100%)
      promedio: items.length ? items.reduce((s, it) => s + Math.min(100, (it.actual / it.meta) * 100), 0) / items.length : 0,
      produjoAlgo: items.some((it) => it.actual > 0),
    });
  }
  return filas;
}

// Congela las metas vigentes en los períodos cerrados que aún no tienen registro,
// para que cambiarlas hoy no reescriba el pasado.
export async function guardarPeriodosCerrados() {
  if (!tieneAlgunaMeta(state.metas)) return false;
  const pendientes = [
    ...periodosCerrados("semana", SEMANAS_HISTORIAL),
    ...periodosCerrados("mes", MESES_HISTORIAL),
  ].filter((f) => !f.congelada);
  if (!pendientes.length) return false;
  for (const f of pendientes) {
    // Si el primero falla (falta la migración o no hay permiso), no se insiste.
    if (!(await guardarSnapshotMetas(f.periodo, f.clave, state.metas))) return false;
  }
  return true;
}
