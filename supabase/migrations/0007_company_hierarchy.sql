-- ============================================================
-- BARBERPRO 0007 — Hierarquia em 3 níveis:
-- site principal (empresas) → empresa (profissionais) → profissional (site próprio)
--
-- - EMPRESA: estabelecimento marcado com is_company = true
--   (endereço, contato e horários da unidade).
-- - PROFISSIONAL: espaço de trabalho com parent_id apontando
--   para a empresa dele (serviços, produtos, clientes e vendas
--   continuam 100% individuais).
--
-- Execute DEPOIS de 0001..0006 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

alter table public.establishments
  add column if not exists parent_id uuid
  constraint establishments_parent_fkey references public.establishments(id) on delete set null;

alter table public.establishments
  add column if not exists is_company boolean not null default false;

create index if not exists establishments_parent_idx on public.establishments (parent_id);

-- ------------------------------------------------------------
-- DADOS DE DEMONSTRAÇÃO (idempotente): a "HS Barearia" existente
-- vira EMPRESA e os 3 profissionais ficam vinculados a ela.
-- Ajuste/ignore se os slugs não existirem no seu banco.
-- ------------------------------------------------------------
update public.establishments
  set is_company = true,
      slug = case when slug = 'hs-barearia-3f39' then 'hs-barearia' else slug end
  where slug = 'hs-barearia-3f39';

update public.establishments e
  set parent_id = (
    select c.id from public.establishments c
    where c.slug = 'hs-barearia' and c.is_company = true
    limit 1
  )
  where e.slug in ('lucas', 'hiago', 'ronalt')
    and e.parent_id is null
    and exists (select 1 from public.establishments c where c.slug = 'hs-barearia');

-- O PRIMEIRO barbeiro cadastrado na empresa vira GERENCIADOR dela
-- (acesso em /admin/empresa para editar dados e adicionar gerenciadores).
insert into public.establishment_admins (establishment_id, profile_id)
select c.id,
       (select w.owner_id from public.establishments w
        where w.parent_id = c.id and w.owner_id is not null
        order by w.created_at asc limit 1)
from public.establishments c
where c.is_company = true and c.slug = 'hs-barearia'
  and not exists (
    select 1 from public.establishment_admins ea
    where ea.establishment_id = c.id
  )
on conflict do nothing;
