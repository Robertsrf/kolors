-- Kolors · migración: PVC y tipo de trabajo (Impresión / Stickers) en eco solvente
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Es seguro correrlo aunque ya existan datos (usa IF NOT EXISTS).

alter table eco_solvente
  add column if not exists tipo_trabajo text not null default 'impresion',
  add column if not exists m2_manual numeric not null default 0,
  add column if not exists pvc_modo text not null default 'ninguno',
  add column if not exists pvc_costo numeric not null default 0,
  add column if not exists pvc_precio_m2 numeric not null default 0;
