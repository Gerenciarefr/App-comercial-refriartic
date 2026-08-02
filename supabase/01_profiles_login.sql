-- =========================================================
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- Seguro de correr aunque algunas columnas ya existan (usa IF NOT EXISTS)
-- =========================================================

-- 1) Campos que completa el asesor en su primer ingreso, más el rol
alter table profiles
  add column if not exists nombre text,
  add column if not exists cedula text,
  add column if not exists celular_comercial text,
  add column if not exists celular_personal text,
  add column if not exists rol text not null default 'asesor',
  add column if not exists perfil_completo boolean not null default false;

-- El correo ya vive en auth.users, no se duplica aquí.

-- 2) Cada vez que Nico crea un usuario nuevo desde
--    Authentication → Users → Add user, esta función crea
--    automáticamente su fila en "profiles" (rol "asesor",
--    perfil_completo = false, para que la app le pida sus datos).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, rol, perfil_completo)
  values (new.id, 'asesor', false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- IMPORTANTE: el trigger de arriba pone "asesor" por defecto a
-- todo usuario nuevo. Cuando crees el usuario de Nico (director)
-- en Authentication → Users, corre esto reemplazando el correo:
-- =========================================================
-- update profiles set rol = 'director', perfil_completo = true
-- where id = (select id from auth.users where email = 'correo-de-nico@ejemplo.com');
