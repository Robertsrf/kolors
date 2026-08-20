-- Kolors · migración: responsables de cada tarjeta (quién la está haciendo)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
-- Es seguro correrlo varias veces.
--
-- Cada tarjeta (pedido de camisa, sublimación o eco solvente) guarda la lista
-- de quiénes la están ejecutando. En la tarjeta se ven como 4 círculos de
-- colores (uno por persona) que se encienden con un clic; puede haber dos o
-- más encendidos a la vez.
--
-- Se guarda una lista de identificadores, p. ej.: ["roberts", "maria"]
-- Los nombres, colores y el orden de los círculos están en js/state.js
-- (constante RESPONSABLES): para cambiar el equipo se edita ahí, no aquí.

alter table pedidos      add column if not exists responsables jsonb not null default '[]'::jsonb;
alter table impresiones  add column if not exists responsables jsonb not null default '[]'::jsonb;
alter table eco_solvente add column if not exists responsables jsonb not null default '[]'::jsonb;
