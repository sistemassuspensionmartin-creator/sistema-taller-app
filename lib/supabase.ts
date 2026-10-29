import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    // El latido de la conexión corre en un Web Worker: el navegador no lo frena
    // cuando la pestaña queda en segundo plano (WhatsApp, otra pestaña, etc.)
    worker: true,
    heartbeatIntervalMs: 15000,
  },
})
