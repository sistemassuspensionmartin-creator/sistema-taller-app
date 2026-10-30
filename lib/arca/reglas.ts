// Reglas fiscales de ARCA para la factura electrónica (WSFEv1).
// Sin dependencias: se usan igual en la pantalla (para mostrar opciones) y en
// el servidor (que es quien decide y valida antes de pedir el CAE).

export type CondicionIva = "Responsable Inscripto" | "Monotributo" | "Exento" | "Consumidor Final"
export type CondicionEmisor = "Responsable Inscripto" | "Monotributo"
export type Ambiente = "homologacion" | "produccion"

// Códigos de comprobante de ARCA
export const CBTE = { FACTURA_A: 1, NC_A: 3, FACTURA_B: 6, NC_B: 8, FACTURA_C: 11, NC_C: 13 } as const
export const TIPOS_FACTURA = [CBTE.FACTURA_A, CBTE.FACTURA_B, CBTE.FACTURA_C]
export const TIPOS_NOTA_CREDITO = [CBTE.NC_A, CBTE.NC_B, CBTE.NC_C]

export const LETRA_CBTE: Record<number, "A" | "B" | "C"> = { 1: "A", 3: "A", 6: "B", 8: "B", 11: "C", 13: "C" }
export const NOMBRE_CBTE: Record<number, string> = {
  1: "Factura A", 3: "Nota de Crédito A", 6: "Factura B", 8: "Nota de Crédito B", 11: "Factura C", 13: "Nota de Crédito C",
}

// Condición frente al IVA del receptor (campo CondicionIVAReceptorId, RG 5616)
export const CONDICION_IVA_ID: Record<CondicionIva, number> = {
  "Responsable Inscripto": 1,
  "Exento": 4,
  "Consumidor Final": 5,
  "Monotributo": 6,
}

// Tipos de documento de ARCA
export const DOC = { CUIT: 80, CUIL: 86, DNI: 96, SIN_IDENTIFICAR: 99 } as const

// Desde este importe hay que identificar al consumidor final (RG 5700/2025, RG 5866/2026)
export const TOPE_IDENTIFICACION_CF = 10_000_000

// Alícuota de IVA 21% (código 5 de ARCA)
export const IVA_21 = { id: 5, tasa: 0.21 }

export function normalizarCondicion(valor?: string | null): CondicionIva {
  const v = (valor || "").toLowerCase()
  if (v.includes("inscripto")) return "Responsable Inscripto"
  if (v.includes("monotrib")) return "Monotributo"
  if (v.includes("exento")) return "Exento"
  return "Consumidor Final"
}

export function esFactura(cbteTipo: number) {
  return (TIPOS_FACTURA as number[]).includes(cbteTipo)
}

export function esNotaCredito(cbteTipo: number) {
  return (TIPOS_NOTA_CREDITO as number[]).includes(cbteTipo)
}

// Tipos de factura que la ley permite según emisor y receptor. El primero es el sugerido.
export function tiposFacturaPermitidos(
  emisor: CondicionEmisor,
  receptor: CondicionIva,
  facturaAMonotributo = false
): number[] {
  if (emisor === "Monotributo") return [CBTE.FACTURA_C]
  if (receptor === "Responsable Inscripto") return [CBTE.FACTURA_A]
  if (receptor === "Monotributo") {
    return facturaAMonotributo ? [CBTE.FACTURA_A, CBTE.FACTURA_B] : [CBTE.FACTURA_B, CBTE.FACTURA_A]
  }
  return [CBTE.FACTURA_B]
}

// La nota de crédito siempre es de la misma letra que la factura que corrige
export function notaCreditoPara(cbteTipoFactura: number): number {
  if (cbteTipoFactura === CBTE.FACTURA_A) return CBTE.NC_A
  if (cbteTipoFactura === CBTE.FACTURA_B) return CBTE.NC_B
  if (cbteTipoFactura === CBTE.FACTURA_C) return CBTE.NC_C
  throw new Error("Solo se puede hacer una nota de crédito sobre una factura.")
}

