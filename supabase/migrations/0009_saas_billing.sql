-- ============================================================
-- BARBERPRO 0009 — SaaS: trial, auto-onboarding e cobrança
--
-- - Nova barbearia se cadastra sozinha pelo site (/registrar-empresa)
--   e ganha 14 dias de trial do plano Pro.
-- - O gerente da empresa (dono/1º barbeiro) cadastra os barbeiros
--   dela direto no painel — com limite por plano (grátis = 1).
-- - Pagamentos de assinatura via Pix são identificados pelo
--   external_reference e aplicam o plano via webhook.
--
-- Execute DEPOIS de 0001..0008 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

alter table public.establishments add column if not exists trial_ends_at timestamptz;
alter table public.establishments add column if not exists plan_paid_until timestamptz;

-- ============================================================
-- 1) AUTO-ONBOARDING: a pessoa cria a própria BARBEARIA (trial)
-- ============================================================
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

  -- um tenant (barbearia) por login
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

  -- slug único (endereço do site da barbearia)
  v_slug := trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'));
  if v_slug = '' or length(v_slug) < 2 then v_slug := 'barbearia'; end if;
  v_base := v_slug;
  v_n := 1;
  while exists (select 1 from public.establishments where slug = v_slug) loop
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

  -- promove a admin (gerente da própria barbearia)
  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');

  return v_company;
end $$;

revoke execute on function public.create_tenant(text, text, text, time, time) from public, anon;
grant execute on function public.create_tenant(text, text, text, time, time) to authenticated;

-- ============================================================
-- 2) GERENTE DA EMPRESA cria os espaços dos barbeiros dela
-- (o master continua podendo tudo; o gerente cria só filhos da
-- própria empresa — via action que força a empresa dele)
-- ============================================================

-- criar espaço-filho de uma empresa que administro
drop policy if exists establishments_tenant_child_insert on public.establishments;
create policy establishments_tenant_child_insert on public.establishments
  for insert with check (
    public.is_superadmin()
    or exists (
      select 1 from public.establishments c
      where c.id = new.parent_id
        and c.is_company
        and public.is_workspace_admin(c.id)
    )
  );

-- gerente da empresa adiciona admins ao espaço novo do barbeiro
drop policy if exists est_admins_child_insert on public.establishment_admins;
create policy est_admins_child_insert on public.establishment_admins
  for insert with check (
    exists (
      select 1 from public.establishments w
      join public.establishments c on c.id = w.parent_id
      where w.id = establishment_admins.establishment_id
        and c.is_company
        and public.is_workspace_admin(c.id)
    )
  );

-- gerente da empresa cria o registro de barbeiro no espaço novo
drop policy if exists barbers_child_insert on public.barbers;
create policy barbers_child_insert on public.barbers
  for insert with check (
    exists (
      select 1 from public.establishments w
      join public.establishments c on c.id = w.parent_id
      where w.id = barbers.establishment_id
        and c.is_company
        and public.is_workspace_admin(c.id)
    )
  );
