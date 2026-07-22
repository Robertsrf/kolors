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

  -- flujo del tablero: Pedido -> Diseño -> Impresión -> Acabado -> Entregado
  estado text not null default 'Pedido',
  fecha_pedido timestamptz,
  fecha_diseno timestamptz,
  fecha_impresion timestamptz,
  fecha_acabado timestamptz,
  fecha_entregado timestamptz,
  fecha_inicio timestamptz,
  fecha_entrega timestamptz,
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

do $$
declare
  t text;
  tablas text[] := array['pedidos','pedido_items','impresiones','eco_solvente','perdidas','pagos','precios_config'];
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
    alter publication supabase_realtime add table pedidos, pedido_items, impresiones, eco_solvente, perdidas, pagos, precios_config, notas_config, mensajes;
  exception when duplicate_object then
    null;
  end;
end $$;
