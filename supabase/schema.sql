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

  remate text not null default 'ninguno',       -- 'ninguno' | 'palos' | 'tubos'
  remate_costo numeric not null default 0,

  lleva_diseno boolean not null default false,
  diseno_costo numeric not null default 0,

  lleva_estructura boolean not null default false,
  estructura_costo numeric not null default 0,

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
-- ROW LEVEL SECURITY
-- Herramienta interna de un solo taller: cualquier usuario que haya
-- iniciado sesión puede leer y escribir todo (no es multi-tenant).
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
begin
  foreach t in array array['pedidos','pedido_items','impresiones','eco_solvente','perdidas','pagos','precios_config']
  loop
    execute format('drop policy if exists "usuarios autenticados acceso total" on %I', t);
    execute format(
      'create policy "usuarios autenticados acceso total" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ============================================================
-- REALTIME: publicar cambios de estas tablas para que la app
-- reciba actualizaciones en vivo entre varias sesiones abiertas.
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table pedidos, pedido_items, impresiones, eco_solvente, perdidas, pagos, precios_config;
  exception when duplicate_object then
    null;
  end;
end $$;
