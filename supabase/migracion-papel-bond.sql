-- Kolors · migración: Papel Bond como tipo de trabajo (cantidad × costo por impresión)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.

-- Columnas para el cobro por cantidad de impresiones
alter table eco_solvente
  add column if not exists cantidad_impresiones numeric not null default 0,
  add column if not exists costo_impresion numeric not null default 0;

-- Convertir los pedidos existentes que tenían material 'papel_bond' al nuevo tipo.
-- Se conserva el total: cantidad = 1 y costo por impresión = total anterior (ancho×alto×precio).
update eco_solvente
  set tipo_trabajo = 'papel_bond',
      cantidad_impresiones = 1,
      costo_impresion = round((coalesce(ancho, 0) * coalesce(alto, 0) * coalesce(precio_m2, 0))::numeric, 2),
      material = 'banner'
  where material = 'papel_bond';
