-- Execute este arquivo no SQL Editor do Supabase.
-- O comando pode ser executado novamente com segurança.

begin;

alter table public.cadastro
  add column if not exists cep text,
  add column if not exists numero text,
  add column if not exists complemento text;

comment on column public.cadastro.cep is 'CEP do endereço do cliente no formato 00000-000';
comment on column public.cadastro.numero is 'Número da casa, apartamento ou imóvel do cliente';
comment on column public.cadastro.complemento is 'Complemento do endereço do cliente';

-- Atualiza o cache da API para reconhecer as novas colunas imediatamente.
notify pgrst, 'reload schema';

commit;