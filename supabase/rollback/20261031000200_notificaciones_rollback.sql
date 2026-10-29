-- Deshace las notificaciones guardadas en la base.
drop trigger if exists trg_notificar_orden_trabajo on public.ordenes_trabajo;
drop function if exists public._notificar_orden_trabajo();

do $$
begin
  if exists (select 1 from pg_publication_tables
              where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones') then
    alter publication supabase_realtime drop table public.notificaciones;
  end if;
end;
$$;

drop table if exists public.notificaciones;
