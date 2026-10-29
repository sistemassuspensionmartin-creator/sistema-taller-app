-- =====================================================================
-- ETAPA 2: Notificaciones guardadas en la base de datos
-- ---------------------------------------------------------------------
-- Las notificaciones quedan pendientes hasta que alguien del sector las
-- abre o las marca como vistas (desaparecen para todo el sector).
-- Cada notificación guarda quién la generó: esa persona no la recibe
-- ni escucha el sonido.
-- destino: 'oficina' (admin y cajero) o 'taller' (mecánico).
-- Script re-ejecutable.
-- Para deshacer: rollback/20261031000200_notificaciones_rollback.sql
-- =====================================================================

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  destino text not null check (destino in ('oficina', 'taller')),
  titulo text not null,
  mensaje text,
  referencia_id uuid,
  orden_id uuid,
  patente text,
  creado_por uuid default auth.uid(),
  creado_por_rol text,
  created_at timestamptz not null default now(),
  vista_at timestamptz,
  vista_por uuid
);

create index if not exists notificaciones_pendientes_idx
  on public.notificaciones (destino, created_at desc) where vista_at is null;
create index if not exists notificaciones_orden_idx on public.notificaciones (orden_id);

alter table public.notificaciones enable row level security;

drop policy if exists "Notificaciones lectura autenticados" on public.notificaciones;
create policy "Notificaciones lectura autenticados" on public.notificaciones
  for select to authenticated using (true);

drop policy if exists "Notificaciones alta propia" on public.notificaciones;
create policy "Notificaciones alta propia" on public.notificaciones
  for insert to authenticated with check (creado_por = auth.uid());

drop policy if exists "Notificaciones marcar vista" on public.notificaciones;
create policy "Notificaciones marcar vista" on public.notificaciones
  for update to authenticated using (true) with check (true);

-- Solo se pueden modificar las columnas de "vista"
revoke update on public.notificaciones from authenticated;
grant update (vista_at, vista_por) on public.notificaciones to authenticated;
revoke all on public.notificaciones from anon;

-- Tiempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones') then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Disparadores del tablero del taller
-- ---------------------------------------------------------------------
create or replace function public._notificar_orden_trabajo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_rol text := public.get_auth_role();
begin
  if tg_op = 'DELETE' then
    -- Anularon el ingreso: los avisos de esa tarjeta ya no sirven
    update public.notificaciones set vista_at = now()
     where orden_id = old.id and vista_at is null;
    return null;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(v_rol, '') <> 'mecanico' then
      insert into public.notificaciones
        (tipo, destino, titulo, mensaje, referencia_id, orden_id, patente, creado_por, creado_por_rol)
      values
        ('auto_ingresado', 'taller',
         case when coalesce(new.es_garantia, false) then 'Reingreso por Garantía' else 'Nuevo Auto en Taller' end,
         format('Administración ingresó el vehículo %s (%s).', new.vehiculo_patente, new.cliente_nombre),
         new.presupuesto_id, new.id, new.vehiculo_patente, auth.uid(), v_rol);
    end if;
    return null;
  end if;

  -- UPDATE de estado
  if new.estado is distinct from old.estado then
    if new.estado = 'Terminado' then
      insert into public.notificaciones
        (tipo, destino, titulo, mensaje, referencia_id, orden_id, patente, creado_por, creado_por_rol)
      values
        ('auto_terminado', 'oficina', 'Vehículo Terminado',
         format('El vehículo %s (%s) ya fue marcado como listo en el taller.', new.vehiculo_patente, new.cliente_nombre),
         new.presupuesto_id, new.id, new.vehiculo_patente, auth.uid(), v_rol);
    end if;

    if new.estado in ('En Proceso', 'Terminado', 'Entregado') then
      -- El mecánico ya tomó el auto: se cierra el aviso de "nuevo auto"
      update public.notificaciones set vista_at = now()
       where orden_id = new.id and tipo = 'auto_ingresado' and vista_at is null;
    end if;

    if new.estado = 'Entregado' then
      update public.notificaciones set vista_at = now()
       where orden_id = new.id and tipo = 'auto_terminado' and vista_at is null;
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public._notificar_orden_trabajo() from public, anon, authenticated;

drop trigger if exists trg_notificar_orden_trabajo on public.ordenes_trabajo;
create trigger trg_notificar_orden_trabajo
  after insert or delete or update of estado on public.ordenes_trabajo
  for each row execute function public._notificar_orden_trabajo();
