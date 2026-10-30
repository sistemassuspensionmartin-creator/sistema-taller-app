-- =====================================================================
-- SEGURIDAD 2: permisos por rol en cada tabla (resultado del security-audit)
-- ---------------------------------------------------------------------
-- Hasta ahora todas las tablas tenían "cualquier usuario logueado puede
-- leer y escribir todo" (USING (true)). Las funciones de dinero controlaban
-- el rol, pero cualquiera podía saltearlas escribiendo directo en la tabla.
-- Este script:
--   1. Reemplaza esas políticas por permisos según el rol (admin, cajero,
--      mecánico). Una cuenta sin perfil no puede hacer nada.
--   2. Las tablas de dinero (cajas, movimientos, cierres) solo se leen desde
--      oficina y solo se modifican a través de las funciones del sistema.
--   3. El saldo de clientes y proveedores solo lo cambian las funciones.
--   4. Cada usuario ve solo su propio perfil (y su PIN); el admin ve todos.
--   5. Rechaza montos inválidos (NaN, Infinito) en todo lo que es dinero.
--   6. Nueva función para eliminar proveedores (controla saldo en $0).
--   7. La anulación de cobros usa el vínculo exacto con cada reversión.
-- Cada pantalla sigue funcionando igual para el rol que la usa hoy.
-- Script re-ejecutable.
-- Para deshacer: rollback/20261031000500_permisos_por_rol_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rol del usuario actual (lo usan las políticas)
-- ---------------------------------------------------------------------
create or replace function public.rol_actual()
returns text
language sql stable security definer set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

revoke all on function public.rol_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated;

-- La función anterior queda igual pero con search_path fijo
alter function public.get_auth_role() set search_path = public;

-- ---------------------------------------------------------------------
-- 2. Borrar las políticas abiertas y crear las nuevas
-- ---------------------------------------------------------------------
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

-- Nadie sin login accede a ninguna tabla
revoke all on all tables in schema public from anon;

-- Dinero: lectura solo oficina; escritura solo por las funciones del sistema
do $$
declare
  t text;
begin
  foreach t in array array['cajas', 'movimientos_caja', 'cierres_caja',
                           'movimientos_clientes', 'movimientos_proveedores'] loop
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
    execute format($p$create policy oficina_lee on public.%I for select to authenticated
                      using (public.rol_actual() in ('admin', 'cajero'))$p$, t);
  end loop;
end;
$$;

-- Tablas de trabajo diario: todo el personal (incluye mecánico)
do $$
declare
  t text;
begin
  foreach t in array array['ordenes_trabajo', 'presupuestos', 'presupuesto_items',
                           'turnos', 'vehiculos'] loop
    execute format($p$create policy personal_todo on public.%I for all to authenticated
                      using (public.rol_actual() in ('admin', 'cajero', 'mecanico'))
                      with check (public.rol_actual() in ('admin', 'cajero', 'mecanico'))$p$, t);
  end loop;
end;
$$;

-- Catálogo: lo ve todo el personal; lo edita oficina (el mecánico ajusta stock por la función)
create policy personal_lee on public.catalogo for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy oficina_escribe on public.catalogo for all to authenticated
  using (public.rol_actual() in ('admin', 'cajero'))
  with check (public.rol_actual() in ('admin', 'cajero'));

