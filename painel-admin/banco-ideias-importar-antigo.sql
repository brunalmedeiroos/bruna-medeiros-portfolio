-- ---------------------------------------------------------------------
-- Banco de ideias & Roteiros: importar o banco antigo.
--
-- Guarda, em cada pasta e conteúdo importado, de qual pilar/ideia do banco
-- antigo ele veio. Isso permite importar mais de uma vez sem duplicar nada
-- (o que já foi copiado é pulado) e esconder do cronograma as ideias antigas
-- que já ganharam uma cópia.
--
-- Não apaga nem altera planejador_pilares nem planejador_ideias: a importação
-- é só cópia. Pode rodar mais de uma vez sem problema.
-- ---------------------------------------------------------------------

alter table public.ideias_pastas
  add column if not exists origem_pilar_id uuid;

alter table public.ideias_conteudos
  add column if not exists origem_ideia_id uuid;

create unique index if not exists ideias_pastas_origem_pilar_idx
  on public.ideias_pastas (origem_pilar_id) where origem_pilar_id is not null;

create unique index if not exists ideias_conteudos_origem_ideia_idx
  on public.ideias_conteudos (origem_ideia_id) where origem_ideia_id is not null;
