-- Deshace las funciones de dinero y stock.
-- Las columnas nuevas (revierte_id, movimiento_caja_id, usuario_id) y la
-- tabla operaciones NO se borran para no perder datos: no molestan al
-- sistema anterior. Si se quieren quitar, descomentar el bloque final.

drop function if exists public.ingresar_presupuesto_taller(uuid, uuid, text, text, text, jsonb);
drop function if exists public.ajustar_stock(uuid, numeric);
drop function if exists public.cliente_eliminar_movimiento(uuid);
drop function if exists public.cliente_nota_credito(uuid, uuid, numeric, text, text);
drop function if exists public.cliente_registrar_pago(uuid, uuid, uuid, text, numeric, text, text, text);
drop function if exists public.cliente_registrar_cargo(uuid, uuid, numeric, text, text);
drop function if exists public.proveedor_eliminar_movimiento(uuid);
drop function if exists public.proveedor_nota_credito(uuid, uuid, numeric, text, text);
drop function if exists public.proveedor_registrar_pago(uuid, uuid, uuid, numeric, text, text);
drop function if exists public.proveedor_registrar_factura(uuid, uuid, numeric, text, text);
drop function if exists public.cerrar_caja(uuid, numeric, text);
drop function if exists public.transferir_entre_cajas(uuid, uuid, uuid, numeric, text);
drop function if exists public.registrar_gasto(uuid, uuid, numeric, text, text, text);
drop function if exists public.caja_presupuestos(timestamptz);
drop function if exists public.anular_cobros_presupuesto(uuid, uuid);
drop function if exists public.registrar_cobro_presupuesto(uuid, uuid, numeric, text, uuid, text, text);
drop function if exists public._revertir_movimiento_caja(uuid, uuid, numeric, boolean, text);
drop function if exists public.presupuesto_pagado(uuid);
drop function if exists public._fecha_ultimo_cierre();
drop function if exists public._validar_monto(numeric);
drop function if exists public._mover_caja(uuid, numeric, boolean);
drop function if exists public._cerrar_operacion(uuid, jsonb);
drop function if exists public._iniciar_operacion(uuid, text);
drop function if exists public._exigir_rol(text[]);

-- alter table public.movimientos_caja        drop column if exists revierte_id;
-- alter table public.movimientos_proveedores drop column if exists movimiento_caja_id;
-- alter table public.movimientos_proveedores drop column if exists usuario_id;
-- alter table public.movimientos_clientes    drop column if exists movimiento_caja_id;
-- alter table public.movimientos_clientes    drop column if exists usuario_id;
-- drop table if exists public.operaciones;
