-- Kolors · migración: material eco, cuadro de madera, fechas de entrega y aviso
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Es seguro correrlo aunque ya existan datos (usa IF NOT EXISTS).

-- CAMISAS
alter table pedidos
  add column if not exists fecha_inicio timestamptz,
  add column if not exists fecha_entrega timestamptz,
  add column if not exists aviso_dias int;
update pedidos set fecha_inicio = coalesce(fecha_inicio, fecha_pedido) where fecha_inicio is null;

-- SUBLIMACIÓN
alter table impresiones
  add column if not exists fecha_inicio timestamptz,
  add column if not exists fecha_entrega timestamptz,
  add column if not exists aviso_dias int;
update impresiones set fecha_inicio = coalesce(fecha_inicio, fecha) where fecha_inicio is null;

-- ECO SOLVENTE (incluye las columnas del tablero por si no se corrió la migración anterior)
alter table eco_solvente
  add column if not exists estado text not null default 'Pedido',
  add column if not exists fecha_pedido timestamptz,
  add column if not exists fecha_diseno timestamptz,
  add column if not exists fecha_impresion timestamptz,
  add column if not exists fecha_acabado timestamptz,
  add column if not exists fecha_entregado timestamptz,
  add column if not exists material text not null default 'banner',
  add column if not exists lleva_cuadro_madera boolean not null default false,
  add column if not exists cuadro_madera_costo numeric not null default 0,
  add column if not exists fecha_inicio timestamptz,
  add column if not exists fecha_entrega timestamptz,
  add column if not exists aviso_dias int;
update eco_solvente set fecha_pedido = coalesce(fecha_pedido, fecha, creado_at) where fecha_pedido is null;
update eco_solvente set fecha_inicio = coalesce(fecha_inicio, fecha_pedido, fecha) where fecha_inicio is null;
