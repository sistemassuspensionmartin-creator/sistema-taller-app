-- Deshace el script 000550. Conserva la papelera (presupuestos_eliminados) para no
-- perder información; solo vuelve a permitir el borrado directo y quita las
-- funciones y el índice de números únicos.
grant delete on public.presupuestos to authenticated;
drop function if exists public.presupuesto_eliminar(uuid);
drop function if exists public.presupuesto_restaurar(uuid);
drop index if exists public.presupuestos_numero_nuevo_unico;
