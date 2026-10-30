// Pruebas de las reglas fiscales y de la firma del certificado (no se conecta con ARCA).
// Uso: node scripts/pruebas-arca.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import forge from "node-forge"
import {
  CBTE, DOC, calcularImportes, cuitValido, documentoReceptor, fechaArgentina, notaCreditoPara,
  tiposFacturaPermitidos, urlQr,
} from "../lib/arca/reglas.ts"
import { armarTRA, firmarTRA } from "../lib/arca/cliente.ts"

const CUIT_OK = "20111111112" // dígito verificador válido

test("tipo de factura según emisor y receptor", () => {
  assert.deepEqual(tiposFacturaPermitidos("Responsable Inscripto", "Responsable Inscripto"), [CBTE.FACTURA_A])
  assert.deepEqual(tiposFacturaPermitidos("Responsable Inscripto", "Consumidor Final"), [CBTE.FACTURA_B])
  assert.deepEqual(tiposFacturaPermitidos("Responsable Inscripto", "Exento"), [CBTE.FACTURA_B])
  assert.deepEqual(tiposFacturaPermitidos("Responsable Inscripto", "Monotributo"), [CBTE.FACTURA_B, CBTE.FACTURA_A])
  assert.deepEqual(tiposFacturaPermitidos("Responsable Inscripto", "Monotributo", true), [CBTE.FACTURA_A, CBTE.FACTURA_B])
  assert.deepEqual(tiposFacturaPermitidos("Monotributo", "Responsable Inscripto"), [CBTE.FACTURA_C])
})

test("nota de crédito de la misma letra", () => {
  assert.equal(notaCreditoPara(CBTE.FACTURA_A), CBTE.NC_A)
  assert.equal(notaCreditoPara(CBTE.FACTURA_B), CBTE.NC_B)
  assert.equal(notaCreditoPara(CBTE.FACTURA_C), CBTE.NC_C)
  assert.throws(() => notaCreditoPara(CBTE.NC_B))
})

test("CUIT con dígito verificador", () => {
  assert.equal(cuitValido(CUIT_OK), true)
  assert.equal(cuitValido("20-11111111-2"), true)
  assert.equal(cuitValido("20111111113"), false)
  assert.equal(cuitValido("123"), false)
})

test("documento del receptor", () => {
  // Factura A exige CUIT válido
  assert.throws(() => documentoReceptor({ documento: "", condicion: "Responsable Inscripto", cbteTipo: CBTE.FACTURA_A, importe: 100 }))
  assert.deepEqual(documentoReceptor({ documento: "20-11111111-2", condicion: "Responsable Inscripto", cbteTipo: CBTE.FACTURA_A, importe: 100 }),
    { docTipo: DOC.CUIT, docNro: CUIT_OK })
  // Consumidor final sin documento por debajo del tope
  assert.deepEqual(documentoReceptor({ documento: "", condicion: "Consumidor Final", cbteTipo: CBTE.FACTURA_B, importe: 50_000 }),
    { docTipo: DOC.SIN_IDENTIFICAR, docNro: "0" })
  // Con DNI
  assert.deepEqual(documentoReceptor({ documento: "30.123.456", condicion: "Consumidor Final", cbteTipo: CBTE.FACTURA_B, importe: 50_000 }),
    { docTipo: DOC.DNI, docNro: "30123456" })
  // Desde $10.000.000 hay que identificarlo
  assert.throws(() => documentoReceptor({ documento: "", condicion: "Consumidor Final", cbteTipo: CBTE.FACTURA_B, importe: 10_000_000 }))
  // Si deduce Ganancias lleva CUIT
  assert.throws(() => documentoReceptor({ documento: "30123456", condicion: "Consumidor Final", cbteTipo: CBTE.FACTURA_B, importe: 100, deduceGanancias: true }))
  // Monotributista con Factura B: CUIT
  assert.throws(() => documentoReceptor({ documento: "", condicion: "Monotributo", cbteTipo: CBTE.FACTURA_B, importe: 100 }))
})

test("neto e IVA 21% cuadran con el total", () => {
  for (const total of [1, 100, 121, 1130000, 99999.99, 0.5, 1234.56]) {
    const r = calcularImportes(total, CBTE.FACTURA_B)
    assert.equal(Math.round((r.neto + r.iva) * 100), Math.round(total * 100), `total ${total}`)
  }
  assert.deepEqual(calcularImportes(121, CBTE.FACTURA_A), { total: 121, neto: 100, iva: 21 })
  assert.deepEqual(calcularImportes(500, CBTE.FACTURA_C), { total: 500, neto: 500, iva: 0 })
})

test("fecha en horario de Argentina", () => {
  // 02:00 UTC del 1/11 todavía es 31/10 en Argentina (UTC-3)
  assert.deepEqual(fechaArgentina(new Date("2026-11-01T02:00:00Z")), { iso: "2026-10-31", arca: "20261031" })
})

test("QR con el formato de ARCA", () => {
  const url = urlQr({ fecha: "2026-10-31", cuit: CUIT_OK, ptoVta: 3, tipoCmp: 6, nroCmp: 15, importe: 1210, tipoDocRec: 99, nroDocRec: "0", cae: "74123456789012" })
  assert.ok(url.startsWith("https://www.afip.gob.ar/fe/qr/?p="))
  const json = JSON.parse(Buffer.from(url.split("?p=")[1], "base64").toString("utf8"))
  assert.deepEqual(json, {
    ver: 1, fecha: "2026-10-31", cuit: 20111111112, ptoVta: 3, tipoCmp: 6, nroCmp: 15, importe: 1210,
    moneda: "PES", ctz: 1, tipoDocRec: 99, nroDocRec: 0, tipoCodAut: "E", codAut: 74123456789012,
  })
})

