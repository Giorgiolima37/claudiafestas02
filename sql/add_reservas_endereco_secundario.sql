begin;

alter table public.reservas
  add column if not exists endereco_secundario text,
  add column if not exists municipio_secundario text,
  add column if not exists bairro_secundario text,
  add column if not exists numero_secundario text,
  add column if not exists complemento_secundario text;

notify pgrst, 'reload schema';

commit;
