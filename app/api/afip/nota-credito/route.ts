import { NextResponse } from "next/server"
import { supabaseAdmin, verificarRol } from "@/lib/servidor/sesion"
import { leerConfigFiscal, mensajeError } from "@/lib/arca/configuracion"
import { emitirComprobante } from "@/lib/arca/emitir"
import { calcularImportes, fechaArgentina, notaCreditoPara } from "@/lib/arca/reglas"

// ARCA puede demorar: margen para el pedido de acceso y el CAE
export const maxDuration = 60

// Emite una nota de crédito sobre una factura autorizada (total o parcial).
export async function POST(request: Request) {
  const verificacion = await verificarRol(request, ["admin", "cajero"])
  if (verificacion.error) return verificacion.error

  try {
    const { operacion, factura_id, importe } = await request.json()
    if (!operacion || !factura_id) {
      return NextResponse.json({ error: "Faltan datos del pedido." }, { status: 400 })
    }

    const cfg = await leerConfigFiscal(supabaseAdmin)
    const { data: factura } = await supabaseAdmin.from("facturas").select("*").eq("id", factura_id).single()
    if (!factura || factura.estado !== "autorizada") {
      return NextResponse.json({ error: "La nota de crédito tiene que salir de una factura autorizada por ARCA." }, { status: 400 })
    }

    const tipoNc = notaCreditoPara(factura.cbte_tipo)
    const importes = calcularImportes(Number(importe), tipoNc)

    const reservado = await supabaseAdmin.rpc("nota_credito_reservar", {
      p_operacion: operacion,
      p_factura_id: factura_id,
      p_importe: importes.total,
      p_usuario: verificacion.usuario.id,
      p_datos: {
        ambiente: cfg.ambiente,
        fecha_cbte: fechaArgentina().iso,
        total_neto: importes.neto,
        iva_total: importes.iva,
      },
    })
    if (reservado.error) throw new Error(reservado.error.message)

    const nota = await emitirComprobante(supabaseAdmin, reservado.data, {
      tipo: factura.cbte_tipo,
      ptoVta: factura.punto_venta,
      numero: factura.numero_factura,
      cuit: factura.cuit_emisor,
      fecha: String(factura.fecha_cbte).replace(/-/g, ""),
    })
    return NextResponse.json({ factura: nota })
  } catch (e) {
    return NextResponse.json({ error: mensajeError(e) }, { status: 400 })
  }
}
