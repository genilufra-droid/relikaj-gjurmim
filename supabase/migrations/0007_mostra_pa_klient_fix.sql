-- Faza 6c: mostra në parcelë mund të regjistrohet pa klient (klienti dihet më vonë, në qendër).
-- Trigger-i i vjetër kërkonte gjithmonë një klient dhe bllokonte mostrat në parcelë.
create or replace function public.samples_before() returns trigger language plpgsql as
$$
begin
  if new.customer_id is not null and not exists (
    select 1 from public.customers where id = new.customer_id and company_id = new.company_id
  ) then
    raise exception 'Klienti nuk i përket kësaj kompanie';
  end if;
  if new.product_id is not null and not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
    raise exception 'Produkti nuk i përket kësaj kompanie';
  end if;
  if new.shipment_id is not null and not exists (select 1 from public.shipments where id = new.shipment_id and company_id = new.company_id) then
    raise exception 'Dërgesa nuk i përket kësaj kompanie';
  end if;
  if new.plot_id is not null and not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
