-- Kolors · migración: Dariana con acceso completo (igual que el admin)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
--
-- Antes Dariana era "editor": editaba el trabajo diario, pero no podía ver el log
-- ni poner las metas. Esto le abre lo que faltaba, que está limitado por correo:
--   · leer el log de cambios
--   · establecer y editar las metas
--   · corregir o borrar el registro histórico de metas
-- (Crear/editar pedidos ya lo podía hacer: eso solo se le niega al jefe.)
--
-- Ojo: los botones de "Importar respaldo" y "Borrar todo" se controlan en la
-- pantalla, no aquí. Se abren en js/auth.js dándole el rol 'admin'.

-- Log de cambios
drop policy if exists "logs_select_admin_jefe" on logs;
create policy "logs_select_admin_jefe" on logs for select to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));

-- Metas de producción
drop policy if exists "metas_escribir" on metas_config;
create policy "metas_escribir" on metas_config for all to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));

-- Registro histórico de metas (corregir / borrar)
drop policy if exists "metas_hist_editar" on metas_historial;
drop policy if exists "metas_hist_borrar" on metas_historial;
create policy "metas_hist_editar" on metas_historial for update to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'))
  with check ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));
create policy "metas_hist_borrar" on metas_historial for delete to authenticated
  using ((auth.jwt() ->> 'email') in ('admin@kolors.app', 'jefe@kolors.app', 'dariana@kolors.app'));
