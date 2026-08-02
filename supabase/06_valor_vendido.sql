create or replace view public.v_valor_vendido_stats as
select
  c.asesor_id,
  coalesce(sum(o.valor_con_iva) filter (
    where date_trunc('week', o.created_at at time zone 'America/Bogota')
        = date_trunc('week', now() at time zone 'America/Bogota')
  ), 0) as valor_semana,
  coalesce(sum(o.valor_con_iva) filter (
    where date_trunc('month', o.created_at at time zone 'America/Bogota')
        = date_trunc('month', now() at time zone 'America/Bogota')
  ), 0) as valor_mes
from public.order_ops o
join public.clients c on c.id = o.client_id
group by c.asesor_id;
