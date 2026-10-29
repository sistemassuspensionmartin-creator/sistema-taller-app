-- =====================================================================
-- PRUEBAS AUTOMÁTICAS de las funciones de dinero, stock y notificaciones
-- ---------------------------------------------------------------------
-- NO MODIFICA DATOS: todo corre dentro de un bloque que al final se
-- cancela a propósito. Por eso SIEMPRE termina en "error":
--   * Si dice  "PRUEBAS OK ..."      -> todo funcionó (y no quedó nada guardado).
--   * Si dice  "FALLO: ..."          -> indica qué prueba falló.
-- Correr DESPUÉS de los scripts 000100, 000200 y 000300.
-- =====================================================================
do $$
declare
  v_admin uuid;
  v_mostrador uuid; v_cheques uuid; v_transf uuid;
  s_mostrador numeric; s_cheques numeric; s_transf numeric;
  v_pres uuid; v_prov uuid; v_cli uuid; v_orden uuid; v_art uuid;
  v_op uuid := gen_random_uuid();
  v_res jsonb; v_num numeric; v_txt text; v_cnt int;
  v_fallo boolean;
begin
  -- Usuario admin de prueba (se toma el primero que exista)
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  if v_admin is null then raise exception 'FALLO: no hay ningún usuario admin para simular'; end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  select id, saldo into v_mostrador, s_mostrador from public.cajas where nombre ilike '%mostrador%' limit 1;
  select id, saldo into v_cheques,   s_cheques   from public.cajas where nombre ilike '%cheque%' limit 1;
  select id, saldo into v_transf,    s_transf    from public.cajas where nombre ilike '%transferencia%' limit 1;

  -- Datos de prueba
  insert into public.presupuestos (fecha_emision, total_final, estado, numero_correlativo)
  values (current_date, 1000, 'Aprobado', 999999) returning id into v_pres;
  insert into public.proveedores (nombre, saldo) values ('PRUEBA AUTOMATICA', 0) returning id into v_prov;
  insert into public.clientes (nombre, saldo) values ('PRUEBA AUTOMATICA', 0) returning id into v_cli;
  insert into public.catalogo (detalle, tipo, precio_base, stock_actual, controlar_stock)
  values ('ARTICULO PRUEBA', 'Repuesto', 1, 10, true) returning id into v_art;

  -- ---------------- COBROS ----------------
  v_res := public.registrar_cobro_presupuesto(v_op, v_pres, 600, 'Efectivo', v_mostrador, 'Cobro prueba', null);
  if (v_res->>'estado_pago') <> 'Parcial' then raise exception 'FALLO cobro parcial: %', v_res; end if;
  select saldo into v_num from public.cajas where id = v_mostrador;
  if v_num <> s_mostrador + 600 then raise exception 'FALLO: la caja no sumó el cobro (% vs %)', v_num, s_mostrador + 600; end if;

  -- Doble clic: mismo código de operación => no se registra dos veces
  v_res := public.registrar_cobro_presupuesto(v_op, v_pres, 600, 'Efectivo', v_mostrador, 'Cobro prueba', null);
  if coalesce((v_res->>'duplicado')::boolean, false) is not true then raise exception 'FALLO: el duplicado no fue detectado'; end if;
  select count(*) into v_cnt from public.movimientos_caja where presupuesto_id = v_pres;
  if v_cnt <> 1 then raise exception 'FALLO: el doble clic generó % movimientos', v_cnt; end if;
  select saldo into v_num from public.cajas where id = v_mostrador;
  if v_num <> s_mostrador + 600 then raise exception 'FALLO: el doble clic sumó dos veces a la caja'; end if;

  -- Cobrar más de lo que falta => rechazado
  v_fallo := false;
  begin
    perform public.registrar_cobro_presupuesto(gen_random_uuid(), v_pres, 500, 'Efectivo', v_mostrador, 'x', null);
  exception when others then v_fallo := true;
  end;
  if not v_fallo then raise exception 'FALLO: permitió cobrar más de lo que restaba'; end if;

  v_res := public.registrar_cobro_presupuesto(gen_random_uuid(), v_pres, 400, 'Transferencia', v_transf, 'Cobro prueba 2', null);
  if (v_res->>'estado') <> 'Cobrado' then raise exception 'FALLO cobro total: %', v_res; end if;
  if public.presupuesto_pagado(v_pres) <> 1000 then raise exception 'FALLO: pagado <> 1000'; end if;

  -- Anulación: devuelve la plata a cada caja y el presupuesto vuelve a Aprobado
  perform public.anular_cobros_presupuesto(gen_random_uuid(), v_pres);
  if public.presupuesto_pagado(v_pres) <> 0 then raise exception 'FALLO: después de anular el pagado no es 0'; end if;
  select saldo into v_num from public.cajas where id = v_mostrador;
  if v_num <> s_mostrador then raise exception 'FALLO: la anulación no devolvió el efectivo'; end if;
  select saldo into v_num from public.cajas where id = v_transf;
  if v_num <> s_transf then raise exception 'FALLO: la anulación no devolvió la transferencia'; end if;
  select estado into v_txt from public.presupuestos where id = v_pres;
  if v_txt <> 'Aprobado' then raise exception 'FALLO: el presupuesto anulado quedó en %', v_txt; end if;

  -- Anular otra vez => no hay cobros vigentes (no revierte dos veces)
  v_fallo := false;
  begin
    perform public.anular_cobros_presupuesto(gen_random_uuid(), v_pres);
  exception when others then v_fallo := sqlerrm like 'SIN_COBROS%';
  end;
  if not v_fallo then raise exception 'FALLO: se pudo anular dos veces'; end if;

  -- Volver a cobrar después de anular
  v_res := public.registrar_cobro_presupuesto(gen_random_uuid(), v_pres, 1000, 'Efectivo', v_mostrador, 'Re-cobro', null);
  if (v_res->>'estado') <> 'Cobrado' then raise exception 'FALLO re-cobro: %', v_res; end if;

  -- ---------------- PROVEEDORES (pago con cheque + nota de crédito) ----------------
  perform public.proveedor_registrar_factura(gen_random_uuid(), v_prov, 1000, 'FA-1', null);
  perform public.proveedor_registrar_pago(gen_random_uuid(), v_prov, v_cheques, 300, 'CH-1', null);
  select saldo into v_num from public.cajas where id = v_cheques;
  if v_num <> s_cheques - 300 then raise exception 'FALLO: el pago con cheque no RESTÓ de la Caja Cheques (% vs %)', v_num, s_cheques - 300; end if;
  select metodo_pago into v_txt from public.movimientos_caja where detalle = 'Pago a Proveedor: PRUEBA AUTOMATICA' limit 1;
  if v_txt <> 'Cheque' then raise exception 'FALLO: el pago con cheque quedó como %', v_txt; end if;

  perform public.proveedor_nota_credito(gen_random_uuid(), v_prov, 200, null, 'Devolución');
  select saldo into v_num from public.proveedores where id = v_prov;
  if v_num <> 500 then raise exception 'FALLO: saldo proveedor esperado 500, quedó %', v_num; end if;
  select saldo into v_num from public.cajas where id = v_cheques;
  if v_num <> s_cheques - 300 then raise exception 'FALLO: la nota de crédito movió plata de una caja'; end if;

  -- Eliminar el pago: vuelve la deuda y la plata a la caja
  select id into v_orden from public.movimientos_proveedores where proveedor_id = v_prov and tipo = 'pago_proveedor';
  perform public.proveedor_eliminar_movimiento(v_orden);
  select saldo into v_num from public.proveedores where id = v_prov;
  if v_num <> 800 then raise exception 'FALLO: al borrar el pago el saldo quedó %', v_num; end if;
  select saldo into v_num from public.cajas where id = v_cheques;
  if v_num <> s_cheques then raise exception 'FALLO: al borrar el pago la plata no volvió a la caja'; end if;

  -- Pago sin fondos => rechazado
  v_fallo := false;
  begin
    perform public.proveedor_registrar_pago(gen_random_uuid(), v_prov, v_cheques, s_cheques + 1000000, null, null);
  exception when others then v_fallo := true;
  end;
  if not v_fallo then raise exception 'FALLO: permitió pagar sin fondos'; end if;

  -- ---------------- CLIENTES ----------------
  perform public.cliente_registrar_cargo(gen_random_uuid(), v_cli, 1000, null, null);
  perform public.cliente_registrar_pago(gen_random_uuid(), v_cli, v_transf, 'Transferencia', 400, null, null, 'Cobro a Cuenta Corriente: PRUEBA');
  perform public.cliente_nota_credito(gen_random_uuid(), v_cli, 100, null, null);
  select saldo into v_num from public.clientes where id = v_cli;
  if v_num <> 500 then raise exception 'FALLO: saldo cliente esperado 500, quedó %', v_num; end if;
  select id into v_orden from public.movimientos_clientes where cliente_id = v_cli and tipo = 'pago_ingreso';
  perform public.cliente_eliminar_movimiento(v_orden);
  select saldo into v_num from public.clientes where id = v_cli;
  if v_num <> 900 then raise exception 'FALLO: al borrar el cobro el saldo del cliente quedó %', v_num; end if;
  select saldo into v_num from public.cajas where id = v_transf;
  if v_num <> s_transf then raise exception 'FALLO: al borrar el cobro la plata no salió de la caja'; end if;

  -- ---------------- STOCK E INGRESO AL TALLER ----------------
  if public.ajustar_stock(v_art, -3) <> 7 then raise exception 'FALLO: ajustar_stock'; end if;
  v_op := gen_random_uuid();
  v_res := public.ingresar_presupuesto_taller(v_op, v_pres, 'Cobrado', 'PRUEBA01', 'Cliente Prueba',
             jsonb_build_array(jsonb_build_object('catalogo_id', v_art, 'cantidad', 2, 'tipo', 'Repuesto', 'detalle', 'ARTICULO PRUEBA')));
  perform public.ingresar_presupuesto_taller(v_op, v_pres, 'Cobrado', 'PRUEBA01', 'Cliente Prueba',
             jsonb_build_array(jsonb_build_object('catalogo_id', v_art, 'cantidad', 2, 'tipo', 'Repuesto', 'detalle', 'ARTICULO PRUEBA')));
  select count(*) into v_cnt from public.ordenes_trabajo where presupuesto_id = v_pres;
  if v_cnt <> 1 then raise exception 'FALLO: el doble ingreso creó % órdenes', v_cnt; end if;
  select stock_actual into v_cnt from public.catalogo where id = v_art;
  if v_cnt <> 5 then raise exception 'FALLO: el stock quedó en % (esperado 5)', v_cnt; end if;

  -- La pantalla Caja muestra el presupuesto (ya con auto ingresado) como cobrado en el turno
  if not exists (select 1 from public.caja_presupuestos('2000-01-01') where id = v_pres and restante = 0 and cobrado_en_turno) then
    raise exception 'FALLO: caja_presupuestos no muestra el re-cobro';
  end if;

  -- ---------------- NOTIFICACIONES ----------------
  v_orden := (v_res->>'orden_id')::uuid;
  if not exists (select 1 from public.notificaciones where orden_id = v_orden and destino = 'taller' and creado_por = v_admin) then
    raise exception 'FALLO: no se creó el aviso de nuevo auto para el taller';
  end if;
  update public.ordenes_trabajo set estado = 'Terminado' where id = v_orden;
  if not exists (select 1 from public.notificaciones where orden_id = v_orden and destino = 'oficina' and tipo = 'auto_terminado' and vista_at is null) then
    raise exception 'FALLO: no se creó el aviso de auto terminado para la oficina';
  end if;
  update public.ordenes_trabajo set estado = 'Entregado' where id = v_orden;
  if exists (select 1 from public.notificaciones where orden_id = v_orden and vista_at is null) then
    raise exception 'FALLO: al entregar el auto quedaron avisos pendientes';
  end if;

  -- ---------------- CIERRE DE CAJA ----------------
  select saldo into v_num from public.cajas where id = v_mostrador;
  v_res := public.cerrar_caja(gen_random_uuid(), v_num - 50, 'Prueba');
  if (v_res->>'diferencia')::numeric <> -50 then raise exception 'FALLO cierre: %', v_res; end if;
  select saldo into v_num from public.cajas where id = v_mostrador;
  if v_num <> (v_res->>'efectivo_real')::numeric then raise exception 'FALLO: el cierre no ajustó el saldo'; end if;
  if not exists (select 1 from public.movimientos_caja where tipo_movimiento = 'ajuste_faltante' and caja_origen_id = v_mostrador and monto = 50 and fecha >= now()) then
    raise exception 'FALLO: el faltante del cierre no salió de la caja';
  end if;

  -- Fin: se cancela todo a propósito para no dejar datos de prueba
  raise exception 'PRUEBAS OK: todas las pruebas pasaron. No se guardó ningún dato.';
end;
$$;
