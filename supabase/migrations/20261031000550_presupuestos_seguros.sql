-- =====================================================================
-- PRESUPUESTOS: que no se pierdan ni se repitan
-- ---------------------------------------------------------------------
--   1. Números PRE en orden: los nuevos siguen desde el número más alto que
--      existe hoy y no se pueden repetir (antes se elegían al azar entre
--      1000 y 9999 y se repetían). Los viejos conservan su número.
--   2. "Asociar presupuesto" ya no borra el presupuesto viejo: queda en
--      estado "Asociado" y vinculado al nuevo (columna asociado_a).
--   3. Eliminar un presupuesto pasa por la función presupuesto_eliminar:
--        - no deja eliminar uno con cobros, facturas o ingreso al taller;
--        - guarda una copia completa (con sus ítems) en la papelera
--          presupuestos_eliminados, de donde se puede restaurar.
-- Script re-ejecutable.
-- Para deshacer: rollback/20261031000550_presupuestos_seguros_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Numeración
-- ---------------------------------------------------------------------
do $$
declare
  v_seq text := pg_get_serial_sequence('public.presupuestos', 'numero_correlativo');
  v_max bigint;
begin
  if v_seq is null then
    select substring(pg_get_expr(d.adbin, d.adrelid) from 'nextval\(''([^'']+)''') into v_seq
      from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
     where d.adrelid = 'public.presupuestos'::regclass and a.attname = 'numero_correlativo';
  end if;
  if v_seq is null then
    raise exception 'No se encontró la secuencia de numero_correlativo.';
  end if;

  select coalesce(max(numero_correlativo), 0) into v_max from public.presupuestos;
  -- Solo avanza: si la secuencia ya está más adelante, no la mueve para atrás
  perform setval(v_seq, greatest(v_max, (select coalesce(last_value, 0) from pg_sequences
                                           where format('%I.%I', schemaname, sequencename) = v_seq
                                              or sequencename = v_seq limit 1), 1));
  execute format('grant usage, select on sequence %s to authenticated', v_seq);

  -- Desde ahora ningún número nuevo se repite (los viejos repetidos se conservan)
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'presupuestos_numero_nuevo_unico') then
    execute format('create unique index presupuestos_numero_nuevo_unico on public.presupuestos (numero_correlativo) where numero_correlativo > %s', v_max);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Asociar sin borrar
-- ---------------------------------------------------------------------
alter table public.presupuestos add column if not exists asociado_a uuid references public.presupuestos(id);
create index if not exists presupuestos_asociado_idx on public.presupuestos (asociado_a);

-- ---------------------------------------------------------------------
-- 3. Papelera y eliminación segura
-- ---------------------------------------------------------------------
create table if not exists public.presupuestos_eliminados (
  id uuid primary key,
  numero_correlativo integer,
  vehiculo_patente text,
  total_final numeric,
  datos jsonb not null,
  items jsonb not null default '[]'::jsonb,
  eliminado_por uuid,
  eliminado_por_nombre text,
  eliminado_at timestamptz not null default now()
);
alter table public.presupuestos_eliminados enable row level security;
revoke all on public.presupuestos_eliminados from anon, authenticated;
grant select on public.presupuestos_eliminados to authenticated;
drop policy if exists oficina_lee on public.presupuestos_eliminados;
create policy oficina_lee on public.presupuestos_eliminados for select to authenticated
  using (public.rol_actual() in ('admin', 'cajero'));

create or replace function public.presupuesto_eliminar(p_presupuesto_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_pres public.presupuestos;
  v_nombre text;
begin
  perform public._exigir_rol(array['admin', 'cajero', 'mecanico']);

  select * into v_pres from public.presupuestos where id = p_presupuesto_id for update;
  if not found then
    raise exception 'El presupuesto no existe.';
  end if;

  if exists (select 1 from public.movimientos_caja where presupuesto_id = p_presupuesto_id) then
    raise exception 'TIENE_COBROS: El presupuesto PRE-% tiene cobros registrados en la caja: no se puede eliminar.', v_pres.numero_correlativo;
  end if;
  if exists (select 1 from public.facturas where presupuesto_id = p_presupuesto_id) then
    raise exception 'TIENE_FACTURAS: El presupuesto PRE-% tiene facturas: no se puede eliminar.', v_pres.numero_correlativo;
  end if;
  if exists (select 1 from public.ordenes_trabajo where presupuesto_id = p_presupuesto_id) then
    raise exception 'EN_TALLER: El presupuesto PRE-% ingresó al taller: no se puede eliminar.', v_pres.numero_correlativo;
  end if;

  select nombre into v_nombre from public.perfiles where id = auth.uid();

  insert into public.presupuestos_eliminados
    (id, numero_correlativo, vehiculo_patente, total_final, datos, items, eliminado_por, eliminado_por_nombre)
  values (
    v_pres.id, v_pres.numero_correlativo, v_pres.vehiculo_patente, v_pres.total_final, to_jsonb(v_pres),
    coalesce((select jsonb_agg(to_jsonb(i)) from public.presupuesto_items i where i.presupuesto_id = p_presupuesto_id), '[]'::jsonb),
    auth.uid(), v_nombre)
  on conflict (id) do update set datos = excluded.datos, items = excluded.items, eliminado_at = now();

  -- Lo que lo referenciaba queda sin vínculo (el turno o el asociado siguen existiendo)
  update public.turnos set presupuesto_id = null where presupuesto_id = p_presupuesto_id;
  update public.presupuestos set asociado_a = null where asociado_a = p_presupuesto_id;

  delete from public.presupuesto_items where presupuesto_id = p_presupuesto_id;
  delete from public.presupuestos where id = p_presupuesto_id;
  return jsonb_build_object('eliminado', true, 'numero', v_pres.numero_correlativo);
end;
$$;

-- Restaurar desde la papelera (solo admin). Ejemplo en el SQL Editor:
--   select public.presupuesto_restaurar('<id>');
-- (el id se ve en: select id, numero_correlativo, vehiculo_patente, eliminado_at from presupuestos_eliminados order by eliminado_at desc;)
create or replace function public.presupuesto_restaurar(p_presupuesto_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_pap public.presupuestos_eliminados;
begin
  if auth.uid() is not null then
    perform public._exigir_rol(array['admin']);
  end if;

  select * into v_pap from public.presupuestos_eliminados where id = p_presupuesto_id;
  if not found then
    raise exception 'No está en la papelera.';
  end if;
  if exists (select 1 from public.presupuestos where id = p_presupuesto_id) then
    raise exception 'Ese presupuesto ya existe.';
  end if;

  insert into public.presupuestos select * from jsonb_populate_record(null::public.presupuestos, v_pap.datos);
  insert into public.presupuesto_items
    select * from jsonb_populate_recordset(null::public.presupuesto_items, v_pap.items);
  delete from public.presupuestos_eliminados where id = p_presupuesto_id;
  return jsonb_build_object('restaurado', true, 'numero', v_pap.numero_correlativo);
end;
$$;

revoke all on function public.presupuesto_eliminar(uuid) from public, anon;
grant execute on function public.presupuesto_eliminar(uuid) to authenticated;
revoke all on function public.presupuesto_restaurar(uuid) from public, anon;
grant execute on function public.presupuesto_restaurar(uuid) to authenticated;

-- Desde ahora los presupuestos solo se eliminan con presupuesto_eliminar (pasan por la papelera)
revoke delete on public.presupuestos from authenticated;
