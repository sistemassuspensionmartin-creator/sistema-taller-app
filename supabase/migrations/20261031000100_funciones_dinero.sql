-- =====================================================================
-- ETAPA 1: Operaciones de dinero y stock dentro de la base de datos
-- ---------------------------------------------------------------------
-- Cada operación se ejecuta completa o no se ejecuta (transacción),
-- los saldos se suman/restan de forma atómica (sin leer desde la PC)
-- y cada operación lleva un código único para que un doble clic no
-- la registre dos veces.
-- Script re-ejecutable: se puede correr más de una vez sin problema.
-- Para deshacer: rollback/20261031000100_funciones_dinero_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Estructura nueva (solo agregados)
-- ---------------------------------------------------------------------
create table if not exists public.operaciones (
  id uuid primary key,
  tipo text not null,
  usuario_id uuid,
  resultado jsonb,
  created_at timestamptz not null default now()
);
alter table public.operaciones enable row level security;

alter table public.movimientos_caja        add column if not exists revierte_id uuid;
alter table public.movimientos_proveedores add column if not exists movimiento_caja_id uuid;
alter table public.movimientos_proveedores add column if not exists usuario_id uuid;
alter table public.movimientos_clientes    add column if not exists movimiento_caja_id uuid;
alter table public.movimientos_clientes    add column if not exists usuario_id uuid;

create index if not exists movimientos_caja_presupuesto_idx on public.movimientos_caja (presupuesto_id);
create index if not exists movimientos_caja_fecha_idx       on public.movimientos_caja (fecha);
create index if not exists movimientos_clientes_cliente_idx on public.movimientos_clientes (cliente_id);
create index if not exists movimientos_prov_proveedor_idx   on public.movimientos_proveedores (proveedor_id);
create index if not exists ordenes_trabajo_presupuesto_idx  on public.ordenes_trabajo (presupuesto_id);
create index if not exists ordenes_trabajo_estado_idx       on public.ordenes_trabajo (estado);
create index if not exists cierres_caja_fecha_idx           on public.cierres_caja (fecha_cierre);

-- ---------------------------------------------------------------------
-- 2. Funciones auxiliares (internas)
-- ---------------------------------------------------------------------

-- Verifica que haya sesión y que el rol esté permitido. Devuelve el rol.
create or replace function public._exigir_rol(p_roles text[])
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_rol text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida. Volvé a iniciar sesión.' using errcode = '28000';
  end if;
  select rol into v_rol from public.perfiles where id = auth.uid();
  if v_rol is null or not (v_rol = any (p_roles)) then
    raise exception 'No tenés permisos para realizar esta operación.' using errcode = '42501';
  end if;
  return v_rol;
end;
$$;

