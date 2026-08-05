import { supabase } from "./supabaseClient.js";
import { state, migrarPrecios, FASES_CAMISAS_DEFECTO, FASES_ECO_DEFECTO, normalizarMetas } from "./state.js";
import { getUsuarioActual } from "./auth.js";

// ============================================================
// LOG DE CAMBIOS
// ============================================================
export async function registrarLog(seccion, descripcion) {
  try {
    const u = getUsuarioActual();
    await supabase.from("logs").insert({ usuario: u ? u.nombre : "?", seccion, descripcion });
  } catch (e) {
    // El log nunca debe romper la acción principal.
  }
}

export async function cargarLogs() {
  const { data, error } = await supabase.from("logs").select("*").order("creado_at", { ascending: false }).limit(500);
  if (error) {
    state.logs = [];
    return state.logs;
  }
  state.logs = data || [];
  return state.logs;
}

export function suscribirLogs(cb) {
  const canal = supabase.channel("kolors-logs");
  canal.on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, (payload) => {
    if (payload.new) {
      state.logs.unshift(payload.new);
      cb(payload.new);
    }
  });
  canal.subscribe();
  return canal;
}

function agruparPor(rows, key) {
  const mapa = new Map();
  (rows || []).forEach((row) => {
    const k = row[key];
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(row);
  });
  return mapa;
}

function mapPagoRow(pg) {
  return { id: pg.id, fecha: pg.fecha, monto: Number(pg.monto) };
}

// ============================================================
// MAPEO FILA (Supabase) <-> OBJETO EN MEMORIA (misma forma que usa la UI)
// ============================================================
function pedidoFromRow(row, items, pagos) {
  return {
    id: row.id,
    cliente: { nombre: row.cliente_nombre, telefono: row.cliente_telefono || "", notas: row.cliente_notas || "" },
    descripcion: row.descripcion || "",
    items: (items || []).map((it) => ({
      id: it.id,
      genero: it.genero,
      talla: it.talla,
      descripcion: it.descripcion || "",
      cantidad: it.cantidad,
      precioUnitario: Number(it.precio_unitario),
    })),
    estado: row.estado,
    fechas: {
      pedido: row.fecha_pedido,
      impresion: row.fecha_impresion,
      sublimacion: row.fecha_sublimacion,
      costura: row.fecha_costura,
      entregado: row.fecha_entregado,
    },
    abono: Number(row.abono || 0),
    fechaInicio: row.fecha_inicio || null,
    fechaEntrega: row.fecha_entrega || null,
    fechaEstado: row.fecha_estado || null,
    avisoDias: row.aviso_dias == null ? null : Number(row.aviso_dias),
    pagos: (pagos || []).map(mapPagoRow),
    creado: row.creado_at,
  };
}

function impresionFromRow(row, pagos) {
  return {
    id: row.id,
    cliente: row.cliente,
    fecha: row.fecha,
    tipo: row.tipo || "otros",
    ancho: Number(row.ancho),
    alto: Number(row.alto),
    precioM2: Number(row.precio_m2 || 0),
    descripcion: row.descripcion || "",
    abono: Number(row.abono || 0),
    fechaInicio: row.fecha_inicio || null,
    fechaEntrega: row.fecha_entrega || null,
    avisoDias: row.aviso_dias == null ? null : Number(row.aviso_dias),
    pagos: (pagos || []).map(mapPagoRow),
    creado: row.creado_at,
  };
}

