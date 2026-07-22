import { supabase } from "./supabaseClient.js";
import { state, migrarPrecios } from "./state.js";

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
    estado: row.estado || "Pedido",
    fechas: {
      pedido: row.fecha_pedido,
      diseno: row.fecha_diseno,
      impresion: row.fecha_impresion,
      acabado: row.fecha_acabado,
      entregado: row.fecha_entregado,
    },
    remate: row.remate || "ninguno",
    remateCosto: Number(row.remate_costo || 0),
    llevaDiseno: !!row.lleva_diseno,
    disenoCosto: Number(row.diseno_costo || 0),
    llevaEstructura: !!row.lleva_estructura,
    estructuraCosto: Number(row.estructura_costo || 0),
    clearModo: row.clear_modo || "ninguno",
    clearCosto: Number(row.clear_costo || 0),
    clearPrecioM2: Number(row.clear_precio_m2 || 0),
    transferModo: row.transfer_modo || "ninguno",
    transferCosto: Number(row.transfer_costo || 0),
    transferPrecioM2: Number(row.transfer_precio_m2 || 0),
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
};

export async function cargarTodo() {
  await Promise.all([cargarPedidos(), cargarImpresiones(), cargarEcoSolvente(), cargarPerdidas(), cargarPrecios()]);
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
export async function crearPedido({ cliente, descripcion, items, abono }) {
  const { data: row, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_notas: cliente.notas,
      descripcion,
      estado: "Pedido",
      fecha_pedido: new Date().toISOString(),
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
  await cargarPedidos();
}

export async function actualizarPedido(id, { cliente, descripcion, abono, items }) {
  const { error } = await supabase
    .from("pedidos")
    .update({
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_notas: cliente.notas,
      descripcion,
      abono,
    })
    .eq("id", id);
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
  await cargarPedidos();
}

export async function actualizarFasePedido(id, estado, campoFecha, valorFecha) {
  const cambios = { estado };
  if (campoFecha) cambios[campoFecha] = valorFecha;
  const { error } = await supabase.from("pedidos").update(cambios).eq("id", id);
  if (error) throw error;
  await cargarPedidos();
}

export async function eliminarPedido(id) {
  await supabase.from("pagos").delete().eq("entidad_tipo", "pedido").eq("entidad_id", id);
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) throw error;
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
  });
  if (error) throw error;
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
    })
    .eq("id", id);
  if (error) throw error;
  await cargarImpresiones();
}

export async function eliminarImpresion(id) {
  await supabase.from("pagos").delete().eq("entidad_tipo", "impresion").eq("entidad_id", id);
  const { error } = await supabase.from("impresiones").delete().eq("id", id);
  if (error) throw error;
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
    estado: "Pedido",
    fecha_pedido: new Date().toISOString(),
    remate: datos.remate,
    remate_costo: datos.remateCosto,
    lleva_diseno: datos.llevaDiseno,
    diseno_costo: datos.disenoCosto,
    lleva_estructura: datos.llevaEstructura,
    estructura_costo: datos.estructuraCosto,
    clear_modo: datos.clearModo,
    clear_costo: datos.clearCosto,
    clear_precio_m2: datos.clearPrecioM2,
    transfer_modo: datos.transferModo,
    transfer_costo: datos.transferCosto,
    transfer_precio_m2: datos.transferPrecioM2,
  });
  if (error) throw error;
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
      remate: datos.remate,
      remate_costo: datos.remateCosto,
      lleva_diseno: datos.llevaDiseno,
      diseno_costo: datos.disenoCosto,
      lleva_estructura: datos.llevaEstructura,
      estructura_costo: datos.estructuraCosto,
      clear_modo: datos.clearModo,
      clear_costo: datos.clearCosto,
      clear_precio_m2: datos.clearPrecioM2,
      transfer_modo: datos.transferModo,
      transfer_costo: datos.transferCosto,
      transfer_precio_m2: datos.transferPrecioM2,
    })
    .eq("id", id);
  if (error) throw error;
  await cargarEcoSolvente();
}

export async function actualizarFaseEco(id, estado, campoFecha, valorFecha) {
  const cambios = { estado };
  if (campoFecha) cambios[campoFecha] = valorFecha;
  const { error } = await supabase.from("eco_solvente").update(cambios).eq("id", id);
  if (error) throw error;
  await cargarEcoSolvente();
}

export async function eliminarEco(id) {
  await supabase.from("pagos").delete().eq("entidad_tipo", "eco_solvente").eq("entidad_id", id);
  const { error } = await supabase.from("eco_solvente").delete().eq("id", id);
  if (error) throw error;
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
  await cargarPerdidas();
}

// ============================================================
// ABONOS (compartidos entre pedidos, impresiones y eco solvente)
// ============================================================
export async function agregarPago(entidadTipo, entidadId, fecha, monto) {
  const { error } = await supabase.from("pagos").insert({
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
    fecha,
    monto,
  });
  if (error) throw error;
  await CARGADORES[entidadTipo === "pedido" ? "pedidos" : entidadTipo === "impresion" ? "impresiones" : "eco_solvente"]();
}

// ============================================================
// PRECIOS (tarjeta de referencia)
// ============================================================
export async function guardarPrecios(precios) {
  const { error } = await supabase.from("precios_config").upsert({ id: 1, data: precios });
  if (error) throw error;
  state.precios = precios;
}

// ============================================================
// IMPORTAR RESPALDO ANTIGUO (localStorage JSON) A SUPABASE
// ============================================================
export async function importarRespaldoAntiguo({ pedidos, impresiones, perdidas }) {
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

  await cargarTodo();
}

// ============================================================
// BORRAR TODO
// ============================================================
export async function borrarTodo() {
  await supabase.from("pagos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("pedido_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("impresiones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("eco_solvente").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("perdidas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await cargarTodo();
}
