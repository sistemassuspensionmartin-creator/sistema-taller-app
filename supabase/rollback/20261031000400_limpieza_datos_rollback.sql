-- Deshace la ETAPA 0 (limpieza y conciliación de datos).
begin;

-- 3. Quitar los ajustes de conciliación
delete from public.movimientos_caja where detalle = 'Conciliación inicial del sistema';

-- 2. Volver los ajuste_faltante a como estaban
update public.movimientos_caja m
   set caja_destino_id = (r.fila->>'caja_destino_id')::uuid,
       caja_origen_id  = null
  from public._respaldo_etapa0 r
 where r.motivo = 'ajuste_faltante_invertido'
   and m.id = (r.fila->>'id')::uuid;

-- 1. Restaurar los cobros duplicados de PRE-9559
insert into public.movimientos_caja
select (jsonb_populate_record(null::public.movimientos_caja, r.fila)).*
  from public._respaldo_etapa0 r
 where r.motivo = 'duplicado_pre_9559'
   and not exists (select 1 from public.movimientos_caja m where m.id = (r.fila->>'id')::uuid);

delete from public._respaldo_etapa0;
commit;
