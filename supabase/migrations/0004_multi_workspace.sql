-- ============================================================
-- BARBERPRO 0004 — Multi-espaço (plataforma de profissionais)
-- Cada barbeiro/profissional independente administra o PRÓPRIO
-- espaço (serviços, produtos, agenda, Pix), com vários espaços
-- coexistindo na mesma instalação. Um espaço pode ter vários
-- administradores (dono + convidados).
--
-- Execute DEPOIS do 0001, 0002 e 0003 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- ============================================================
-- 1) ESTRUTURA
-- ============================================================

-- Dono do espaço (o próprio profissional, ou quem criou).
alter table public.establishments
  add column if not exists owner_id uuid
  constraint establishments_owner_fkey references public.profiles(id) on delete set null;

-- Vários administradores por espaço (dono + convidados por e-mail).
create table if not exists public.establishment_admins (
  establishment_id uuid not null constraint est_admins_est_fkey references public.establishments(id) on delete cascade,
  profile_id uuid not null constraint est_admins_profile_fkey references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (establishment_id, profile_id)
);

create index if not exists est_admins_profile_idx on public.establishment_admins (profile_id);

-- ============================================================
-- 2) FUNÇÕES AUXILIARES
-- ============================================================

-- Superadministrador da PLATAFORMA: e-mails listados em admin_emails.
-- Vê e gerencia todos os espaços (suporte/operações).
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.admin_emails ae on lower(ae.email) = lower(p.email)
    where p.id = auth.uid()
  )
$$;

-- Administrador de um ESPAÇO: dono, convidado ou superadmin.
-- Substitui o antigo "is_admin() global" nas policies de dados.
create or replace function public.is_workspace_admin(p_establishment_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_establishment_id is not null and (
    public.is_superadmin()
    or exists (
      select 1 from public.establishments e
      where e.id = p_establishment_id
        and (
          e.owner_id = auth.uid()
          or exists (
            select 1 from public.establishment_admins ea
            where ea.establishment_id = e.id and ea.profile_id = auth.uid()
          )
        )
    )
  )
$$;

-- ============================================================
-- 3) AUTOPROMOÇÃO CONTROLADA
-- O trigger original impedia qualquer mudança de papel. Agora o
-- próprio usuário pode virar 'admin' APENAS dentro da função
-- create_workspace() (via flag de sessão), e admins podem
-- promover/rebaixar dentro do seu espaço como antes.
-- ============================================================
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ws_owner text;
begin
  if new.role <> old.role then
    if public.is_admin() or public.is_superadmin() then
      return new;
    end if;
    -- Autopromoção só vale dentro de create_workspace()
    v_ws_owner := coalesce(current_setting('app.workspace_owner', true), '');
    if v_ws_owner = auth.uid()::text then
      return new;
    end if;
    raise exception 'Alteração de papel não permitida';
  end if;
  return new;
end $$;

-- ============================================================
-- 4) CRIAÇÃO DE ESPAÇO (registro do profissional)
-- Cria o estabelecimento, assume a propriedade, promove a conta
-- a 'admin' e cria o registro de barbeiro do próprio profissional.
-- ============================================================
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
begin
  if auth.uid() is null then
    raise exception 'Faca login para continuar';
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

  -- quem já administra um espaço não cria outro
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

  insert into public.establishments
    (name, address, phone, whatsapp, opening_time, closing_time, slot_step_min, pix_key, owner_id)
  values
    (trim(p_name), p_address, p_phone, p_whatsapp, p_opening, p_closing, p_step, p_pix_key, auth.uid())
  returning id into v_est;

  insert into public.establishment_admins (establishment_id, profile_id)
  values (v_est, auth.uid())
  on conflict do nothing;

  -- promove a 'admin' (a flag de sessão libera o trigger)
  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');

  -- o próprio profissional já nasce na equipe (editável depois)
  if p_create_barber then
    select full_name into v_full from public.profiles where id = auth.uid();
    insert into public.barbers (establishment_id, full_name, commission_pct, is_active)
    values (v_est, coalesce(nullif(trim(v_full), ''), 'Profissional'), 100, true);
  end if;

  return v_est;
end $$;

-- Superadmin "adota" um espaço antigo sem dono (migração de dados).
create or replace function public.claim_workspace(p_establishment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'Sem permissão';
  end if;
  update public.establishments set owner_id = auth.uid()
  where id = p_establishment_id and owner_id is null;
  if not found then
    raise exception 'Espaço não encontrado ou já possui dono';
  end if;
  insert into public.establishment_admins (establishment_id, profile_id)
  values (p_establishment_id, auth.uid())
  on conflict do nothing;
  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');
end $$;

revoke execute on function public.create_workspace(text, text, text, text, time, time, int, text, boolean) from public, anon;
grant execute on function public.create_workspace(text, text, text, text, time, time, int, text, boolean) to authenticated;
revoke execute on function public.claim_workspace(uuid) from public, anon;
grant execute on function public.claim_workspace(uuid) to authenticated;

-- Consulta segura de "sou superadmin da plataforma?" para o app
-- (admin_emails não é legível por RLS).
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_superadmin()
$$;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ============================================================
-- 5) RLS MULTI-ESPAÇO
-- Admin deixa de ser global: cada policy de escrita passa a exigir
-- is_workspace_admin(establishment_id) (ou superadmin).
-- ============================================================

