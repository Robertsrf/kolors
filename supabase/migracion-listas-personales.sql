-- Kolors · migración: listas personales (control propio de cada usuario)
--
-- Corre esto UNA vez en: Supabase → SQL Editor → New query → Run.
--
-- A diferencia de las notas compartidas, cada lista pertenece a UNA cuenta:
-- solo la ve y la edita quien la creó (ni el admin ve las de los demás).
-- Sirve para llevar el control personal del trabajo del día ("5 camisas L",
-- "planchar las de Ana"...) tachando lo que ya se hizo.

create table if not exists listas_personales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null default 'Lista',
  -- [{ id: "...", texto: "5 camisas talla L", hecho: false }]
  items jsonb not null default '[]'::jsonb,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create index if not exists listas_personales_usuario_idx on listas_personales (usuario_id, creado_at);

-- RLS: cada quien ve y modifica ÚNICAMENTE sus propias listas.
-- (incluye al jefe: una lista personal no modifica pedidos.)
alter table listas_personales enable row level security;

drop policy if exists "listas_propias" on listas_personales;
create policy "listas_propias" on listas_personales
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
