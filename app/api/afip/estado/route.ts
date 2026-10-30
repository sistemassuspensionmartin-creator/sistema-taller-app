import { NextResponse } from "next/server"
import { supabaseAdmin, verificarRol } from "@/lib/servidor/sesion"
import { leerConfigFiscal, mensajeError } from "@/lib/arca/configuracion"
import { credenciales, estadoServidores, obtenerAcceso, ultimoAutorizado } from "@/lib/arca/cliente"
import { CBTE } from "@/lib/arca/reglas"

// ARCA puede demorar: margen para el pedido de acceso y el CAE
export const maxDuration = 60

// "Probar conexión con ARCA" (solo admin): revisa datos fiscales, certificado,
// servidores de ARCA y punto de venta, sin emitir nada.
export async function POST(request: Request) {
  const verificacion = await verificarRol(request, ["admin"])
  if (verificacion.error) return verificacion.error

  const pasos: { paso: string; ok: boolean; detalle: string }[] = []
  const registrar = (paso: string, ok: boolean, detalle: string) => pasos.push({ paso, ok, detalle })

  try {
    const cfg = await leerConfigFiscal(supabaseAdmin)
    registrar("Datos fiscales", true, `${cfg.razonSocial} · CUIT ${cfg.cuit} · PV ${cfg.puntoVenta} · ${cfg.ambiente === "produccion" ? "PRODUCCIÓN" : "PRUEBAS"}`)

    credenciales(cfg.ambiente)
    registrar("Certificado", true, "Cargado en el servidor")

    const servidores = await estadoServidores(cfg.ambiente)
    const servidoresOk = servidores?.AppServer === "OK" && servidores?.DbServer === "OK" && servidores?.AuthServer === "OK"
    registrar("Servidores de ARCA", servidoresOk, `App ${servidores?.AppServer} · Base ${servidores?.DbServer} · Auth ${servidores?.AuthServer}`)

    const acceso = await obtenerAcceso(supabaseAdmin, cfg.ambiente, cfg.cuit)
    registrar("Acceso con el certificado", Boolean(acceso.token), "Ticket de acceso obtenido")

    const tipo = cfg.condicionEmisor === "Monotributo" ? CBTE.FACTURA_C : CBTE.FACTURA_B
    const ultimo = await ultimoAutorizado(acceso, cfg.puntoVenta, tipo)
    registrar("Punto de venta", true, `Último comprobante ${tipo === CBTE.FACTURA_C ? "C" : "B"} autorizado: ${ultimo}`)
  } catch (e) {
    registrar("Error", false, mensajeError(e))
  }

  return NextResponse.json({ pasos, ok: pasos.every(p => p.ok) })
}