function ecoFromRow(row, pagos) {
  return {
    id: row.id,
    cliente: row.cliente,
    fecha: row.fecha,
    ancho: Number(row.ancho),
    alto: Number(row.alto),
    precioM2: Number(row.precio_m2 || 0),
    descripcion: row.descripcion || "",
    abono: Number(row.abono || 0),
    material: row.material || "banner",
    tipoTrabajo: row.tipo_trabajo || "impresion",
    m2Manual: Number(row.m2_manual || 0),
    estado: row.estado || "Pedido",
    fechas: {
      pedido: row.fecha_pedido,
      diseno: row.fecha_diseno,
      impresion: row.fecha_impresion,
      acabado: row.fecha_acabado,
      entregado: row.fecha_entregado,
    },
    fechaInicio: row.fecha_inicio || null,
    fechaEntrega: row.fecha_entrega || null,
    fechaEstado: row.fecha_estado || null,
    avisoDias: row.aviso_dias == null ? null : Number(row.aviso_dias),
    remate: row.remate || "ninguno",
    remateCosto: Number(row.remate_costo || 0),
    llevaDiseno: !!row.lleva_diseno,
    disenoCosto: Number(row.diseno_costo || 0),
    llevaEstructura: !!row.lleva_estructura,
    estructuraCosto: Number(row.estructura_costo || 0),
    llevaCuadroMadera: !!row.lleva_cuadro_madera,
    cuadroMaderaCosto: Number(row.cuadro_madera_costo || 0),
    clearModo: row.clear_modo || "ninguno",
    clearCosto: Number(row.clear_costo || 0),
    clearPrecioM2: Number(row.clear_precio_m2 || 0),
    transferModo: row.transfer_modo || "ninguno",
    transferCosto: Number(row.transfer_costo || 0),
    transferPrecioM2: Number(row.transfer_precio_m2 || 0),
    pvcModo: row.pvc_modo || "ninguno",
    pvcCosto: Number(row.pvc_costo || 0),
    pvcPrecioM2: Number(row.pvc_precio_m2 || 0),
    pagos: (pagos || []).map(mapPagoRow),
    creado: row.creado_at,
  };
}

function perdidaFromRow(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    tipo: row.tipo || "perdida",
    ancho: Number(row.ancho),
    alto: Number(row.alto),
    precioM2: Number(row.precio_m2 || 0),
    descripcion: row.descripcion || "",
    creado: row.creado_at,
  };
}