test("firma del pedido de acceso (CMS) con un certificado de prueba", () => {
  const claves = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = claves.publicKey
  cert.serialNumber = "01"
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + 86400000)
  const sujeto = [{ name: "commonName", value: "prueba" }]
  cert.setSubject(sujeto)
  cert.setIssuer(sujeto)
  cert.sign(claves.privateKey, forge.md.sha256.create())

  const tra = armarTRA("wsfe")
  assert.match(tra, /<service>wsfe<\/service>/)
  const cms = firmarTRA(tra, forge.pki.certificateToPem(cert), forge.pki.privateKeyToPem(claves.privateKey))
  const der = forge.util.decode64(cms)
  // ARCA exige el contenido incluido dentro del CMS (no "detached")
  assert.ok(der.includes(tra), "el TRA va dentro del mensaje firmado")
  const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der))
  assert.equal(p7.certificates.length, 1)
  assert.equal(p7.rawCapture.signerInfos.length, 1)
})

// ---- Respuestas simuladas de ARCA (sin red): verifica cómo se leen ----
import { obtenerAcceso, solicitarCAE, ultimoAutorizado } from "../lib/arca/cliente.ts"

const sobre = (cuerpo) => `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${cuerpo}</soap:Body></soap:Envelope>`
const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

test("lee el ticket de acceso, el último número y el CAE", async () => {
  const claves = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = claves.publicKey; cert.serialNumber = "02"
  cert.validity.notBefore = new Date(); cert.validity.notAfter = new Date(Date.now() + 86400000)
  cert.setSubject([{ name: "commonName", value: "x" }]); cert.setIssuer([{ name: "commonName", value: "x" }])
  cert.sign(claves.privateKey, forge.md.sha256.create())
  process.env.ARCA_HOMO_CERT = Buffer.from(forge.pki.certificateToPem(cert)).toString("base64")
  process.env.ARCA_HOMO_KEY = forge.pki.privateKeyToPem(claves.privateKey)

  const guardados = []
  const adminFalso = {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      upsert: async (fila) => { guardados.push(fila); return {} },
    }),
  }

  const ticket = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><loginTicketResponse version="1.0"><header><expirationTime>2026-10-31T04:00:00.000-03:00</expirationTime></header><credentials><token>TOKEN123</token><sign>SIGN456</sign></credentials></loginTicketResponse>`
  const respuestas = {
    loginCms: sobre(`<ns1:loginCmsResponse xmlns:ns1="http://wsaa.view.sua.dvadac.desein.afip.gov"><loginCmsReturn>${escapar(ticket)}</loginCmsReturn></ns1:loginCmsResponse>`),
    FECompUltimoAutorizado: sobre(`<FECompUltimoAutorizadoResponse xmlns="http://ar.gov.afip.dif.FEV1/"><FECompUltimoAutorizadoResult><PtoVta>3</PtoVta><CbteTipo>6</CbteTipo><CbteNro>41</CbteNro></FECompUltimoAutorizadoResult></FECompUltimoAutorizadoResponse>`),
    FECAESolicitar: sobre(`<FECAESolicitarResponse xmlns="http://ar.gov.afip.dif.FEV1/"><FECAESolicitarResult><FeCabResp><Resultado>A</Resultado></FeCabResp><FeDetResp><FECAEDetResponse><Resultado>A</Resultado><CAE>76123456789012</CAE><CAEFchVto>20261110</CAEFchVto><Observaciones><Obs><Code>10217</Code><Msg>Aviso de prueba</Msg></Obs></Observaciones></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse>`),
  }
  const enviados = []
  globalThis.fetch = async (url, opciones) => {
    enviados.push(opciones.body)
    const metodo = Object.keys(respuestas).find(m => opciones.body.includes(`:${m}>`) || opciones.body.includes(`:${m}/>`))
    return new Response(respuestas[metodo], { status: 200 })
  }

  const acceso = await obtenerAcceso(adminFalso, "homologacion", CUIT_OK)
  assert.equal(acceso.token, "TOKEN123")
  assert.equal(acceso.sign, "SIGN456")
  assert.equal(guardados[0].expira, "2026-10-31T04:00:00.000-03:00")

  assert.equal(await ultimoAutorizado(acceso, 3, 6), 41)

  const r = await solicitarCAE(acceso, {
    cbteTipo: 6, ptoVta: 3, numero: 42, docTipo: 99, docNro: "0", fecha: "20261031",
    total: 1210, neto: 1000, iva: 210, condicionIvaReceptorId: 5,
  })
  assert.equal(r.resultado, "A")
  assert.equal(r.cae, "76123456789012")
  assert.equal(r.vencimiento, "20261110")
  assert.deepEqual(r.observaciones, ["10217 Aviso de prueba"])

  const pedido = enviados.at(-1)
  assert.match(pedido, /<ar:ImpTotal>1210\.00<\/ar:ImpTotal>/)
  assert.match(pedido, /<ar:CondicionIVAReceptorId>5<\/ar:CondicionIVAReceptorId>/)
  assert.match(pedido, /<ar:Iva><ar:AlicIva><ar:Id>5<\/ar:Id><ar:BaseImp>1000\.00<\/ar:BaseImp><ar:Importe>210\.00<\/ar:Importe>/)
})
