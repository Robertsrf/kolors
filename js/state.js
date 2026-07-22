import { redondear2, sumPagos } from "./utils.js";

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
  vinil_tornasol: "Vinil Tornasol",
  papel_bond: "Papel Bond",
  clear: "Clear",
};

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
};

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
  if (!pedido.fechas.entregado) return null;
  const inicio = new Date(pedido.fechas.pedido);
  const fin = new Date(pedido.fechas.entregado);
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24));
}
export function fechaFaseActual(pedido) {
  return pedido.fechas[CLAVE_FECHA[pedido.estado]];
}
export function historialPagosPedido(pedido) {
  const historial = [];
  if (Number(pedido.abono) > 0) {
    historial.push({ fecha: pedido.creado, monto: Number(pedido.abono), nota: "Abono inicial" });
  }
  (pedido.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono" }));
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
    historial.push({ fecha: imp.creado, monto: Number(imp.abono), nota: "Abono inicial" });
  }
  (imp.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono" }));
  return historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// === CÁLCULOS DERIVADOS · ECO SOLVENTE ===
export function m2Eco(eco) {
  return Number(eco.ancho) * Number(eco.alto);
}
export function baseEco(eco) {
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
  return redondear2(
    costoRemateEco(eco) +
      costoDisenoEco(eco) +
      costoEstructuraEco(eco) +
      costoCuadroMaderaEco(eco) +
      costoClearEco(eco) +
      costoTransferEco(eco)
  );
}
export function totalEco(eco) {
  return redondear2(baseEco(eco) + totalExtrasEco(eco));
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
    historial.push({ fecha: eco.creado, monto: Number(eco.abono), nota: "Abono inicial" });
  }
  (eco.pagos || []).forEach((pg) => historial.push({ fecha: pg.fecha, monto: Number(pg.monto), nota: "Abono" }));
  return historial.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}
export function fechaFaseActualEco(eco) {
  const fechas = eco.fechas || {};
  return fechas[CLAVE_FECHA_ECO[eco.estado]] || eco.fecha;
}

// === AGENDA / ENTREGAS (para calendario y notificaciones) ===
export const AVISO_DIAS_DEFECTO = 3;

// Lista unificada de pedidos PENDIENTES que tienen fecha de entrega.
export function agendaItems() {
  const items = [];
  state.pedidos.forEach((p) => {
    if (p.fechaEntrega && p.estado !== "Entregado") {
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
    if (e.fechaEntrega && e.estado !== "Entregado") {
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
