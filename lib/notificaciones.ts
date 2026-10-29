import { supabase } from "@/lib/supabase"

export type DestinoNotificacion = "oficina" | "taller"

export const destinoDeRol = (rol?: string | null): DestinoNotificacion =>
  rol === "mecanico" ? "taller" : "oficina"

// Crea una notificación para el otro sector. Quien la crea queda registrado
// (creado_por = usuario actual) y no la recibe ni escucha el sonido.
export async function crearNotificacion(n: {
  tipo: string
  destino: DestinoNotificacion
  titulo: string
  mensaje: string
  referencia_id?: string | null
  patente?: string | null
  creado_por_rol?: string | null
}) {
  const { error } = await supabase.from("notificaciones").insert([n])
  if (error) console.error("No se pudo crear la notificación:", error.message)
}

// Marca como vistas las notificaciones de un presupuesto (al abrirlo).
export async function marcarVistasDePresupuesto(presupuestoId: string, destino: DestinoNotificacion) {
  const { data: { session } } = await supabase.auth.getSession()
  await supabase
    .from("notificaciones")
    .update({ vista_at: new Date().toISOString(), vista_por: session?.user.id ?? null })
    .eq("referencia_id", presupuestoId)
    .eq("destino", destino)
    .like("tipo", "presupuesto_%")
    .is("vista_at", null)
}

// --- Sonidos ---------------------------------------------------------------
// Se precargan una sola vez y se "desbloquean" con el primer clic/tecla,
// porque el navegador no deja reproducir audio hasta que el usuario interactúa.
const sonidos: Record<string, HTMLAudioElement> = {}
let desbloqueado = false

export function prepararSonidos() {
  if (typeof window === "undefined" || sonidos.listo) return
  sonidos.listo = new Audio("/listo.mp3")
  sonidos.ding = new Audio("/ding.mp3")
  Object.values(sonidos).forEach(a => { a.preload = "auto"; a.load() })

  const desbloquear = () => {
    if (desbloqueado) return
    desbloqueado = true
    Object.values(sonidos).forEach(a => {
      a.muted = true
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false }).catch(() => { a.muted = false })
    })
    window.removeEventListener("pointerdown", desbloquear)
    window.removeEventListener("keydown", desbloquear)
  }
  window.addEventListener("pointerdown", desbloquear)
  window.addEventListener("keydown", desbloquear)
}

export function reproducirSonido(nombre: "listo" | "ding") {
  const audio = sonidos[nombre]
  if (!audio) return
  try {
    audio.currentTime = 0
    audio.play().catch(() => console.log("Audio bloqueado por directiva del navegador"))
  } catch (e) {}
}
