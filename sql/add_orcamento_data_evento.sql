-- Adiciona a data específica do evento aos orçamentos.
-- Pode ser executado novamente com segurança no SQL Editor do Supabase.

begin;

alter table public.orcamentos
  add column if not exists data_evento date;

-- Orçamentos antigos recebem inicialmente a mesma data da reserva.
update public.orcamentos
set data_evento = data_reserva
where data_evento is null;

alter table public.orcamentos
  alter column data_evento set not null;

notify pgrst, 'reload schema';

commit;
