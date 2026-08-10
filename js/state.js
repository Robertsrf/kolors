import { redondear2, sumPagos, fmt, fmtNum, money } from "./utils.js";

// === CONSTANTES ===
export const FASES = ["Pedido", "Impresión", "Sublimación", "Costura", "Entregado"];
export const CLAVE_FECHA = { "Pedido": "pedido", "Impresión": "impresion", "Sublimación": "sublimacion", "Costura": "costura", "Entregado": "entregado" };
export const COLOR_FASE = {
  "Pedido": "var(--c-pedido)",
  "Impresión": "var(--c-impresion)",
  "Sublimación": "var(--c-sublimacion)",
  "Costura": "var(--c-costura)",
  "Entregado": "var(--c-entregado)"
};
export const PALETA_GENERO = ["#ff5c8a", "#7c5cff", "#38bdf8", "#fbbf24", "#34d399"];
export const TALLAS_JOVEN = ["2", "4", "6", "8", "10", "12", "14", "16"];
export const TALLAS_ADULTO = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
export const GENEROS = ["Niño", "Niña", "Dama", "Caballero", "Unisex"];
export const NIVELES_PRECIO = [1, 2, 3, 4, 5, 6, 12];

export const TIPO_IMPRESION_LABEL = { camisa: "👕 Camisa", taller: "🧵 Taller", otros: "💵 Otros" };
export const TIPO_PERDIDA_LABEL = { perdida: "🗑️ Pérdida", prueba: "🧪 Prueba" };
export const REMATE_LABEL = { ninguno: "Sin remate", palos: "🪵 Palos", tubos: "🧵 Tubos" };
export const MATERIAL_ECO_LABEL = {
  vinil: "Vinil",
  banner: "Banner",
  clear: "Clear",
};
export const MATERIALES_ECO = ["vinil", "banner", "clear"];

// Metas de producción (objetivos por semana y por mes)
export function metasVacias() {
  const materiales = {};
  MATERIALES_ECO.forEach((m) => (materiales[m] = { semana: 0, mes: 0 }));
  return { camisasSemana: 0, camisasMes: 0, stickersSemana: 0, stickersMes: 0, materiales };
}
// ¿Hay al menos una meta con valor? (si no, no vale la pena guardar el registro)
export function tieneAlgunaMeta(metas) {
  if (!metas) return false;
  if (metas.camisasSemana > 0 || metas.camisasMes > 0 || metas.stickersSemana > 0 || metas.stickersMes > 0) return true;
  return MATERIALES_ECO.some((m) => metas.materiales[m].semana > 0 || metas.materiales[m].mes > 0);
}
export function normalizarMetas(data) {
  const base = metasVacias();
  if (!data || typeof data !== "object") return base;
  base.camisasSemana = Number(data.camisasSemana) || 0;
  base.camisasMes = Number(data.camisasMes) || 0;
  base.stickersSemana = Number(data.stickersSemana) || 0;
  base.stickersMes = Number(data.stickersMes) || 0;
  if (data.materiales) {
    MATERIALES_ECO.forEach((m) => {
      const v = data.materiales[m] || {};
      base.materiales[m] = { semana: Number(v.semana) || 0, mes: Number(v.mes) || 0 };
    });
  }
  return base;
}
export const TIPO_TRABAJO_ECO_LABEL = {
  impresion: "🖨️ Impresión",
  stickers: "🏷️ Stickers",
  vinil_tornasol: "🌈 Vinil Tornasol",
  papel_bond: "📃 Papel Bond",
  dtf: "🎽 DTF",
};

// Una unidad de DTF tiene siempre el mismo tamaño: 1 m × 57 cm.
export const DTF_ANCHO = 1;
export const DTF_ALTO = 0.57;
export const DTF_M2 = DTF_ANCHO * DTF_ALTO;
export const DTF_TAMANO_LABEL = "1 m × 57 cm";

