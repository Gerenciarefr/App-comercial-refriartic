-- Guardamos el email en profiles para que Nico pueda ver quién se registró
-- sin necesitar permisos de administrador sobre auth.users.
alter table public.profiles
  add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role, rol, email, active, perfil_completo)
  values (new.id, '', 'asesor', 'asesor', new.email, false, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Nico ya está aprobado y activo de antes; nos aseguramos de no dejarlo
-- inactivo por accidente con este cambio.
update public.profiles set active = true where rol = 'director';
