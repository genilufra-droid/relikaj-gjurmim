-- Të dhënat fiskale të kompanisë (NIPT, adresë, operator, IBAN) i mirëmban administruesi i kompanisë,
-- jo vetëm admini i platformës.
drop policy if exists companies_admin_company on public.companies;
create policy companies_admin_company on public.companies
  for update to authenticated
  using (member_role(id) = 'admin')
  with check (member_role(id) = 'admin');
