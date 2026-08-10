-- Kolors · migración: DTF como tipo de trabajo (cantidad × precio por DTF)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Si ya corriste "migracion-papel-bond.sql" esto no cambia nada: el DTF reutiliza
-- las mismas columnas (cantidad × costo unitario), solo cambia lo que significan.
--
-- Una unidad de DTF mide siempre 1 m × 57 cm (0,57 m²) y su precio se coloca a mano.

alter table eco_solvente
  add column if not exists cantidad_impresiones numeric not null default 0,
  add column if not exists costo_impresion numeric not null default 0;
