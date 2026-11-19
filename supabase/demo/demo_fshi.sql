-- ============================================================================
-- BioBes — fshirja e të dhënave DEMO nga kompania 2
-- ----------------------------------------------------------------------------
-- Kredh çdo gjë që u vendos nga demo_biobes.sql, pa prekur asnjë rresht real.
-- Filtrat: shënimi 'DEMO' (zona, fermerë, parcela, qira, punime, trajtime,
-- blerje, pagesa, tërheqje), komenti 'DEMO' (mostra), shënimet 'DEMO'
-- (detyrat), emrat e klientëve/magazinës, dhe datat e vëzhgimeve/inputeve.
--
-- Përdorim:  psql  →  \i supabase/demo/demo_fshi.sql
--            ose Supabase SQL editor (kompania 2 = BioBes).
-- Radha ka rëndësi: fëmijët fshihen para prindërve.
-- ============================================================================

begin;

-- ---------- Magazina: eksporti, dorëzimi, përpunimi ----------
delete from public.stock_moves
 where company_id = 2 and note = 'DEMO';

delete from public.batches
 where company_id = 2 and note = 'DEMO';

-- ---------- Mostrat ----------
delete from public.samples
 where company_id = 2 and comment = 'DEMO';

-- ---------- Pagesat (para blerjeve — pagesat referojnë blerjen) ----------
delete from public.payments
 where company_id = 2 and note = 'DEMO';

-- ---------- Blerjet (trigger-i largon lëvizjet e magazinës) ----------
delete from public.purchases
 where company_id = 2 and note = 'DEMO';

-- ---------- Trajtimet dhe inputet ----------
delete from public.applications
 where company_id = 2 and note = 'DEMO';

delete from public.observations
 where company_id = 2
   and plot_id in (select id from public.plots where company_id = 2 and note = 'DEMO');

delete from public.inputs
 where company_id = 2
   and plot_id in (select id from public.plots where company_id = 2 and note = 'DEMO');

-- ---------- Punimet, qiratë, kultivimet ----------
delete from public.land_operations
 where company_id = 2 and note = 'DEMO';

delete from public.leases
 where company_id = 2 and note = 'DEMO';

delete from public.cultivations
 where company_id = 2
   and plot_id in (select id from public.plots where company_id = 2 and note = 'DEMO');

-- ---------- Detyrat ----------
delete from public.tasks
 where company_id = 2 and notes = 'DEMO';

-- ---------- Parcelat, fermerët, zonat ----------
delete from public.plots
 where company_id = 2 and note = 'DEMO';

delete from public.farmers
 where company_id = 2 and note = 'DEMO';

delete from public.zones
 where company_id = 2 and note = 'DEMO';

-- ---------- Produktet demo (mund të kenë mbetur pa lëvizje) ----------
delete from public.products
 where company_id = 2
   and note = 'DEMO'
   and not exists (select 1 from public.purchases p where p.product_id = public.products.id)
   and not exists (select 1 from public.stock_moves m where m.product_id = public.products.id);

-- ---------- Klienti dhe magazina demo ----------
delete from public.customers
 where company_id = 2 and name = 'Sonnentor';

delete from public.warehouses
 where company_id = 2 and name = 'Magazina qendrore'
   and not exists (select 1 from public.stock_moves m where m.warehouse_id = public.warehouses.id)
   and not exists (select 1 from public.batches b where b.warehouse_id = public.warehouses.id);

-- ============ Verifikim ============
select
  (select count(*) from public.zones       where company_id = 2) zones,
  (select count(*) from public.farmers     where company_id = 2) farmers,
  (select count(*) from public.plots       where company_id = 2) plots,
  (select count(*) from public.products    where company_id = 2) products,
  (select count(*) from public.purchases   where company_id = 2) purchases,
  (select count(*) from public.payments    where company_id = 2) payments,
  (select count(*) from public.samples     where company_id = 2) samples,
  (select count(*) from public.tasks       where company_id = 2) tasks;

commit;
