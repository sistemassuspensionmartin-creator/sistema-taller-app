// Conexión directa con los web services de ARCA (solo servidor).
//  - WSAA: autenticación con el certificado del taller (ticket válido 12 h).
//  - WSFEv1: factura electrónica (último número, pedido de CAE, consulta).
// El certificado y la clave privada se leen de variables de entorno de Vercel,
// nunca se guardan en la base ni llegan al navegador.
import forge from "node-forge"
import { XMLParser } from "fast-xml-parser"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Ambiente } from "./reglas"

const URLS: Record<Ambiente, { wsaa: string; wsfe: string }> = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
}

const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false })

export class ErrorArca extends Error {
  codigo?: string
  sinRespuesta: boolean
  constructor(mensaje: string, codigo?: string, sinRespuesta = false) {
    super(mensaje)
    this.codigo = codigo
    this.sinRespuesta = sinRespuesta
  }
}

// Acepta el PEM tal cual o codificado en base64 (más cómodo para cargar en Vercel)
function leerPem(nombreVariable: string): string | null {
  const valor = process.env[nombreVariable]
  if (!valor) return null
  const limpio = valor.trim()
  return limpio.startsWith("-----") ? limpio.replace(/\\n/g, "\n") : Buffer.from(limpio, "base64").toString("utf8")
}

export function credenciales(ambiente: Ambiente) {
  const prefijo = ambiente === "produccion" ? "ARCA_PROD" : "ARCA_HOMO"
  const cert = leerPem(`${prefijo}_CERT`)
  const key = leerPem(`${prefijo}_KEY`)
  if (!cert || !key) {
    throw new ErrorArca(
      `Falta el certificado de ARCA para ${ambiente === "produccion" ? "producción" : "pruebas"} ` +
      `(variables ${prefijo}_CERT y ${prefijo}_KEY en Vercel).`
    )
  }
  return { cert, key }
}

// Firma el pedido de acceso (TRA) con el certificado: CMS/PKCS#7 con el contenido incluido
export function firmarTRA(tra: string, certPem: string, keyPem: string): string {
  const certificado = forge.pki.certificateFromPem(certPem)
  const clave = forge.pki.privateKeyFromPem(keyPem)
  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(tra, "utf8")
  p7.addCertificate(certificado)
  p7.addSigner({
    key: clave,
    certificate: certificado,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // @ts-ignore: forge acepta Date en signingTime
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  })
  p7.sign()
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes())
}

export function armarTRA(servicio: string, ahora = new Date()) {
  const desde = new Date(ahora.getTime() - 10 * 60 * 1000).toISOString()
  const hasta = new Date(ahora.getTime() + 10 * 60 * 1000).toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header>` +
    `<uniqueId>${Math.floor(ahora.getTime() / 1000)}</uniqueId><generationTime>${desde}</generationTime>` +
    `<expirationTime>${hasta}</expirationTime></header><service>${servicio}</service></loginTicketRequest>`
}

async function llamarSoap(url: string, accion: string, cuerpo: string): Promise<any> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: accion },
      body: `<?xml version="1.0" encoding="utf-8"?>` +
        `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
        `xmlns:ar="http://ar.gov.afip.dif.FEV1/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">` +
        `<soapenv:Header/><soapenv:Body>${cuerpo}</soapenv:Body></soapenv:Envelope>`,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    })
  } catch {
    throw new ErrorArca("ARCA no respondió (sin conexión o demora). Probá de nuevo en unos minutos.", undefined, true)
  }
  const texto = await respuesta.text()
  const xml = parser.parse(texto)
  const body = xml?.Envelope?.Body
  if (body?.Fault) {
    throw new ErrorArca(`ARCA: ${body.Fault.faultstring || "error en el servicio"}`, body.Fault.faultcode)
  }
  if (!respuesta.ok || !body) {
    throw new ErrorArca(`ARCA respondió con un error (${respuesta.status}).`, undefined, respuesta.status >= 500)
  }
  return body
}

export type Acceso = { ambiente: Ambiente; cuit: string; token: string; sign: string }

// Ticket de acceso: se reutiliza el guardado mientras siga vigente (ARCA no da otro antes de tiempo)
export async function obtenerAcceso(admin: SupabaseClient, ambiente: Ambiente, cuit: string, servicio = "wsfe"): Promise<Acceso> {
  const { data: guardado } = await admin
    .from("arca_tokens").select("token, sign, expira")
    .eq("ambiente", ambiente).eq("servicio", servicio).maybeSingle()

  if (guardado && new Date(guardado.expira).getTime() - Date.now() > 5 * 60 * 1000) {
    return { ambiente, cuit, token: guardado.token, sign: guardado.sign }
  }

  const { cert, key } = credenciales(ambiente)
  const cms = firmarTRA(armarTRA(servicio), cert, key)
  const body = await llamarSoap(URLS[ambiente].wsaa, "", `<wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms>`)
  const ticket = parser.parse(String(body?.loginCmsResponse?.loginCmsReturn || ""))?.loginTicketResponse
  const token = ticket?.credentials?.token
  const sign = ticket?.credentials?.sign
  if (!token || !sign) throw new ErrorArca("ARCA no devolvió el ticket de acceso.")

  await admin.from("arca_tokens").upsert({
    ambiente, servicio, token, sign, expira: ticket.header?.expirationTime,
  })
  return { ambiente, cuit, token, sign }
}

const auth = (a: Acceso) =>
  `<ar:Auth><ar:Token>${a.token}</ar:Token><ar:Sign>${a.sign}</ar:Sign><ar:Cuit>${a.cuit}</ar:Cuit></ar:Auth>`

const lista = <T>(valor: T | T[] | undefined): T[] => (valor == null ? [] : Array.isArray(valor) ? valor : [valor])

