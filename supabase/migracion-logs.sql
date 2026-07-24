-- Kolors · migración: registro de cambios (Log)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Guarda quién hizo qué cambio y cuándo. Solo el admin y el jefe pueden verlo.

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  usuario text,
  seccion text,
  descripcion text not null,
  creado_at timestamptz not null default now()
);

alter table logs enable row level security;

-- Cualquiera con sesión puede ESCRIBIR en el log (para que quede registro de sus acciones)
drop policy if exists "logs_insert" on logs;
create policy "logs_insert" on logs for insert to authenticated with check (true);

-- Solo el admin y el jefe pueden LEER el log
drop policy if exists "logs_select_admin_jefe" on logs;
create policy "logs_select_admin_jefe" on logs
  for select to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'));

-- Realtime (los que pueden leer lo verán actualizarse en vivo)
do $$
begin
  begin
    alter publication supabase_realtime add table logs;
  exception when duplicate_object then null;
  end;
end $$;
