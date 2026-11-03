-- =====================================================================
-- PRUEBAS AUTOMÁTICAS de numeración, asociación y papelera (script 000550)
-- NO MODIFICA DATOS: al final se cancela todo a propósito.
--   * "PRUEBAS OK ..."  -> todo funcionó (y no quedó nada guardado).
--   * "FALLO: ..."      -> indica qué prueba falló.
-- =====================================================================
do $$
declare
  v_admin uuid; v_mostrador uuid;
  v_max int; v_a uuid; v_b uuid; v_c uuid; v_num_a int; v_num_b int;
  v_fallo boolean;
begin
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  select id into v_mostrador from public.cajas where nombre ilike '%mostrador%' limit 1;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  select coalesce(max(numero_correlativo), 0) into v_max from public.presupuestos;

  -- Numeración: los nuevos van después del más alto y no se repiten
  insert into public.presupuestos (fecha_emision, total_final, estado) values (current_date, 100, 'Borrador')
    returning id, numero_correlativo into v_a, v_num_a;
  insert into public.presupuestos (fecha_emision, total_final, estado) values (current_date, 200, 'En Espera')
    returning id, numero_correlativo into v_b, v_num_b;
  if v_num_a <= v_max or v_num_b <> v_num_a + 1 then
    raise exception 'FALLO: numeración (máximo anterior %, nuevos % y %)', v_max, v_num_a, v_num_b;
  end if;
  v_fallo := false;
  begin
    insert into public.presupuestos (fecha_emision, total_final, estado, numero_correlativo) values (current_date, 1, 'Borrador', v_num_a);
  exception when unique_violation then v_fallo := true;
  end;
  if not v_fallo then raise exception 'FALLO: se pudo repetir un número nuevo'; end if;

  -- Eliminar pasa por la papelera y se puede restaurar con sus ítems
  insert into public.presupuesto_items (presupuesto_id, tipo, detalle, cantidad, precio_unitario)
  values (v_a, 'Servicio', 'ITEM PRUEBA PAPELERA', 1, 100);
  perform public.presupuesto_eliminar(v_a);
  if exists (select 1 from public.presupuestos where id = v_a) then raise exception 'FALLO: no se eliminó'; end if;
  if not exists (select 1 from public.presupuestos_eliminados where id = v_a and jsonb_array_length(items) = 1) then
    raise exception 'FALLO: no quedó en la papelera con sus ítems';
  end if;
  perform public.presupuesto_restaurar(v_a);
  if not exists (select 1 from public.presupuestos where id = v_a and numero_correlativo = v_num_a) then
    raise exception 'FALLO: no se restauró con su número';
  end if;
  if not exists (select 1 from public.presupuesto_items where presupuesto_id = v_a and detalle = 'ITEM PRUEBA PAPELERA') then
    raise exception 'FALLO: no se restauraron los ítems';
  end if;

  -- Uno con cobros no se puede eliminar
  insert into public.presupuestos (fecha_emision, total_final, estado) values (current_date, 300, 'Aprobado') returning id into v_c;
  perform public.registrar_cobro_presupuesto(gen_random_uuid(), v_c, 100, 'Efectivo', v_mostrador, 'Prueba', null);
  v_fallo := false;
  begin
    perform public.presupuesto_eliminar(v_c);
  exception when others then v_fallo := sqlerrm like 'TIENE_COBROS%';
  end;
  if not v_fallo then raise exception 'FALLO: se pudo eliminar un presupuesto con cobros'; end if;

  -- Asociar: el anterior queda vinculado, no se borra
  update public.presupuestos set estado = 'Asociado', asociado_a = v_a where id = v_b;
  if not exists (select 1 from public.presupuestos where id = v_b and asociado_a = v_a) then
    raise exception 'FALLO: la asociación no quedó registrada';
  end if;

  raise exception 'PRUEBAS OK: numeración, asociación y papelera funcionan. No se guardó ningún dato.';
end;
$$;
