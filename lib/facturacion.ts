// Facturación desde las pantallas: llama a las rutas del servidor y arma los datos para imprimir.
import QRCode from "qrcode"
import { supabase } from "@/lib/supabase"
import { esFactura } from "@/lib/arca/reglas"

async function llamar(ruta: string, cuerpo: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(cuerpo),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Error al comunicarse con el servidor.")
  return data
}

export const emitirFactura = (datos: {
  operacion: string; presupuesto_id: string; importe: number; cbte_tipo: number; deduce_ganancias: boolean
}) => llamar("/api/afip/facturar", datos).then(d => d.factura)

export const emitirNotaCredito = (datos: { operacion: string; factura_id: string; importe: number }) =>
  llamar("/api/afip/nota-credito", datos).then(d => d.factura)

export const probarConexionArca = () => llamar("/api/afip/estado", {})

export async function resumenFacturacion(presupuestoId: string) {
  const { data, error } = await supabase.rpc("facturacion_resumen", { p_presupuesto_id: presupuestoId })
  if (error) throw new Error(error.message)
  return data
}

// Datos completos para FacturaImprimible (incluye la imagen del QR)
export async function datosParaImprimir(resumen: any, comprobante: any) {
  const asociada = comprobante.factura_asociada_id
    ? resumen.comprobantes.find((c: any) => c.id === comprobante.factura_asociada_id)
    : null
  // Se detallan los ítems solo si la factura cubre el presupuesto completo
  const cubreTodo = esFactura(comprobante.cbte_tipo) &&
    Math.abs(Number(comprobante.total_final) - Number(resumen.presupuesto.total)) < 0.01
  const qr = comprobante.qr_url ? await QRCode.toDataURL(comprobante.qr_url, { margin: 0, width: 220 }) : null

  return {
    comprobante,
    asociada,
    emisor: resumen.emisor,
    ambiente: comprobante.ambiente,
    presupuesto: resumen.presupuesto,
    items: cubreTodo ? resumen.items : [],
    qr_imagen: qr,
  }
}
