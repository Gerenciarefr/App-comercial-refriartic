-- 1) Permite que una misión creada para varios asesores quede agrupada
--    (cada asesor tiene su propia fila/copia, pero comparten grupo para
--    poder moverlas o editarlas juntas desde el panel de Nico).
alter table public.manual_tasks
  add column if not exists grupo_mision_id uuid;

-- 2) Bandera de recordatorio ("zumbido"): Nico la activa, la app del
--    asesor la muestra como alerta SOLO si la misión sigue incumplida,
--    y se apaga sola cuando el asesor la marca como cumplida.
alter table public.manual_tasks
  add column if not exists alertar boolean not null default false;

alter table public.manual_tasks
  add column if not exists alertar_at timestamptz;
