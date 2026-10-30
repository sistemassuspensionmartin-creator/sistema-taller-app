-- Deshace el script 000600 (facturación ARCA). Conserva las columnas nuevas
-- y los comprobantes ya emitidos: una factura autorizada por ARCA no se borra.
-- DESPUÉS de correr este archivo, volver a correr
-- migrations/20261031000500_permisos_por_rol.sql para restaurar la versión
-- anterior de anular_cobros_presupuesto.

drop function if exists public.facturacion_resumen(uuid);
drop function if exists public.factura_reservar(uuid, uuid, numeric, uuid, jsonb);
drop function if exists public.nota_credito_reservar(uuid, uuid, numeric, uuid, jsonb);
drop function if exists public.factura_marcar_enviando(uuid, integer);
drop function if exists public.factura_volver_pendiente(uuid);
drop function if exists public.factura_confirmar(uuid, integer, text, date, text, jsonb, text);
drop function if exists public.factura_rechazar(uuid, text, jsonb);
drop function if exists public._actualizar_estado_facturacion(uuid);
drop table if exists public.arca_tokens;
-- _facturado_neto y _ambiente_arca las usa anular_cobros_presupuesto hasta que
-- se vuelva a correr el 000500; después se pueden borrar:
--   drop function if exists public._facturado_neto(uuid, text);
--   drop function if exists public._ambiente_arca();

-- La pantalla vieja de Caja volvía a guardar la factura desde el navegador
grant insert, update on public.facturas to authenticated;
create policy oficina_crea on public.facturas for insert to authenticated
  with check (public.rol_actual() in ('admin', 'cajero'));
create policy oficina_modifica on public.facturas for update to authenticated
  using (public.rol_actual() in ('admin', 'cajero'))
  with check (public.rol_actual() in ('admin', 'cajero'));