export const soloDigitos = (valor?: string | null) => (valor || "").replace(/\D/g, "")

// Valida el dígito verificador de un CUIT/CUIL
export function cuitValido(cuit: string): boolean {
  const d = soloDigitos(cuit)
  if (d.length !== 11) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0)
  let verificador = 11 - (suma % 11)
  if (verificador === 11) verificador = 0
  if (verificador === 10) verificador = 9
  return verificador === Number(d[10])
}

// Documento que se informa a ARCA. Lanza un error con el motivo si falta un dato obligatorio.
export function documentoReceptor(params: {
  documento?: string | null
  condicion: CondicionIva
  cbteTipo: number
  importe: number
  deduceGanancias?: boolean
}): { docTipo: number; docNro: string } {
  const digitos = soloDigitos(params.documento)
  const letra = LETRA_CBTE[params.cbteTipo]
  const exigeCuit = letra === "A" || params.condicion !== "Consumidor Final" || params.deduceGanancias

  if (exigeCuit) {
    if (!cuitValido(digitos)) {
      throw new Error(
        letra === "A"
          ? "La factura A exige el CUIT del cliente. Cargalo (correcto) en la ficha del cliente."
          : params.deduceGanancias
            ? "Si el cliente lo deduce en Ganancias, la factura tiene que llevar su CUIT. Cargalo en la ficha del cliente."
            : `Un cliente ${params.condicion} tiene que tener su CUIT cargado (correcto) en la ficha.`
      )
    }
    return { docTipo: DOC.CUIT, docNro: digitos }
  }

  if (digitos.length === 11 && cuitValido(digitos)) return { docTipo: DOC.CUIT, docNro: digitos }
  if (digitos.length >= 7 && digitos.length <= 8) return { docTipo: DOC.DNI, docNro: digitos }
  if (params.importe >= TOPE_IDENTIFICACION_CF) {
    throw new Error("Desde $10.000.000 hay que identificar al consumidor final con DNI o CUIT. Cargalo en la ficha del cliente.")
  }
  return { docTipo: DOC.SIN_IDENTIFICAR, docNro: "0" }
}

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Separa neto e IVA de un importe final (los precios del taller incluyen IVA)
export function calcularImportes(total: number, cbteTipo: number) {
  const t = redondear(total)
  if (LETRA_CBTE[cbteTipo] === "C") return { total: t, neto: t, iva: 0 }
  const neto = redondear(t / (1 + IVA_21.tasa))
  return { total: t, neto, iva: redondear(t - neto) }
}

// Fecha de hoy en Argentina, en los dos formatos que se usan
export function fechaArgentina(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(fecha) // AAAA-MM-DD
  return { iso: partes, arca: partes.replace(/-/g, "") }
}

// Convierte la fecha de ARCA (AAAAMMDD) a AAAA-MM-DD
export const fechaDesdeArca = (f: string) => `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`

// Código QR obligatorio (RG 4892/2020): URL con los datos del comprobante en JSON y base64
export function urlQr(datos: {
  fecha: string          // AAAA-MM-DD
  cuit: string
  ptoVta: number
  tipoCmp: number
  nroCmp: number
  importe: number
  tipoDocRec: number
  nroDocRec: string
  cae: string
}): string {
  const json = JSON.stringify({
    ver: 1,
    fecha: datos.fecha,
    cuit: Number(soloDigitos(datos.cuit)),
    ptoVta: datos.ptoVta,
    tipoCmp: datos.tipoCmp,
    nroCmp: datos.nroCmp,
    importe: redondear(datos.importe),
    moneda: "PES",
    ctz: 1,
    tipoDocRec: datos.tipoDocRec,
    nroDocRec: Number(soloDigitos(datos.nroDocRec) || 0),
    tipoCodAut: "E",
    codAut: Number(datos.cae),
  })
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(json)))
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`
}

// Número de comprobante con el formato habitual 00001-00000123
export const numeroComprobante = (ptoVta?: number | null, numero?: number | null) =>
  `${String(ptoVta || 0).padStart(5, "0")}-${String(numero || 0).padStart(8, "0")}`
