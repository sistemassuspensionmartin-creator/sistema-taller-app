// Emite un comprobante ya reservado en la base (solo servidor).
// Orden: ticket de acceso -> verificar envíos que quedaron a medias -> pedir el
// siguiente número -> pedir el CAE -> guardar el resultado.
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ErrorArca, consultarComprobante, obtenerAcceso, solicitarCAE, ultimoAutorizado, type Acceso,
} from "./cliente"
import { fechaDesdeArca, urlQr, type Ambiente } from "./reglas"

type Comprobante = Record<string, any>

async function rpc(admin: SupabaseClient, funcion: string, parametros: Record<string, unknown>) {
  const { data, error } = await admin.rpc(funcion, parametros)
  if (error) throw new Error(error.message)
  return data
}

function qrDe(c: Comprobante, numero: number, cae: string) {
  return urlQr({
    fecha: c.fecha_cbte, cuit: c.cuit_emisor, ptoVta: c.punto_venta, tipoCmp: c.cbte_tipo,
    nroCmp: numero, importe: Number(c.total_final), tipoDocRec: c.doc_tipo, nroDocRec: c.doc_nro, cae,
  })
}

async function confirmar(admin: SupabaseClient, c: Comprobante, numero: number, cae: string, vto: string, respuesta: unknown, obs?: string) {
  return rpc(admin, "factura_confirmar", {
    p_id: c.id, p_numero: numero, p_cae: cae, p_cae_vto: fechaDesdeArca(vto),
    p_qr: qrDe(c, numero, cae), p_respuesta: respuesta ?? null, p_obs: obs || null,
  })
}

// Si un envío anterior quedó "enviando" (se cortó la conexión), se consulta a ARCA
// si ese número llegó a autorizarse. Si no llegó, se libera para volver a intentar.
async function reconciliar(admin: SupabaseClient, acceso: Acceso, c: Comprobante) {
  const { data: enCurso } = await admin
    .from("facturas").select("*")
    .eq("ambiente", c.ambiente).eq("punto_venta", c.punto_venta).eq("cbte_tipo", c.cbte_tipo)
    .eq("estado", "enviando")

  for (const p of enCurso || []) {
    const r = await consultarComprobante(acceso, p.punto_venta, p.cbte_tipo, p.numero_factura)
    if (r && Math.abs(r.total - Number(p.total_final)) < 0.01 && r.docNro === String(p.doc_nro)) {
      await confirmar(admin, p, p.numero_factura, r.cae, r.vencimiento, { consulta: r }, "Confirmado por consulta a ARCA")
    } else if (!r) {
      await rpc(admin, "factura_volver_pendiente", { p_id: p.id })
    }
  }
}

export async function emitirComprobante(
  admin: SupabaseClient,
  reservado: Comprobante,
  asociado?: { tipo: number; ptoVta: number; numero: number; cuit: string; fecha: string }
): Promise<Comprobante> {
  if (reservado.estado === "autorizada") return reservado
  if (reservado.estado === "rechazada") {
    throw new ErrorArca(`ARCA rechazó este comprobante: ${reservado.observaciones || "sin detalle"}`)
  }

  const ambiente = reservado.ambiente as Ambiente
  const acceso = await obtenerAcceso(admin, ambiente, reservado.cuit_emisor)
  await reconciliar(admin, acceso, reservado)

  // ¿La reconciliación ya lo dejó autorizado?
  const { data: actual } = await admin.from("facturas").select("*").eq("id", reservado.id).single()
  if (actual?.estado === "autorizada") return actual

  for (let intento = 1; intento <= 3; intento++) {
    const numero = (await ultimoAutorizado(acceso, reservado.punto_venta, reservado.cbte_tipo)) + 1

    try {
      await rpc(admin, "factura_marcar_enviando", { p_id: reservado.id, p_numero: numero })
    } catch (e: any) {
      // Otro pedido simultáneo tomó ese número: se vuelve a pedir el siguiente
      if (/duplicate|unique/i.test(e.message) && intento < 3) continue
      throw e
    }

    let r
    try {
      r = await solicitarCAE(acceso, {
        cbteTipo: reservado.cbte_tipo,
        ptoVta: reservado.punto_venta,
        numero,
        docTipo: reservado.doc_tipo,
        docNro: reservado.doc_nro,
        fecha: String(reservado.fecha_cbte).replace(/-/g, ""),
        total: Number(reservado.total_final),
        neto: Number(reservado.total_neto),
        iva: Number(reservado.iva_total),
        condicionIvaReceptorId: reservado.condicion_iva_receptor_id,
        asociado,
      })
    } catch (e: any) {
      if (e instanceof ErrorArca && e.sinRespuesta) {
        // Queda "enviando": en el próximo intento se consulta a ARCA si se autorizó
        throw new ErrorArca("ARCA no respondió. Volvé a tocar Emitir en unos minutos: el sistema verifica si se llegó a autorizar y no la duplica.", undefined, true)
      }
      await rpc(admin, "factura_volver_pendiente", { p_id: reservado.id })
      throw e
    }

    if (r.resultado === "A" && r.cae && r.vencimiento) {
      return confirmar(admin, reservado, numero, r.cae, r.vencimiento, r.respuesta, r.observaciones.join(" | "))
    }

    // 10016: el número no es el siguiente (otro comprobante entró antes): reintentar
    if (r.errores.some(e => e.codigo === "10016") && intento < 3) {
      await rpc(admin, "factura_volver_pendiente", { p_id: reservado.id })
      continue
    }

    const motivo = [...r.errores.map(e => `${e.codigo} ${e.mensaje}`), ...r.observaciones].join(" | ") || "sin detalle"
    await rpc(admin, "factura_rechazar", { p_id: reservado.id, p_obs: motivo, p_respuesta: r.respuesta ?? null })
    throw new ErrorArca(`ARCA rechazó el comprobante: ${motivo}`)
  }

  throw new ErrorArca("No se pudo obtener un número de comprobante libre. Probá de nuevo.")
}
