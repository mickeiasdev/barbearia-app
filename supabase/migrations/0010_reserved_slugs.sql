-- ============================================================
-- BARBERPRO 0010 — Endereços (slugs) reservados + ajustes
--
-- 1. Slugs reservados: nenhum empresa/profissional pode usar
--    endereços que são rotas do sistema (/agendar, /loja...).
-- 2. HS Barearia passa a usar o slug "hsbarbearia" (o endereço
--    padrão do domínio — configure DEFAULT_COMPANY_SLUG).
-- 3. Empresas sem NENHUM gerente ganham o dono do espaço-filho
--    mais antigo como gerente (primeiro barbeiro).
--
-- Execute DEPOIS de 0001..0009 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_slug in (
    'admin', 'barbeiro', 'api', 'auth', 'vender', 'p', 'agendar', 'loja',
    'servicos', 'barbeiros', 'entrar', 'registrar', 'registrar-empresa',
    'recuperar-senha', 'redefinir-senha', 'minha-conta', 'carrinho', 'assinar',
    'favicon.ico', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'icon.svg'
  )
$$;

-- ------------------------------------------------------------
-- DEMO: slug da empresa principal vira "hsbarbearia"
-- (o nome direto da barbearia — igual ao domínio)
-- ------------------------------------------------------------
update public.establishments
  set slug = 'hsbarbearia'
  where slug = 'hs-barearia' and is_company = true
    and not exists (select 1 from public.establishments where slug = 'hsbarbearia');

-- ------------------------------------------------------------
-- Backfill: empresa sem NENHUM gerente ganha gerente
-- (o dono do espaço-filho mais antigo = primeiro barbeiro)
-- ------------------------------------------------------------
insert into public.establishment_admins (establishment_id, profile_id)
select t.id, t.manager_id
from (
  select c.id,
         coalesce(
           c.owner_id,
           (select w.owner_id from public.establishments w
            where w.parent_id = c.id and w.owner_id is not null
            order by w.created_at asc limit 1)
         ) as manager_id
  from public.establishments c
  where c.is_company = true
) t
where t.manager_id is not null
  and not exists (
    select 1 from public.establishment_admins ea
    where ea.establishment_id = t.id
  )
on conflict do nothing;

-- ------------------------------------------------------------
-- create_tenant: rejeita slug reservado
-- ------------------------------------------------------------
create or replace function public.create_tenant(
  p_company_name text,
  p_address text default null,
  p_whatsapp text default null,
  p_opening time default '09:00',
  p_closing time default '19:00'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_slug text;
  v_base text;
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'Faca login para continuar';
  end if;
  if p_company_name is null or length(trim(p_company_name)) = 0 then
    raise exception 'Informe o nome da barbearia';
  end if;
  if p_opening >= p_closing then
    raise exception 'O horario de abertura deve ser antes do fechamento';
  end if;

  if exists (
    select 1 from public.establishments e
    where e.is_company = true and (
      e.owner_id = auth.uid()
      or exists (
        select 1 from public.establishment_admins ea
        where ea.establishment_id = e.id and ea.profile_id = auth.uid()
      )
    )
  ) then
    raise exception 'Voce ja administra uma barbearia';
  end if;

  v_slug := trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'));
  if v_slug = '' or length(v_slug) < 2 then v_slug := 'barbearia'; end if;
  v_base := v_slug;
  v_n := 1;
  while exists (select 1 from public.establishments where slug = v_slug)
     or public.is_reserved_slug(v_slug)
  loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.establishments
    (name, address, phone, whatsapp, opening_time, closing_time,
     is_company, owner_id, slug, plan, trial_ends_at)
  values
    (trim(p_company_name), p_address, p_whatsapp, p_whatsapp, p_opening, p_closing,
     true, auth.uid(), v_slug, 'trial', now() + interval '14 days')
  returning id into v_company;

  insert into public.establishment_admins (establishment_id, profile_id)
  values (v_company, auth.uid())
  on conflict do nothing;

  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');

  return v_company;
end $$;

revoke execute on function public.create_tenant(text, text, text, time, time) from public, anon;
grant execute on function public.create_tenant(text, text, text, time, time) to authenticated;

-- ------------------------------------------------------------
-- create_workspace: rejeita slug reservado
-- ------------------------------------------------------------
create or replace function public.create_workspace(
  p_name text,
  p_address text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_opening time default '09:00',
  p_closing time default '19:00',
  p_step int default 15,
  p_pix_key text default null,
  p_create_barber boolean default true
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_est uuid;
  v_full text;
  v_slug text;
  v_base text;
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'Faca login para continuar';
  end if;
  if not public.is_superadmin() then
    raise exception 'Cadastro de espaços é feito apenas pelo administrador master';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Informe o nome do espaço';
  end if;
  if p_opening >= p_closing then
    raise exception 'O horário de abertura deve ser antes do fechamento';
  end if;
  if p_step is null or p_step < 5 or p_step > 60 then
    raise exception 'Intervalo entre horários inválido';
  end if;

  if exists (
    select 1 from public.establishments e
    where e.owner_id = auth.uid()
       or exists (
         select 1 from public.establishment_admins ea
         where ea.establishment_id = e.id and ea.profile_id = auth.uid()
       )
  ) then
    raise exception 'Você já administra um espaço';
  end if;

  v_slug := trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'));
  if v_slug = '' or length(v_slug) < 2 then v_slug := 'espaco'; end if;
  v_base := v_slug;
  v_n := 1;
  while exists (select 1 from public.establishments where slug = v_slug)
     or public.is_reserved_slug(v_slug)
  loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.establishments
    (name, address, phone, whatsapp, opening_time, closing_time, slot_step_min, pix_key, owner_id, slug)
  values
    (trim(p_name), p_address, p_phone, p_whatsapp, p_opening, p_closing, p_step, p_pix_key, auth.uid(), v_slug)
  returning id into v_est;

  insert into public.establishment_admins (establishment_id, profile_id)
  values (v_est, auth.uid())
  on conflict do nothing;

  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');

  if p_create_barber then
    select full_name into v_full from public.profiles where id = auth.uid();
    insert into public.barbers (establishment_id, full_name, commission_pct, is_active)
    values (v_est, coalesce(nullif(trim(v_full), ''), 'Profissional'), 100, true);
  end if;

  return v_est;
end $$;
