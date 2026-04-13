import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Iniciamos Supabase con la LLAVE MAESTRA (Service Role)
// Esto nos permite crear usuarios sin desloguear al Administrador actual.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, password, nombre, apellido, rol } = await request.json()

    // 1. Creamos el usuario en la bóveda secreta de Auth
    // @ts-ignore
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Para que no tenga que validar el mail
    })

    if (authError) throw authError

    // 2. Si se creó bien, guardamos sus datos en TU tabla de 'perfiles'
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin.from('perfiles').insert([{
        id: authData.user.id,
        nombre,
        apellido,
        email,
        rol
      }])

      if (profileError) throw profileError
    }

    return NextResponse.json({ success: true, message: "Usuario creado exitosamente" })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}