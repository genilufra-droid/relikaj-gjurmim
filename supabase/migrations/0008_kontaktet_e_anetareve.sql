-- Faza 7: qasja në llogari — kontaktet e anëtarëve për rivendosjen e fjalëkalimit.
-- Admini i kompanisë (ose administratori i platformës) sheh emailin, telefonin dhe hyrjen e fundit
-- të anëtarëve, që të dërgojë lidhjen e rivendosjes ose të vendosë fjalëkalim të përkohshëm.
-- auth.users nuk hapet: vetëm kjo funksion i kufizuar e lexon.

create or replace function public.member_contacts(p_company bigint)
returns table (user_id uuid, email text, phone text, last_sign_in timestamptz, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (coalesce(public.is_platform_admin(), false) or coalesce(public.member_role(p_company), '') = 'admin') then
    raise exception 'Nuk keni leje për këtë veprim';
  end if;
  return query
    select u.id, u.email::text, u.phone::text, u.last_sign_in_at, u.created_at
    from auth.users u
    join public.members m on m.user_id = u.id
    where m.company_id = p_company;
end;
$$;

revoke execute on function public.member_contacts(bigint) from public, anon;
grant execute on function public.member_contacts(bigint) to authenticated;
