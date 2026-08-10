-- Kolors · migración: registro histórico de metas (cómo quedó cada semana / cada mes)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
--
-- Guarda las metas que estaban vigentes en cada período ya cerrado. Lo producido
-- NO se guarda: se vuelve a calcular con los pedidos entregados, así el registro
-- siempre coincide con los datos reales aunque se corrija un pedido después.

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
-- Todos pueden ver el registro y congelar el período que acaba de cerrar...
create policy "metas_hist_leer" on metas_historial for select to authenticated using (true);
create policy "metas_hist_crear" on metas_historial for insert to authenticated with check (true);
-- ...pero solo admin y jefe pueden corregir o borrar el registro.
create policy "metas_hist_editar" on metas_historial for update to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'));
create policy "metas_hist_borrar" on metas_historial for delete to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app'));

do $$
begin
  begin
    alter publication supabase_realtime add table metas_historial;
  exception when duplicate_object then null;
  end;
end $$;
