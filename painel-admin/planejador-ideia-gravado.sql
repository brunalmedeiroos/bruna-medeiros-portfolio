alter table public.planejador_ideias
  add column if not exists gravado boolean not null default false;