// Los stickers y el vinil tornasol se cargan por m² directo (m² + diseño).
export function ecoEsPorM2Manual(eco) {
  return eco.tipoTrabajo === "stickers" || eco.tipoTrabajo === "vinil_tornasol";
}
// El papel bond se cobra por cantidad de impresiones × costo por impresión (no m²).
export function ecoEsPapelBond(eco) {
  return eco.tipoTrabajo === "papel_bond";
}
// El DTF se cobra por cantidad de unidades × precio por unidad (tamaño fijo).
export function ecoEsDtf(eco) {
  return eco.tipoTrabajo === "dtf";
}
// Tipos que se cobran por cantidad × costo unitario (papel bond y DTF).
export function ecoEsPorUnidad(eco) {
  return ecoEsPapelBond(eco) || ecoEsDtf(eco);
}
// "Simples": no llevan material ni extras salvo diseño (stickers, tornasol, papel bond, DTF).
export function ecoEsSimple(eco) {
  return ecoEsPorM2Manual(eco) || ecoEsPorUnidad(eco);
}

// Fases por defecto de cada tablero (id estable = valor de `estado` guardado)
export const FASES_CAMISAS_DEFECTO = [
  { id: "Pedido", nombre: "Pedido", color: "#94a3b8" },
  { id: "Impresión", nombre: "Impresión", color: "#38bdf8" },
  { id: "Sublimación", nombre: "Sublimación", color: "#a78bfa" },
  { id: "Costura", nombre: "Costura", color: "#fbbf24" },
  { id: "Entregado", nombre: "Entregado", color: "#34d399" },
];
export const FASES_ECO_DEFECTO = [
  { id: "Pedido", nombre: "Pedido", color: "#94a3b8" },
  { id: "Diseño", nombre: "Diseño", color: "#a78bfa" },
  { id: "Impresión", nombre: "Impresión", color: "#38bdf8" },
  { id: "Acabado", nombre: "Acabado", color: "#fbbf24" },
  { id: "Entregado", nombre: "Entregado", color: "#34d399" },
];

// Tablero de Eco Solvente
export const FASES_ECO = ["Pedido", "Diseño", "Impresión", "Acabado", "Entregado"];
export const CLAVE_FECHA_ECO = { "Pedido": "pedido", "Diseño": "diseno", "Impresión": "impresion", "Acabado": "acabado", "Entregado": "entregado" };
export const COLOR_FASE_ECO = {
  "Pedido": "var(--c-pedido)",
  "Diseño": "var(--c-sublimacion)",
  "Impresión": "var(--c-impresion)",
  "Acabado": "var(--c-costura)",
  "Entregado": "var(--c-entregado)",
};

export function tallasPorGenero(genero) {
  return genero === "Niño" || genero === "Niña" ? TALLAS_JOVEN : TALLAS_ADULTO;
}

// === ESTADO EN MEMORIA ===
export const state = {
  pedidos: [],
  impresiones: [],
  ecoSolvente: [],
  perdidas: [],
  precios: { secciones: [{ titulo: "Precios", filas: [] }] },
  notas: "",
  mensajes: [],
  logs: [],
  fasesCamisas: FASES_CAMISAS_DEFECTO.map((f) => ({ ...f })),
  fasesEco: FASES_ECO_DEFECTO.map((f) => ({ ...f })),
  metas: metasVacias(),
  // Registro histórico: metas que estaban vigentes en cada semana / mes ya cerrado.
  // [{ periodo: "semana" | "mes", clave: "2026-08-04" | "2026-08", metas: {...} }]
  metasHistorial: [],
};

// === FASES DINÁMICAS (configurables) ===
export function faseFinalCamisas() {
  const f = state.fasesCamisas;
  return f.length ? f[f.length - 1].id : "Entregado";
}
export function faseFinalEco() {
  const f = state.fasesEco;
  return f.length ? f[f.length - 1].id : "Entregado";
}
export function colorFaseCamisas(id) {
  const f = state.fasesCamisas.find((x) => x.id === id);
  return f ? f.color : "#94a3b8";
}
export function colorFaseEco(id) {
  const f = state.fasesEco.find((x) => x.id === id);
  return f ? f.color : "#94a3b8";
}
export function nombreFaseCamisas(id) {
  const f = state.fasesCamisas.find((x) => x.id === id);
  return f ? f.nombre : id;
}
export function nombreFaseEco(id) {
  const f = state.fasesEco.find((x) => x.id === id);
  return f ? f.nombre : id;
}

