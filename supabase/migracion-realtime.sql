-- ============================================================
-- MIGRACIÓN: asegurar el TIEMPO REAL de todas las tablas
--
-- Si los cambios de una persona no le aparecen a las demás hasta que recargan
-- la página, casi siempre es porque alguna tabla no está publicada en tiempo
-- real (por ejemplo, se creó con una migración vieja que no lo hacía).
--
-- Este script revisa tabla por tabla y publica solo las que falten. Es seguro
-- correrlo las veces que quieras: si ya estaba todo bien, no cambia nada.
--
-- Cómo se corre: Supabase → SQL Editor → New query → pegar todo → Run.
-- ============================================================
do $$
declare
  t text;
  faltantes int := 0;
  tablas text[] := array[
    'pedidos', 'pedido_items', 'impresiones', 'eco_solvente', 'perdidas', 'pagos',
    'precios_config', 'tableros_config', 'metas_config', 'metas_historial',
    'notas_config', 'mensajes', 'logs'
  ];
begin
  -- La publicación viene de fábrica en Supabase, pero por si acaso.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tablas loop
    -- Solo si la tabla existe (hay migraciones opcionales) y aún no está publicada.
    if exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      faltantes := faltantes + 1;
      raise notice 'Tiempo real activado para: %', t;
    end if;
  end loop;

  if faltantes = 0 then
    raise notice 'Todo estaba en orden: las % tablas ya publicaban en tiempo real.', array_length(tablas, 1);
  end if;
end $$;

-- Para revisar cómo quedó (debe listar todas las tablas de arriba):
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;