function erroresDe(resultado: any): { codigo: string; mensaje: string }[] {
  return lista(resultado?.Errors?.Err).map((e: any) => ({ codigo: String(e.Code), mensaje: String(e.Msg) }))
}

async function wsfe(acceso: Acceso, metodo: string, interior: string) {
  const body = await llamarSoap(
    URLS[acceso.ambiente].wsfe,
    `http://ar.gov.afip.dif.FEV1/${metodo}`,
    `<ar:${metodo}>${auth(acceso)}${interior}</ar:${metodo}>`
  )
  return body?.[`${metodo}Response`]?.[`${metodo}Result`]
}

export async function ultimoAutorizado(acceso: Acceso, ptoVta: number, cbteTipo: number): Promise<number> {
  const r = await wsfe(acceso, "FECompUltimoAutorizado", `<ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo>`)
  const errores = erroresDe(r)
  if (errores.length) throw new ErrorArca(`ARCA: ${errores.map(e => `${e.codigo} ${e.mensaje}`).join(" | ")}`, errores[0].codigo)
  return Number(r?.CbteNro || 0)
}

export async function consultarComprobante(acceso: Acceso, ptoVta: number, cbteTipo: number, numero: number) {
  const r = await wsfe(acceso, "FECompConsultar",
    `<ar:FeCompConsReq><ar:CbteTipo>${cbteTipo}</ar:CbteTipo><ar:CbteNro>${numero}</ar:CbteNro><ar:PtoVta>${ptoVta}</ar:PtoVta></ar:FeCompConsReq>`)
  const g = r?.ResultGet
  if (!g || !g.CodAutorizacion) return null
  return {
    cae: String(g.CodAutorizacion),
    vencimiento: String(g.FchVto),
    total: Number(g.ImpTotal),
    docNro: String(g.DocNro),
    fecha: String(g.CbteFch),
  }
}

export type DetalleComprobante = {
  cbteTipo: number
  ptoVta: number
  numero: number
  docTipo: number
  docNro: string
  fecha: string // AAAAMMDD
  total: number
  neto: number
  iva: number
  condicionIvaReceptorId: number
  asociado?: { tipo: number; ptoVta: number; numero: number; cuit: string; fecha: string }
}

const importe = (n: number) => n.toFixed(2)

export async function solicitarCAE(acceso: Acceso, d: DetalleComprobante) {
  const esC = d.cbteTipo === 11 || d.cbteTipo === 13
  const asociados = d.asociado
    ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${d.asociado.tipo}</ar:Tipo><ar:PtoVta>${d.asociado.ptoVta}</ar:PtoVta>` +
      `<ar:Nro>${d.asociado.numero}</ar:Nro><ar:Cuit>${d.asociado.cuit}</ar:Cuit><ar:CbteFch>${d.asociado.fecha}</ar:CbteFch>` +
      `</ar:CbteAsoc></ar:CbtesAsoc>`
    : ""
  const iva = esC ? "" :
    `<ar:Iva><ar:AlicIva><ar:Id>5</ar:Id><ar:BaseImp>${importe(d.neto)}</ar:BaseImp><ar:Importe>${importe(d.iva)}</ar:Importe></ar:AlicIva></ar:Iva>`

  // Concepto 3 = productos y servicios (repuestos + mano de obra): exige fechas de servicio y vencimiento de pago
  const interior =
    `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${d.ptoVta}</ar:PtoVta><ar:CbteTipo>${d.cbteTipo}</ar:CbteTipo></ar:FeCabReq>` +
    `<ar:FeDetReq><ar:FECAEDetRequest>` +
    `<ar:Concepto>3</ar:Concepto><ar:DocTipo>${d.docTipo}</ar:DocTipo><ar:DocNro>${d.docNro}</ar:DocNro>` +
    `<ar:CbteDesde>${d.numero}</ar:CbteDesde><ar:CbteHasta>${d.numero}</ar:CbteHasta><ar:CbteFch>${d.fecha}</ar:CbteFch>` +
    `<ar:ImpTotal>${importe(d.total)}</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc><ar:ImpNeto>${importe(d.neto)}</ar:ImpNeto>` +
    `<ar:ImpOpEx>0.00</ar:ImpOpEx><ar:ImpTrib>0.00</ar:ImpTrib><ar:ImpIVA>${importe(d.iva)}</ar:ImpIVA>` +
    `<ar:FchServDesde>${d.fecha}</ar:FchServDesde><ar:FchServHasta>${d.fecha}</ar:FchServHasta><ar:FchVtoPago>${d.fecha}</ar:FchVtoPago>` +
    `<ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>` +
    `<ar:CondicionIVAReceptorId>${d.condicionIvaReceptorId}</ar:CondicionIVAReceptorId>` +
    asociados + iva +
    `</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`

  const r = await wsfe(acceso, "FECAESolicitar", interior)
  const det = lista(r?.FeDetResp?.FECAEDetResponse)[0]
  const observaciones = lista(det?.Observaciones?.Obs).map((o: any) => `${o.Code} ${o.Msg}`)
  const errores = erroresDe(r)
  return {
    resultado: String(det?.Resultado || r?.FeCabResp?.Resultado || "R") as "A" | "R" | "P",
    cae: det?.CAE ? String(det.CAE) : null,
    vencimiento: det?.CAEFchVto ? String(det.CAEFchVto) : null,
    observaciones,
    errores,
    respuesta: r,
  }
}

export async function estadoServidores(ambiente: Ambiente) {
  const body = await llamarSoap(URLS[ambiente].wsfe, "http://ar.gov.afip.dif.FEV1/FEDummy", "<ar:FEDummy/>")
  return body?.FEDummyResponse?.FEDummyResult as { AppServer?: string; DbServer?: string; AuthServer?: string }
}
