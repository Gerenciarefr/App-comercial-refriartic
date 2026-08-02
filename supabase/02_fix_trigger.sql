create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role, rol, perfil_completo)
  values (new.id, '', 'asesor', 'asesor', false)
  on conflict (id) do nothing;
  return new;
end;
$$;
