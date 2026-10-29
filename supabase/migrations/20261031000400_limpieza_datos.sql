-- =====================================================================
-- ETAPA 0: Limpieza y conciliación de datos
-- ---------------------------------------------------------------------
-- CORRER DESPUÉS de publicar la versión nueva del sistema.
--   1. Elimina los 3 cobros duplicados de PRE-9559 (se cobró una sola vez).
--   2. Corrige los "ajuste_faltante" viejos, que se guardaban como si la
--      plata hubiera entrado a la caja (ahora se registran como salida).
--   3. Registra un ajuste por caja para que la suma de movimientos sea
--      igual al saldo que muestra hoy el sistema (el saldo NO se toca).
-- Todo lo modificado queda respaldado en _respaldo_etapa0.
-- Para deshacer: rollback/20261031000400_limpieza_datos_rollback.sql
-- =====================================================================

begin;

create table if not exists public._respaldo_etapa0 (
  motivo text not null,
  respaldado_at timestamptz not null default now(),
  fila jsonb not null
);
alter table public._respaldo_etapa0 enable row level security;

-- 1. Cobros duplicados de PRE-9559 -------------------------------------
with dup as (
  select m.*
    from public.movimientos_caja m
    join public.presupuestos p on p.id = m.presupuesto_id
   where p.numero_correlativo = 9559
     and m.tipo_movimiento = 'ingreso_cobro'
     and m.monto = 1130000
     and m.id in ('47707707-3451-4841-b22e-d0ff8ed7fb35',
                  '38a8702a-24c8-4f3b-bcc3-987333b34a6c',
                  '91197924-0399-435f-9e62-e7a34e2e953c')
     and not exists (select 1 from public._respaldo_etapa0 r
                      where r.motivo = 'duplicado_pre_9559' and (r.fila->>'id')::uuid = m.id)
)
insert into public._respaldo_etapa0 (motivo, fila)
select 'duplicado_pre_9559', to_jsonb(dup) from dup;

delete from public.movimientos_caja
 where id in (select (fila->>'id')::uuid from public._respaldo_etapa0 where motivo = 'duplicado_pre_9559');

-- 2. Ajustes por faltante guardados al revés ----------------------------
insert into public._respaldo_etapa0 (motivo, fila)
select 'ajuste_faltante_invertido', to_jsonb(m)
  from public.movimientos_caja m
 where m.tipo_movimiento = 'ajuste_faltante'
   and m.caja_destino_id is not null
   and m.caja_origen_id is null;

update public.movimientos_caja
   set caja_origen_id = caja_destino_id,
       caja_destino_id = null
 where tipo_movimiento = 'ajuste_faltante'
   and caja_destino_id is not null
   and caja_origen_id is null;

-- 3. Conciliación: movimientos = saldo guardado -------------------------
with mov as (
  select caja_destino_id as caja_id, monto from public.movimientos_caja where caja_destino_id is not null
  union all
  select caja_origen_id, -monto from public.movimientos_caja where caja_origen_id is not null
), libro as (
  select caja_id, sum(monto) as total from mov group by caja_id
), dif as (
  select c.id, coalesce(c.saldo, 0) - coalesce(l.total, 0) as diferencia
    from public.cajas c left join libro l on l.caja_id = c.id
)
insert into public.movimientos_caja (tipo_movimiento, caja_origen_id, caja_destino_id, monto, metodo_pago, detalle, notas)
select case when diferencia > 0 then 'ajuste_sobrante' else 'ajuste_faltante' end,
       case when diferencia < 0 then id end,
       case when diferencia > 0 then id end,
       abs(diferencia),
       'Ajuste',
       'Conciliación inicial del sistema',
       'Ajuste único para igualar la cinta de movimientos con el saldo de la caja (migración 2026-10-31).'
  from dif
 where abs(diferencia) >= 0.01;

commit;

-- Verificación: las dos columnas tienen que ser iguales en todas las cajas
with mov as (
  select caja_destino_id as caja_id, monto from public.movimientos_caja where caja_destino_id is not null
  union all
  select caja_origen_id, -monto from public.movimientos_caja where caja_origen_id is not null
)
select c.nombre, c.saldo as saldo_guardado, coalesce(sum(mov.monto), 0) as saldo_segun_movimientos
  from public.cajas c left join mov on mov.caja_id = c.id
 group by c.id, c.nombre, c.saldo
 order by c.nombre;
