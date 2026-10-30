-- =====================================================================
-- FACTURACIÓN ELECTRÓNICA ARCA (web service WSFEv1)
-- ---------------------------------------------------------------------
--   1. Datos fiscales del taller y ambiente (prueba / producción).
--   2. Comprobantes: facturas y notas de crédito con todos los datos que
--      exige ARCA, su estado (pendiente, enviando, autorizada, rechazada)
--      y la respuesta de ARCA para auditoría.
--   3. Reglas en la base:
--        - solo se factura lo cobrado (cobrado - ya facturado + notas de crédito);
--        - la nota de crédito sale siempre de una factura autorizada y no
--          puede superar lo que queda de esa factura;
--        - cada pedido tiene un código único: el doble clic no emite dos veces;
--        - no se puede anular el cobro de algo facturado sin nota de crédito.
--   4. Las facturas las crea solo el servidor (con la clave de servicio).
-- Script re-ejecutable. Correr DESPUÉS del 000500.
-- Para deshacer: rollback/20261031000600_facturacion_arca_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Datos fiscales del emisor
-- ---------------------------------------------------------------------
alter table public.configuracion
  add column if not exists razon_social text,
  add column if not exists condicion_iva_emisor text not null default 'Responsable Inscripto'
    check (condicion_iva_emisor in ('Responsable Inscripto', 'Monotributo')),
  add column if not exists iibb text,
  add column if not exists inicio_actividades date,
  add column if not exists domicilio_fiscal text,
  add column if not exists arca_punto_venta integer check (arca_punto_venta between 1 and 99998),
  add column if not exists arca_ambiente text not null default 'homologacion'
    check (arca_ambiente in ('homologacion', 'produccion')),
  add column if not exists arca_factura_a_monotributo boolean not null default false;

-- Números PRE en orden: la secuencia sigue desde el número más alto que ya existe
-- (antes la pantalla asignaba un número al azar de 4 cifras)
do $$
declare
  v_seq text := pg_get_serial_sequence('public.presupuestos', 'numero_correlativo');
  v_max bigint;
begin
  if v_seq is null then
    select pg_get_expr(d.adbin, d.adrelid) into v_seq
      from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
     where d.adrelid = 'public.presupuestos'::regclass and a.attname = 'numero_correlativo';
    v_seq := substring(v_seq from 'nextval\(''([^'']+)''');
  end if;
  if v_seq is not null then
    select coalesce(max(numero_correlativo), 0) into v_max from public.presupuestos;
    perform setval(v_seq, greatest(v_max, (select last_value from pg_sequences
                                             where format('%I.%I', schemaname, sequencename) = v_seq
                                                or sequencename = v_seq limit 1), 1));
    -- El alta de presupuestos desde la pantalla ahora usa la secuencia
    execute format('grant usage, select on sequence %s to authenticated', v_seq);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Comprobantes
-- ---------------------------------------------------------------------
alter table public.facturas
  add column if not exists cbte_tipo integer,
  add column if not exists concepto integer not null default 3,
  add column if not exists doc_tipo integer,
  add column if not exists doc_nro text,
  add column if not exists condicion_iva_receptor_id integer,
  add column if not exists cliente_nombre text,
  add column if not exists cliente_domicilio text,
  add column if not exists cliente_condicion_iva text,
  add column if not exists fecha_cbte date,
  add column if not exists ambiente text check (ambiente in ('homologacion', 'produccion')),
  add column if not exists estado text not null default 'autorizada'
    check (estado in ('pendiente', 'enviando', 'autorizada', 'rechazada')),
  add column if not exists observaciones text,
  add column if not exists factura_asociada_id uuid references public.facturas(id),
  add column if not exists operacion uuid,
  add column if not exists cuit_emisor text,
  add column if not exists qr_url text,
  add column if not exists arca_respuesta jsonb,
  add column if not exists emitido_por uuid,
  add column if not exists actualizado_at timestamptz;

