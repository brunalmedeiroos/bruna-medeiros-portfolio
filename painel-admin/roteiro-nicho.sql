-- Roteiros por nicho (UGC/Publi > Roteiros)
-- Guarda o nicho do roteiro (o código do nicho do portfólio, ex: tech, beleza).
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.

alter table public.ugc_roteiros add column if not exists nicho text;
