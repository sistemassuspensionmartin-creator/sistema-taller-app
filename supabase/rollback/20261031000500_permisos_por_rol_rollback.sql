-- Deshace el script 000500 (permisos por rol): vuelve a dejar que cualquier
-- usuario logueado lea y escriba todas las tablas, como antes. La base sigue
-- cerrada para quien no inició sesión.
-- DESPUÉS de correr este archivo, volver a correr
-- migrations/20261031000100_funciones_dinero.sql para restaurar las versiones
-- anteriores de anular_cobros_presupuesto, caja_presupuestos y _validar_monto.

-- 1. Quitar las políticas nuevas
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
     where schemaname = 'public'
       and tablename in ('cajas', 'catalogo', 'categorias_gasto', 'cierres_caja', 'clientes',
                         'configuracion', 'facturas', 'movimientos_caja', 'movimientos_clientes',
                         'movimientos_proveedores', 'notificaciones', 'ordenes_trabajo',
                         'pedidos_proveedor', 'perfiles', 'presupuesto_items', 'presupuestos',
                         'proveedores', 'turnos', 'vehiculos')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- 2. Volver a las políticas abiertas para usuarios logueados
do $$
declare
  t text;
begin
  foreach t in array array['cajas', 'catalogo', 'categorias_gasto', 'cierres_caja', 'clientes',
                           'configuracion', 'facturas', 'movimientos_caja', 'movimientos_clientes',
                           'movimientos_proveedores', 'ordenes_trabajo', 'pedidos_proveedor',
                           'perfiles', 'presupuesto_items', 'presupuestos', 'proveedores',
                           'turnos', 'vehiculos'] loop
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)',
                   'Acceso seguro ' || t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

create policy "Notificaciones lectura autenticados" on public.notificaciones
  for select to authenticated using (true);
create policy "Notificaciones alta propia" on public.notificaciones
  for insert to authenticated with check (creado_por = auth.uid());
create policy "Notificaciones marcar vista" on public.notificaciones
  for update to authenticated using (true) with check (true);

-- 3. Quitar los controles de monto, el índice y las funciones nuevas
alter table public.cajas                   drop constraint if exists cajas_saldo_finito;
alter table public.clientes                drop constraint if exists clientes_saldo_finito;
alter table public.proveedores             drop constraint if exists proveedores_saldo_finito;
alter table public.movimientos_caja        drop constraint if exists movimientos_caja_monto_finito;
alter table public.movimientos_clientes    drop constraint if exists movimientos_clientes_monto_finito;
alter table public.movimientos_proveedores drop constraint if exists movimientos_proveedores_monto_finito;
drop index if exists public.movimientos_caja_revierte_unico;
drop function if exists public.proveedor_eliminar(uuid);
-- rol_actual() se deja: no da permisos por sí sola y la usa caja_presupuestos
-- hasta que se vuelva a correr el 000100.