-- Pedidos a proveedor: los genera también el presupuesto del mecánico
create policy personal_lee on public.pedidos_proveedor for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy personal_crea on public.pedidos_proveedor for insert to authenticated
  with check (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy oficina_modifica on public.pedidos_proveedor for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero'))
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_borra on public.pedidos_proveedor for delete to authenticated
  using (public.rol_actual() in ('admin', 'cajero'));

-- Clientes: todo el personal los ve y edita (pantalla Vehículos); alta y baja desde oficina.
-- El saldo no se puede escribir directo (permiso por columna más abajo).
create policy personal_lee on public.clientes for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy personal_modifica on public.clientes for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'))
  with check (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy oficina_crea on public.clientes for insert to authenticated
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_borra on public.clientes for delete to authenticated
  using (public.rol_actual() in ('admin', 'cajero'));

revoke insert, update on public.clientes from authenticated;
grant insert (id, nombre, apellido, tipo_cliente, razon_social, documento, telefono, email, calle, barrio,
              ciudad, domicilio_fiscal, condicion_iva, nivel_problema, notas, tiene_cuenta_corriente, fecha_registro)
  on public.clientes to authenticated;
grant update (nombre, apellido, tipo_cliente, razon_social, documento, telefono, email, calle, barrio,
              ciudad, domicilio_fiscal, condicion_iva, nivel_problema, notas, tiene_cuenta_corriente)
  on public.clientes to authenticated;

-- Proveedores: solo oficina. El saldo solo lo cambian las funciones y la baja
-- se hace con proveedor_eliminar (controla que el saldo sea $0).
create policy oficina_lee on public.proveedores for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_crea on public.proveedores for insert to authenticated
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_modifica on public.proveedores for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero'))
  with check (public.rol_actual() in ('admin', 'cajero'));

revoke insert, update, delete on public.proveedores from authenticated;
grant insert (nombre, telefono, cuit, notas) on public.proveedores to authenticated;
grant update (nombre, telefono, cuit, notas) on public.proveedores to authenticated;

-- Facturas: las emite oficina; el personal las puede ver
create policy personal_lee on public.facturas for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy oficina_crea on public.facturas for insert to authenticated
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_modifica on public.facturas for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero'))
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy admin_borra on public.facturas for delete to authenticated
  using (public.rol_actual() = 'admin');

-- Configuración: la ve todo el personal; la cambia el admin
create policy personal_lee on public.configuracion for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy admin_escribe on public.configuracion for all to authenticated
  using (public.rol_actual() = 'admin')
  with check (public.rol_actual() = 'admin');

-- Categorías de gasto: las usa oficina; las administra el admin
create policy oficina_lee on public.categorias_gasto for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero'));
create policy admin_escribe on public.categorias_gasto for all to authenticated
  using (public.rol_actual() = 'admin')
  with check (public.rol_actual() = 'admin');

-- Perfiles: cada uno ve y edita el suyo; el admin ve y edita todos.
-- Las altas las hace el servidor (/api/usuarios). El trigger _proteger_perfiles
-- sigue impidiendo que un no-admin cambie roles.
create policy propio_o_admin_lee on public.perfiles for select to authenticated
  using (id = auth.uid() or public.rol_actual() = 'admin');
create policy propio_o_admin_modifica on public.perfiles for update to authenticated
  using (id = auth.uid() or public.rol_actual() = 'admin')
  with check (id = auth.uid() or public.rol_actual() = 'admin');
create policy admin_borra on public.perfiles for delete to authenticated
  using (public.rol_actual() = 'admin');
revoke insert on public.perfiles from authenticated;

-- Notificaciones: igual que antes, pero solo para personal con perfil
create policy personal_lee on public.notificaciones for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy alta_propia on public.notificaciones for insert to authenticated
  with check (creado_por = auth.uid() and public.rol_actual() in ('admin', 'cajero', 'mecanico'));
create policy marcar_vista on public.notificaciones for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero', 'mecanico'))
  with check (vista_por is null or vista_por = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Montos válidos en todo lo que es dinero (rechaza NaN e Infinito)
-- ---------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('cajas', 'saldo'), ('clientes', 'saldo'), ('proveedores', 'saldo'),
      ('movimientos_caja', 'monto'), ('movimientos_clientes', 'monto'), ('movimientos_proveedores', 'monto')
    ) as v(tabla, columna)
  loop
    if not exists (select 1 from pg_constraint
                    where conrelid = format('public.%I', c.tabla)::regclass
                      and conname = c.tabla || '_' || c.columna || '_finito') then
      execute format('alter table public.%I add constraint %I check (%I is null or (%I <> ''NaN''::numeric and abs(%I) < 1e12)) not valid',
                     c.tabla, c.tabla || '_' || c.columna || '_finito', c.columna, c.columna, c.columna);
    end if;
  end loop;
end;
$$;

create or replace function public._validar_monto(p_monto numeric)
returns void
language plpgsql immutable
as $$
begin
  if p_monto is null or p_monto = 'NaN'::numeric or p_monto <= 0 or p_monto >= 1e12 then
    raise exception 'Ingrese un monto válido.';
  end if;
end;
$$;
revoke all on function public._validar_monto(numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Eliminar proveedor (solo con saldo en $0)
-- ---------------------------------------------------------------------
create or replace function public.proveedor_eliminar(p_proveedor_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_prov record;
begin
  perform public._exigir_rol(array['admin', 'cajero']);

  select id, nombre, saldo into v_prov from public.proveedores where id = p_proveedor_id for update;
  if not found then
    raise exception 'El proveedor no existe.';
  end if;
  if round(coalesce(v_prov.saldo, 0), 2) <> 0 then
    raise exception 'No se puede eliminar al proveedor "%". Tiene un saldo pendiente de $%.', v_prov.nombre, v_prov.saldo;
  end if;

  -- Sus movimientos se borran en cascada (clave foránea ON DELETE CASCADE)
  delete from public.proveedores where id = p_proveedor_id;
  return jsonb_build_object('eliminado', true);
end;
$$;
revoke all on function public.proveedor_eliminar(uuid) from public, anon;
grant execute on function public.proveedor_eliminar(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Caja: el resumen de presupuestos solo para oficina
-- ---------------------------------------------------------------------
create or replace function public.caja_presupuestos(p_desde timestamptz)
returns table (
  id uuid, numero integer, patente text, cliente text, total numeric, pagado numeric,
  restante numeric, estado_pago text, estado_facturacion text, cobrado_en_turno boolean
)
language sql stable security definer set search_path = public
as $$
  with ords as (
    select distinct on (presupuesto_id) presupuesto_id, vehiculo_patente, cliente_nombre
      from public.ordenes_trabajo
     where presupuesto_id is not null
     order by presupuesto_id, created_at desc
  ), pag as (
    select presupuesto_id,
           sum(case when tipo_movimiento = 'ingreso_cobro' then monto
                    when tipo_movimiento = 'egreso_gasto'  then -monto else 0 end) as pagado,
           bool_or(tipo_movimiento = 'ingreso_cobro' and fecha >= p_desde) as en_turno
      from public.movimientos_caja
     where presupuesto_id is not null
     group by presupuesto_id
  )
  select p.id, p.numero_correlativo, o.vehiculo_patente, coalesce(o.cliente_nombre, 'Sin registrar'),
         coalesce(p.total_final, 0), coalesce(pag.pagado, 0),
         coalesce(p.total_final, 0) - coalesce(pag.pagado, 0),
         coalesce(p.estado_pago, 'Pendiente')::text, coalesce(p.estado_facturacion, 'No Facturado')::text,
         coalesce(pag.en_turno, false)
    from ords o
    join public.presupuestos p on p.id = o.presupuesto_id
    left join pag on pag.presupuesto_id = p.id
   where public.rol_actual() in ('admin', 'cajero')
     and (coalesce(p.total_final, 0) - coalesce(pag.pagado, 0) > 0
          or coalesce(pag.en_turno, false));
$$;

-- ---------------------------------------------------------------------
-- 6. Anulación de cobros: usa el vínculo exacto cobro -> reversión
--    (antes comparaba fechas; dos operaciones simultáneas podían
--    devolver dos veces el mismo cobro)
-- ---------------------------------------------------------------------
create or replace function public.anular_cobros_presupuesto(
  p_operacion uuid,
  p_presupuesto_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol text;
  v_previo jsonb;
  v_pres record;
  v_desde_legado timestamptz;
  v_vigentes uuid[];
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_mov record;
  v_cliente_id uuid;
  v_cantidad int := 0;
  v_nombre text;
begin
  v_rol := public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'anular_cobros');
  if v_previo is not null then return v_previo; end if;

  select id, numero_correlativo, vehiculo_patente into v_pres
    from public.presupuestos where id = p_presupuesto_id for update;
  if not found then
    raise exception 'El presupuesto no existe.';
  end if;

  -- Reversiones viejas (antes de esta versión) no tienen vínculo: para esas
  -- se sigue usando la fecha de la última reversión sin vínculo.
  select coalesce(max(fecha), '-infinity'::timestamptz) into v_desde_legado
    from public.movimientos_caja
   where presupuesto_id = p_presupuesto_id and tipo_movimiento = 'egreso_gasto' and revierte_id is null;

  select coalesce(array_agg(m.id order by m.fecha), '{}') into v_vigentes
    from public.movimientos_caja m
   where m.presupuesto_id = p_presupuesto_id
     and m.tipo_movimiento = 'ingreso_cobro'
     and m.fecha > v_desde_legado
     and not exists (select 1 from public.movimientos_caja r where r.revierte_id = m.id);

  if cardinality(v_vigentes) = 0 then
    raise exception 'SIN_COBROS: Este presupuesto no registra movimientos de dinero activos en la caja.';
  end if;

  if exists (select 1 from public.movimientos_caja m
              where m.id = any(v_vigentes)
                and (m.fecha at time zone 'America/Argentina/Buenos_Aires')::date <> v_hoy) then
    raise exception 'COBRO_VIEJO: No podés anular el cobro de este trabajo porque se realizó en días anteriores y esa caja ya fue cerrada. Por seguridad contable, solicitá un ajuste al administrador.';
  end if;

  select cliente_id into v_cliente_id from public.vehiculos where patente = v_pres.vehiculo_patente;

  for v_mov in
    select m.* from public.movimientos_caja m
     where m.id = any(v_vigentes)
     order by m.fecha
  loop
    if v_mov.caja_destino_id is not null then
      perform public._mover_caja(v_mov.caja_destino_id, -v_mov.monto, false);
    end if;

    if v_mov.metodo_pago = 'Cuenta Corriente' and coalesce(v_mov.cliente_id, v_cliente_id) is not null then
      update public.clientes
         set saldo = coalesce(saldo, 0) - v_mov.monto
       where id = coalesce(v_mov.cliente_id, v_cliente_id);
      update public.clientes
         set tiene_cuenta_corriente = (coalesce(saldo, 0) > 0)
       where id = coalesce(v_mov.cliente_id, v_cliente_id);
      insert into public.movimientos_clientes (cliente_id, monto, tipo, comprobante, detalle, usuario_id)
      values (coalesce(v_mov.cliente_id, v_cliente_id), v_mov.monto, 'anulacion',
              'ANUL-PRE-' || v_pres.numero_correlativo,
              'ANULACIÓN: Devolución de cargo por presupuesto PRE-' || v_pres.numero_correlativo, auth.uid());
    end if;

    insert into public.movimientos_caja
      (tipo_movimiento, caja_origen_id, monto, metodo_pago, presupuesto_id, cliente_id, detalle, notas, usuario_id, revierte_id)
    values
      ('egreso_gasto', v_mov.caja_destino_id, v_mov.monto, v_mov.metodo_pago, p_presupuesto_id, v_mov.cliente_id,
       'REVERSIÓN: Anulación Cobro PRE-' || v_pres.numero_correlativo || ' (' || coalesce(v_pres.vehiculo_patente, 'S/P') || ')',
       'Anulado en mostrador por corrección de cobro.', auth.uid(), v_mov.id);
    v_cantidad := v_cantidad + 1;
  end loop;

  select nombre into v_nombre from public.perfiles where id = auth.uid();
  update public.presupuestos
     set estado = 'Aprobado',
         estado_pago = 'Pendiente',
         modificado_por_rol = v_rol,
         modificado_por_nombre = coalesce(v_nombre, modificado_por_nombre)
   where id = p_presupuesto_id;

  return public._cerrar_operacion(p_operacion, jsonb_build_object('anulados', v_cantidad));
end;
$$;

-- Un cobro solo puede tener una reversión
create unique index if not exists movimientos_caja_revierte_unico
  on public.movimientos_caja (revierte_id) where revierte_id is not null;
