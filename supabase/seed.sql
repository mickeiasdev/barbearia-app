-- ============================================================
-- BARBERPRO — Dados de demonstração (OPCIONAL)
-- Execute DEPOIS do 0001_schema.sql no SQL Editor do Supabase.
--
-- IMPORTANTE (admin do sistema):
--   1) Adicione aqui o SEU e-mail para virar administrador:
insert into public.admin_emails (email) values ('seu-email@exemplo.com')
  on conflict (email) do nothing;
--   2) Cadastre-se no site com esse e-mail -> já nasce como admin.
--   (Alternativa: update public.profiles set role='admin' where email='...')
-- ============================================================

-- Estabelecimento demo
insert into public.establishments (id, name, address, phone, whatsapp, instagram, opening_time, closing_time, slot_step_min)
values ('e0000000-0000-0000-0000-000000000001',
        'BarberPro Studio',
        'Rua das Navalhas, 123 — São Paulo/SP',
        '(11) 4002-8922',
        '(11) 99999-0001',
        '@barberpro.studio',
        '09:00', '19:00', 15)
on conflict (id) do nothing;

-- Serviços demo
insert into public.services (id, establishment_id, name, description, price_cents, duration_min, is_active) values
  ('s0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Corte Masculino','Máquina e tesoura com finalização.',4500,30,true),
  ('s0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','Corte + Barba','Combo completo com toalha quente.',7000,50,true),
  ('s0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','Barba Terapia','Modelagem e hidratação da barba.',3500,20,true),
  ('s0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','Pigmentação','Preenchimento e correção de falhas.',6000,40,true),
  ('s0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001','Corte Infantil','Atendimento paciente para os pequenos.',4000,30,true),
  ('s0000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000001','Alisamento','Progressiva orgânica masculina.',9000,60,true),
  ('s0000000-0000-0000-0000-000000000007','e0000000-0000-0000-0000-000000000001','Hidratação Capilar','Tratamento reconstrutor.',5000,40,true),
  ('s0000000-0000-0000-0000-000000000008','e0000000-0000-0000-0000-000000000001','Pezinho','Acabamento de contorno rápido.',2500,15,true)
on conflict (id) do nothing;

-- Barbeiros demo (vários por estabelecimento)
insert into public.barbers (id, establishment_id, full_name, bio, commission_pct, is_active) values
  ('b0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Rafael Costa','Especialista em degradê e navalhado. 12 anos de experiência.',40,true),
  ('b0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','João Silva','Clássico com toalha quente e barba desenhada.',35,true),
  ('b0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','Marcos Oliveira','Cortes modernos, pigmentação e infantil.',30,true),
  ('b0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','Thiago Santos','Barba terapia e hidratação capilar.',35,true)
on conflict (id) do nothing;

-- Todos os barbeiros fazem os serviços básicos; especialidades variam
insert into public.barber_services (barber_id, service_id)
select 'b0000000-0000-0000-0000-000000000001', id from public.services
  where establishment_id = 'e0000000-0000-0000-0000-000000000001'
on conflict do nothing;

insert into public.barber_services (barber_id, service_id)
select 'b0000000-0000-0000-0000-000000000002', id from public.services
  where id in ('s0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000002','s0000000-0000-0000-0000-000000000003','s0000000-0000-0000-0000-000000000008')
on conflict do nothing;

insert into public.barber_services (barber_id, service_id)
select 'b0000000-0000-0000-0000-000000000003', id from public.services
  where id in ('s0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000004','s0000000-0000-0000-0000-000000000005','s0000000-0000-0000-0000-000000000006','s0000000-0000-0000-0000-000000000008')
on conflict do nothing;

insert into public.barber_services (barber_id, service_id)
select 'b0000000-0000-0000-0000-000000000004', id from public.services
  where id in ('s0000000-0000-0000-0000-000000000001','s0000000-0000-0000-0000-000000000002','s0000000-0000-0000-0000-000000000003','s0000000-0000-0000-0000-000000000007')
on conflict do nothing;

-- Jornada demo: seg-sex 9h às 19h (com intervalo) e sábado 9h às 16h
insert into public.barber_schedules (barber_id, weekday, start_time, end_time)
select b.id, wd, st, et
from public.barbers b
cross join (values (1,'09:00','12:30'),(1,'13:30','19:00'),
                   (2,'09:00','12:30'),(2,'13:30','19:00'),
                   (3,'09:00','12:30'),(3,'13:30','19:00'),
                   (4,'09:00','12:30'),(4,'13:30','19:00'),
                   (5,'09:00','12:30'),(5,'13:30','19:00'),
                   (6,'09:00','16:00')) as t(wd, st, et)
where b.establishment_id = 'e0000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- Produtos demo (loja)
insert into public.products (id, establishment_id, name, description, category, price_cents, stock, is_active) values
  ('p0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Pomada Modeladora Matte','Fixação forte sem brilho, 120g.','Pomadas',3500,20,true),
  ('p0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','Óleo para Barba Premium','Amacia e hidrata, 30ml.','Barba',2800,15,true),
  ('p0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','Shampoo Antiqueda','Fortalece a raiz, 250ml.','Shampoos',4200,10,true),
  ('p0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','Balm de Barbear','Acalma a pele pós-barba, 100ml.','Barba',3000,12,true),
  ('p0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001','Pó Matificador','Controle de oleosidade, 10g.','Estilização',3200,8,true),
  ('p0000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000001','Cera para Bigode','Modelagem firme, 15g.','Estilização',2600,6,true),
  ('p0000000-0000-0000-0000-000000000007','e0000000-0000-0000-0000-000000000001','Tesoura Profissional','Inox 5,5 polegadas.','Ferramentas',8900,3,true),
  ('p0000000-0000-0000-0000-000000000008','e0000000-0000-0000-0000-000000000001','Toalha Microfibra','Ultra absorvente.','Acessórios',1900,25,true)
on conflict (id) do nothing;

-- Para remover os dados demo depois:
-- delete from public.establishments where id = 'e0000000-0000-0000-0000-000000000001';
-- (cascata remove barbeiros, serviços, produtos e horários vinculados)
