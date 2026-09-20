-- Campanhas (antes "Trabalhos", dentro de UGC/Publicidade): funil de
-- produção mais simples e uma marcação de destaque (estrela). Rodar no
-- projeto principal do Creator Center (trfoymytrvdbslwizfqs), não no
-- projeto do Desafio UGC.

alter table public.ugc_trabalhos
  add column if not exists destaque boolean not null default false;

-- Migra os status antigos pro novo funil de produção (Briefing, Roteiro,
-- Aprovação Roteiro, Gravação, Edição, Aprovado, Entregue). Negociando/
-- Fechado/Aguardando briefing/Aguardando produto viram Briefing (ainda não
-- começou a produção). A antiga "Aprovação" (que ficava depois da edição)
-- vira "Aprovado". Aguardando pagamento/Pago viram Entregue, porque
-- pagamento já é rastreado à parte na coluna status_pagamento, não precisa
-- mais duplicar dentro de status. Cancelado continua existindo (histórico).
update public.ugc_trabalhos
  set status = 'Briefing'
  where status in ('Negociando', 'Fechado', 'Aguardando briefing', 'Aguardando produto');

update public.ugc_trabalhos set status = 'Aprovado' where status = 'Aprovação';
update public.ugc_trabalhos set status = 'Entregue' where status in ('Aguardando pagamento', 'Pago');

alter table public.ugc_trabalhos alter column status set default 'Briefing';
alter table public.ugc_trabalhos drop constraint if exists ugc_trabalhos_status_check;
alter table public.ugc_trabalhos add constraint ugc_trabalhos_status_check
  check (status in ('Briefing', 'Roteiro', 'Aprovação Roteiro', 'Gravação', 'Edição', 'Aprovado', 'Entregue', 'Cancelado'));
