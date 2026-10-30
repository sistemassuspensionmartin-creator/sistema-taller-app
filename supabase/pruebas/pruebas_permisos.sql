-- =====================================================================
-- PRUEBAS AUTOMÁTICAS de permisos por rol (script 000500)
-- ---------------------------------------------------------------------
-- NO MODIFICA DATOS: al final se cancela todo a propósito. Siempre termina
-- en "error":
--   * "PRUEBAS OK ..."  -> todo funcionó (y no quedó nada guardado).
--   * "FALLO: ..."      -> indica qué prueba falló.
-- Simula ser el mecánico, un cajero y una cuenta sin perfil, y prueba qué
-- puede hacer cada uno directo sobre las tablas.
-- Correr DESPUÉS del script 000500.
-- =====================================================================
do $$
declare
  v_mec uuid; v_caj uuid; v_caja uuid; v_cli uuid;
  v_prov0 uuid; v_prov10 uuid;
  v_cnt int;
begin
  select id into v_mec from public.perfiles where rol = 'mecanico' limit 1;
  select id into v_caj from public.perfiles where rol = 'cajero' limit 1;
  select id into v_caja from public.cajas limit 1;
  select id into v_cli from public.clientes limit 1;
  if v_mec is null or v_caj is null or v_caja is null then
    raise exception 'FALLO: se necesita al menos un mecánico, un cajero y una caja para probar';
  end if;

  -- Datos de prueba (se cancelan al final)
  insert into public.proveedores (nombre, saldo) values ('PRUEBA PERMISOS 0', 0) returning id into v_prov0;
  insert into public.proveedores (nombre, saldo) values ('PRUEBA PERMISOS 10', 10) returning id into v_prov10;

  -- ---------------- MECÁNICO ----------------
  perform set_config('request.jwt.claim.sub', v_mec::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_mec, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_cnt from public.cajas;
  if v_cnt <> 0 then raise exception 'FALLO: el mecánico puede ver las cajas'; end if;

  begin
    update public.cajas set saldo = saldo where id = v_caja;
    raise exception 'FALLO: el mecánico pudo modificar una caja';
  exception when insufficient_privilege then null;
  end;

  select count(*) into v_cnt from public.perfiles;
  if v_cnt <> 1 then raise exception 'FALLO: el mecánico ve % perfiles (debería ver solo el suyo)', v_cnt; end if;

  begin
    update public.perfiles set rol = 'admin' where id = v_mec;
    raise exception 'FALLO: el mecánico pudo cambiarse el rol';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.clientes set saldo = 1 where id = v_cli;
    raise exception 'FALLO: se pudo cambiar el saldo de un cliente directo';
  exception when insufficient_privilege then null;
  end;

  -- Lo que el mecánico sí usa tiene que seguir funcionando
  update public.clientes set notas = notas where id = v_cli;
  perform count(*) from public.presupuestos;
  perform count(*) from public.ordenes_trabajo;
  update public.ordenes_trabajo set estado = estado where id = (select id from public.ordenes_trabajo limit 1);

  reset role;

  -- ---------------- CAJERO ----------------
  perform set_config('request.jwt.claim.sub', v_caj::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_caj, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_cnt from public.cajas;
  if v_cnt = 0 then raise exception 'FALLO: el cajero no ve las cajas'; end if;

  begin
    update public.cajas set saldo = saldo where id = v_caja;
    raise exception 'FALLO: el cajero pudo modificar una caja sin pasar por las funciones';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.movimientos_caja (tipo_movimiento, monto) values ('ingreso_cobro', 1);
    raise exception 'FALLO: el cajero pudo cargar un movimiento de caja directo';
  exception when insufficient_privilege then null;
  end;

  select count(*) into v_cnt from public.perfiles;
  if v_cnt <> 1 then raise exception 'FALLO: el cajero ve % perfiles (debería ver solo el suyo)', v_cnt; end if;

  -- Eliminar proveedor: con saldo 0 sí, con saldo no
  perform public.proveedor_eliminar(v_prov0);
  if exists (select 1 from public.proveedores where id = v_prov0) then
    raise exception 'FALLO: no se eliminó el proveedor con saldo 0';
  end if;
  begin
    perform public.proveedor_eliminar(v_prov10);
    raise exception 'FALLO: se eliminó un proveedor con saldo pendiente';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  begin
    delete from public.proveedores where id = v_prov10;
    raise exception 'FALLO: se pudo borrar un proveedor directo';
  exception when insufficient_privilege then null;
  end;

  -- Montos inválidos rechazados
  begin
    perform public.registrar_gasto(gen_random_uuid(), v_caja, 'NaN'::numeric, 'Efectivo', 'Prueba', null);
    raise exception 'FALLO: se aceptó un gasto con monto NaN';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;

  reset role;

  -- ---------------- CUENTA SIN PERFIL ----------------
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_cnt from public.clientes;
  if v_cnt <> 0 then raise exception 'FALLO: una cuenta sin perfil ve clientes'; end if;
  select count(*) into v_cnt from public.presupuestos;
  if v_cnt <> 0 then raise exception 'FALLO: una cuenta sin perfil ve presupuestos'; end if;

  reset role;

  raise exception 'PRUEBAS OK: los permisos por rol funcionan. No se guardó ningún dato.';
end;
$$;
