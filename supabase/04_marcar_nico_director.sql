update profiles
set rol = 'director', role = 'director', perfil_completo = true, active = true
where id = (select id from auth.users where email = 'gerencia@refriartico.com');
