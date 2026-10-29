-- =====================================================================
-- SEGURIDAD: cerrar el acceso a la base solo a usuarios del sistema
-- ---------------------------------------------------------------------
-- Hoy varias tablas tienen RLS desactivado y algunas políticas permiten
-- acceso al rol "public" (cualquiera con la clave del navegador).
-- Este script:
--   1. Activa RLS en TODAS las tablas del esquema public.
--   2. Elimina las políticas abiertas a "public".
--   3. Impide que un usuario que no es admin cambie roles, cree o borre
--      perfiles (la creación de empleados usa la API con clave de servicio).
-- Las políticas para usuarios logueados ya existen y no se tocan: para
-- los usuarios del sistema no cambia nada. El resto se revisa en el
-- security-audit.
-- Script re-ejecutable.
-- Para deshacer: rollback/20261031000300_seguridad_rls_rollback.sql
-- =====================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end;
$$;

drop policy if exists "Permitir todo a todos en cajas"        on public.cajas;
drop policy if exists "Permitir todo a todos en movimientos"  on public.movimientos_caja;
drop policy if exists "Permitir edicion de configuracion"     on public.configuracion;
drop policy if exists "Permitir lectura de configuracion"     on public.configuracion;
drop policy if exists "Perfiles visibles para todos"          on public.perfiles;
drop policy if exists "Permitir actualizar perfiles"          on public.perfiles;
drop policy if exists "Permitir borrar perfiles"              on public.perfiles;
drop policy if exists "Permitir insertar perfiles"            on public.perfiles;

-- Protección de roles: solo un admin puede cambiar el rol, crear o borrar
-- perfiles. auth.uid() es null cuando opera la clave de servicio (API).
create or replace function public._proteger_perfiles()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(public.get_auth_role(), '') = 'admin' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' or tg_op = 'DELETE' then
    raise exception 'Solo un administrador puede crear o eliminar usuarios.' using errcode = '42501';
  end if;

  if new.rol is distinct from old.rol or new.id is distinct from old.id then
    raise exception 'Solo un administrador puede cambiar el rol de un usuario.' using errcode = '42501';
  end if;
  if old.id <> auth.uid() then
    raise exception 'Solo un administrador puede modificar los datos de otro usuario.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public._proteger_perfiles() from public, anon, authenticated;

drop trigger if exists trg_proteger_perfiles on public.perfiles;
create trigger trg_proteger_perfiles
  before insert or update or delete on public.perfiles
  for each row execute function public._proteger_perfiles();
