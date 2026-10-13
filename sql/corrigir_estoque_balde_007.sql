begin;

-- Corrige o saldo que já foi duplicado antes do ajuste da devolução.
update public.estoque
set disponivel = 7,
    alugado = 0,
    reservado = 0
where ltrim(coalesce(codigo_interno::text, ''), '0') = '7'
  and upper(trim(item)) = 'BALDE ALUMINIO';

notify pgrst, 'reload schema';

commit;