create unique index if not exists facturas_operacion_unica on public.facturas (operacion) where operacion is not null;
create unique index if not exists facturas_numero_unico
  on public.facturas (ambiente, punto_venta, cbte_tipo, numero_factura)
  where ambiente is not null and numero_factura is not null and estado in ('enviando', 'autorizada');
create index if not exists facturas_presupuesto_idx on public.facturas (presupuesto_id);
create index if not exists facturas_asociada_idx on public.facturas (factura_asociada_id);

-- Los comprobantes los crea y actualiza solo el servidor
revoke insert, update, delete on public.facturas from authenticated;
drop policy if exists oficina_crea on public.facturas;
drop policy if exists oficina_modifica on public.facturas;

-- Ticket de acceso a ARCA (dura 12 h). Solo lo usa el servidor.
create table if not exists public.arca_tokens (
  ambiente text not null,
  servicio text not null,
  token text not null,
  sign text not null,
  expira timestamptz not null,
  primary key (ambiente, servicio)
);
alter table public.arca_tokens enable row level security;
revoke all on public.arca_tokens from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Cálculos
-- ---------------------------------------------------------------------
-- Facturas menos notas de crédito de un presupuesto (incluye las que están
-- en curso, para que dos pedidos simultáneos no superen lo cobrado)
create or replace function public._facturado_neto(p_presupuesto_id uuid, p_ambiente text)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(case when cbte_tipo in (1, 6, 11) then total_final
                           when cbte_tipo in (3, 8, 13) then -total_final else 0 end), 0)
    from public.facturas
   where presupuesto_id = p_presupuesto_id
     and ambiente = p_ambiente
     and estado in ('pendiente', 'enviando', 'autorizada');
$$;

create or replace function public._ambiente_arca()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select arca_ambiente from public.configuracion order by id limit 1), 'homologacion');
$$;

