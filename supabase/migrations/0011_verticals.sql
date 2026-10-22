-- ============================================================
-- BARBERPRO 0011 - Multi-vertical (nichos)
-- ============================================================

alter table public.establishments
  add column if not exists vertical text not null default 'barbearia';

alter table public.establishments drop constraint if exists establishments_vertical_check;
alter table public.establishments add constraint establishments_vertical_check
  check (vertical in ('barbearia','salao','estetica','manicure','tatuagem','personal'));

create or replace function public.create_tenant(
  p_company_name text,
  p_address text default null,
  p_whatsapp text default null,
  p_opening time default '09:00',
  p_closing time default '19:00',
  p_vertical text default 'barbearia'
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
  if p_vertical is null or p_vertical not in
     ('barbearia','salao','estetica','manicure','tatuagem','personal') then
    raise exception 'Nicho invalido';
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
     is_company, owner_id, slug, plan, trial_ends_at, vertical)
  values
    (trim(p_company_name), p_address, p_whatsapp, p_whatsapp, p_opening, p_closing,
     true, auth.uid(), v_slug, 'trial', now() + interval '14 days', p_vertical)
  returning id into v_company;

  insert into public.establishment_admins (establishment_id, profile_id)
  values (v_company, auth.uid())
  on conflict do nothing;

  perform set_config('app.workspace_owner', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid() and role in ('client','barber');

  return v_company;
end $$;

revoke execute on function public.create_tenant(text, text, text, time, time, text) from public, anon;
grant execute on function public.create_tenant(text, text, text, time, time, text) to authenticated;
