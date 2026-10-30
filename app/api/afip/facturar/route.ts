import { NextResponse } from "next/server"
import { supabaseAdmin, verificarRol } from "@/lib/servidor/sesion"
import { leerConfigFiscal, mensajeError } from "@/lib/arca/configuracion"
import { emitirComprobante } from "@/lib/arca/emitir"
import {
  CONDICION_IVA_ID, LETRA_CBTE, calcularImportes, documentoReceptor, fechaArgentina,
  normalizarCondicion, tiposFacturaPermitidos,
} from "@/lib/arca/reglas"

// ARCA puede demorar: margen para el pedido de acceso y el CAE
export const maxDuration = 60

// Emite una factura electrónica por lo cobrado de un presupuesto.
// El navegador solo indica presupuesto, importe y tipo: todo lo demás (cliente,
// documento, condición de IVA, neto e IVA, número) lo resuelve el servidor.
export async function POST(request: Request) {
  const verificacion = await verificarRol(request, ["admin", "cajero"])
  if (verificacion.error) return verificacion.error

  try {
    const { operacion, presupuesto_id, importe, cbte_tipo, deduce_ganancias } = await request.json()
    if (!operacion || !presupuesto_id) {
      return NextResponse.json({ error: "Faltan datos del pedido." }, { status: 400 })
    }

    const cfg = await leerConfigFiscal(supabaseAdmin)

    const { data: pres } = await supabaseAdmin
      .from("presupuestos").select("id, vehiculo_patente").eq("id", presupuesto_id).single()
    if (!pres) return NextResponse.json({ error: "El presupuesto no existe." }, { status: 404 })

    const { data: vehiculo } = await supabaseAdmin
      .from("vehiculos").select("clientes(*)").eq("patente", pres.vehiculo_patente).maybeSingle()
    const cliente: any = (vehiculo as any)?.clientes
    if (!cliente) {
      return NextResponse.json({ error: "El vehículo no tiene un cliente asignado. Asignalo antes de facturar." }, { status: 400 })
    }

    const condicion = normalizarCondicion(cliente.condicion_iva)
    const permitidos = tiposFacturaPermitidos(cfg.condicionEmisor, condicion, cfg.facturaAMonotributo)
    const tipo = Number(cbte_tipo) || permitidos[0]
    if (!permitidos.includes(tipo)) {
      return NextResponse.json({ error: `Para un cliente ${condicion} no corresponde ese tipo de factura.` }, { status: 400 })
    }

    const importes = calcularImportes(Number(importe), tipo)
    const doc = documentoReceptor({
      documento: cliente.documento, condicion, cbteTipo: tipo, importe: importes.total, deduceGanancias: Boolean(deduce_ganancias),
    })

    const nombre = cliente.tipo_cliente === "empresa"
      ? (cliente.razon_social || cliente.nombre)
      : `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
    const domicilio = cliente.domicilio_fiscal ||
      [cliente.calle, cliente.barrio, cliente.ciudad].filter(Boolean).join(", ") || null

    const reservado = await supabaseAdmin.rpc("factura_reservar", {
      p_operacion: operacion,
      p_presupuesto_id: presupuesto_id,
      p_importe: importes.total,
      p_usuario: verificacion.usuario.id,
      p_datos: {
        ambiente: cfg.ambiente,
        cbte_tipo: tipo,
        tipo_factura: LETRA_CBTE[tipo],
        punto_venta: cfg.puntoVenta,
        cuit_emisor: cfg.cuit,
        doc_tipo: doc.docTipo,
        doc_nro: doc.docNro,
        condicion_iva_receptor_id: CONDICION_IVA_ID[condicion],
        cliente_nombre: nombre,
        cliente_domicilio: domicilio,
        cliente_condicion_iva: condicion,
        fecha_cbte: fechaArgentina().iso,
        total_neto: importes.neto,
        iva_total: importes.iva,
      },
    })
    if (reservado.error) throw new Error(reservado.error.message)

    const factura = await emitirComprobante(supabaseAdmin, reservado.data)
    return NextResponse.json({ factura })
  } catch (e) {
    return NextResponse.json({ error: mensajeError(e) }, { status: 400 })
  }
}
