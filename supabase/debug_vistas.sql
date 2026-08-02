select table_name as vista, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'v_ranking_semanal',
    'v_leads_stats',
    'v_leads_por_estado',
    'v_cotizaciones_formales_stats',
    'v_ventas_stats',
    'v_ventas_perdidas_stats',
    'v_visitas_stats',
    'v_llamadas_stats'
  )
order by table_name, ordinal_position;
