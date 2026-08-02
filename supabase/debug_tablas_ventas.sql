select table_name as tabla, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('clients', 'leads', 'order_ops')
order by table_name, ordinal_position;
