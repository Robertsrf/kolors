-- Kolors · migración: notas compartidas + chat del equipo
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Crea las tablas del bloc de notas compartido y del chat en tiempo real.

-- NOTAS COMPARTIDAS (un solo bloc para todo el equipo)
create table if not exists notas_config (
  id int primary key default 1,
  contenido text not null default '',
  actualizado_at timestamptz,
  actualizado_por text,
  constraint notas_singleton check (id = 1)
);
insert into notas_config (id, contenido) values (1, '') on conflict (id) do nothing;

-- CHAT DEL EQUIPO
create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  texto text not null,
  creado_at timestamptz not null default now()
);

-- RLS: cualquier usuario con sesión puede leer y escribir notas y chat
-- (incluye al jefe: comunicarse no es "modificar pedidos").
alter table notas_config enable row level security;
alter table mensajes enable row level security;

drop policy if exists "notas_todos" on notas_config;
drop policy if exists "mensajes_todos" on mensajes;
create policy "notas_todos" on notas_config for all to authenticated using (true) with check (true);
create policy "mensajes_todos" on mensajes for all to authenticated using (true) with check (true);

-- Realtime para que notas y chat se actualicen en vivo entre sesiones
do $$
begin
  begin
    alter publication supabase_realtime add table notas_config, mensajes;
  exception when duplicate_object then
    null;
  end;
end $$;
