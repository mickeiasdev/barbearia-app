-- ============================================================
-- BARBERPRO 0005 — Portfólio + Avaliações + Favoritos + Folgas
-- + No-show + Caixa (desconto/estorno) + Perfil público (slug)
-- + Lembretes 24h (cron) + Pix antecipado + Plano por espaço.
--
-- Execute DEPOIS de 0001..0004 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- ============================================================
-- 1) FOLGA PONTUAL / BLOQUEIO DE HORÁRIO POR BARBEIRO
-- "não atendo dia 25/12" (dia inteiro: 00:00–23:59) ou
-- "bloquear 12h–14h para almoço".
-- ============================================================
create table if not exists public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null constraint time_off_barber_fkey references public.barbers(id) on delete cascade,
  day date not null,
  start_time time not null default '00:00',
  end_time time not null default '23:59',
  reason text,
  created_at timestamptz not null default now(),
  constraint time_off_range_check check (start_time < end_time)
);
create index if not exists time_off_barber_day_idx on public.barber_time_off (barber_id, day);

alter table public.barber_time_off enable row level security;
drop policy if exists time_off_public_select on public.barber_time_off;
create policy time_off_public_select on public.barber_time_off
  for select using (true);
drop policy if exists time_off_admin_all on public.barber_time_off;
create policy time_off_admin_all on public.barber_time_off
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_time_off.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_time_off.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  );

-- ============================================================
-- 2) PORTFÓLIO DE FOTOS POR BARBEIRO
-- ============================================================
create table if not exists public.barber_photos (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null constraint photos_barber_fkey references public.barbers(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists photos_barber_idx on public.barber_photos (barber_id, created_at desc);

alter table public.barber_photos enable row level security;
drop policy if exists photos_public_select on public.barber_photos;
create policy photos_public_select on public.barber_photos
  for select using (true);
drop policy if exists photos_admin_all on public.barber_photos;
create policy photos_admin_all on public.barber_photos
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_photos.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = barber_photos.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  );

-- ============================================================
-- 3) AVALIAÇÕES (DEPOIMENTOS COM NOTA)
-- Cliente avalia após atendimento CONCLUÍDO (1 por atendimento).
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null constraint reviews_barber_fkey references public.barbers(id) on delete cascade,
  client_id uuid not null constraint reviews_client_fkey references public.profiles(id) on delete cascade,
  appointment_id uuid not null constraint reviews_appt_fkey references public.appointments(id) on delete cascade,
  rating smallint not null constraint reviews_rating_check check (rating between 1 and 5),
  comment text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint reviews_appt_unique unique (appointment_id)
);
create index if not exists reviews_barber_idx on public.reviews (barber_id, created_at desc);

alter table public.reviews enable row level security;
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews
  for select using (is_visible = true or client_id = auth.uid());
drop policy if exists reviews_client_insert on public.reviews;
create policy reviews_client_insert on public.reviews
  for insert with check (
    auth.uid() = client_id
    and rating between 1 and 5
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.client_id = auth.uid()
        and a.status = 'completed'
    )
  );
drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all on public.reviews
  for all using (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = reviews.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  )
  with check (
    public.is_superadmin()
    or exists (
      select 1 from public.barbers b
      where b.id = reviews.barber_id
        and public.is_workspace_admin(b.establishment_id)
    )
  );

-- ============================================================
-- 4) FAVORITOS DO CLIENTE
-- ============================================================
create table if not exists public.favorites (
  client_id uuid not null constraint favorites_client_fkey references public.profiles(id) on delete cascade,
  barber_id uuid not null constraint favorites_barber_fkey references public.barbers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, barber_id)
);

alter table public.favorites enable row level security;
drop policy if exists favorites_client_all on public.favorites;
create policy favorites_client_all on public.favorites
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ============================================================
-- 5) ESPAÇO: slug público (perfil /p/slug), Pix antecipado, plano
-- ============================================================
alter table public.establishments add column if not exists slug text;
alter table public.establishments add column if not exists require_prepayment boolean not null default false;
alter table public.establishments add column if not exists plan text not null default 'free';

