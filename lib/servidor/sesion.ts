// Solo para rutas del servidor (app/api). Usa la clave de servicio: nunca importar desde componentes.
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Exige un token de sesión válido de un usuario con alguno de los roles indicados.
export async function verificarRol(request: Request, roles: string[]) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "No autorizado: se requiere una sesión activa." }, { status: 401 }) }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.split(" ")[1])
  if (error || !user) {
    return { error: NextResponse.json({ error: "Sesión inválida o expirada. Volvé a iniciar sesión." }, { status: 401 }) }
  }

  const { data: perfil } = await supabaseAdmin.from("perfiles").select("rol").eq("id", user.id).single()
  if (!perfil || !roles.includes(perfil.rol)) {
    return { error: NextResponse.json({ error: "No tenés permisos para esta acción." }, { status: 403 }) }
  }

  return { usuario: user, rol: perfil.rol as string }
}
