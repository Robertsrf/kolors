-- Kolors · migración: sesiones fotográficas
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
--
-- OJO con los permisos: a diferencia del resto de las tablas, aquí el jefe SÍ
-- puede crear, editar y borrar. Las sesiones fotográficas son su área, así que
-- su cuenta no queda en "solo lectura" para esta tabla.

create table if not exists sesiones_foto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  -- Día de la sesión (lo que se ve en el calendario).
  fecha timestamptz not null,
  valor_sesion numeric not null default 0,
  lugar text not null default 'estudio', -- 'estudio' | 'aire_libre'
  lleva_fotos boolean not null default false,
  -- [{ id, tamano: '8x10', cantidad: 5, precioUnitario: 3 }]
  fotos jsonb not null default '[]'::jsonb,
  descripcion text,
  creado_at timestamptz not null default now()
);

create index if not exists sesiones_foto_fecha_idx on sesiones_foto (fecha);

-- RLS: leer y escribir cualquiera con sesión iniciada, JEFE INCLUIDO.
alter table sesiones_foto enable row level security;

drop policy if exists "sesiones_foto_leer" on sesiones_foto;
drop policy if exists "sesiones_foto_todos" on sesiones_foto;
create policy "sesiones_foto_todos" on sesiones_foto
  for all to authenticated
  using (true)
  with check (true);

-- Realtime: que las sesiones aparezcan solas en las demás pantallas.
do $$
begin
  begin
    alter publication supabase_realtime add table sesiones_foto;
  exception when duplicate_object then
    null;
  end;
end $$;
