-- ============================================================
-- BARBERPRO 0002 — Portal do barbeiro + Reagendamento
-- Execute DEPOIS do 0001_schema.sql no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- Barbeiro lê os agendamentos dele (barbers.profile_id = login)
alter table public.appointments enable row level security;
drop policy if exists appts_barber_select on public.appointments;
create policy appts_barber_select on public.appointments
  for select using (
    exists (
      select 1 from public.barbers b
      where b.profile_id = auth.uid() and b.id = appointments.barber_id
    )
  );

-- Barbeiro confirma (pending -> confirmed) e conclui (-> completed).
-- Nunca pode cancelar nem alterar outra coisa: a policy restringe.
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
      and status in ('confirmed', 'completed')
  );

-- Barbeiro vê os dados de contato apenas dos SEUS clientes
alter table public.profiles enable row level security;
drop policy if exists profiles_barber_select on public.profiles;
create policy profiles_barber_select on public.profiles
  for select using (
    exists (
      select 1 from public.barbers b
      join public.appointments a on a.barber_id = b.id
      where b.profile_id = auth.uid() and a.client_id = profiles.id
    )
  );

-- ============================================================
-- Reagendamento pelo cliente (troca barbeiro/serviço/data/hora)
-- Valida: dono do agendamento, status ativo, serviço ativo,
-- barbeiro executa o serviço, horário dentro da jornada,
-- sem conflito com OUTROS agendamentos (o próprio é substituído).
-- A constraint appointments_no_overlap revalida atomicamente.
-- ============================================================
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

  -- dentro da jornada do barbeiro naquele dia da semana?
  if not exists (
    select 1 from public.barber_schedules s
    where s.barber_id = p_barber_id
      and s.weekday = (extract(dow from p_date))::smallint
      and s.start_time <= v_start_local
      and s.end_time >= v_end_local
  ) then
    raise exception 'Horário fora da jornada do barbeiro';
  end if;

  -- conflito com OUTROS agendamentos ativos (o próprio será substituído)
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
