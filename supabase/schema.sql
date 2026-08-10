-- Kolors · esquema de base de datos (Supabase / Postgres)
-- Ejecutar completo en: Supabase → tu proyecto → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- ============================================================
-- PEDIDOS DE CAMISA
-- ============================================================
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_telefono text,
  cliente_notas text,
  descripcion text,
  estado text not null default 'Pedido',
  fecha_pedido timestamptz,
  fecha_impresion timestamptz,
  fecha_sublimacion timestamptz,
  fecha_costura timestamptz,
  fecha_entregado timestamptz,
  fecha_inicio timestamptz,
  fecha_entrega timestamptz,
  fecha_estado timestamptz,
  aviso_dias int,
  abono numeric not null default 0,
  creado_at timestamptz not null default now()
);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  genero text,
  talla text,
  descripcion text,
  cantidad int not null,
  precio_unitario numeric not null default 0
);

-- ============================================================
-- SUBLIMACIÓN (impresiones)
-- ============================================================
create table if not exists impresiones (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  fecha timestamptz not null,
  tipo text not null default 'otros', -- 'camisa' | 'taller' | 'otros'
  ancho numeric not null,
  alto numeric not null,
  precio_m2 numeric not null default 0,
  descripcion text,
  abono numeric not null default 0,
  fecha_inicio timestamptz,
  fecha_entrega timestamptz,
  aviso_dias int,
  creado_at timestamptz not null default now()
);

-- ============================================================
-- ECO SOLVENTE (pendones/banners)
-- ============================================================
create table if not exists eco_solvente (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  fecha timestamptz not null,
  ancho numeric not null,
  alto numeric not null,
  precio_m2 numeric not null default 0,
  descripcion text,
  abono numeric not null default 0,
  material text not null default 'banner',       -- 'vinil' | 'banner' | 'vinil_tornasol' | 'papel_bond' | 'clear'
  tipo_trabajo text not null default 'impresion', -- 'impresion' | 'stickers' | 'vinil_tornasol' | 'papel_bond' | 'dtf'
  m2_manual numeric not null default 0,          -- m² directo (stickers / vinil tornasol)
  cantidad_impresiones numeric not null default 0, -- cantidad (papel bond)
  costo_impresion numeric not null default 0,      -- costo por impresión (papel bond)

  -- flujo del tablero: Pedido -> Diseño -> Impresión -> Acabado -> Entregado
  estado text not null default 'Pedido',
  fecha_pedido timestamptz,
  fecha_diseno timestamptz,
  fecha_impresion timestamptz,
  fecha_acabado timestamptz,
  fecha_entregado timestamptz,
  fecha_inicio timestamptz,
  fecha_entrega timestamptz,
  fecha_estado timestamptz,
  aviso_dias int,

  remate text not null default 'ninguno',       -- 'ninguno' | 'palos' | 'tubos'
  remate_costo numeric not null default 0,

  lleva_diseno boolean not null default false,
  diseno_costo numeric not null default 0,

  lleva_estructura boolean not null default false,
  estructura_costo numeric not null default 0,

  lleva_cuadro_madera boolean not null default false,
  cuadro_madera_costo numeric not null default 0,

  clear_modo text not null default 'ninguno',   -- 'ninguno' | 'fijo' | 'm2'
  clear_costo numeric not null default 0,
  clear_precio_m2 numeric not null default 0,

  transfer_modo text not null default 'ninguno', -- 'ninguno' | 'fijo' | 'm2'
  transfer_costo numeric not null default 0,
  transfer_precio_m2 numeric not null default 0,

  pvc_modo text not null default 'ninguno',      -- 'ninguno' | 'fijo' | 'm2'
  pvc_costo numeric not null default 0,
  pvc_precio_m2 numeric not null default 0,

  creado_at timestamptz not null default now()
);

-- ============================================================
-- PÉRDIDAS Y PRUEBAS DE IMPRESIÓN
-- ============================================================
create table if not exists perdidas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null,
  tipo text not null default 'perdida', -- 'perdida' | 'prueba'
  ancho numeric not null,
  alto numeric not null,
  precio_m2 numeric not null default 0,
  descripcion text,
  creado_at timestamptz not null default now()
);

-- ============================================================
-- ABONOS (compartidos entre pedidos, impresiones y eco_solvente)
-- ============================================================
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null check (entidad_tipo in ('pedido', 'impresion', 'eco_solvente')),
  entidad_id uuid not null,
  fecha timestamptz not null,
  monto numeric not null,
  creado_at timestamptz not null default now()
);

-- ============================================================
-- TARJETA DE PRECIOS DE REFERENCIA (contenido libre)
-- ============================================================
create table if not exists precios_config (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  constraint precios_config_singleton check (id = 1)
);
insert into precios_config (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- ============================================================
-- FASES CONFIGURABLES DE LOS TABLEROS (camisas y eco solvente)
-- ============================================================
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

-- ============================================================
-- METAS DE PRODUCCIÓN (las fijan las cuentas con acceso completo; todos las ven)
-- ============================================================
create table if not exists metas_config (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  constraint metas_singleton check (id = 1)
);
insert into metas_config (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
alter table metas_config enable row level security;
drop policy if exists "metas_leer" on metas_config;
drop policy if exists "metas_escribir" on metas_config;
create policy "metas_leer" on metas_config for select to authenticated using (true);
create policy "metas_escribir" on metas_config for all to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));

