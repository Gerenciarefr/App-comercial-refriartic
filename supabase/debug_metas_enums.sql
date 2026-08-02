select t.typname as enum_nombre, e.enumlabel as valor
from pg_type t
join pg_enum e on t.oid = e.enumtypid
where t.typname in (
  select udt_name from information_schema.columns
  where table_schema = 'public' and table_name = 'metas'
    and column_name in ('metrica', 'periodo')
)
order by t.typname, e.enumsortorder;