-- establishments: escrita pelo dono/admins do espaço.
drop policy if exists establishments_admin_all on public.establishments;
create policy establishments_admin_all on public.establishments
  for all using (public.is_workspace_admin(id) or public.is_superadmin())
  with check (public.is_workspace_admin(id) or public.is_superadmin());

-- establishment_admins
alter table public.establishment_admins enable row level security;
drop policy if exists est_admins_select on public.establishment_admins;
create policy est_admins_select on public.establishment_admins
  for select using (public.is_workspace_admin(establishment_id) or profile_id = auth.uid() or public.is_superadmin());
drop policy if exists est_admins_manage on public.establishment_admins;
create policy est_admins_manage on public.establishment_admins
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- barbers
drop policy if exists barbers_admin_all on public.barbers;
create policy barbers_admin_all on public.barbers
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- services
drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- products
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- appointments
drop policy if exists appts_admin_all on public.appointments;
create policy appts_admin_all on public.appointments
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- orders
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all using (public.is_workspace_admin(establishment_id) or public.is_superadmin())
  with check (public.is_workspace_admin(establishment_id) or public.is_superadmin());

-- order_items (via pedido)
drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_workspace_admin(o.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_workspace_admin(o.establishment_id)
    )
  );

-- barber_services (via barbeiro)
drop policy if exists barber_services_admin_all on public.barber_services;
create policy barber_services_admin_all on public.barber_services
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_services.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_services.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  );

-- barber_schedules (via barbeiro)
drop policy if exists barber_schedules_admin_all on public.barber_schedules;
create policy barber_schedules_admin_all on public.barber_schedules
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_schedules.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_schedules.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  );

-- ============================================================
-- 6) place_order MULTI-ESPAÇO
-- O pedido pertence ao espaço dos produtos (todos do mesmo espaço,
-- garantido pelo carrinho) — não mais "o primeiro estabelecimento".
-- Admin só lança venda no próprio espaço.
-- ============================================================
create or replace function public.place_order(
  p_items jsonb,
  p_client_id uuid default null,
  p_payment_method text default 'pix'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_est uuid;
  v_is_admin boolean;
  v_client uuid := null;
begin
  v_is_admin := public.is_admin();

  if v_is_admin then
    v_client := p_client_id;
  elsif auth.uid() is not null then
    if p_client_id is not null and p_client_id <> auth.uid() then
      raise exception 'Cliente invalido';
    end if;
    v_client := auth.uid();
  else
    raise exception 'Faca login para finalizar a compra';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if p_payment_method is null or p_payment_method not in ('pix','dinheiro','cartao') then
    raise exception 'Forma de pagamento invalida';
  end if;

  -- espaço definido pelo primeiro produto...
  select establishment_id into v_est from public.products
  where id = coalesce(((p_items->0)->>'product_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_est is null then
    raise exception 'Produto nao encontrado';
  end if;

  -- ...e todos os itens devem ser do MESMO espaço
  if exists (
    select 1
    from jsonb_array_elements(p_items) it
    join public.products pr on pr.id = (it->>'product_id')::uuid
    where pr.establishment_id <> v_est
  ) then
    raise exception 'O carrinho tem produtos de profissionais diferentes. Finalize um pedido por profissional.';
  end if;

  -- admin só vende no espaço que administra
  if v_is_admin and not (public.is_workspace_admin(v_est) or public.is_superadmin()) then
    raise exception 'Sem permissao para vender neste espaco';
  end if;

  insert into public.orders (establishment_id, client_id, total_cents, payment_method, status, created_by)
  values (v_est, v_client, 0, p_payment_method, 'paid', auth.uid())
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
      where id = coalesce((v_item->>'product_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        and establishment_id = v_est
      for update;
    if not found then
      raise exception 'Produto nao encontrado';
    end if;
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    if v_qty <= 0 then
      raise exception 'Quantidade invalida';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Estoque insuficiente para o item "%" (disponivel: %)', v_product.name, v_product.stock;
    end if;
    update public.products set stock = stock - v_qty where id = v_product.id;
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    values (v_order_id, v_product.id, v_product.name, v_product.price_cents, v_qty);
  end loop;

  update public.orders
  set total_cents = (select coalesce(sum(unit_price_cents * quantity), 0) from public.order_items where order_id = v_order_id)
  where id = v_order_id;

  return v_order_id;
end $$;
