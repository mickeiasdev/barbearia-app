-- ============================================================
-- BARBERPRO — Barbearia (agendamentos + loja + admin)
-- Schema Supabase: tabelas, funções, triggers e RLS.
--
- Como usar: abra o "SQL Editor" do seu projeto Supabase,
- cole TODO este arquivo e execute "Run". É idempotente
- (pode executar mais de uma vez sem quebrar).
-- ============================================================

create extension if not exists btree_gist;

-- ============================================================
-- TABELAS
-- ============================================================

-- E-mails autorizados a virar administrador ao se cadastrarem.
create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Perfil de cada usuário (espelha auth.users via trigger).
create table if not exists public.profiles (
  id uuid primary key constraint profiles_id_fkey references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text,
  role text not null default 'client' constraint profiles_role_check check (role in ('client','barber','admin')),
  created_at timestamptz not null default now()
);

-- O estabelecimento (barbearia). Um por deploy (single-tenant).
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  opening_time time not null default '09:00',
  closing_time time not null default '19:00',
  slot_step_min int not null default 15 constraint establishments_step_check check (slot_step_min between 5 and 60),
  created_at timestamptz not null default now()
);

-- Barbeiros: vários por estabelecimento.
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null constraint barbers_establishment_id_fkey references public.establishments(id) on delete cascade,
  profile_id uuid constraint barbers_profile_id_fkey references public.profiles(id) on delete set null,
  full_name text not null,
  bio text,
  photo_url text,
  commission_pct numeric(5,2) not null default 0 constraint barbers_commission_check check (commission_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Serviços oferecidos (corte, barba, etc).
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null constraint services_establishment_id_fkey references public.establishments(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null constraint services_price_check check (price_cents >= 0),
  duration_min int not null constraint services_duration_check check (duration_min between 5 and 480),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Quais serviços cada barbeiro executa (N:N).
create table if not exists public.barber_services (
  barber_id uuid not null constraint barber_services_barber_id_fkey references public.barbers(id) on delete cascade,
  service_id uuid not null constraint barber_services_service_id_fkey references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- Jornada de trabalho por barbeiro (0=dom .. 6=sáb). Várias janelas/dia.
create table if not exists public.barber_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null constraint barber_schedules_barber_id_fkey references public.barbers(id) on delete cascade,
  weekday smallint not null constraint barber_schedules_weekday_check check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  constraint barber_schedules_time_check check (start_time < end_time)
);
create unique index if not exists barber_schedules_unique on public.barber_schedules (barber_id, weekday, start_time);

-- Produtos vendidos na loja.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null constraint products_establishment_id_fkey references public.establishments(id) on delete cascade,
  name text not null,
  description text,
  category text,
  image_url text,
  price_cents int not null constraint products_price_check check (price_cents >= 0),
  stock int not null default 0 constraint products_stock_check check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Agendamentos: 1 cliente + 1 barbeiro + 1 serviço + horário.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null constraint appointments_establishment_id_fkey references public.establishments(id) on delete cascade,
  barber_id uuid not null constraint appointments_barber_id_fkey references public.barbers(id),
  service_id uuid not null constraint appointments_service_id_fkey references public.services(id),
  client_id uuid not null constraint appointments_client_id_fkey references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' constraint appointments_status_check check (status in ('pending','confirmed','completed','cancelled')),
  price_cents int not null constraint appointments_price_check check (price_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint appointments_time_check check (ends_at > starts_at)
);

-- Garante que NUNCA haja dois atendimentos ativos do mesmo barbeiro
-- no mesmo intervalo de tempo (proteção à prova de corrida).
alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (barber_id with =, tstzrange(starts_at, ends_at) with &&)
  where (status in ('pending','confirmed'));

-- Pedidos (vendas de produtos). Podem ser do site, do balcão (POS) e
-- opcionalmente vinculados a um agendamento.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null constraint orders_establishment_id_fkey references public.establishments(id) on delete cascade,
  client_id uuid constraint orders_client_id_fkey references public.profiles(id) on delete set null,
  appointment_id uuid constraint orders_appointment_id_fkey references public.appointments(id) on delete set null,
  total_cents int not null constraint orders_total_check check (total_cents >= 0),
  payment_method text not null default 'pix' constraint orders_payment_check check (payment_method in ('pix','dinheiro','cartao')),
  status text not null default 'paid' constraint orders_status_check check (status in ('pending','paid','cancelled')),
  created_by uuid constraint orders_created_by_fkey references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null constraint order_items_order_id_fkey references public.orders(id) on delete cascade,
  product_id uuid constraint order_items_product_id_fkey references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents int not null constraint order_items_price_check check (unit_price_cents >= 0),
  quantity int not null constraint order_items_qty_check check (quantity > 0)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists appointments_barber_day_idx on public.appointments (barber_id, starts_at desc);
create index if not exists appointments_client_idx on public.appointments (client_id, starts_at desc);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists products_est_idx on public.products (establishment_id);
create index if not exists barbers_est_idx on public.barbers (establishment_id);
create index if not exists services_est_idx on public.services (establishment_id);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Retorna true se o usuário logado é administrador.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- Cria o profile automaticamente quando o usuário se cadastra.
-- Se o e-mail estiver em admin_emails, já nasce como administrador.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'phone', ''),
    case when exists (select 1 from public.admin_emails where lower(email) = lower(new.email))
      then 'admin' else 'client' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um usuário mude o próprio papel (só admin promove).
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Alteração de papel não permitida';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Horários disponíveis de um barbeiro em uma data (fuso America/Sao_Paulo).
-- Cruza a jornada (barber_schedules) com os agendamentos ativos existentes.
-- Pública: qualquer visitante pode consultar os horários.
create or replace function public.get_available_slots(p_barber_id uuid, p_date date, p_duration_min int)
returns timestamptz[]
language plpgsql stable security definer set search_path = public as $$
declare
  v_slots timestamptz[] := '{}';
  v_appts tstzrange[] := '{}';
  v_sched record;
  v_t timestamptz;
  v_day_end timestamptz;
  v_range tstzrange;
  v_step int;
  v_now timestamptz := now();
begin
  if p_duration_min is null or p_duration_min <= 0 then
    raise exception 'Duracao invalida';
  end if;

  select coalesce(max(e.slot_step_min), 15) into v_step
    from public.establishments e
    join public.barbers b on b.establishment_id = e.id
    where b.id = p_barber_id;

  select coalesce(array_agg(tstzrange(starts_at, ends_at)), '{}') into v_appts
    from public.appointments
    where barber_id = p_barber_id
      and status in ('pending','confirmed')
      and (starts_at at time zone 'America/Sao_Paulo')::date = p_date;

  for v_sched in
    select * from public.barber_schedules
    where barber_id = p_barber_id and weekday = (extract(dow from p_date))::smallint
    order by start_time
  loop
    v_t := (p_date + v_sched.start_time) at time zone 'America/Sao_Paulo';
    v_day_end := (p_date + v_sched.end_time) at time zone 'America/Sao_Paulo';
    while v_t + make_interval(mins => p_duration_min) <= v_day_end loop
      v_range := tstzrange(v_t, v_t + make_interval(mins => p_duration_min));
      if v_t >= v_now and not exists (select 1 from unnest(v_appts) a where a && v_range) then
        v_slots := array_append(v_slots, v_t);
      end if;
      v_t := v_t + make_interval(mins => v_step);
    end loop;
  end loop;

  return v_slots;
end $$;

-- Finaliza um pedido de forma atômica: valida estoque, baixa estoque,
-- cria o pedido + itens e calcula o total. Usada pelo checkout do site
-- (cliente logado) e pelo PDV do admin (podendo ser venda avulsa).
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

  select id into v_est from public.establishments order by created_at limit 1;
  if v_est is null then
    raise exception 'Estabelecimento nao configurado';
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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles: cada usuário lê/edita o próprio perfil; admin faz tudo.
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- establishments: leitura pública, escrita só admin.
alter table public.establishments enable row level security;
drop policy if exists establishments_public_select on public.establishments;
create policy establishments_public_select on public.establishments for select using (true);
drop policy if exists establishments_admin_all on public.establishments;
create policy establishments_admin_all on public.establishments for all using (public.is_admin()) with check (public.is_admin());

-- barbers: leitura pública (ativos) / admin; escrita só admin.
alter table public.barbers enable row level security;
drop policy if exists barbers_public_select on public.barbers;
create policy barbers_public_select on public.barbers for select using (is_active = true or public.is_admin());
drop policy if exists barbers_admin_all on public.barbers;
create policy barbers_admin_all on public.barbers for all using (public.is_admin()) with check (public.is_admin());

-- services: idem.
alter table public.services enable row level security;
drop policy if exists services_public_select on public.services;
create policy services_public_select on public.services for select using (is_active = true or public.is_admin());
drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services for all using (public.is_admin()) with check (public.is_admin());

-- barber_services e barber_schedules: leitura pública, escrita admin.
alter table public.barber_services enable row level security;
drop policy if exists barber_services_public_select on public.barber_services;
create policy barber_services_public_select on public.barber_services for select using (true);
drop policy if exists barber_services_admin_all on public.barber_services;
create policy barber_services_admin_all on public.barber_services for all using (public.is_admin()) with check (public.is_admin());

alter table public.barber_schedules enable row level security;
drop policy if exists barber_schedules_public_select on public.barber_schedules;
create policy barber_schedules_public_select on public.barber_schedules for select using (true);
drop policy if exists barber_schedules_admin_all on public.barber_schedules;
create policy barber_schedules_admin_all on public.barber_schedules for all using (public.is_admin()) with check (public.is_admin());

-- products: leitura pública (ativos) / admin; escrita só admin.
alter table public.products enable row level security;
drop policy if exists products_public_select on public.products;
create policy products_public_select on public.products for select using (is_active = true or public.is_admin());
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all using (public.is_admin()) with check (public.is_admin());

-- appointments: cliente vê e cria os próprios (sempre 'pending') e pode
-- cancelar os futuros; admin faz tudo. Inserções passam ainda pela
-- restrição de não-sobreposição appointments_no_overlap.
alter table public.appointments enable row level security;
drop policy if exists appts_client_select on public.appointments;
create policy appts_client_select on public.appointments for select using (auth.uid() = client_id);
drop policy if exists appts_client_insert on public.appointments;
create policy appts_client_insert on public.appointments for insert with check (auth.uid() = client_id and status = 'pending');
drop policy if exists appts_client_cancel on public.appointments;
create policy appts_client_cancel on public.appointments for update
  using (auth.uid() = client_id and starts_at > now())
  with check (auth.uid() = client_id and status = 'cancelled' and starts_at > now());
drop policy if exists appts_admin_all on public.appointments;
create policy appts_admin_all on public.appointments for all using (public.is_admin()) with check (public.is_admin());

-- orders / order_items: cliente vê os próprios (comprados ou registrados
-- por ele); admin vê e gerencia tudo. Inserções de pedido acontecem
-- exclusivamente pela função place_order (security definer), que valida
-- estoque e cliente de forma segura.
alter table public.orders enable row level security;
drop policy if exists orders_client_select on public.orders;
create policy orders_client_select on public.orders for select using (auth.uid() = client_id or auth.uid() = created_by);
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all using (public.is_admin()) with check (public.is_admin());

alter table public.order_items enable row level security;
drop policy if exists order_items_client_select on public.order_items;
create policy order_items_client_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.created_by = auth.uid())));
drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- admin_emails: leitura pública necessária apenas ao trigger
-- (security definer já ignora RLS). Mantenha como está.
alter table public.admin_emails enable row level security;
