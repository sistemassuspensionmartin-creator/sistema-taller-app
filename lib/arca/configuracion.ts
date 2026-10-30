// Datos fiscales del taller, leídos y validados en el servidor antes de facturar.
import type { SupabaseClient } from "@supabase/supabase-js"
import { cuitValido, soloDigitos, type Ambiente, type CondicionEmisor } from "./reglas"

export type ConfigFiscal = {
  ambiente: Ambiente
  cuit: string
  razonSocial: string
  condicionEmisor: CondicionEmisor
  puntoVenta: number
  facturaAMonotributo: boolean
}

export async function leerConfigFiscal(admin: SupabaseClient): Promise<ConfigFiscal> {
  const { data: c, error } = await admin.from("configuracion").select("*").order("id").limit(1).single()
  if (error || !c) throw new Error("No se encontró la configuración del taller.")

  const faltan: string[] = []
  if (!cuitValido(c.cuit)) faltan.push("CUIT válido")
  if (!c.razon_social) faltan.push("razón social")
  if (!c.arca_punto_venta) faltan.push("punto de venta de ARCA")
  if (!c.domicilio_fiscal) faltan.push("domicilio fiscal")
  if (!c.inicio_actividades) faltan.push("inicio de actividades")
  if (c.condicion_iva_emisor === "Responsable Inscripto" && !c.iibb) faltan.push("Ingresos Brutos")
  if (faltan.length) {
    throw new Error(`Completá en Ajustes > Facturación ARCA: ${faltan.join(", ")}.`)
  }

  return {
    ambiente: c.arca_ambiente === "produccion" ? "produccion" : "homologacion",
    cuit: soloDigitos(c.cuit),
    razonSocial: c.razon_social,
    condicionEmisor: c.condicion_iva_emisor === "Monotributo" ? "Monotributo" : "Responsable Inscripto",
    puntoVenta: Number(c.arca_punto_venta),
    facturaAMonotributo: Boolean(c.arca_factura_a_monotributo),
  }
}

// Respuesta de error uniforme: los códigos "SUPERA_COBRADO: ..." se muestran sin el código
export function mensajeError(e: unknown) {
  const texto = e instanceof Error ? e.message : String(e)
  return texto.replace(/^[A-Z_]+:\s*/, "")
}
