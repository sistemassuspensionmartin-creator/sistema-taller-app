import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente con LLAVE MAESTRA (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ROLES_VALIDOS = ['admin', 'cajero', 'mecanico']

// Exige un token de sesión válido de un usuario con rol 'admin'.
// Devuelve el usuario, o la respuesta de error para cortar el pedido.
async function verificarAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json(
      { error: 'No autorizado: Se requiere una sesión activa para realizar esta acción.' },
      { status: 401 }
    ) }
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authUserError } = await supabaseAdmin.auth.getUser(token)
  if (authUserError || !user) {
    return { error: NextResponse.json(
      { error: 'Sesión inválida o expirada. Por favor, vuelva a iniciar sesión.' },
      { status: 401 }
    ) }
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfilError || perfil?.rol !== 'admin') {
    return { error: NextResponse.json(
      { error: 'Acceso denegado: Se requieren permisos de Administrador para gestionar empleados.' },
      { status: 403 }
    ) }
  }

  return { usuario: user }
}

export async function POST(request: Request) {
  try {
    const verificacion = await verificarAdmin(request)
    if (verificacion.error) return verificacion.error

    const { email, password, nombre, apellido, rol, pin_bloqueo } = await request.json()

    if (!ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
    }
    if (pin_bloqueo && !/^\d{4}$/.test(pin_bloqueo)) {
      return NextResponse.json({ error: 'El PIN debe ser exactamente de 4 números.' }, { status: 400 })
    }

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

      if (profileError) {
        // Sin perfil la cuenta no sirve: no la dejamos huérfana
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }
    }

    return NextResponse.json({ success: true, message: "Usuario creado exitosamente" })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// Elimina un empleado: su perfil y también su cuenta de acceso (así ya no puede iniciar sesión).
export async function DELETE(request: Request) {
  try {
    const verificacion = await verificarAdmin(request)
    if (verificacion.error) return verificacion.error

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Falta el usuario a eliminar.' }, { status: 400 })
    }
    if (id === verificacion.usuario.id) {
      return NextResponse.json({ error: 'No podés eliminar tu propio usuario.' }, { status: 400 })
    }

    const { error: perfilError } = await supabaseAdmin.from('perfiles').delete().eq('id', id)
    if (perfilError) throw perfilError

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
