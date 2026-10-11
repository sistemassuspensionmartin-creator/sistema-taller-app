import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente con LLAVE MAESTRA (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // 1. VALIDACIÓN DE IDENTIDAD: Exigir token de sesión en la cabecera
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere una sesión activa para realizar esta acción.' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    // 2. Comprobar que el token sea de un usuario real logueado
    const { data: { user: usuarioEmisor }, error: authUserError } = await supabaseAdmin.auth.getUser(token)
    if (authUserError || !usuarioEmisor) {
      return NextResponse.json(
        { error: 'Sesión inválida o expirada. Por favor, vuelva a iniciar sesión.' },
        { status: 401 }
      )
    }

    // 3. Comprobar en la tabla perfiles que sea estrictamente 'admin'
    const { data: perfilEmisor, error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', usuarioEmisor.id)
      .single()

    if (perfilError || perfilEmisor?.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de Administrador para crear empleados.' },
        { status: 403 }
      )
    }

    // 4. Si pasó todos los filtros de seguridad, procesamos la creación
    const { email, password, nombre, apellido, rol, pin_bloqueo } = await request.json()

    // @ts-ignore
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (authError) throw authError

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin.from('perfiles').insert([{
        id: authData.user.id,
        nombre,
        apellido,
        email,
        rol,
        pin_bloqueo: pin_bloqueo || null
      }])

      if (profileError) throw profileError
    }

    return NextResponse.json({ success: true, message: "Usuario creado exitosamente" })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}