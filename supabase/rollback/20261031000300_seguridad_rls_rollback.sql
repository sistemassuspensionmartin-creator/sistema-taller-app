-- Deshace el script de seguridad 000300 SIN volver a abrir la base al público.
-- Quita solo la protección de roles en perfiles. RLS sigue activo y las tablas
-- siguen cerradas para quien no inició sesión.
-- (La versión anterior de este archivo volvía a abrir cajas, movimientos y
-- perfiles a cualquiera con la clave pública: no se debe volver a ese estado.)
-- Si se corrió el 000500, deshacer primero ese con su propio rollback.

drop trigger if exists trg_proteger_perfiles on public.perfiles;
drop function if exists public._proteger_perfiles();
