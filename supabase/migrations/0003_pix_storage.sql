-- ============================================================
-- BARBERPRO 0003 — Pix nativo + Upload de imagens (Storage)
-- Execute DEPOIS do 0001 e 0002 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- Chave Pix da barbearia (usada para gerar o "copia e cola" no app)
alter table public.establishments add column if not exists pix_key text;

-- ============================================================
-- Supabase Storage: bucket público "media"
-- Imagens de produtos e barbeiros enviadas pelo painel admin.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- qualquer pessoa (visitante logada ou não) pode VER as imagens
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

-- apenas administradores enviam/substituem/removem imagens
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
