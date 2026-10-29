-- Deshace el script de seguridad y deja la base como estaba antes.
-- ATENCIÓN: vuelve a dejar tablas abiertas. Usar solo en una emergencia.

drop trigger if exists trg_proteger_perfiles on public.perfiles;
drop function if exists public._proteger_perfiles();

-- Tablas que tenían RLS desactivado antes de la migración
do $$
declare
  t text;
begin
  foreach t in array array['cajas', 'catalogo', 'clientes', 'configuracion', 'movimientos_caja',
                           'ordenes_trabajo', 'perfiles', 'presupuesto_items', 'presupuestos',
                           'turnos', 'vehiculos'] loop
    execute format('alter table public.%I disable row level security', t);
  end loop;
end;
$$;

create policy "Permitir todo a todos en cajas"       on public.cajas            for all    to public using (true) with check (true);
create policy "Permitir todo a todos en movimientos" on public.movimientos_caja for all    to public using (true) with check (true);
create policy "Permitir edicion de configuracion"    on public.configuracion    for all    to public using (true) with check (true);
create policy "Permitir lectura de configuracion"    on public.configuracion    for select to public using (true);
create policy "Perfiles visibles para todos"         on public.perfiles         for select to public using (true);
create policy "Permitir actualizar perfiles"         on public.perfiles         for update to public using (true);
create policy "Permitir borrar perfiles"             on public.perfiles         for delete to public using (true);
create policy "Permitir insertar perfiles"           on public.perfiles         for insert to public with check (true);
