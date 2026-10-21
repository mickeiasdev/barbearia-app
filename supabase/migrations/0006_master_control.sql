-- ============================================================
-- BARBERPRO 0006 — Controle master: cadastro de espaços e
-- barbeiros passa a ser EXCLUSIVO do administrador master
-- (e-mail em admin_emails). Auto-cadastro de profissional no
-- site é desligado; o registro público cria apenas clientes.
--
-- Execute DEPOIS de 0001..0005 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- create_workspace agora exige superadmin da plataforma.
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

  -- NOVO: só o administrador master cria espaços.
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
