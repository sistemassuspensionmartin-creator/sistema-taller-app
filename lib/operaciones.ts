import { supabase } from "@/lib/supabase"

// Código único por operación: si el botón se toca dos veces (o se reintenta
// tras un corte), la base reconoce el mismo código y no la registra de nuevo.
export const nuevaOperacionId = () => crypto.randomUUID()

// Ejecuta una función de la base de datos y convierte el error en un mensaje legible.
export async function ejecutarOperacion<T = any>(funcion: string, parametros: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(funcion, parametros)
  if (error) throw new Error(error.message)
  return data as T
}

// Las funciones devuelven algunos errores con un código al principio ("COBRO_VIEJO: ...").
export const separarCodigoError = (mensaje: string) => {
  const match = /^([A-Z_]+):\s*([\s\S]*)$/.exec(mensaje || "")
  return match ? { codigo: match[1], mensaje: match[2] } : { codigo: null, mensaje }
}

// Elige la caja destino según el método de pago (y el tipo de tarjeta).
export const TIPOS_TARJETA = ["Débito (Taller)", "Crédito (Taller)", "Crédito (Neumater)"]

export function resolverCajaDestino(cajas: any[], metodoPago: string, tipoTarjeta?: string): string | null {
  const buscar = (...textos: string[]) =>
    cajas.find(c => textos.some(t => (c.nombre || "").toLowerCase().includes(t)))?.id ?? null

  if (metodoPago === "Efectivo") return buscar("mostrador")
  if (metodoPago === "Transferencia") return buscar("transferencia")
  if (metodoPago === "Cheque") return buscar("cheque")
  if (metodoPago === "Tarjeta") {
    if (tipoTarjeta === "Débito (Taller)") return buscar("debito taller", "débito taller")
    if (tipoTarjeta === "Crédito (Neumater)") return buscar("neumater", "neumarter")
    if (tipoTarjeta === "Crédito (Taller)") return buscar("credito taller", "crédito taller")
    return null
  }
  return null
}