-- backfill de slug para espaços existentes (determinístico e idempotente)
do $$
declare r record; v_slug text;
begin
  for r in select id, name from public.establishments where slug is null loop
    v_slug := trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(r.name, '')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'));
    if v_slug = '' or length(v_slug) < 2 then v_slug := 'espaco'; end if;
    v_slug := v_slug || '-' || substr(replace(r.id::text, '-', ''), 1, 4);
    update public.establishments set slug = v_slug where id = r.id;
  end loop;
end $$;

create unique index if not exists establishments_slug_key on public.establishments (slug);

-- ============================================================
-- 6) PEDIDOS: desconto + estorno
-- ============================================================
alter table public.orders add column if not exists discount_cents int not null default 0
  constraint orders_discount_check check (discount_cents >= 0);

-- place_order com desconto (PDV): total = bruto - desconto.
create or replace function public.place_order(
  p_items jsonb,
  p_client_id uuid default null,
  p_payment_method text default 'pix',
  p_discount_cents int default 0
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
  v_gross int;
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

  if p_discount_cents is null or p_discount_cents < 0 then
    raise exception 'Desconto invalido';
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

  insert into public.orders (establishment_id, client_id, total_cents, discount_cents, payment_method, status, created_by)
  values (v_est, v_client, 0, p_discount_cents, p_payment_method, 'paid', auth.uid())
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

  select coalesce(sum(unit_price_cents * quantity), 0) into v_gross
    from public.order_items where order_id = v_order_id;
  if p_discount_cents > v_gross then
    raise exception 'Desconto maior que o total do pedido';
  end if;

  update public.orders set total_cents = v_gross - p_discount_cents
  where id = v_order_id;

  return v_order_id;
end $$;

-- Estorno: cancela o pedido e devolve o estoque (só admin do espaço).
create or replace function public.refund_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_est uuid;
  v_status text;
begin
  select establishment_id, status into v_est, v_status
    from public.orders where id = p_order_id;
  if not found then
    raise exception 'Pedido nao encontrado';
  end if;
  if not (public.is_workspace_admin(v_est) or public.is_superadmin()) then
    raise exception 'Sem permissao para estornar este pedido';
  end if;
  if v_status <> 'paid' then
    raise exception 'Pedido ja esta cancelado ou pendente';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;

  -- devolve estoque dos itens que ainda têm produto vinculado
  update public.products p set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.product_id = p.id;
end $$;
revoke execute on function public.refund_order(uuid) from public, anon;
grant execute on function public.refund_order(uuid) to authenticated;

-- ============================================================
-- 7) AGENDAMENTOS: status no_show + lembrete 24h
-- ============================================================
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending','confirmed','completed','cancelled','no_show'));

alter table public.appointments add column if not exists reminder_sent_at timestamptz;

-- barbeiro também pode marcar não compareceu
drop policy if exists appts_barber_update on public.appointments;
create policy appts_barber_update on public.appointments
  for update using (
    exists (
      select 1 from public.barbers b
      where b.profile_id = auth.uid() and b.id = appointments.barber_id
    )
  )
  with check (
    exists (
      select 1 from public.barbers b
      where b.profile_id = auth.uid() and b.id = appointments.barber_id
    )
      and status in ('confirmed', 'completed', 'no_show')
  );

-- ============================================================
-- 8) SLOTS LIVRES AGORA RESPEITAM FOLGAS PONTUAIS
-- ============================================================
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
      if v_t >= v_now
        and not exists (select 1 from unnest(v_appts) a where a && v_range)
        -- NOVO: pula horários dentro de folga/bloqueio pontual
        and not exists (
          select 1 from public.barber_time_off tf
          where tf.barber_id = p_barber_id
            and tf.day = p_date
            and tstzrange(
                  (p_date + tf.start_time) at time zone 'America/Sao_Paulo',
                  (p_date + tf.end_time) at time zone 'America/Sao_Paulo'
                ) && v_range
        )
      then
        v_slots := array_append(v_slots, v_t);
      end if;
      v_t := v_t + make_interval(mins => v_step);
    end loop;
  end loop;

  return v_slots;