-- Anti-duplicado: si la operación ya se ejecutó devuelve su resultado,
-- si es nueva la registra y devuelve null.
create or replace function public._iniciar_operacion(p_operacion uuid, p_tipo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if p_operacion is null then
    return null;
  end if;
  insert into public.operaciones (id, tipo, usuario_id)
  values (p_operacion, p_tipo, auth.uid())
  on conflict (id) do nothing;
  if found then
    return null;
  end if;
  select resultado into v_resultado from public.operaciones where id = p_operacion;
  return coalesce(v_resultado, '{}'::jsonb) || jsonb_build_object('duplicado', true);
end;
$$;

create or replace function public._cerrar_operacion(p_operacion uuid, p_resultado jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if p_operacion is not null then
    update public.operaciones set resultado = p_resultado where id = p_operacion;
  end if;
  return p_resultado;
end;
$$;

-- Suma (o resta, con delta negativo) al saldo de una caja de forma atómica.
create or replace function public._mover_caja(p_caja_id uuid, p_delta numeric, p_validar_fondos boolean)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_saldo numeric;
  v_nombre text;
begin
  update public.cajas
     set saldo = coalesce(saldo, 0) + p_delta
   where id = p_caja_id
  returning saldo, nombre into v_saldo, v_nombre;

  if not found then
    raise exception 'La caja seleccionada no existe.';
  end if;
  if p_validar_fondos and p_delta < 0 and v_saldo < 0 then
    raise exception 'No hay fondos suficientes en la caja %.', v_nombre;
  end if;
  return v_saldo;
end;
$$;

create or replace function public._validar_monto(p_monto numeric)
returns void
language plpgsql immutable
as $$
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'Ingrese un monto válido.';
  end if;
end;
$$;

create or replace function public._fecha_ultimo_cierre()
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select coalesce(max(fecha_cierre), '2000-01-01T00:00:00Z'::timestamptz) from public.cierres_caja;
$$;

-- Monto neto cobrado de un presupuesto (cobros menos reversiones).
create or replace function public.presupuesto_pagado(p_presupuesto_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(case
           when tipo_movimiento = 'ingreso_cobro' then monto
           when tipo_movimiento = 'egreso_gasto'  then -monto
           else 0 end), 0)
    from public.movimientos_caja
   where presupuesto_id = p_presupuesto_id;
$$;

-- Devuelve la plata de un movimiento de caja eliminado. Si el movimiento es
-- del turno actual se borra; si la caja ya se cerró se deja un ajuste.
create or replace function public._revertir_movimiento_caja(
  p_movimiento_caja_id uuid,
  p_caja_id uuid,
  p_monto numeric,
  p_es_ingreso boolean,
  p_detalle text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_fecha timestamptz;
begin
  if p_caja_id is null then
    return;
  end if;

  perform public._mover_caja(p_caja_id, case when p_es_ingreso then -p_monto else p_monto end, false);

  if p_movimiento_caja_id is not null then
    select fecha into v_fecha from public.movimientos_caja where id = p_movimiento_caja_id;
  end if;

  if v_fecha is not null and v_fecha > public._fecha_ultimo_cierre() then
    delete from public.movimientos_caja where id = p_movimiento_caja_id;
  else
    insert into public.movimientos_caja
      (tipo_movimiento, caja_origen_id, caja_destino_id, monto, metodo_pago, detalle, usuario_id)
    values
      (case when p_es_ingreso then 'ajuste_faltante' else 'ajuste_sobrante' end,
       case when p_es_ingreso then p_caja_id end,
       case when p_es_ingreso then null else p_caja_id end,
       p_monto, 'Ajuste', p_detalle, auth.uid());
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Cobros de presupuestos
-- ---------------------------------------------------------------------
create or replace function public.registrar_cobro_presupuesto(
  p_operacion uuid,
  p_presupuesto_id uuid,
  p_monto numeric,
  p_metodo text,
  p_caja_id uuid,
  p_detalle text,
  p_notas text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol text;
  v_previo jsonb;
  v_pres record;
  v_pagado numeric;
  v_restante numeric;
  v_cliente_id uuid;
  v_estado text;
  v_estado_pago text;
  v_nombre text;
begin
  v_rol := public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'cobro_presupuesto');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  select id, total_final, estado, numero_correlativo, vehiculo_patente
    into v_pres
    from public.presupuestos
   where id = p_presupuesto_id
     for update;
  if not found then
    raise exception 'El presupuesto no existe.';
  end if;

  v_pagado := public.presupuesto_pagado(p_presupuesto_id);
  v_restante := coalesce(v_pres.total_final, 0) - v_pagado;
  if p_monto > v_restante + 0.009 then
    raise exception 'El monto ($%) supera lo que resta cobrar ($%). Puede que el cobro ya se haya registrado desde otra computadora.',
      p_monto, greatest(v_restante, 0);
  end if;

  select cliente_id into v_cliente_id from public.vehiculos where patente = v_pres.vehiculo_patente;

  if p_metodo = 'Cuenta Corriente' then
    if v_cliente_id is null then
      raise exception 'El presupuesto no tiene un cliente asociado para pasarlo a cuenta corriente.';
    end if;
    update public.clientes
       set saldo = coalesce(saldo, 0) + p_monto,
           tiene_cuenta_corriente = true
     where id = v_cliente_id;
    insert into public.movimientos_clientes (cliente_id, monto, tipo, comprobante, detalle, usuario_id)
    values (v_cliente_id, p_monto, 'cargo_deuda', 'PRE-' || v_pres.numero_correlativo,
            'Deuda por Presupuesto PRE-' || v_pres.numero_correlativo, auth.uid());
  else
    if p_caja_id is null then
      raise exception 'No se encontró la caja destino para este método de pago.';
    end if;
    perform public._mover_caja(p_caja_id, p_monto, false);
  end if;

  insert into public.movimientos_caja
    (tipo_movimiento, caja_destino_id, monto, metodo_pago, presupuesto_id, cliente_id, detalle, notas, usuario_id)
  values
    ('ingreso_cobro', case when p_metodo = 'Cuenta Corriente' then null else p_caja_id end,
     p_monto, p_metodo, p_presupuesto_id, v_cliente_id, p_detalle, p_notas, auth.uid());

  v_pagado := v_pagado + p_monto;
  v_restante := coalesce(v_pres.total_final, 0) - v_pagado;

  if v_restante <= 0.009 then
    v_estado_pago := 'Cobrado';
    v_estado := case when v_pres.estado = 'Facturado' then 'Facturado' else 'Cobrado' end;
  else
    v_estado_pago := 'Parcial';
    v_estado := 'Aprobado';
  end if;

  select nombre into v_nombre from public.perfiles where id = auth.uid();
  update public.presupuestos
     set estado = v_estado,
         estado_pago = v_estado_pago,
         modificado_por_rol = v_rol,
         modificado_por_nombre = coalesce(v_nombre, modificado_por_nombre)
   where id = p_presupuesto_id;

  return public._cerrar_operacion(p_operacion, jsonb_build_object(
    'pagado', v_pagado, 'restante', greatest(v_restante, 0), 'estado', v_estado, 'estado_pago', v_estado_pago));
end;
$$;

-- Anula todos los cobros vigentes de un presupuesto (solo los del día).
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
  v_desde timestamptz;
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

  -- Cobros vigentes = los posteriores a la última anulación.
  select coalesce(max(fecha), '-infinity'::timestamptz) into v_desde
    from public.movimientos_caja
   where presupuesto_id = p_presupuesto_id and tipo_movimiento = 'egreso_gasto';

  if not exists (select 1 from public.movimientos_caja
                  where presupuesto_id = p_presupuesto_id and tipo_movimiento = 'ingreso_cobro' and fecha > v_desde) then
    raise exception 'SIN_COBROS: Este presupuesto no registra movimientos de dinero activos en la caja.';
  end if;

  if exists (select 1 from public.movimientos_caja
              where presupuesto_id = p_presupuesto_id and tipo_movimiento = 'ingreso_cobro' and fecha > v_desde
                and (fecha at time zone 'America/Argentina/Buenos_Aires')::date <> v_hoy) then
    raise exception 'COBRO_VIEJO: No podés anular el cobro de este trabajo porque se realizó en días anteriores y esa caja ya fue cerrada. Por seguridad contable, solicitá un ajuste al administrador.';
  end if;

  select cliente_id into v_cliente_id from public.vehiculos where patente = v_pres.vehiculo_patente;

  for v_mov in
    select * from public.movimientos_caja
     where presupuesto_id = p_presupuesto_id and tipo_movimiento = 'ingreso_cobro' and fecha > v_desde
     order by fecha
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

-- Lista de presupuestos para la Caja: con saldo pendiente o cobrados en el turno.
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
   where coalesce(p.total_final, 0) - coalesce(pag.pagado, 0) > 0
      or coalesce(pag.en_turno, false);
$$;

-- ---------------------------------------------------------------------
-- 4. Caja: gastos, movimientos internos y cierre
-- ---------------------------------------------------------------------
create or replace function public.registrar_gasto(
  p_operacion uuid,
  p_caja_id uuid,
  p_monto numeric,
  p_metodo text,
  p_detalle text,
  p_notas text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'gasto');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  v_saldo := public._mover_caja(p_caja_id, -p_monto, true);
  insert into public.movimientos_caja (tipo_movimiento, caja_origen_id, monto, metodo_pago, detalle, notas, usuario_id)
  values ('egreso_gasto', p_caja_id, p_monto, coalesce(p_metodo, 'Efectivo'), p_detalle, p_notas, auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

create or replace function public.transferir_entre_cajas(
  p_operacion uuid,
  p_caja_origen_id uuid,
  p_caja_destino_id uuid,
  p_monto numeric,
  p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'transferencia_interna');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);
  if p_caja_origen_id = p_caja_destino_id then
    raise exception 'La caja de origen y destino no pueden ser la misma.';
  end if;

  -- Orden fijo de bloqueo para evitar esperas cruzadas entre dos PCs
  perform 1 from public.cajas where id in (p_caja_origen_id, p_caja_destino_id) order by id for update;

  perform public._mover_caja(p_caja_origen_id, -p_monto, true);
  perform public._mover_caja(p_caja_destino_id, p_monto, false);
  insert into public.movimientos_caja
    (tipo_movimiento, caja_origen_id, caja_destino_id, monto, metodo_pago, detalle, usuario_id)
  values
    ('transferencia_interna', p_caja_origen_id, p_caja_destino_id, p_monto, 'Efectivo',
     coalesce(nullif(p_detalle, ''), 'Movimiento interno de fondos'), auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('ok', true));
end;
$$;

create or replace function public.cerrar_caja(
  p_operacion uuid,
  p_efectivo_real numeric,
  p_notas text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_desde timestamptz;
  v_caja record;
  v_diferencia numeric;
  v_transf numeric;
  v_tarj numeric;
  v_cheq numeric;
  v_cierre_id uuid;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'cierre_caja');
  if v_previo is not null then return v_previo; end if;
  if p_efectivo_real is null or p_efectivo_real < 0 then
    raise exception 'Ingrese un monto real válido.';
  end if;

  select id, coalesce(saldo, 0) as saldo into v_caja
    from public.cajas where nombre ilike '%mostrador%' order by nombre limit 1 for update;
  if not found then
    raise exception 'No se encontró la Caja Mostrador.';
  end if;

  v_desde := public._fecha_ultimo_cierre();

  select
    coalesce(sum(case when metodo_pago = 'Transferencia' then case when tipo_movimiento = 'ingreso_cobro' then monto else -monto end end), 0),
    coalesce(sum(case when metodo_pago = 'Tarjeta'       then case when tipo_movimiento = 'ingreso_cobro' then monto else -monto end end), 0),
    coalesce(sum(case when metodo_pago = 'Cheque'        then case when tipo_movimiento = 'ingreso_cobro' then monto else -monto end end), 0)
    into v_transf, v_tarj, v_cheq
    from public.movimientos_caja
   where fecha >= v_desde and tipo_movimiento in ('ingreso_cobro', 'egreso_gasto');

  v_diferencia := p_efectivo_real - v_caja.saldo;

  insert into public.cierres_caja
    (saldo_esperado_efectivo, saldo_real_efectivo, diferencia, total_tarjetas, total_transferencias, total_cheques, notas)
  values
    (v_caja.saldo, p_efectivo_real, v_diferencia, v_tarj, v_transf, v_cheq, p_notas)
  returning id into v_cierre_id;

  if v_diferencia <> 0 then
    update public.cajas set saldo = p_efectivo_real where id = v_caja.id;
    insert into public.movimientos_caja
      (tipo_movimiento, caja_origen_id, caja_destino_id, monto, metodo_pago, detalle, usuario_id)
    values
      (case when v_diferencia > 0 then 'ajuste_sobrante' else 'ajuste_faltante' end,
       case when v_diferencia < 0 then v_caja.id end,
       case when v_diferencia > 0 then v_caja.id end,
       abs(v_diferencia), 'Efectivo',
       'Ajuste automático por cierre de caja. ' || case when v_diferencia > 0 then 'Sobrante.' else 'Faltante.' end,
       auth.uid());
  end if;

  return public._cerrar_operacion(p_operacion, jsonb_build_object(
    'cierre_id', v_cierre_id,
    'desde', v_desde,
    'efectivo_esperado', v_caja.saldo,
    'efectivo_real', p_efectivo_real,
    'diferencia', v_diferencia,
    'transferencias', v_transf,
    'tarjetas', v_tarj,
    'cheques', v_cheq));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Cuentas corrientes de PROVEEDORES
-- ---------------------------------------------------------------------
create or replace function public.proveedor_registrar_factura(
  p_operacion uuid, p_proveedor_id uuid, p_monto numeric, p_comprobante text, p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'proveedor_factura');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  update public.proveedores set saldo = coalesce(saldo, 0) + p_monto where id = p_proveedor_id returning saldo into v_saldo;
  if not found then raise exception 'El proveedor no existe.'; end if;

  insert into public.movimientos_proveedores (proveedor_id, tipo, monto, comprobante, detalle, usuario_id)
  values (p_proveedor_id, 'factura_compra', p_monto, p_comprobante,
          coalesce(nullif(p_detalle, ''), 'Compra / Ingreso de mercadería'), auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

create or replace function public.proveedor_registrar_pago(
  p_operacion uuid, p_proveedor_id uuid, p_caja_id uuid, p_monto numeric, p_comprobante text, p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_prov record;
  v_caja_nombre text;
  v_metodo text;
  v_mov_caja uuid;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'proveedor_pago');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);
  if p_caja_id is null then raise exception 'Seleccione de qué caja sale el dinero.'; end if;

  select id, nombre into v_prov from public.proveedores where id = p_proveedor_id for update;
  if not found then raise exception 'El proveedor no existe.'; end if;

  select lower(nombre) into v_caja_nombre from public.cajas where id = p_caja_id;
  v_metodo := case
    when v_caja_nombre like '%efectivo%' or v_caja_nombre like '%mostrador%' then 'Efectivo'
    when v_caja_nombre like '%cheque%'  then 'Cheque'
    when v_caja_nombre like '%tarjeta%' then 'Tarjeta'
    else 'Transferencia' end;

  perform public._mover_caja(p_caja_id, -p_monto, true);

  insert into public.movimientos_caja (tipo_movimiento, caja_origen_id, monto, metodo_pago, detalle, notas, usuario_id)
  values ('egreso_gasto', p_caja_id, p_monto, v_metodo, 'Pago a Proveedor: ' || v_prov.nombre,
          'Ref: ' || coalesce(p_comprobante, ''), auth.uid())
  returning id into v_mov_caja;

  insert into public.movimientos_proveedores
    (proveedor_id, tipo, monto, caja_origen_id, comprobante, detalle, movimiento_caja_id, usuario_id)
  values
    (p_proveedor_id, 'pago_proveedor', p_monto, p_caja_id, p_comprobante,
     coalesce(nullif(p_detalle, ''), 'Pago a cuenta'), v_mov_caja, auth.uid());

  update public.proveedores set saldo = coalesce(saldo, 0) - p_monto where id = p_proveedor_id returning saldo into v_saldo;

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

-- Nota de crédito: baja la deuda con el proveedor sin mover plata de ninguna caja.
create or replace function public.proveedor_nota_credito(
  p_operacion uuid, p_proveedor_id uuid, p_monto numeric, p_comprobante text, p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'proveedor_nota_credito');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  update public.proveedores set saldo = coalesce(saldo, 0) - p_monto where id = p_proveedor_id returning saldo into v_saldo;
  if not found then raise exception 'El proveedor no existe.'; end if;

  insert into public.movimientos_proveedores (proveedor_id, tipo, monto, comprobante, detalle, usuario_id)
  values (p_proveedor_id, 'nota_credito', p_monto, nullif(p_comprobante, ''),
          coalesce(nullif(p_detalle, ''), 'Nota de crédito'), auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

create or replace function public.proveedor_eliminar_movimiento(p_movimiento_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_mov record;
  v_prov_nombre text;
  v_mov_caja uuid;
  v_delta numeric;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);

  select * into v_mov from public.movimientos_proveedores where id = p_movimiento_id for update;
  if not found then
    raise exception 'El movimiento ya no existe (puede que lo hayan eliminado desde otra computadora).';
  end if;
  select nombre into v_prov_nombre from public.proveedores where id = v_mov.proveedor_id for update;

  v_delta := case v_mov.tipo when 'factura_compra' then -v_mov.monto else v_mov.monto end;
  update public.proveedores set saldo = coalesce(saldo, 0) + v_delta where id = v_mov.proveedor_id returning saldo into v_saldo;

  if v_mov.tipo = 'pago_proveedor' and v_mov.caja_origen_id is not null then
    v_mov_caja := v_mov.movimiento_caja_id;
    if v_mov_caja is null then
      -- Pagos viejos (sin vínculo): buscamos el egreso de caja que le corresponde
      select id into v_mov_caja
        from public.movimientos_caja
       where tipo_movimiento = 'egreso_gasto'
         and caja_origen_id = v_mov.caja_origen_id
         and monto = v_mov.monto
         and detalle = 'Pago a Proveedor: ' || v_prov_nombre
         and abs(extract(epoch from (fecha - v_mov.fecha))) < 120
       order by abs(extract(epoch from (fecha - v_mov.fecha)))
       limit 1;
    end if;
    perform public._revertir_movimiento_caja(v_mov_caja, v_mov.caja_origen_id, v_mov.monto, false,
      'REVERSIÓN: Pago a Proveedor ' || coalesce(v_prov_nombre, '') || ' eliminado');
  end if;

  delete from public.movimientos_proveedores where id = p_movimiento_id;
  return jsonb_build_object('saldo', v_saldo);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Cuentas corrientes de CLIENTES
-- ---------------------------------------------------------------------
create or replace function public.cliente_registrar_cargo(
  p_operacion uuid, p_cliente_id uuid, p_monto numeric, p_comprobante text, p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'cliente_cargo');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  update public.clientes set saldo = coalesce(saldo, 0) + p_monto where id = p_cliente_id returning saldo into v_saldo;
  if not found then raise exception 'El cliente no existe.'; end if;

  insert into public.movimientos_clientes (cliente_id, tipo, monto, comprobante, detalle, usuario_id)
  values (p_cliente_id, 'cargo_deuda', p_monto, p_comprobante,
          coalesce(nullif(p_detalle, ''), 'Cargo / Trabajo realizado'), auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

create or replace function public.cliente_registrar_pago(
  p_operacion uuid, p_cliente_id uuid, p_caja_id uuid, p_metodo text, p_monto numeric,
  p_comprobante text, p_detalle text, p_detalle_caja text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_mov_caja uuid;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'cliente_pago');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);
  if p_caja_id is null then
    raise exception 'No se encontró una caja específica para %. Verificá los nombres de tus cajas.', p_metodo;
  end if;

  perform 1 from public.clientes where id = p_cliente_id for update;
  if not found then raise exception 'El cliente no existe.'; end if;

  perform public._mover_caja(p_caja_id, p_monto, false);

  insert into public.movimientos_caja (tipo_movimiento, caja_destino_id, monto, metodo_pago, cliente_id, detalle, notas, usuario_id)
  values ('ingreso_cobro', p_caja_id, p_monto, p_metodo, p_cliente_id, p_detalle_caja,
          'Ref: ' || coalesce(nullif(p_comprobante, ''), 'S/N'), auth.uid())
  returning id into v_mov_caja;

  insert into public.movimientos_clientes
    (cliente_id, tipo, monto, caja_destino_id, comprobante, detalle, movimiento_caja_id, usuario_id)
  values
    (p_cliente_id, 'pago_ingreso', p_monto, p_caja_id, p_comprobante,
     coalesce(nullif(p_detalle, ''), 'Pago recibido en ' || p_metodo), v_mov_caja, auth.uid());

  update public.clientes set saldo = coalesce(saldo, 0) - p_monto where id = p_cliente_id returning saldo into v_saldo;

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

-- Nota de crédito: baja la deuda del cliente sin mover plata de ninguna caja.
create or replace function public.cliente_nota_credito(
  p_operacion uuid, p_cliente_id uuid, p_monto numeric, p_comprobante text, p_detalle text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_previo jsonb;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'cliente_nota_credito');
  if v_previo is not null then return v_previo; end if;
  perform public._validar_monto(p_monto);

  update public.clientes set saldo = coalesce(saldo, 0) - p_monto where id = p_cliente_id returning saldo into v_saldo;
  if not found then raise exception 'El cliente no existe.'; end if;

  insert into public.movimientos_clientes (cliente_id, tipo, monto, comprobante, detalle, usuario_id)
  values (p_cliente_id, 'nota_credito', p_monto, nullif(p_comprobante, ''),
          coalesce(nullif(p_detalle, ''), 'Nota de crédito'), auth.uid());

  return public._cerrar_operacion(p_operacion, jsonb_build_object('saldo', v_saldo));
end;
$$;

create or replace function public.cliente_eliminar_movimiento(p_movimiento_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_mov record;
  v_mov_caja uuid;
  v_delta numeric;
  v_saldo numeric;
begin
  perform public._exigir_rol(array['admin', 'cajero']);

  select * into v_mov from public.movimientos_clientes where id = p_movimiento_id for update;
  if not found then
    raise exception 'El movimiento ya no existe (puede que lo hayan eliminado desde otra computadora).';
  end if;
  perform 1 from public.clientes where id = v_mov.cliente_id for update;

  -- Saldo de cliente: positivo = nos debe.
  -- Los registros viejos de anulación ('pago_abono') se guardaban con monto negativo.
  v_delta := case
    when v_mov.tipo = 'cargo_deuda' then -v_mov.monto
    when v_mov.tipo = 'pago_abono'  then abs(v_mov.monto)
    else v_mov.monto end;
  update public.clientes set saldo = coalesce(saldo, 0) + v_delta where id = v_mov.cliente_id returning saldo into v_saldo;

  if v_mov.tipo = 'pago_ingreso' and v_mov.caja_destino_id is not null then
    v_mov_caja := v_mov.movimiento_caja_id;
    if v_mov_caja is null then
      select id into v_mov_caja
        from public.movimientos_caja
       where tipo_movimiento = 'ingreso_cobro'
         and caja_destino_id = v_mov.caja_destino_id
         and monto = v_mov.monto
         and detalle like 'Cobro a Cuenta Corriente:%'
         and abs(extract(epoch from (fecha - v_mov.fecha))) < 120
       order by abs(extract(epoch from (fecha - v_mov.fecha)))
       limit 1;
    end if;
    perform public._revertir_movimiento_caja(v_mov_caja, v_mov.caja_destino_id, v_mov.monto, true,
      'REVERSIÓN: Cobro de cuenta corriente eliminado');
  end if;

  delete from public.movimientos_clientes where id = p_movimiento_id;
  return jsonb_build_object('saldo', v_saldo);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Stock e ingreso al taller
-- ---------------------------------------------------------------------

-- Suma o resta stock de forma atómica (solo si el artículo controla stock).
create or replace function public.ajustar_stock(p_catalogo_id uuid, p_delta numeric)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_stock integer;
begin
  perform public._exigir_rol(array['admin', 'cajero', 'mecanico']);
  update public.catalogo
     set stock_actual = coalesce(stock_actual, 0) + round(p_delta)::integer
   where id = p_catalogo_id and controlar_stock is distinct from false
  returning stock_actual into v_stock;
  return v_stock;
end;
$$;

-- Ingreso de un presupuesto al taller: descuenta stock, genera pedidos,
-- marca el presupuesto y crea la tarjeta del tablero. Todo junto o nada.
-- p_items: [{ "catalogo_id": uuid, "cantidad": n, "tipo": text, "detalle": text }]
create or replace function public.ingresar_presupuesto_taller(
  p_operacion uuid,
  p_presupuesto_id uuid,
  p_estado_final text,
  p_vehiculo_patente text,
  p_cliente_nombre text,
  p_items jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol text;
  v_previo jsonb;
  v_item jsonb;
  v_controla boolean;
  v_orden_id uuid;
  v_nombre text;
begin
  v_rol := public._exigir_rol(array['admin', 'cajero']);
  v_previo := public._iniciar_operacion(p_operacion, 'ingreso_taller');
  if v_previo is not null then return v_previo; end if;

  perform 1 from public.presupuestos where id = p_presupuesto_id for update;
  if not found then raise exception 'El presupuesto no existe.'; end if;

  if exists (select 1 from public.ordenes_trabajo
              where presupuesto_id = p_presupuesto_id and coalesce(es_garantia, false) = false) then
    update public.presupuestos set ingresado_al_taller = true where id = p_presupuesto_id;
    raise exception 'YA_INGRESADO: Este presupuesto ya fue ingresado al Taller. No se puede duplicar.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    continue when coalesce(v_item->>'catalogo_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    select controlar_stock is distinct from false into v_controla
      from public.catalogo where id = (v_item->>'catalogo_id')::uuid;
    if coalesce(v_controla, false) then
      update public.catalogo
         set stock_actual = coalesce(stock_actual, 0) - round((v_item->>'cantidad')::numeric)::integer
       where id = (v_item->>'catalogo_id')::uuid;
      if v_item->>'tipo' in ('Neumático', 'Repuesto') then
        insert into public.pedidos_proveedor (catalogo_id, detalle, cantidad, estado)
        values ((v_item->>'catalogo_id')::uuid, v_item->>'detalle',
                round((v_item->>'cantidad')::numeric)::integer, 'Pedir');
      end if;
    end if;
  end loop;

  select nombre into v_nombre from public.perfiles where id = auth.uid();
  update public.presupuestos
     set estado = p_estado_final,
         ingresado_al_taller = true,
         modificado_por_rol = v_rol,
         modificado_por_nombre = coalesce(v_nombre, modificado_por_nombre)
   where id = p_presupuesto_id;

  insert into public.ordenes_trabajo (presupuesto_id, vehiculo_patente, cliente_nombre, estado)
  values (p_presupuesto_id, p_vehiculo_patente, coalesce(nullif(p_cliente_nombre, ''), 'Cliente'), 'A Ingresar')
  returning id into v_orden_id;

  return public._cerrar_operacion(p_operacion, jsonb_build_object('orden_id', v_orden_id));
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Permisos: las funciones solo las usan usuarios logueados
-- ---------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public._exigir_rol(text[])',
    'public._iniciar_operacion(uuid, text)',
    'public._cerrar_operacion(uuid, jsonb)',
    'public._mover_caja(uuid, numeric, boolean)',
    'public._validar_monto(numeric)',
    'public._fecha_ultimo_cierre()',
    'public._revertir_movimiento_caja(uuid, uuid, numeric, boolean, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;

  foreach f in array array[
    'public.presupuesto_pagado(uuid)',
    'public.registrar_cobro_presupuesto(uuid, uuid, numeric, text, uuid, text, text)',
    'public.anular_cobros_presupuesto(uuid, uuid)',
    'public.caja_presupuestos(timestamptz)',
    'public.registrar_gasto(uuid, uuid, numeric, text, text, text)',
    'public.transferir_entre_cajas(uuid, uuid, uuid, numeric, text)',
    'public.cerrar_caja(uuid, numeric, text)',
    'public.proveedor_registrar_factura(uuid, uuid, numeric, text, text)',
    'public.proveedor_registrar_pago(uuid, uuid, uuid, numeric, text, text)',
    'public.proveedor_nota_credito(uuid, uuid, numeric, text, text)',
    'public.proveedor_eliminar_movimiento(uuid)',
    'public.cliente_registrar_cargo(uuid, uuid, numeric, text, text)',
    'public.cliente_registrar_pago(uuid, uuid, uuid, text, numeric, text, text, text)',
    'public.cliente_nota_credito(uuid, uuid, numeric, text, text)',
    'public.cliente_eliminar_movimiento(uuid)',
    'public.ajustar_stock(uuid, numeric)',
    'public.ingresar_presupuesto_taller(uuid, uuid, text, text, text, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
