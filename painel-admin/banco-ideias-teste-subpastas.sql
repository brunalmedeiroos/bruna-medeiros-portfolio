-- ---------------------------------------------------------------------
-- Banco de ideias (teste): subpastas em qualquer nível.
--
-- Cada pasta passa a poder ter pastas dentro (pai_id), sem limite de níveis,
-- e ganha cor e emoji próprios (se ficarem vazios, a pasta usa a cor da
-- pasta de cima). Só mexe na tabela do teste (ideias_pastas): o que você já
-- criou continua exatamente onde está, como pasta de primeiro nível.
--
-- Excluir uma pasta exclui também o que está dentro dela (o painel sempre
-- avisa quantas pastas e conteúdos vão junto antes de confirmar).
--
-- Pode rodar mais de uma vez sem problema.
-- ---------------------------------------------------------------------

alter table public.ideias_pastas
  add column if not exists pai_id uuid references public.ideias_pastas(id) on delete cascade;

alter table public.ideias_pastas
  add column if not exists cor text;

alter table public.ideias_pastas
  add column if not exists emoji text;

create index if not exists ideias_pastas_pai_idx on public.ideias_pastas (pai_id);