// === CÁLCULOS DERIVADOS · PEDIDOS DE CAMISA ===
export function totalCamisas(pedido) {
  return pedido.items.reduce((s, it) => s + Number(it.cantidad), 0);
}
export function totalPedidoMonto(pedido) {
  return redondear2(pedido.items.reduce((s, it) => s + Number(it.cantidad) * Number(it.precioUnitario), 0));
}
export function totalAbonadoPedido(pedido) {
  return redondear2(Number(pedido.abono || 0) + sumPagos(pedido.pagos));
}
export function saldoPendiente(pedido) {
  return redondear2(totalPedidoMonto(pedido) - totalAbonadoPedido(pedido));
}
export function estaPagado(pedido) {
  return saldoPendiente(pedido) <= 0;
}
export function diasProduccion(pedido) {
  // Solo tiene sentido para pedidos que llegaron a la fase final (entregados).
  if (pedido.estado !== faseFinalCamisas()) return null;
  const ini = pedido.fechaInicio || (pedido.fechas && pedido.fechas.pedido) || pedido.creado;
  const fin = pedido.fechaEstado || (pedido.fechas && pedido.fechas.entregado);
  if (!ini || !fin) return null;
  return Math.round((new Date(fin) - new Date(ini)) / (1000 * 60 * 60 * 24));
}
export function fechaFaseActual(pedido) {
  return pedido.fechaEstado || pedido.fechaInicio || (pedido.fechas && pedido.fechas[CLAVE_FECHA[pedido.estado]]) || pedido.creado;
}
export function historialPagosPedido(pedido) {
  const historial = [];
  if (Number(pedido.abono) > 0) {
    historial.push({ fecha: pedido.creado, monto: Number(pedido.abono), nota: "Abono inicial", entidadTipo: "pedido", entidadId: pedido.id, pagoId: null });
  }
  (pedido.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono", entidadTipo: "pedido", entidadId: pedido.id, pagoId: pg.id }));
  return historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// === CÁLCULOS DERIVADOS · SUBLIMACIÓN (impresiones) ===
export function m2Impresion(imp) {
  return Number(imp.ancho) * Number(imp.alto);
}
export function impresionCobraDinero(tipo) {
  return tipo === "otros";
}
export function totalImpresion(imp) {
  return redondear2(m2Impresion(imp) * Number(imp.precioM2));
}
export function totalAbonadoImpresion(imp) {
  return redondear2(Number(imp.abono || 0) + sumPagos(imp.pagos));
}
export function saldoImpresion(imp) {
  return redondear2(totalImpresion(imp) - totalAbonadoImpresion(imp));
}
export function estaPagadaImpresion(imp) {
  return saldoImpresion(imp) <= 0;
}
export function historialPagosImpresion(imp) {
  const historial = [];
  if (Number(imp.abono) > 0) {
    historial.push({ fecha: imp.creado, monto: Number(imp.abono), nota: "Abono inicial", entidadTipo: "impresion", entidadId: imp.id, pagoId: null });
  }
  (imp.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono", entidadTipo: "impresion", entidadId: imp.id, pagoId: pg.id }));
  return historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// === CÁLCULOS DERIVADOS · ECO SOLVENTE ===
export function m2Eco(eco) {
  if (ecoEsPapelBond(eco)) return 0; // se mide en impresiones, no en m²
  if (ecoEsDtf(eco)) return redondear2((Number(eco.cantidadImpresiones) || 0) * DTF_M2);
  if (ecoEsPorM2Manual(eco)) return Number(eco.m2Manual) || 0;
  return Number(eco.ancho) * Number(eco.alto);
}
export function baseEco(eco) {
  // Papel bond y DTF: cantidad × costo unitario (comparten las mismas columnas).
  if (ecoEsPorUnidad(eco)) return redondear2((Number(eco.cantidadImpresiones) || 0) * (Number(eco.costoImpresion) || 0));
  return redondear2(m2Eco(eco) * Number(eco.precioM2));
}
export function costoClearEco(eco) {
  if (eco.clearModo === "m2") return redondear2(m2Eco(eco) * Number(eco.clearPrecioM2 || 0));
  if (eco.clearModo === "fijo") return redondear2(Number(eco.clearCosto || 0));
  return 0;
}
export function costoTransferEco(eco) {
  if (eco.transferModo === "m2") return redondear2(m2Eco(eco) * Number(eco.transferPrecioM2 || 0));
  if (eco.transferModo === "fijo") return redondear2(Number(eco.transferCosto || 0));
  return 0;
}
export function costoPvcEco(eco) {
  if (eco.pvcModo === "m2") return redondear2(m2Eco(eco) * Number(eco.pvcPrecioM2 || 0));
  if (eco.pvcModo === "fijo") return redondear2(Number(eco.pvcCosto || 0));
  return 0;
}
export function costoRemateEco(eco) {
  return eco.remate && eco.remate !== "ninguno" ? redondear2(Number(eco.remateCosto || 0)) : 0;
}
export function costoDisenoEco(eco) {
  return eco.llevaDiseno ? redondear2(Number(eco.disenoCosto || 0)) : 0;
}
export function costoEstructuraEco(eco) {
  return eco.llevaEstructura ? redondear2(Number(eco.estructuraCosto || 0)) : 0;
}
export function costoCuadroMaderaEco(eco) {
  return eco.llevaCuadroMadera ? redondear2(Number(eco.cuadroMaderaCosto || 0)) : 0;
}
export function totalExtrasEco(eco) {
  // Los tipos simples (stickers, vinil tornasol, papel bond, DTF) solo llevan diseño.
  if (ecoEsSimple(eco)) return costoDisenoEco(eco);
  return redondear2(
    costoRemateEco(eco) +
      costoDisenoEco(eco) +
      costoEstructuraEco(eco) +
      costoCuadroMaderaEco(eco) +
      costoClearEco(eco) +
      costoTransferEco(eco) +
      costoPvcEco(eco)
  );
}
export function totalEco(eco) {
  return redondear2(baseEco(eco) + totalExtrasEco(eco));
}
// El dato que importa de un pedido eco, en piezas, para poder destacarlo:
// cuántos m² si son stickers, la medida si es impresión, cuántas unidades si va
// por cantidad. { icono, valor, unidad, detalle }
export function datoPrincipalEco(eco) {
  if (ecoEsPapelBond(eco)) {
    const n = Number(eco.cantidadImpresiones) || 0;
    return { icono: "🖨️", valor: fmtNum(n), unidad: n === 1 ? "impresión" : "impresiones", detalle: `${money(eco.costoImpresion)} c/u` };
  }
  if (ecoEsDtf(eco)) {
    const n = Number(eco.cantidadImpresiones) || 0;
    return { icono: "🎽", valor: fmtNum(n), unidad: "DTF", detalle: `${fmt(m2Eco(eco))} m² · ${money(eco.costoImpresion)} c/u` };
  }
  if (ecoEsPorM2Manual(eco)) {
    return { icono: "📐", valor: fmt(m2Eco(eco)), unidad: "m²", detalle: "" };
  }
  return { icono: "📐", valor: fmt(m2Eco(eco)), unidad: "m²", detalle: `${fmt(eco.ancho)}×${fmt(eco.alto)} m` };
}

// Lo mismo pero en una línea de texto (ficha del cliente).
export function descripcionMedidaEco(eco) {
  const d = datoPrincipalEco(eco);
  return `${d.icono} ${d.valor} ${d.unidad}${d.detalle ? ` · ${d.detalle}` : ""}`;
}
export function totalAbonadoEco(eco) {
  return redondear2(Number(eco.abono || 0) + sumPagos(eco.pagos));
}
export function saldoEco(eco) {
  return redondear2(totalEco(eco) - totalAbonadoEco(eco));
}
export function estaPagadoEco(eco) {
  return saldoEco(eco) <= 0;
}
export function historialPagosEco(eco) {
  const historial = [];
  if (Number(eco.abono) > 0) {
    historial.push({ fecha: eco.creado, monto: Number(eco.abono), nota: "Abono inicial", entidadTipo: "eco_solvente", entidadId: eco.id, pagoId: null });
  }
  (eco.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono", entidadTipo: "eco_solvente", entidadId: eco.id, pagoId: pg.id }));
  return historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}
export function fechaFaseActualEco(eco) {
  const fechas = eco.fechas || {};
  return eco.fechaEstado || eco.fechaInicio || fechas[CLAVE_FECHA_ECO[eco.estado]] || eco.fecha;
}

// === AGENDA / ENTREGAS (para calendario y notificaciones) ===
export const AVISO_DIAS_DEFECTO = 3;

// Lista unificada de pedidos PENDIENTES que tienen fecha de entrega.
export function agendaItems() {
  const items = [];
  const finalCam = faseFinalCamisas();
  const finalEco = faseFinalEco();
  state.pedidos.forEach((p) => {
    if (p.fechaEntrega && p.estado !== finalCam) {
      items.push({
        tipo: "camisa",
        icono: "👕",
        seccion: "Camisas",
        id: p.id,
        cliente: p.cliente.nombre,
        fechaEntrega: p.fechaEntrega,
        avisoDias: p.avisoDias == null ? AVISO_DIAS_DEFECTO : p.avisoDias,
        saldo: Math.max(saldoPendiente(p), 0),
        estado: p.estado,
      });
    }
  });
  state.impresiones.forEach((i) => {
    if (i.fechaEntrega && !estaPagadaImpresion(i)) {
      items.push({
        tipo: "sublimacion",
        icono: "🖨️",
        seccion: "Sublimación",
        id: i.id,
        cliente: i.cliente,
        fechaEntrega: i.fechaEntrega,
        avisoDias: i.avisoDias == null ? AVISO_DIAS_DEFECTO : i.avisoDias,
        saldo: Math.max(saldoImpresion(i), 0),
        estado: "",
      });
    }
  });
  state.ecoSolvente.forEach((e) => {
    if (e.fechaEntrega && e.estado !== finalEco) {
      items.push({
        tipo: "eco",
        icono: "🏳️",
        seccion: "Eco Solvente",
        id: e.id,
        cliente: e.cliente,
        fechaEntrega: e.fechaEntrega,
        avisoDias: e.avisoDias == null ? AVISO_DIAS_DEFECTO : e.avisoDias,
        saldo: Math.max(saldoEco(e), 0),
        estado: e.estado,
      });
    }
  });
  return items;
}

// Días de calendario entre hoy (00:00) y la fecha dada (00:00). Negativo = vencido.
export function diasHastaEntrega(fechaISO, hoy = new Date()) {
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const f = new Date(fechaISO);
  const fd = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  return Math.round((fd - h) / 86400000);
}

// Pedidos cuya entrega está dentro de su ventana de aviso (o ya vencidos).
export function notificacionesEntrega(hoy = new Date()) {
  return agendaItems()
    .map((it) => ({ ...it, dias: diasHastaEntrega(it.fechaEntrega, hoy) }))
    .filter((it) => it.dias <= it.avisoDias)
    .sort((a, b) => a.dias - b.dias);
}

// === CÁLCULOS DERIVADOS · PÉRDIDAS Y PRUEBAS ===
export function m2Perdida(p) {
  return Number(p.ancho) * Number(p.alto);
}
export function totalPerdida(p) {
  return redondear2(m2Perdida(p) * Number(p.precioM2));
}

// === PRECIOS (tarjeta de referencia) ===
export function migrarPrecios(raw) {
  if (raw && Array.isArray(raw.secciones) && raw.secciones.length) return raw;
  const filas = NIVELES_PRECIO.map((cant) => {
    const v = (raw && raw[cant]) || {};
    return {
      etiqueta: (cant === 12 ? "12+" : String(cant)) + " camisa" + (cant > 1 ? "s" : ""),
      publico: Number(v.publico || 0),
      disenador: Number(v.disenador || 0),
    };
  });
  return { secciones: [{ titulo: "Camisas por cantidad", filas: filas }] };
}

// === CLIENTES AGREGADOS (desglose por área) ===
export function obtenerClientesAgregados() {
  const mapa = new Map();
  function getEntry(nombreRaw) {
    const nombre = (nombreRaw || "").trim();
    if (!nombre) return null;
    const key = nombre.toLowerCase();
    if (!mapa.has(key)) {
      mapa.set(key, { key, nombre, telefono: "", pedidos: [], impresiones: [], ecoSolvente: [] });
    }
    return mapa.get(key);
  }
  state.pedidos.forEach((p) => {
    const entry = getEntry(p.cliente.nombre);
    if (!entry) return;
    entry.pedidos.push(p);
    if (p.cliente.telefono) entry.telefono = p.cliente.telefono;
  });
  state.impresiones.forEach((imp) => {
    const entry = getEntry(imp.cliente);
    if (!entry) return;
    entry.impresiones.push(imp);
  });
  state.ecoSolvente.forEach((eco) => {
    const entry = getEntry(eco.cliente);
    if (!entry) return;
    entry.ecoSolvente.push(eco);
  });
  return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
