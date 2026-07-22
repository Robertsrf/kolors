-- Kolors · migración: tablero para Eco Solvente
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Agrega el estado (fase) y las fechas de cada fase a los pedidos de
-- eco solvente, para que tengan su propio tablero como las camisas.
-- Es seguro correrlo aunque ya existan pedidos (usa IF NOT EXISTS).

alter table eco_solvente
  add column if not exists estado text not null default 'Pedido',
  add column if not exists fecha_pedido timestamptz,
  add column if not exists fecha_diseno timestamptz,
  add column if not exists fecha_impresion timestamptz,
  add column if not exists fecha_acabado timestamptz,
  add column if not exists fecha_entregado timestamptz;

-- Para pedidos eco que ya existían: marcarles la fecha de "Pedido"
-- (usa la fecha que tuvieran cargada, o su fecha de creación).
update eco_solvente
  set fecha_pedido = coalesce(fecha_pedido, fecha, creado_at)
  where fecha_pedido is null;
