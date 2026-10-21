-- ============================================================
-- BARBERPRO 0008 — Apresentação configurável do site do barbeiro
--
-- Três layouts (Clássico, Painel e Editorial) escolhidos nas
-- Configurações do espaço, com banner, nome de exibição e frase.
--
-- Execute DEPOIS de 0001..0007 no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

alter table public.establishments
  add column if not exists layout_theme smallint not null default 1;

alter table public.establishments drop constraint if exists establishments_layout_check;
alter table public.establishments add constraint establishments_layout_check
  check (layout_theme between 1 and 3);

alter table public.establishments add column if not exists banner_url text;
alter table public.establishments add column if not exists tagline text;
alter table public.establishments add column if not exists display_name text;

-- ------------------------------------------------------------
-- DEMONSTRAÇÃO (idempotente): os 3 profissionais ficam com
-- LAYOUTS DIFERENTES e banners gerados, para você ver os três.
-- Banners já publicados no bucket "media" (pasta banners/).
-- ------------------------------------------------------------
update public.establishments set
  layout_theme = 1,
  banner_url = 'https://ktlfbbegncixaxuvncpj.supabase.co/storage/v1/object/public/media/banners/banner-lucas.png',
  display_name = 'Lucas',
  tagline = 'Corte na régua, barba no detalhe — sem fila de espera.'
where slug = 'lucas' and layout_theme = 1 and banner_url is null;

update public.establishments set
  layout_theme = 2,
  banner_url = 'https://ktlfbbegncixaxuvncpj.supabase.co/storage/v1/object/public/media/banners/banner-hiago.png',
  display_name = 'Hiago',
  tagline = 'Degradê navalhado com finalização premium.'
where slug = 'hiago' and layout_theme = 1 and banner_url is null;

update public.establishments set
  layout_theme = 3,
  banner_url = 'https://ktlfbbegncixaxuvncpj.supabase.co/storage/v1/object/public/media/banners/banner-ronalt.png',
  display_name = 'Ronalt',
  tagline = 'Clássico, infantil e alisamento com acabamento de salon.'
where slug = 'ronalt' and layout_theme = 1 and banner_url is null;
