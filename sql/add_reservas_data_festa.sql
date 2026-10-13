begin;

alter table public.reservas
  add column if not exists data_festa date;

-- Reservas antigas recebem inicialmente a mesma data usada para o aluguel.
update public.reservas
set data_festa = data_evento
where data_festa is null;

notify pgrst, 'reload schema';

commit;