-- Registro histórico: las metas que estaban vigentes en cada período ya cerrado.
create table if not exists metas_historial (
  periodo text not null check (periodo in ('semana', 'mes')),
  clave text not null,              -- semana: 'AAAA-MM-DD' (lunes) · mes: 'AAAA-MM'
  data jsonb not null default '{}'::jsonb,
  creado_at timestamptz not null default now(),
  primary key (periodo, clave)
);
alter table metas_historial enable row level security;
drop policy if exists "metas_hist_leer" on metas_historial;
drop policy if exists "metas_hist_crear" on metas_historial;
drop policy if exists "metas_hist_editar" on metas_historial;
drop policy if exists "metas_hist_borrar" on metas_historial;
create policy "metas_hist_leer" on metas_historial for select to authenticated using (true);
create policy "metas_hist_crear" on metas_historial for insert to authenticated with check (true);
create policy "metas_hist_editar" on metas_historial for update to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));
create policy "metas_hist_borrar" on metas_historial for delete to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));

-- ============================================================
-- NOTAS COMPARTIDAS + CHAT DEL EQUIPO
-- ============================================================
create table if not exists notas_config (
  id int primary key default 1,
  contenido text not null default '',
  actualizado_at timestamptz,
  actualizado_por text,
  constraint notas_singleton check (id = 1)
);
insert into notas_config (id, contenido) values (1, '') on conflict (id) do nothing;

create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  texto text not null,
  creado_at timestamptz not null default now()
);

alter table notas_config enable row level security;
alter table mensajes enable row level security;
drop policy if exists "notas_todos" on notas_config;
drop policy if exists "mensajes_todos" on mensajes;
create policy "notas_todos" on notas_config for all to authenticated using (true) with check (true);
create policy "mensajes_todos" on mensajes for all to authenticated using (true) with check (true);

-- LOG DE CAMBIOS (solo lo leen las cuentas con acceso completo)
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  usuario text,
  seccion text,
  descripcion text not null,
  creado_at timestamptz not null default now()
);
alter table logs enable row level security;
drop policy if exists "logs_insert" on logs;
drop policy if exists "logs_select_admin_jefe" on logs;
create policy "logs_insert" on logs for insert to authenticated with check (true);
create policy "logs_select_admin_jefe" on logs for select to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));

-- ============================================================
-- ROW LEVEL SECURITY (con roles por código)
--
-- Todos los que iniciaron sesión pueden LEER todo.
-- Todos pueden ESCRIBIR (crear/editar/borrar) EXCEPTO la cuenta del
-- jefe (jefe@kolors.app), que queda como "solo lectura" a nivel de
-- base de datos (no depende solo de esconder botones en la pantalla).
--
-- Si cambias el correo del jefe, actualízalo también aquí abajo.
-- ============================================================
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table impresiones enable row level security;
alter table eco_solvente enable row level security;
alter table perdidas enable row level security;
alter table pagos enable row level security;
alter table precios_config enable row level security;
alter table tableros_config enable row level security;

do $$
declare
  t text;
  tablas text[] := array['pedidos','pedido_items','impresiones','eco_solvente','perdidas','pagos','precios_config','tableros_config'];
  -- condición: el usuario NO es el jefe (solo lectura)
  puede_escribir text := '((auth.jwt() ->> ''email'') is distinct from ''jefe@kolors.app'')';
begin
  foreach t in array tablas
  loop
    -- limpiar políticas viejas (por si se corre el script más de una vez)
    execute format('drop policy if exists "usuarios autenticados acceso total" on %I', t);
    execute format('drop policy if exists "leer_autenticados" on %I', t);
    execute format('drop policy if exists "escribir_no_jefe_ins" on %I', t);
    execute format('drop policy if exists "escribir_no_jefe_upd" on %I', t);
    execute format('drop policy if exists "escribir_no_jefe_del" on %I', t);

    -- leer: cualquier usuario autenticado
    execute format('create policy "leer_autenticados" on %I for select to authenticated using (true)', t);
    -- crear / editar / borrar: todos menos el jefe
    execute format('create policy "escribir_no_jefe_ins" on %I for insert to authenticated with check %s', t, puede_escribir);
    execute format('create policy "escribir_no_jefe_upd" on %I for update to authenticated using %s with check %s', t, puede_escribir, puede_escribir);
    execute format('create policy "escribir_no_jefe_del" on %I for delete to authenticated using %s', t, puede_escribir);
  end loop;
end $$;

-- ============================================================
-- REALTIME: publicar cambios de estas tablas para que la app
-- reciba actualizaciones en vivo entre varias sesiones abiertas.
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table pedidos, pedido_items, impresiones, eco_solvente, perdidas, pagos, precios_config, tableros_config, metas_config, metas_historial, notas_config, mensajes, logs;
  exception when duplicate_object then
    null;
  end;
end $$;
