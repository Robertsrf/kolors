-- Kolors · migración: sistema de metas (objetivos de producción)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Las metas las establecen el admin y el jefe; todos pueden verlas.

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
-- Solo admin y jefe pueden establecer/editar las metas
create policy "metas_escribir" on metas_config for all to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'));

do $$
begin
  begin
    alter publication supabase_realtime add table metas_config;
  exception when duplicate_object then null;
  end;
end $$;
