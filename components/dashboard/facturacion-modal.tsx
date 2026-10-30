"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, FileMinus, Loader2, Printer, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { nuevaOperacionId } from "@/lib/operaciones"
import { datosParaImprimir, emitirFactura, emitirNotaCredito, resumenFacturacion } from "@/lib/facturacion"
import {
  LETRA_CBTE, NOMBRE_CBTE, documentoReceptor, esFactura, normalizarCondicion, numeroComprobante,
  tiposFacturaPermitidos,
} from "@/lib/arca/reglas"

const plata = (n: number) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const COLOR_ESTADO: Record<string, string> = {
  autorizada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rechazada: "bg-red-100 text-red-800 border-red-300",
  pendiente: "bg-amber-100 text-amber-800 border-amber-300",
  enviando: "bg-amber-100 text-amber-800 border-amber-300",
}

export function FacturacionModal({
  presupuestoId, onClose, onCambio, onImprimir,
}: {
  presupuestoId: string | null
  onClose: () => void
  onCambio: () => void
  onImprimir: (datos: any) => void
}) {
  const [resumen, setResumen] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<number>(6)
  const [importe, setImporte] = useState("")
  const [deduceGanancias, setDeduceGanancias] = useState(false)
  const [facturaNC, setFacturaNC] = useState<any>(null)
  const [importeNC, setImporteNC] = useState("")
  const operacionRef = useRef(nuevaOperacionId())

  const cargar = async () => {
    if (!presupuestoId) return
    setCargando(true)
    setError(null)
    try {
      const r = await resumenFacturacion(presupuestoId)
      setResumen(r)
      const permitidos = tiposDe(r)
      setTipo(permitidos[0])
      setImporte(String(r.facturable || ""))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (presupuestoId) {
      operacionRef.current = nuevaOperacionId()
      setFacturaNC(null)
      setDeduceGanancias(false)
      cargar()
    } else {
      setResumen(null)
    }
  }, [presupuestoId])

  const tiposDe = (r: any) => tiposFacturaPermitidos(
    r?.emisor?.condicion_iva === "Monotributo" ? "Monotributo" : "Responsable Inscripto",
    normalizarCondicion(r?.receptor?.condicion_iva),
    Boolean(r?.emisor?.factura_a_monotributo)
  )

  const imprimir = async (comprobante: any, r = resumen) => {
    onImprimir(await datosParaImprimir(r, comprobante))
  }

  const terminar = async (comprobante: any) => {
    operacionRef.current = nuevaOperacionId()
    const r = await resumenFacturacion(presupuestoId!)
    setResumen(r)
    setImporte(String(r.facturable || ""))
    setFacturaNC(null)
    onCambio()
    await imprimir(comprobante, r)
  }

  const handleEmitir = async () => {
    const monto = Number(importe)
    if (!monto || monto <= 0) return setError("Ingresá un importe válido.")
    if (monto > Number(resumen.facturable) + 0.009) return setError(`Solo se puede facturar lo cobrado: ${plata(resumen.facturable)}.`)
    if (!confirm(`¿Emitir ${NOMBRE_CBTE[tipo]} por ${plata(monto)}${resumen.ambiente !== "produccion" ? " (MODO PRUEBA)" : ""}?`)) return
    setEnviando(true)
    setError(null)
    try {
      const factura = await emitirFactura({
        operacion: operacionRef.current, presupuesto_id: presupuestoId!, importe: monto,
        cbte_tipo: tipo, deduce_ganancias: deduceGanancias,
      })
      await terminar(factura)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleEmitirNC = async () => {
    const monto = Number(importeNC)
    if (!monto || monto <= 0) return setError("Ingresá un importe válido.")
    if (monto > Number(facturaNC.nc_restante) + 0.009) return setError(`La nota de crédito no puede superar ${plata(facturaNC.nc_restante)}.`)
    if (!confirm(`¿Emitir Nota de Crédito ${facturaNC.tipo_factura} por ${plata(monto)} sobre la factura ${numeroComprobante(facturaNC.punto_venta, facturaNC.numero_factura)}?`)) return
    setEnviando(true)
    setError(null)
    try {
      const nota = await emitirNotaCredito({ operacion: operacionRef.current, factura_id: facturaNC.id, importe: monto })
      await terminar(nota)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const permitidos = resumen ? tiposDe(resumen) : []
  const condicion = normalizarCondicion(resumen?.receptor?.condicion_iva)
  let avisoDocumento: string | null = null
  if (resumen?.receptor && Number(importe) > 0) {
    try {
      documentoReceptor({ documento: resumen.receptor.documento, condicion, cbteTipo: tipo, importe: Number(importe), deduceGanancias })
    } catch (e: any) {
      avisoDocumento = e.message
    }
  }

  return (
    <Dialog open={!!presupuestoId} onOpenChange={(abierto) => { if (!abierto && !enviando) onClose() }}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Receipt className="w-5 h-5 text-primary" /> Facturación ARCA {resumen ? `· PRE-${resumen.presupuesto.numero}` : ""}
            {resumen && resumen.ambiente !== "produccion" && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 border">MODO PRUEBA</Badge>
            )}
          </DialogTitle>
          <DialogDescription>Se factura sobre lo cobrado. Las notas de crédito se emiten desde una factura.</DialogDescription>
        </DialogHeader>

        {cargando || !resumen ? (
          <div className="py-10 flex justify-center">{error ? <p className="text-red-600 text-sm">{error}</p> : <Loader2 className="w-6 h-6 animate-spin" />}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Cobrado</p><p className="font-bold">{plata(resumen.cobrado)}</p></div>
              <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Facturado</p><p className="font-bold">{plata(resumen.facturado)}</p></div>
              <div className="rounded-xl border border-primary/40 p-3"><p className="text-xs text-muted-foreground">Disponible para facturar</p><p className="font-bold text-primary">{plata(resumen.facturable)}</p></div>
            </div>

            <div className="rounded-xl border border-border p-3 text-sm">
              {resumen.receptor ? (
                <p><span className="font-semibold">{resumen.receptor.nombre}</span> · {resumen.receptor.condicion_iva} · {resumen.receptor.documento || "sin documento"}</p>
              ) : (
                <p className="text-red-600">El vehículo no tiene un cliente asignado.</p>
              )}
            </div>

            {!facturaNC && Number(resumen.facturable) > 0 && resumen.receptor && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo de comprobante</Label>
                    <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={tipo} onChange={(e) => setTipo(Number(e.target.value))}>
                      {permitidos.map(t => <option key={t} value={t}>{NOMBRE_CBTE[t]}</option>)}
                    </select>
                    {permitidos.length === 1 && <p className="text-[11px] text-muted-foreground">Es el único que corresponde para un cliente {condicion}.</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Importe a facturar (con IVA)</Label>
                    <Input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} />
                  </div>
                </div>
                {LETRA_CBTE[tipo] === "B" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={deduceGanancias} onChange={(e) => setDeduceGanancias(e.target.checked)} />
                    El cliente lo va a deducir en Ganancias (lleva su CUIT)
                  </label>
                )}
                {avisoDocumento && (
                  <p className="text-sm text-amber-700 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {avisoDocumento}</p>
                )}
              </div>
            )}

            {facturaNC && (
              <div className="space-y-3 rounded-xl border border-amber-300 p-4">
                <p className="text-sm font-semibold">Nota de Crédito {facturaNC.tipo_factura} sobre la factura {numeroComprobante(facturaNC.punto_venta, facturaNC.numero_factura)}</p>
                <div className="space-y-1">
                  <Label>Importe (máximo {plata(facturaNC.nc_restante)})</Label>
                  <Input type="number" min="0" step="0.01" value={importeNC} onChange={(e) => setImporteNC(e.target.value)} />
                </div>
              </div>
            )}

            {resumen.comprobantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Comprobantes emitidos</p>
                {resumen.comprobantes.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm gap-2">
                    <div>
                      <p className="font-medium">{NOMBRE_CBTE[c.cbte_tipo]} {c.numero_factura ? numeroComprobante(c.punto_venta, c.numero_factura) : ""} · {plata(c.total_final)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.ambiente === "produccion" ? "" : "Prueba · "}{c.fecha_cbte}{c.observaciones ? ` · ${c.observaciones}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`border ${COLOR_ESTADO[c.estado] || ""}`}>{c.estado}</Badge>
                      {c.estado === "autorizada" && (
                        <Button size="sm" variant="outline" onClick={() => imprimir(c)}><Printer className="w-4 h-4" /></Button>
                      )}
                      {esFactura(c.cbte_tipo) && c.estado === "autorizada" && Number(c.nc_restante) > 0 && (
                        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700"
                          onClick={() => { setFacturaNC(c); setImporteNC(String(c.nc_restante)); setError(null); operacionRef.current = nuevaOperacionId() }}>
                          <FileMinus className="w-4 h-4 mr-1" /> Nota de crédito
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</p>}
          </div>
        )}

        <DialogFooter>
          {facturaNC ? (
            <>
              <Button variant="ghost" onClick={() => setFacturaNC(null)} disabled={enviando}>Volver</Button>
              <Button onClick={handleEmitirNC} disabled={enviando} className="bg-amber-600 hover:bg-amber-700 text-white">
                {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Emitir Nota de Crédito
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={enviando}>Cerrar</Button>
              {resumen && Number(resumen.facturable) > 0 && resumen.receptor && (
                <Button onClick={handleEmitir} disabled={enviando || !!avisoDocumento} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Emitir {NOMBRE_CBTE[tipo]}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
