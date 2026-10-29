import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type Opciones = {
  // Recarga periódica de respaldo mientras la pantalla está visible (0 = sin recarga)
  intervaloMs?: number
  // Tiempo mínimo en segundo plano para recargar al volver a la pestaña
  minOcultoMs?: number
}

// Suscribe un canal de tiempo real y vuelve a sincronizar los datos cada vez
// que la conexión se recupera (corte de red, PC en reposo, pestaña en segundo
// plano), así ningún cambio se pierde aunque se haya perdido el evento.
export function suscribirCanal(
  nombre: string,
  configurar: (canal: RealtimeChannel) => RealtimeChannel,
  resincronizar: () => void,
  { intervaloMs = 0, minOcultoMs = 5000 }: Opciones = {}
) {
  let conectadoAntes = false
  let ocultoDesde: number | null = null

  // Nombre único por montaje: evita reusar un canal que todavía se está cerrando
  const canal = configurar(supabase.channel(`${nombre}-${Math.random().toString(36).slice(2, 10)}`))
  canal.subscribe((estado) => {
    if (estado === "SUBSCRIBED") {
      if (conectadoAntes) resincronizar()
      conectadoAntes = true
    }
  })

  const alCambiarVisibilidad = () => {
    if (document.visibilityState === "hidden") {
      ocultoDesde = Date.now()
    } else if (ocultoDesde !== null) {
      if (Date.now() - ocultoDesde >= minOcultoMs) resincronizar()
      ocultoDesde = null
    }
  }
  const alVolverLaRed = () => resincronizar()

  document.addEventListener("visibilitychange", alCambiarVisibilidad)
  window.addEventListener("online", alVolverLaRed)

  const intervalo = intervaloMs > 0
    ? setInterval(() => { if (document.visibilityState === "visible") resincronizar() }, intervaloMs)
    : null

  return () => {
    document.removeEventListener("visibilitychange", alCambiarVisibilidad)
    window.removeEventListener("online", alVolverLaRed)
    if (intervalo) clearInterval(intervalo)
    supabase.removeChannel(canal)
  }
}