-- Actualiza el estado de facturación que se ve en Caja (solo con comprobantes reales)
create or replace function public._actualizar_estado_facturacion(p_presupuesto_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_neto numeric;
  v_total numeric;
begin
  select coalesce(sum(case when cbte_tipo in (1, 6, 11) then total_final
                           when cbte_tipo in (3, 8, 13) then -total_final else 0 end), 0)
    into v_neto
    from public.facturas
   where presupuesto_id = p_presupuesto_id and ambiente = 'produccion' and estado = 'autorizada';

  select coalesce(total_final, 0) into v_total from public.presupuestos where id = p_presupuesto_id;

  update public.presupuestos
     set estado_facturacion = case when v_neto <= 0.009 then 'No Facturado'
                                   when v_neto >= v_total - 0.009 then 'Facturado'
                                   else 'Parcial' end
   where id = p_presupuesto_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Resumen para la pantalla de facturación (oficina)
-- ---------------------------------------------------------------------
create or replace function public.facturacion_resumen(p_presupuesto_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_cfg record;
  v_pres record;
  v_cli record;
  v_ambiente text;
  v_cobrado numeric;
  v_facturado numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);

  select * into v_cfg from public.configuracion order by id limit 1;
  v_ambiente := coalesce(v_cfg.arca_ambiente, 'homologacion');

  select * into v_pres from public.presupuestos where id = p_presupuesto_id;
  if not found then
    raise exception 'El presupuesto no existe.';
  end if;

  select c.* into v_cli
    from public.vehiculos v join public.clientes c on c.id = v.cliente_id
   where v.patente = v_pres.vehiculo_patente;

  v_cobrado := public.presupuesto_pagado(p_presupuesto_id);
  v_facturado := public._facturado_neto(p_presupuesto_id, v_ambiente);

  return jsonb_build_object(
    'ambiente', v_ambiente,
    'emisor', jsonb_build_object(
      'razon_social', v_cfg.razon_social, 'nombre_taller', v_cfg.nombre_taller, 'cuit', v_cfg.cuit,
      'condicion_iva', v_cfg.condicion_iva_emisor, 'iibb', v_cfg.iibb,
      'inicio_actividades', v_cfg.inicio_actividades, 'domicilio_fiscal', v_cfg.domicilio_fiscal,
      'direccion', v_cfg.direccion, 'telefono', v_cfg.telefono, 'logo_url', v_cfg.logo_url,
      'punto_venta', v_cfg.arca_punto_venta, 'factura_a_monotributo', v_cfg.arca_factura_a_monotributo),
    'presupuesto', jsonb_build_object(
      'id', v_pres.id, 'numero', v_pres.numero_correlativo, 'total', coalesce(v_pres.total_final, 0),
      'descuento', coalesce(v_pres.descuento, 0), 'patente', v_pres.vehiculo_patente),
    'receptor', case when v_cli.id is null then null else jsonb_build_object(
      'nombre', case when v_cli.tipo_cliente = 'empresa' then coalesce(v_cli.razon_social, v_cli.nombre)
                     else trim(coalesce(v_cli.nombre, '') || ' ' || coalesce(v_cli.apellido, '')) end,
      'documento', v_cli.documento,
      'condicion_iva', coalesce(v_cli.condicion_iva, 'Consumidor Final'),
      'domicilio', coalesce(nullif(v_cli.domicilio_fiscal, ''),
                            nullif(trim(concat_ws(', ', nullif(v_cli.calle, ''), nullif(v_cli.barrio, ''), nullif(v_cli.ciudad, ''))), ''))) end,
    'items', coalesce((select jsonb_agg(jsonb_build_object('detalle', detalle, 'cantidad', cantidad,
                                                           'precio_unitario', precio_unitario, 'tipo', tipo))
                         from public.presupuesto_items where presupuesto_id = p_presupuesto_id), '[]'::jsonb),
    'cobrado', v_cobrado,
    'facturado', v_facturado,
    'facturable', greatest(round(v_cobrado - v_facturado, 2), 0),
    'comprobantes', coalesce((
      select jsonb_agg((to_jsonb(f) - 'arca_respuesta') || jsonb_build_object(
               'nc_restante', case when f.cbte_tipo in (1, 6, 11) and f.estado = 'autorizada' then
                 round(f.total_final - coalesce((select sum(n.total_final) from public.facturas n
                                                  where n.factura_asociada_id = f.id
                                                    and n.estado in ('pendiente', 'enviando', 'autorizada')), 0), 2)
                 else 0 end) order by f.created_at)
        from public.facturas f
       where f.presupuesto_id = p_presupuesto_id and f.ambiente is not null), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Reservas (las llama solo el servidor, antes de pedir el CAE)
-- ---------------------------------------------------------------------
-- p_datos lo arma el servidor: cbte_tipo, tipo_factura, doc_tipo, doc_nro,
-- condicion_iva_receptor_id, cliente_*, total_neto, iva_total, fecha_cbte,
-- punto_venta, cuit_emisor, ambiente
create or replace function public.factura_reservar(
  p_operacion uuid, p_presupuesto_id uuid, p_importe numeric, p_usuario uuid, p_datos jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_existente public.facturas;
  v_nueva public.facturas;
  v_rol text;
  v_ambiente text := p_datos->>'ambiente';
  v_cobrado numeric;
  v_facturado numeric;
begin
  select * into v_existente from public.facturas where operacion = p_operacion;
  if found then
    return to_jsonb(v_existente);
  end if;

  select rol into v_rol from public.perfiles where id = p_usuario;
  if v_rol is null or v_rol not in ('admin', 'cajero') then
    raise exception 'No tenés permisos para facturar.';
  end if;
  perform public._validar_monto(p_importe);
  if (p_datos->>'cbte_tipo')::int not in (1, 6, 11) then
    raise exception 'Tipo de factura inválido.';
  end if;
  if round((p_datos->>'total_neto')::numeric + (p_datos->>'iva_total')::numeric, 2) <> round(p_importe, 2) then
    raise exception 'El neto más el IVA no coincide con el total.';
  end if;

  perform 1 from public.presupuestos where id = p_presupuesto_id for update;
  if not found then
    raise exception 'El presupuesto no existe.';
  end if;

  v_cobrado := public.presupuesto_pagado(p_presupuesto_id);
  v_facturado := public._facturado_neto(p_presupuesto_id, v_ambiente);
  if p_importe > v_cobrado - v_facturado + 0.009 then
    raise exception 'SUPERA_COBRADO: Solo se puede facturar lo cobrado. Disponible para facturar: $%.',
      to_char(greatest(v_cobrado - v_facturado, 0), 'FM999G999G990D00');
  end if;

  insert into public.facturas (
    presupuesto_id, operacion, estado, ambiente, es_simulacion, cbte_tipo, tipo_factura, concepto,
    punto_venta, cuit_emisor, doc_tipo, doc_nro, cliente_cuit, condicion_iva_receptor_id,
    cliente_nombre, cliente_domicilio, cliente_condicion_iva, fecha_cbte,
    total_final, total_neto, iva_total, emitido_por, actualizado_at)
  values (
    p_presupuesto_id, p_operacion, 'pendiente', v_ambiente, v_ambiente <> 'produccion',
    (p_datos->>'cbte_tipo')::int, p_datos->>'tipo_factura', 3,
    (p_datos->>'punto_venta')::int, p_datos->>'cuit_emisor', (p_datos->>'doc_tipo')::int, p_datos->>'doc_nro',
    p_datos->>'doc_nro', (p_datos->>'condicion_iva_receptor_id')::int,
    p_datos->>'cliente_nombre', p_datos->>'cliente_domicilio', p_datos->>'cliente_condicion_iva',
    (p_datos->>'fecha_cbte')::date,
    round(p_importe, 2), (p_datos->>'total_neto')::numeric, (p_datos->>'iva_total')::numeric, p_usuario, now())
  returning * into v_nueva;

  return to_jsonb(v_nueva);
end;
$$;

create or replace function public.nota_credito_reservar(
  p_operacion uuid, p_factura_id uuid, p_importe numeric, p_usuario uuid, p_datos jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_existente public.facturas;
  v_fac public.facturas;
  v_nueva public.facturas;
  v_rol text;
  v_usado numeric;
  v_tipo_nc int;
begin
  select * into v_existente from public.facturas where operacion = p_operacion;
  if found then
    return to_jsonb(v_existente);
  end if;

  select rol into v_rol from public.perfiles where id = p_usuario;
  if v_rol is null or v_rol not in ('admin', 'cajero') then
    raise exception 'No tenés permisos para emitir notas de crédito.';
  end if;
  perform public._validar_monto(p_importe);

  select * into v_fac from public.facturas where id = p_factura_id for update;
  if not found or v_fac.estado <> 'autorizada' or v_fac.cbte_tipo not in (1, 6, 11) or v_fac.ambiente is null then
    raise exception 'La nota de crédito tiene que salir de una factura autorizada por ARCA.';
  end if;
  if v_fac.ambiente <> p_datos->>'ambiente' then
    raise exception 'La factura es de otro ambiente (prueba / producción).';
  end if;

  v_tipo_nc := case v_fac.cbte_tipo when 1 then 3 when 6 then 8 else 13 end;
  if round((p_datos->>'total_neto')::numeric + (p_datos->>'iva_total')::numeric, 2) <> round(p_importe, 2) then
    raise exception 'El neto más el IVA no coincide con el total.';
  end if;

  select coalesce(sum(total_final), 0) into v_usado
    from public.facturas
   where factura_asociada_id = p_factura_id and estado in ('pendiente', 'enviando', 'autorizada');
  if p_importe > v_fac.total_final - v_usado + 0.009 then
    raise exception 'SUPERA_FACTURA: La nota de crédito no puede superar lo que queda de la factura ($%).',
      to_char(greatest(v_fac.total_final - v_usado, 0), 'FM999G999G990D00');
  end if;

  insert into public.facturas (
    presupuesto_id, factura_asociada_id, operacion, estado, ambiente, es_simulacion, cbte_tipo, tipo_factura,
    concepto, punto_venta, cuit_emisor, doc_tipo, doc_nro, cliente_cuit, condicion_iva_receptor_id,
    cliente_nombre, cliente_domicilio, cliente_condicion_iva, fecha_cbte,
    total_final, total_neto, iva_total, emitido_por, actualizado_at)
  values (
    v_fac.presupuesto_id, v_fac.id, p_operacion, 'pendiente', v_fac.ambiente, v_fac.es_simulacion, v_tipo_nc,
    v_fac.tipo_factura, v_fac.concepto, v_fac.punto_venta, v_fac.cuit_emisor, v_fac.doc_tipo, v_fac.doc_nro,
    v_fac.doc_nro, v_fac.condicion_iva_receptor_id, v_fac.cliente_nombre, v_fac.cliente_domicilio,
    v_fac.cliente_condicion_iva, (p_datos->>'fecha_cbte')::date,
    round(p_importe, 2), (p_datos->>'total_neto')::numeric, (p_datos->>'iva_total')::numeric, p_usuario, now())
  returning * into v_nueva;

  return to_jsonb(v_nueva);
end;
$$;

-- Estados del pedido a ARCA
create or replace function public.factura_marcar_enviando(p_id uuid, p_numero integer)
returns void
language sql security definer set search_path = public
as $$
  update public.facturas set estado = 'enviando', numero_factura = p_numero, actualizado_at = now()
   where id = p_id and estado in ('pendiente', 'enviando');
$$;

create or replace function public.factura_volver_pendiente(p_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.facturas set estado = 'pendiente', numero_factura = null, actualizado_at = now()
   where id = p_id and estado = 'enviando';
$$;

create or replace function public.factura_confirmar(
  p_id uuid, p_numero integer, p_cae text, p_cae_vto date, p_qr text, p_respuesta jsonb, p_obs text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_fac public.facturas;
begin
  update public.facturas
     set estado = 'autorizada', numero_factura = p_numero, cae = p_cae, cae_vencimiento = p_cae_vto,
         qr_url = p_qr, arca_respuesta = p_respuesta, observaciones = p_obs, actualizado_at = now()
   where id = p_id
  returning * into v_fac;
  if v_fac.presupuesto_id is not null then
    perform public._actualizar_estado_facturacion(v_fac.presupuesto_id);
  end if;
  return to_jsonb(v_fac);
end;
$$;

create or replace function public.factura_rechazar(p_id uuid, p_obs text, p_respuesta jsonb)
returns void
language sql security definer set search_path = public
as $$
  update public.facturas
     set estado = 'rechazada', numero_factura = null, observaciones = p_obs, arca_respuesta = p_respuesta,
         actualizado_at = now()
   where id = p_id and estado in ('pendiente', 'enviando');
$$;

-- ---------------------------------------------------------------------
-- 6. Anular cobros: si hay facturas, primero va la nota de crédito
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

  if public._facturado_neto(p_presupuesto_id, public._ambiente_arca()) > 0.009 then
    raise exception 'FACTURADO: Este trabajo tiene facturas emitidas en ARCA. Primero emití la nota de crédito desde Caja (botón de facturación) y después anulá el cobro.';
  end if;

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

-- ---------------------------------------------------------------------
-- 7. Permisos de las funciones
-- ---------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public._facturado_neto(uuid, text)',
    'public._ambiente_arca()',
    'public._actualizar_estado_facturacion(uuid)',
    'public.factura_reservar(uuid, uuid, numeric, uuid, jsonb)',
    'public.nota_credito_reservar(uuid, uuid, numeric, uuid, jsonb)',
    'public.factura_marcar_enviando(uuid, integer)',
    'public.factura_volver_pendiente(uuid)',
    'public.factura_confirmar(uuid, integer, text, date, text, jsonb, text)',
    'public.factura_rechazar(uuid, text, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;

  execute 'revoke all on function public.facturacion_resumen(uuid) from public, anon';
  execute 'grant execute on function public.facturacion_resumen(uuid) to authenticated';
end;
$$;
