-- Faza 9: vlera e blerjes (amount) llogaritet vetë nga sasia e thatë × çmimi.
-- Më parë aplikacioni shkruante vetëm qty_dry dhe price, ndaj «amount» mbetej 0 në çdo blerje.
-- Zgjidhja bëhet në bazë (trigger), që të vlejë për aplikacionin, importin dhe çdo shkrim tjetër.

create or replace function public.purchases_set_amount()
returns trigger
language plpgsql
as $$
begin
  new.amount := coalesce(new.qty_dry, 0) * coalesce(new.price, 0);
  return new;
end;
$$;

drop trigger if exists purchases_amount on public.purchases;
create trigger purchases_amount
  before insert or update of qty_dry, price
  on public.purchases
  for each row execute function public.purchases_set_amount();

-- Plotësimi i rreshtave ekzistues që kanë mbetur 0 pa arsye.
update public.purchases
   set amount = coalesce(qty_dry, 0) * coalesce(price, 0)
 where coalesce(amount, 0) = 0
   and coalesce(price, 0) > 0
   and coalesce(qty_dry, 0) > 0;
