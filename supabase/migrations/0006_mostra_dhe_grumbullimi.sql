-- Faza 6b: mostra mund të merret edhe pa klient (në parcelë, para se të dihet blerësi);
-- grumbulluesi lidhet me përdoruesin dhe pagesat e korrjes.
alter table public.samples alter column customer_id drop not null;

-- Pagesa për korrjen: sa ende i detyrohet grumbulluesi/kompania fermerit
create view public.purchase_payments with (security_invoker = true) as
select pu.company_id, pu.id as purchase_id, pu.date, pu.lot_code, pu.farmer_id,
  f.first_name || ' ' || f.last_name as farmer, pu.plot_id, coalesce(p.name, '') as plot,
  pu.qty_dry, pu.amount,
  coalesce((select sum(x.amount) from public.payments x where x.purchase_id = pu.id), 0) as paid_now,
  greatest(pu.amount - coalesce((select sum(x.amount) from public.payments x where x.purchase_id = pu.id), 0), 0) as remaining,
  (select count(*) from public.payments x where x.purchase_id = pu.id and x.paid_by = 'collector') as collector_payments
from public.purchases pu
left join public.farmers f on f.id = pu.farmer_id
left join public.plots p on p.id = pu.plot_id;

grant select on public.purchase_payments to authenticated;

-- Grumbulluesi sheh pagesat e korrjeve të zonave që mbulon
create index if not exists zones_collector on public.zones (company_id, collector_user_id);
