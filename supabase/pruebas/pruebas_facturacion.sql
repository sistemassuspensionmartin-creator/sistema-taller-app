-- =====================================================================
-- PRUEBAS AUTOMÁTICAS de las reglas de facturación (script 000600)
-- ---------------------------------------------------------------------
-- NO MODIFICA DATOS y NO se conecta con ARCA: prueba las reglas de la base
-- con un presupuesto de prueba. Siempre termina en "error":
--   * "PRUEBAS OK ..."  -> todo funcionó (y no quedó nada guardado).
--   * "FALLO: ..."      -> indica qué prueba falló.
-- Correr DESPUÉS del script 000600.
-- =====================================================================
do $$
declare
  v_caj uuid; v_mostrador uuid; v_pres uuid;
  v_fac jsonb; v_fac2 jsonb; v_nc jsonb;
  v_amb text := public._ambiente_arca();
  v_fallo boolean;
  v_datos jsonb;
begin
  select id into v_caj from public.perfiles where rol in ('cajero', 'admin') limit 1;
  select id into v_mostrador from public.cajas where nombre ilike '%mostrador%' limit 1;
  perform set_config('request.jwt.claim.sub', v_caj::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_caj, 'role', 'authenticated')::text, true);

  insert into public.presupuestos (fecha_emision, total_final, estado)
  values (current_date, 1210, 'Aprobado') returning id into v_pres;
  perform public.registrar_cobro_presupuesto(gen_random_uuid(), v_pres, 1000, 'Efectivo', v_mostrador, 'Prueba facturación', null);

  v_datos := jsonb_build_object('ambiente', v_amb, 'cbte_tipo', 6, 'tipo_factura', 'B', 'punto_venta', 99,
    'cuit_emisor', '20111111112', 'doc_tipo', 99, 'doc_nro', '0', 'condicion_iva_receptor_id', 5,
    'cliente_nombre', 'Prueba', 'fecha_cbte', current_date, 'total_neto', 826.45, 'iva_total', 173.55);

  -- No se puede facturar más de lo cobrado
  v_fallo := false;
  begin
    perform public.factura_reservar(gen_random_uuid(), v_pres, 1210, v_caj,
      v_datos || jsonb_build_object('total_neto', 1000, 'iva_total', 210));
  exception when others then v_fallo := sqlerrm like 'SUPERA_COBRADO%';
  end;
  if not v_fallo then raise exception 'FALLO: permitió facturar más de lo cobrado'; end if;

  -- Neto + IVA tiene que dar el total
  v_fallo := false;
  begin
    perform public.factura_reservar(gen_random_uuid(), v_pres, 1000, v_caj, v_datos || jsonb_build_object('iva_total', 1));
  exception when others then v_fallo := true;
  end;
  if not v_fallo then raise exception 'FALLO: aceptó neto + IVA distinto del total'; end if;

  -- Factura por lo cobrado; el mismo código de operación no duplica
  v_fac := public.factura_reservar('00000000-0000-0000-0000-00000000f001', v_pres, 1000, v_caj, v_datos);
  v_fac2 := public.factura_reservar('00000000-0000-0000-0000-00000000f001', v_pres, 1000, v_caj, v_datos);
  if v_fac->>'id' <> v_fac2->>'id' then raise exception 'FALLO: el doble clic reservó dos facturas'; end if;
  if v_fac->>'estado' <> 'pendiente' then raise exception 'FALLO: la reserva no quedó pendiente'; end if;

  -- Una segunda factura no puede pasar lo cobrado (la pendiente ya cuenta)
  v_fallo := false;
  begin
    perform public.factura_reservar(gen_random_uuid(), v_pres, 10, v_caj,
      v_datos || jsonb_build_object('total_neto', 8.26, 'iva_total', 1.74));
  exception when others then v_fallo := sqlerrm like 'SUPERA_COBRADO%';
  end;
  if not v_fallo then raise exception 'FALLO: dos facturas superaron lo cobrado'; end if;

  -- Autorización (simula la respuesta de ARCA)
  perform public.factura_marcar_enviando((v_fac->>'id')::uuid, 1);
  v_fac := public.factura_confirmar((v_fac->>'id')::uuid, 1, '76000000000001', current_date + 10,
                                    'https://www.afip.gob.ar/fe/qr/?p=x', null, null);
  if v_fac->>'estado' <> 'autorizada' then raise exception 'FALLO: la factura no quedó autorizada'; end if;

  -- No se puede anular el cobro de algo facturado sin nota de crédito
  v_fallo := false;
  begin
    perform public.anular_cobros_presupuesto(gen_random_uuid(), v_pres);
  exception when others then v_fallo := sqlerrm like 'FACTURADO%';
  end;
  if not v_fallo then raise exception 'FALLO: permitió anular un cobro facturado sin nota de crédito'; end if;

  -- Nota de crédito: no puede superar la factura
  v_fallo := false;
  begin
    perform public.nota_credito_reservar(gen_random_uuid(), (v_fac->>'id')::uuid, 1001, v_caj,
      jsonb_build_object('ambiente', v_amb, 'fecha_cbte', current_date, 'total_neto', 827.27, 'iva_total', 173.73));
  exception when others then v_fallo := sqlerrm like 'SUPERA_FACTURA%';
  end;
  if not v_fallo then raise exception 'FALLO: la nota de crédito superó la factura'; end if;

  -- Nota de crédito total: queda asociada, con la misma letra
  v_nc := public.nota_credito_reservar(gen_random_uuid(), (v_fac->>'id')::uuid, 1000, v_caj,
    jsonb_build_object('ambiente', v_amb, 'fecha_cbte', current_date, 'total_neto', 826.45, 'iva_total', 173.55));
  if (v_nc->>'cbte_tipo')::int <> 8 or v_nc->>'factura_asociada_id' <> v_fac->>'id' then
    raise exception 'FALLO: la nota de crédito no quedó como NC B asociada a la factura';
  end if;
  perform public.factura_marcar_enviando((v_nc->>'id')::uuid, 1);
  perform public.factura_confirmar((v_nc->>'id')::uuid, 1, '76000000000002', current_date + 10, null, null, null);

  -- Con la nota de crédito, se puede volver a facturar y también anular el cobro
  if (public.facturacion_resumen(v_pres)->>'facturable')::numeric <> 1000 then
    raise exception 'FALLO: después de la nota de crédito el disponible no volvió a 1000';
  end if;
  perform public.anular_cobros_presupuesto(gen_random_uuid(), v_pres);

  raise exception 'PRUEBAS OK: las reglas de facturación funcionan. No se guardó ningún dato.';
end;
$$;