// ============================================================
// CARGA INICIAL (todas las tablas)
// ============================================================
async function cargarPedidos() {
  const [{ data: rows, error }, { data: items, error: e2 }, { data: pagos, error: e3 }] = await Promise.all([
    supabase.from("pedidos").select("*").order("creado_at", { ascending: true }),
    supabase.from("pedido_items").select("*"),
    supabase.from("pagos").select("*").eq("entidad_tipo", "pedido"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  if (e3) throw e3;
  const itemsPorPedido = agruparPor(items, "pedido_id");
  const pagosPorEntidad = agruparPor(pagos, "entidad_id");
  state.pedidos = (rows || []).map((row) =>
    pedidoFromRow(row, itemsPorPedido.get(row.id), pagosPorEntidad.get(row.id))
  );
}

async function cargarImpresiones() {
  const [{ data: rows, error }, { data: pagos, error: e2 }] = await Promise.all([
    supabase.from("impresiones").select("*").order("fecha", { ascending: false }),
    supabase.from("pagos").select("*").eq("entidad_tipo", "impresion"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const pagosPorEntidad = agruparPor(pagos, "entidad_id");
  state.impresiones = (rows || []).map((row) => impresionFromRow(row, pagosPorEntidad.get(row.id)));
}

async function cargarEcoSolvente() {
  const [{ data: rows, error }, { data: pagos, error: e2 }] = await Promise.all([
    supabase.from("eco_solvente").select("*").order("fecha", { ascending: false }),
    supabase.from("pagos").select("*").eq("entidad_tipo", "eco_solvente"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const pagosPorEntidad = agruparPor(pagos, "entidad_id");
  state.ecoSolvente = (rows || []).map((row) => ecoFromRow(row, pagosPorEntidad.get(row.id)));
}

async function cargarPerdidas() {
  const { data: rows, error } = await supabase.from("perdidas").select("*").order("fecha", { ascending: false });
  if (error) throw error;
  state.perdidas = (rows || []).map(perdidaFromRow);
}

async function cargarPrecios() {
  const { data: row, error } = await supabase.from("precios_config").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  state.precios = migrarPrecios(row ? row.data : null);
}

function normalizarFases(arr, defecto) {
  if (!Array.isArray(arr) || !arr.length) return defecto.map((f) => ({ ...f }));
  return arr
    .filter((f) => f && f.id && f.nombre)
    .map((f) => ({ id: String(f.id), nombre: String(f.nombre), color: f.color || "#94a3b8" }));
}

async function cargarTablerosConfig() {
  const { data: row, error } = await supabase.from("tableros_config").select("*").eq("id", 1).maybeSingle();
  if (error) {
    // Si la tabla aún no existe, se usan las fases por defecto.
    state.fasesCamisas = FASES_CAMISAS_DEFECTO.map((f) => ({ ...f }));
    state.fasesEco = FASES_ECO_DEFECTO.map((f) => ({ ...f }));
    return;
  }
  state.fasesCamisas = normalizarFases(row ? row.camisas : null, FASES_CAMISAS_DEFECTO);
  state.fasesEco = normalizarFases(row ? row.eco : null, FASES_ECO_DEFECTO);
}

export async function guardarFasesTablero(cual, fases) {
  const columna = cual === "eco" ? "eco" : "camisas";
  const { error } = await supabase.from("tableros_config").upsert({ id: 1, [columna]: fases });
  if (error) throw error;
  if (cual === "eco") state.fasesEco = fases;
  else state.fasesCamisas = fases;
  registrarLog("Sistema", `Configuró las secciones del tablero de ${cual === "eco" ? "eco solvente" : "camisas"}`);
}

async function cargarMetas() {
  const { data: row, error } = await supabase.from("metas_config").select("*").eq("id", 1).maybeSingle();
  if (error) {
    state.metas = normalizarMetas(null);
    return;
  }
  state.metas = normalizarMetas(row ? row.data : null);
}

export async function guardarMetas(metas) {
  const { error } = await supabase.from("metas_config").upsert({ id: 1, data: metas });
  if (error) throw error;
  state.metas = normalizarMetas(metas);
  registrarLog("Sistema", "Actualizó las metas de producción");
}

const CARGADORES = {
  pedidos: cargarPedidos,
  pedido_items: cargarPedidos,
  impresiones: cargarImpresiones,
  eco_solvente: cargarEcoSolvente,
  perdidas: cargarPerdidas,
  pagos: async () => {
    await Promise.all([cargarPedidos(), cargarImpresiones(), cargarEcoSolvente()]);
  },
  precios_config: cargarPrecios,
  tableros_config: cargarTablerosConfig,
  metas_config: cargarMetas,
};

export async function cargarTodo() {
  await Promise.all([
    cargarPedidos(),
    cargarImpresiones(),
    cargarEcoSolvente(),
    cargarPerdidas(),
    cargarPrecios(),
    cargarTablerosConfig(),
    cargarMetas(),
  ]);
}

// ============================================================
// NOTAS COMPARTIDAS
// ============================================================
export async function cargarNotas() {
  const { data, error } = await supabase.from("notas_config").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  state.notas = data ? data.contenido || "" : "";
  return state.notas;
}
export async function guardarNotas(texto, autor) {
  const { error } = await supabase
    .from("notas_config")
    .upsert({ id: 1, contenido: texto, actualizado_at: new Date().toISOString(), actualizado_por: autor });
  if (error) throw error;
  state.notas = texto;
}
export function suscribirNotas(cb) {
  const canal = supabase.channel("kolors-notas");
  canal.on("postgres_changes", { event: "*", schema: "public", table: "notas_config" }, (payload) => {
    if (payload.new) state.notas = payload.new.contenido || "";
    cb(payload.new || {});
  });
  canal.subscribe();
  return canal;
}

// ============================================================
// CHAT DEL EQUIPO
// ============================================================
export async function cargarMensajes() {
  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .order("creado_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  state.mensajes = data || [];
  return state.mensajes;
}
export async function enviarMensaje(autor, texto) {
  const { error } = await supabase.from("mensajes").insert({ autor, texto });
  if (error) throw error;
}
export function suscribirChat(cb) {
  const canal = supabase.channel("kolors-chat");
  canal.on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
    if (payload.new) {
      state.mensajes.push(payload.new);
      cb(payload.new);
    }
  });
  canal.subscribe();
  return canal;
}

// ============================================================
// TIEMPO REAL: cualquier cambio en cualquier tabla recarga esa
// entidad y notifica para volver a pintar la pantalla.
// ============================================================
export function suscribirRealtime(onCambio) {
  const pendientes = new Set();
  let timer = null;

  function programarRefresco(tabla) {
    pendientes.add(tabla);
    if (timer) return;
    timer = setTimeout(async () => {
      const tablas = Array.from(pendientes);
      pendientes.clear();
      timer = null;
      await Promise.all(tablas.map((t) => CARGADORES[t] && CARGADORES[t]()));
      onCambio();
    }, 200);
  }

  const canal = supabase.channel("kolors-db-changes");
  Object.keys(CARGADORES).forEach((tabla) => {
    canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => programarRefresco(tabla));
  });
  canal.subscribe();
  return canal;
}

// ============================================================
// PEDIDOS DE CAMISA
// ============================================================
export async function crearPedido({ cliente, descripcion, items, abono, fechaInicio, fechaEntrega, avisoDias }) {
  const ahora = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_notas: cliente.notas,
      descripcion,
      estado: "Pedido",
      fecha_pedido: fechaInicio || ahora,
      fecha_inicio: fechaInicio || ahora,
      fecha_entrega: fechaEntrega || null,
      aviso_dias: avisoDias == null ? null : avisoDias,
      abono,
    })
    .select()
    .single();
  if (error) throw error;
  if (items.length) {
    const { error: errItems } = await supabase.from("pedido_items").insert(
      items.map((it) => ({
        pedido_id: row.id,
        genero: it.genero,
        talla: it.talla,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio_unitario: it.precioUnitario,
      }))
    );
    if (errItems) throw errItems;
  }
  registrarLog("Camisas", `Creó el pedido de "${cliente.nombre}"`);
  await cargarPedidos();
}

export async function actualizarPedido(id, { cliente, descripcion, abono, items, fechaInicio, fechaEntrega, avisoDias }) {
  const cambios = {
    cliente_nombre: cliente.nombre,
    cliente_telefono: cliente.telefono,
    cliente_notas: cliente.notas,
    descripcion,
    abono,
    fecha_entrega: fechaEntrega || null,
    aviso_dias: avisoDias == null ? null : avisoDias,
  };
  if (fechaInicio) {
    cambios.fecha_inicio = fechaInicio;
    cambios.fecha_pedido = fechaInicio;
  }
  const { error } = await supabase.from("pedidos").update(cambios).eq("id", id);
  if (error) throw error;

  const { error: errDel } = await supabase.from("pedido_items").delete().eq("pedido_id", id);
  if (errDel) throw errDel;
  if (items.length) {
    const { error: errIns } = await supabase.from("pedido_items").insert(
      items.map((it) => ({
        pedido_id: id,
        genero: it.genero,
        talla: it.talla,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio_unitario: it.precioUnitario,
      }))
    );
    if (errIns) throw errIns;
  }
  registrarLog("Camisas", `Editó el pedido de "${cliente.nombre}"`);
  await cargarPedidos();
}

export async function actualizarFasePedido(id, estado) {
  const p = state.pedidos.find((x) => x.id === id);
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", id);
  if (error) throw error;
  // fecha_estado en un update aparte: si la columna aún no existe (migración
  // pendiente), avanzar de fase igual funciona; se ignora ese error.
  await supabase.from("pedidos").update({ fecha_estado: new Date().toISOString() }).eq("id", id);
  registrarLog("Camisas", `Movió el pedido de "${p ? p.cliente.nombre : id}" a "${estado}"`);
  await cargarPedidos();
}

export async function eliminarPedido(id) {
  const p = state.pedidos.find((x) => x.id === id);
  await supabase.from("pagos").delete().eq("entidad_tipo", "pedido").eq("entidad_id", id);
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) throw error;
  registrarLog("Camisas", `Eliminó el pedido de "${p ? p.cliente.nombre : id}"`);
  await cargarPedidos();
}

// ============================================================
// SUBLIMACIÓN (impresiones)
// ============================================================
export async function crearImpresion(datos) {
  const { error } = await supabase.from("impresiones").insert({
    cliente: datos.cliente,
    fecha: datos.fecha,
    tipo: datos.tipo,
    ancho: datos.ancho,
    alto: datos.alto,
    precio_m2: datos.precioM2,
    descripcion: datos.descripcion,
    abono: datos.abono,
    fecha_inicio: datos.fechaInicio || datos.fecha || null,
    fecha_entrega: datos.fechaEntrega || null,
    aviso_dias: datos.avisoDias == null ? null : datos.avisoDias,
  });
  if (error) throw error;
  registrarLog("Sublimación", `Creó una sublimación de "${datos.cliente}"`);
  await cargarImpresiones();
}

export async function actualizarImpresion(id, datos) {
  const { error } = await supabase
    .from("impresiones")
    .update({
      cliente: datos.cliente,
      fecha: datos.fecha,
      tipo: datos.tipo,
      ancho: datos.ancho,
      alto: datos.alto,
      precio_m2: datos.precioM2,
      descripcion: datos.descripcion,
      abono: datos.abono,
      fecha_inicio: datos.fechaInicio || datos.fecha || null,
      fecha_entrega: datos.fechaEntrega || null,
      aviso_dias: datos.avisoDias == null ? null : datos.avisoDias,
    })
    .eq("id", id);
  if (error) throw error;
  registrarLog("Sublimación", `Editó una sublimación de "${datos.cliente}"`);
  await cargarImpresiones();
}

export async function eliminarImpresion(id) {
  const imp = state.impresiones.find((x) => x.id === id);
  await supabase.from("pagos").delete().eq("entidad_tipo", "impresion").eq("entidad_id", id);
  const { error } = await supabase.from("impresiones").delete().eq("id", id);
  if (error) throw error;
  registrarLog("Sublimación", `Eliminó una sublimación de "${imp ? imp.cliente : id}"`);
  await cargarImpresiones();
}

// ============================================================
// ECO SOLVENTE
// ============================================================
export async function crearEco(datos) {
  const { error } = await supabase.from("eco_solvente").insert({
    cliente: datos.cliente,
    fecha: datos.fecha,
    ancho: datos.ancho,
    alto: datos.alto,
    precio_m2: datos.precioM2,
    descripcion: datos.descripcion,
    abono: datos.abono,
    material: datos.material || "banner",
    tipo_trabajo: datos.tipoTrabajo || "impresion",
    m2_manual: datos.m2Manual || 0,
    estado: "Pedido",
    fecha_pedido: datos.fechaInicio || new Date().toISOString(),
    fecha_inicio: datos.fechaInicio || datos.fecha || new Date().toISOString(),
    fecha_entrega: datos.fechaEntrega || null,
    aviso_dias: datos.avisoDias == null ? null : datos.avisoDias,
    remate: datos.remate,
    remate_costo: datos.remateCosto,
    lleva_diseno: datos.llevaDiseno,
    diseno_costo: datos.disenoCosto,
    lleva_estructura: datos.llevaEstructura,
    estructura_costo: datos.estructuraCosto,
    lleva_cuadro_madera: datos.llevaCuadroMadera,
    cuadro_madera_costo: datos.cuadroMaderaCosto,
    clear_modo: datos.clearModo,
    clear_costo: datos.clearCosto,
    clear_precio_m2: datos.clearPrecioM2,
    transfer_modo: datos.transferModo,
    transfer_costo: datos.transferCosto,
    transfer_precio_m2: datos.transferPrecioM2,
    pvc_modo: datos.pvcModo,
    pvc_costo: datos.pvcCosto,
    pvc_precio_m2: datos.pvcPrecioM2,
  });
  if (error) throw error;
  registrarLog("Eco Solvente", `Creó un pedido eco solvente de "${datos.cliente}"`);
  await cargarEcoSolvente();
}

export async function actualizarEco(id, datos) {
  const { error } = await supabase
    .from("eco_solvente")
    .update({
      cliente: datos.cliente,
      fecha: datos.fecha,
      ancho: datos.ancho,
      alto: datos.alto,
      precio_m2: datos.precioM2,
      descripcion: datos.descripcion,
      abono: datos.abono,
      material: datos.material || "banner",
      tipo_trabajo: datos.tipoTrabajo || "impresion",
      m2_manual: datos.m2Manual || 0,
      fecha_inicio: datos.fechaInicio || datos.fecha || null,
      fecha_entrega: datos.fechaEntrega || null,
      aviso_dias: datos.avisoDias == null ? null : datos.avisoDias,
      remate: datos.remate,
      remate_costo: datos.remateCosto,
      lleva_diseno: datos.llevaDiseno,
      diseno_costo: datos.disenoCosto,
      lleva_estructura: datos.llevaEstructura,
      estructura_costo: datos.estructuraCosto,
      lleva_cuadro_madera: datos.llevaCuadroMadera,
      cuadro_madera_costo: datos.cuadroMaderaCosto,
      clear_modo: datos.clearModo,
      clear_costo: datos.clearCosto,
      clear_precio_m2: datos.clearPrecioM2,
      transfer_modo: datos.transferModo,
      transfer_costo: datos.transferCosto,
      transfer_precio_m2: datos.transferPrecioM2,
      pvc_modo: datos.pvcModo,
      pvc_costo: datos.pvcCosto,
      pvc_precio_m2: datos.pvcPrecioM2,
    })
    .eq("id", id);
  if (error) throw error;
  registrarLog("Eco Solvente", `Editó un pedido eco solvente de "${datos.cliente}"`);
  await cargarEcoSolvente();
}

export async function actualizarFaseEco(id, estado) {
  const e = state.ecoSolvente.find((x) => x.id === id);
  const { error } = await supabase.from("eco_solvente").update({ estado }).eq("id", id);
  if (error) throw error;
  await supabase.from("eco_solvente").update({ fecha_estado: new Date().toISOString() }).eq("id", id);
  registrarLog("Eco Solvente", `Movió el pedido eco de "${e ? e.cliente : id}" a "${estado}"`);
  await cargarEcoSolvente();
}

export async function eliminarEco(id) {
  const e = state.ecoSolvente.find((x) => x.id === id);
  await supabase.from("pagos").delete().eq("entidad_tipo", "eco_solvente").eq("entidad_id", id);
  const { error } = await supabase.from("eco_solvente").delete().eq("id", id);
  if (error) throw error;
  registrarLog("Eco Solvente", `Eliminó un pedido eco solvente de "${e ? e.cliente : id}"`);
  await cargarEcoSolvente();
}

// ============================================================
// PÉRDIDAS Y PRUEBAS DE IMPRESIÓN
// ============================================================
export async function crearPerdida(datos) {
  const { error } = await supabase.from("perdidas").insert({
    fecha: datos.fecha,
    tipo: datos.tipo,
    ancho: datos.ancho,
    alto: datos.alto,
    precio_m2: datos.precioM2,
    descripcion: datos.descripcion,
  });
  if (error) throw error;
  registrarLog("Pérdidas", `Registró una ${datos.tipo === "prueba" ? "prueba" : "pérdida"}${datos.descripcion ? ` (${datos.descripcion})` : ""}`);
  await cargarPerdidas();
}

export async function actualizarPerdida(id, datos) {
  const { error } = await supabase
    .from("perdidas")
    .update({
      fecha: datos.fecha,
      tipo: datos.tipo,
      ancho: datos.ancho,
      alto: datos.alto,
      precio_m2: datos.precioM2,
      descripcion: datos.descripcion,
    })
    .eq("id", id);
  if (error) throw error;
  await cargarPerdidas();
}

export async function eliminarPerdida(id) {
  const { error } = await supabase.from("perdidas").delete().eq("id", id);
  if (error) throw error;
  registrarLog("Pérdidas", "Eliminó un registro de pérdida/prueba");
  await cargarPerdidas();
}

// ============================================================
// ABONOS (compartidos entre pedidos, impresiones y eco solvente)
// ============================================================
function tablaDeEntidad(entidadTipo) {
  return entidadTipo === "pedido" ? "pedidos" : entidadTipo === "impresion" ? "impresiones" : "eco_solvente";
}

function clienteDeEntidad(entidadTipo, entidadId) {
  if (entidadTipo === "pedido") {
    const p = state.pedidos.find((x) => x.id === entidadId);
    return p ? p.cliente.nombre : entidadId;
  }
  const lista = entidadTipo === "impresion" ? state.impresiones : state.ecoSolvente;
  const e = lista.find((x) => x.id === entidadId);
  return e ? e.cliente : entidadId;
}

export async function agregarPago(entidadTipo, entidadId, fecha, monto) {
  const { error } = await supabase.from("pagos").insert({
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
    fecha,
    monto,
  });
  if (error) throw error;
  registrarLog("Abonos", `Registró un abono de $${monto} a "${clienteDeEntidad(entidadTipo, entidadId)}"`);
  await CARGADORES[tablaDeEntidad(entidadTipo)]();
}

// Elimina un abono: si es un pago posterior, borra la fila de `pagos`;
// si es el abono inicial (vive en la entidad), lo pone en 0.
export async function eliminarAbono(entidadTipo, entidadId, pagoId) {
  const cliente = clienteDeEntidad(entidadTipo, entidadId);
  if (pagoId) {
    const { error } = await supabase.from("pagos").delete().eq("id", pagoId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(tablaDeEntidad(entidadTipo)).update({ abono: 0 }).eq("id", entidadId);
    if (error) throw error;
  }
  registrarLog("Abonos", `Eliminó un abono de "${cliente}"`);
  await CARGADORES[tablaDeEntidad(entidadTipo)]();
}

// ============================================================
// PRECIOS (tarjeta de referencia)
// ============================================================
export async function guardarPrecios(precios) {
  const { error } = await supabase.from("precios_config").upsert({ id: 1, data: precios });
  if (error) throw error;
  state.precios = precios;
  registrarLog("Sistema", "Actualizó la lista de precios");
}

// ============================================================
// IMPORTAR RESPALDO ANTIGUO (localStorage JSON) A SUPABASE
// ============================================================
export async function importarRespaldoAntiguo({ pedidos, impresiones, ecoSolvente, perdidas }) {
  for (const p of pedidos || []) {
    const { data: row, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_nombre: p.cliente.nombre,
        cliente_telefono: p.cliente.telefono || null,
        cliente_notas: p.cliente.notas || null,
        descripcion: p.descripcion || null,
        estado: p.estado,
        fecha_pedido: p.fechas.pedido,
        fecha_impresion: p.fechas.impresion,
        fecha_sublimacion: p.fechas.sublimacion,
        fecha_costura: p.fechas.costura,
        fecha_entregado: p.fechas.entregado,
        fecha_inicio: p.fechaInicio || p.fechas.pedido || null,
        fecha_entrega: p.fechaEntrega || null,
        aviso_dias: p.avisoDias == null ? null : p.avisoDias,
        abono: p.abono || 0,
        creado_at: p.creado || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (p.items && p.items.length) {
      await supabase.from("pedido_items").insert(
        p.items.map((it) => ({
          pedido_id: row.id,
          genero: it.genero,
          talla: it.talla,
          descripcion: it.descripcion || null,
          cantidad: it.cantidad,
          precio_unitario: it.precioUnitario,
        }))
      );
    }
    if (p.pagos && p.pagos.length) {
      await supabase.from("pagos").insert(
        p.pagos.map((pg) => ({ entidad_tipo: "pedido", entidad_id: row.id, fecha: pg.fecha, monto: pg.monto }))
      );
    }
  }

  for (const imp of impresiones || []) {
    const { data: row, error } = await supabase
      .from("impresiones")
      .insert({
        cliente: imp.cliente,
        fecha: imp.fecha,
        tipo: imp.tipo || "otros",
        ancho: imp.ancho,
        alto: imp.alto,
        precio_m2: imp.precioM2,
        descripcion: imp.descripcion || null,
        abono: imp.abono || 0,
        fecha_inicio: imp.fechaInicio || imp.fecha || null,
        fecha_entrega: imp.fechaEntrega || null,
        aviso_dias: imp.avisoDias == null ? null : imp.avisoDias,
        creado_at: imp.creado || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (imp.pagos && imp.pagos.length) {
      await supabase.from("pagos").insert(
        imp.pagos.map((pg) => ({ entidad_tipo: "impresion", entidad_id: row.id, fecha: pg.fecha, monto: pg.monto }))
      );
    }
  }

  for (const eco of ecoSolvente || []) {
    const { data: row, error } = await supabase
      .from("eco_solvente")
      .insert({
        cliente: eco.cliente,
        fecha: eco.fecha,
        ancho: eco.ancho,
        alto: eco.alto,
        precio_m2: eco.precioM2 || 0,
        descripcion: eco.descripcion || null,
        abono: eco.abono || 0,
        material: eco.material || "banner",
        tipo_trabajo: eco.tipoTrabajo || "impresion",
        m2_manual: eco.m2Manual || 0,
        estado: eco.estado || "Pedido",
        fecha_pedido: (eco.fechas && eco.fechas.pedido) || eco.fecha || eco.creado || new Date().toISOString(),
        fecha_diseno: (eco.fechas && eco.fechas.diseno) || null,
        fecha_impresion: (eco.fechas && eco.fechas.impresion) || null,
        fecha_acabado: (eco.fechas && eco.fechas.acabado) || null,
        fecha_entregado: (eco.fechas && eco.fechas.entregado) || null,
        fecha_inicio: eco.fechaInicio || eco.fecha || null,
        fecha_entrega: eco.fechaEntrega || null,
        aviso_dias: eco.avisoDias == null ? null : eco.avisoDias,
        remate: eco.remate || "ninguno",
        remate_costo: eco.remateCosto || 0,
        lleva_diseno: !!eco.llevaDiseno,
        diseno_costo: eco.disenoCosto || 0,
        lleva_estructura: !!eco.llevaEstructura,
        estructura_costo: eco.estructuraCosto || 0,
        lleva_cuadro_madera: !!eco.llevaCuadroMadera,
        cuadro_madera_costo: eco.cuadroMaderaCosto || 0,
        clear_modo: eco.clearModo || "ninguno",
        clear_costo: eco.clearCosto || 0,
        clear_precio_m2: eco.clearPrecioM2 || 0,
        transfer_modo: eco.transferModo || "ninguno",
        transfer_costo: eco.transferCosto || 0,
        transfer_precio_m2: eco.transferPrecioM2 || 0,
        pvc_modo: eco.pvcModo || "ninguno",
        pvc_costo: eco.pvcCosto || 0,
        pvc_precio_m2: eco.pvcPrecioM2 || 0,
        creado_at: eco.creado || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (eco.pagos && eco.pagos.length) {
      await supabase.from("pagos").insert(
        eco.pagos.map((pg) => ({ entidad_tipo: "eco_solvente", entidad_id: row.id, fecha: pg.fecha, monto: pg.monto }))
      );
    }
  }

  for (const p of perdidas || []) {
    await supabase.from("perdidas").insert({
      fecha: p.fecha,
      tipo: p.tipo || "perdida",
      ancho: p.ancho,
      alto: p.alto,
      precio_m2: p.precioM2,
      descripcion: p.descripcion || null,
      creado_at: p.creado || new Date().toISOString(),
    });
  }

  registrarLog(
    "Sistema",
    `Importó datos: ${(pedidos || []).length} camisas, ${(impresiones || []).length} sublimación, ${(ecoSolvente || []).length} eco solvente, ${(perdidas || []).length} pérdidas`
  );
  await cargarTodo();
}

// ============================================================
// BORRAR TODO
// ============================================================
export async function borrarTodo() {
  await registrarLog("Sistema", "⚠️ Borró TODOS los datos");
  await supabase.from("pagos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("pedido_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("impresiones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("eco_solvente").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("perdidas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await cargarTodo();
}