end $$;

-- Reagendamento também respeita folgas pontuais
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_date date,
  p_time text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_appt public.appointments%rowtype;
  v_service public.services%rowtype;
  v_starts timestamptz;
  v_ends timestamptz;
  v_start_local time;
  v_end_local time;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
  if v_appt.client_id is distinct from auth.uid() then
    raise exception 'Sem permissão para reagendar este atendimento';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Somente agendamentos ativos podem ser reagendados';
  end if;

  select * into v_service from public.services
    where id = p_service_id and is_active = true;
  if not found then
    raise exception 'Serviço indisponível';
  end if;

  if not exists (
    select 1 from public.barber_services bs
    join public.barbers b on b.id = bs.barber_id
    where bs.barber_id = p_barber_id
      and bs.service_id = p_service_id
      and b.is_active = true
  ) then
    raise exception 'Este barbeiro não executa o serviço selecionado';
  end if;

  if p_time is null or p_time !~ '^[0-9]{2}:[0-9]{2}$' then
    raise exception 'Horário inválido';
  end if;

  v_starts := (p_date + p_time::time) at time zone 'America/Sao_Paulo';
  v_ends := v_starts + make_interval(mins => v_service.duration_min);
  v_start_local := (v_starts at time zone 'America/Sao_Paulo')::time;
  v_end_local := (v_ends at time zone 'America/Sao_Paulo')::time;

  if v_starts <= now() then
    raise exception 'Escolha um horário futuro';
  end if;

  if not exists (
    select 1 from public.barber_schedules s
    where s.barber_id = p_barber_id
      and s.weekday = (extract(dow from p_date))::smallint
      and s.start_time <= v_start_local
      and s.end_time >= v_end_local
  ) then
    raise exception 'Horário fora da jornada do barbeiro';
  end if;

  -- NOVO: não deixa remarcar para dentro de folga/bloqueio
  if exists (
    select 1 from public.barber_time_off tf
    where tf.barber_id = p_barber_id
      and tf.day = p_date
      and tf.start_time < v_end_local
      and tf.end_time > v_start_local
  ) then
    raise exception 'O barbeiro está ausente neste horário (folga/bloqueio)';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.barber_id = p_barber_id
      and a.id <> p_appointment_id
      and a.status in ('pending', 'confirmed')
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_starts, v_ends)
  ) then
    raise exception 'Este horário acabou de ser ocupado. Escolha outro.';
  end if;

  update public.appointments
  set barber_id = p_barber_id,
      service_id = p_service_id,
      starts_at = v_starts,
      ends_at = v_ends,
      price_cents = v_service.price_cents
  where id = p_appointment_id;
end $$;

-- ============================================================
-- 9) create_workspace agora gera slug público único
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
  v_slug text;
  v_base text;
  v_n int;
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

  -- slug público a partir do nome (ex.: "Studio João" -> studio-joao)
  v_slug := trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'));
  if v_slug = '' or length(v_slug) < 2 then v_slug := 'espaco'; end if;
  v_base := v_slug;
  v_n := 1;
  while exists (select 1 from public.establishments where slug = v_slug) loop
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

-- ============================================================
-- 10) CONTATOS DO ESPAÇO (para notificar o profissional)
-- Retorna e-mail/telefone do dono, admins e barbeiros vinculados
-- do espaço — usado para avisar de novos agendamentos.
-- ============================================================
create or replace function public.workspace_admin_contacts(p_establishment_id uuid)
returns table (email text, phone text)
language sql stable security definer set search_path = public as $$
  select distinct p.email, p.phone
  from public.profiles p
  where p.id in (
    select e.owner_id from public.establishments e
      where e.id = p_establishment_id and e.owner_id is not null
    union
    select ea.profile_id from public.establishment_admins ea
      where ea.establishment_id = p_establishment_id
    union
    select b.profile_id from public.barbers b
      where b.establishment_id = p_establishment_id and b.profile_id is not null
  )
$$;
revoke execute on function public.workspace_admin_contacts(uuid) from public, anon;
grant execute on function public.workspace_admin_contacts(uuid) to authenticated;

