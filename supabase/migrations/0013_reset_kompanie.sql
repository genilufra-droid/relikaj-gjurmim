-- Faza 13: reset i plotë i të dhënave të një kompanie (përveç kompanisë dhe përdoruesve/anëtarëve).
-- Vetëm admin i kompanisë ose platform admin, dhe vetëm me kodin e konfirmimit «RESET».
create or replace function public.reset_company_data(p_company bigint, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  pending text[];
  nxt text[];
  pass int := 0;
  n bigint;
  total bigint := 0;
begin
  if p_confirm is distinct from 'RESET' then
    raise exception 'Kodi i konfirmimit duhet të jetë RESET';
  end if;
  if not (public.is_platform_admin() or coalesce(public.member_role(p_company) = 'admin', false)) then
    raise exception 'Vetëm administratori mund ta bëjë reset';
  end if;

  select array_agg(c.table_name order by c.table_name) into pending
  from information_schema.columns c
  join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.column_name = 'company_id' and c.table_name not in ('members', 'companies');

  -- fshi në rend varësish: përsërit derisa çdo tabelë të pastrohet (kyçet e huaja)
  while coalesce(array_length(pending, 1), 0) > 0 and pass < 12 loop
    pass := pass + 1;
    nxt := '{}';
    foreach t in array pending loop
      begin
        execute format('delete from public.%I where company_id = $1', t) using p_company;
        get diagnostics n = row_count;
        total := total + n;
      exception when foreign_key_violation then
        nxt := nxt || t;
      end;
    end loop;
    pending := nxt;
  end loop;
  if coalesce(array_length(pending, 1), 0) > 0 then
    raise exception 'Reset nuk përfundoi, mbetën tabelat: %', pending;
  end if;
  return jsonb_build_object('deleted_rows', total, 'passes', pass);
end;
$$;
revoke all on function public.reset_company_data(bigint, text) from public, anon;
grant execute on function public.reset_company_data(bigint, text) to authenticated;
