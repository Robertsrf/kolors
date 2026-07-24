-- Kolors · migración: fases/secciones configurables de los tableros
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Permite personalizar las columnas (secciones) del tablero de camisas y de
-- eco solvente: agregar, renombrar, reordenar y cambiar color.

-- Configuración de fases por tablero (una sola fila)
create table if not exists tableros_config (
  id int primary key default 1,
  camisas jsonb not null default '[
    {"id":"Pedido","nombre":"Pedido","color":"#94a3b8"},
    {"id":"Impresión","nombre":"Impresión","color":"#38bdf8"},
    {"id":"Sublimación","nombre":"Sublimación","color":"#a78bfa"},
    {"id":"Costura","nombre":"Costura","color":"#fbbf24"},
    {"id":"Entregado","nombre":"Entregado","color":"#34d399"}
  ]'::jsonb,
  eco jsonb not null default '[
    {"id":"Pedido","nombre":"Pedido","color":"#94a3b8"},
    {"id":"Diseño","nombre":"Diseño","color":"#a78bfa"},
    {"id":"Impresión","nombre":"Impresión","color":"#38bdf8"},
    {"id":"Acabado","nombre":"Acabado","color":"#fbbf24"},
    {"id":"Entregado","nombre":"Entregado","color":"#34d399"}
  ]'::jsonb,
  constraint tableros_singleton check (id = 1)
);
insert into tableros_config (id) values (1) on conflict (id) do nothing;

-- Fecha en que el pedido entró a su fase actual (para el "hace X días")
alter table pedidos add column if not exists fecha_estado timestamptz;
alter table eco_solvente add column if not exists fecha_estado timestamptz;

update pedidos set fecha_estado = coalesce(
  case estado
    when 'Entregado' then fecha_entregado
    when 'Costura' then fecha_costura
    when 'Sublimación' then fecha_sublimacion
    when 'Impresión' then fecha_impresion
    else fecha_pedido
  end, fecha_inicio, creado_at)
  where fecha_estado is null;

update eco_solvente set fecha_estado = coalesce(
  case estado
    when 'Entregado' then fecha_entregado
    when 'Acabado' then fecha_acabado
    when 'Impresión' then fecha_impresion
    when 'Diseño' then fecha_diseno
    else fecha_pedido
  end, fecha_inicio, creado_at)
  where fecha_estado is null;

-- Permisos: todos leen; todos escriben menos el jefe (solo lectura)
alter table tableros_config enable row level security;
drop policy if exists "tableros_leer" on tableros_config;
drop policy if exists "tableros_escribir" on tableros_config;
create policy "tableros_leer" on tableros_config for select to authenticated using (true);
create policy "tableros_escribir" on tableros_config for all to authenticated
  using ((auth.jwt() ->> 'email') is distinct from 'jefe@kolors.app')
  with check ((auth.jwt() ->> 'email') is distinct from 'jefe@kolors.app');

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table tableros_config;
  exception when duplicate_object then null;
  end;
end $$;
