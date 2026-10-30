# Base de datos — cómo aplicar los cambios

Todos los scripts se corren en **Supabase → SQL Editor**, copiando y pegando el archivo
completo. Hacerlo **después de las 19 h o el fin de semana**, con nadie usando el sistema.

## Orden de publicación

| Paso | Qué hacer | Archivo |
|------|-----------|---------|
| 1 | Funciones de dinero y stock | `migrations/20261031000100_funciones_dinero.sql` |
| 2 | Notificaciones guardadas | `migrations/20261031000200_notificaciones.sql` |
| 3 | Seguridad (RLS) | `migrations/20261031000300_seguridad_rls.sql` |
| 4 | Pruebas automáticas (no guardan nada) | `pruebas/pruebas_funciones.sql` |
| 5 | Publicar la versión nueva (merge a `main` → Vercel) | — |
| 6 | Limpieza y conciliación de datos | `migrations/20261031000400_limpieza_datos.sql` |

- Los pasos 1 a 3 solo **agregan** cosas: la versión actual del sistema sigue funcionando
  igual hasta que se publica la nueva. Se pueden correr más de una vez sin problema.
- El paso 4 **siempre termina en error a propósito** (así no queda nada guardado).
  Tiene que decir `PRUEBAS OK: todas las pruebas pasaron`. Si dice `FALLO: ...`, frenar y avisar.
- El paso 6 se corre **una sola vez**, con la versión nueva ya publicada. Al final muestra
  una tabla: las columnas `saldo_guardado` y `saldo_segun_movimientos` tienen que ser iguales.

## Etapa 2: permisos por rol (resultado del security-audit)

| Paso | Qué hacer | Archivo |
|------|-----------|---------|
| 7 | Permisos por rol en cada tabla | `migrations/20261031000500_permisos_por_rol.sql` |
| 8 | Pruebas de permisos (no guardan nada) | `pruebas/pruebas_permisos.sql` |
| 9 | Volver a correr las pruebas de dinero | `pruebas/pruebas_funciones.sql` |
| 10 | Publicar la versión nueva (merge a `main` → Vercel) | — |

- El paso 7 se puede correr más de una vez.
- Los pasos 8 y 9 tienen que terminar en `PRUEBAS OK`. Si dicen `FALLO: ...`, correr el
  rollback del 000500 y avisar.
- Hacer los pasos 7 a 10 seguidos: hasta publicar, "eliminar proveedor" de la versión
  vieja da error (ya no puede borrar movimientos directo).

## Deshacer

Cada script tiene su versión para deshacer en `rollback/`, con el mismo nombre. Se corren
en orden inverso (primero el 000400, después 000300, etc.).
