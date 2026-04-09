"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Building2, Users, Plus, FileText, ArrowDownRight, ArrowUpRight, 
  Wallet, Search, Landmark, Receipt, Loader2, ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CuentasCorrientesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Datos
  const [proveedores, setProveedores] = useState<any[]>([])
  const [cajas, setCajas] = useState<any[]>([])
  const [movimientosLedger, setMovimientosLedger] = useState<any[]>([])
  
  // Estado Modal Proveedor
  const [isNuevoProveedorOpen, setIsNuevoProveedorOpen] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", telefono: "", cuit: "", notas: "" })

  // Estado Modal Factura (Aumenta deuda)
  const [isFacturaOpen, setIsFacturaOpen] = useState(false)
  const [provSeleccionado, setProvSeleccionado] = useState<any>(null)
  const [datosFactura, setDatosFactura] = useState({ monto: "", comprobante: "", detalle: "" })

  // Estado Modal Pago (Disminuye deuda)
  const [isPagoOpen, setIsPagoOpen] = useState(false)
  const [datosPago, setDatosPago] = useState({ monto: "", caja_origen_id: "", comprobante: "", detalle: "" })

  // Estado Modal Ledger (Resumen de cuenta)
  const [isLedgerOpen, setIsLedgerOpen] = useState(false)

  const cargarDatosBase = async () => {
    setIsLoading(true)
    try {
      const [{ data: provs }, { data: cjs }] = await Promise.all([
        supabase.from('proveedores').select('*').order('nombre'),
        supabase.from('cajas').select('*').order('nombre')
      ])
      
      setProveedores(provs || [])
      setCajas(cjs || [])
    } catch (error) {
      console.error("Error al cargar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargarDatosBase()
  }, [])

  // --- 1. CREAR PROVEEDOR ---
  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.nombre) return alert("El nombre es obligatorio")
    
    setIsSaving(true)
    try {
      const { error } = await supabase.from('proveedores').insert([nuevoProveedor])
      if (error) throw error
      
      setIsNuevoProveedorOpen(false)
      setNuevoProveedor({ nombre: "", telefono: "", cuit: "", notas: "" })
      cargarDatosBase()
    } catch (error: any) {
      alert("Error al crear: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- 2. CARGAR FACTURA (SUMA DEUDA) ---
  const handleCargarFactura = async () => {
    const montoNum = parseFloat(datosFactura.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    
    setIsSaving(true)
    try {
      // 1. Guardar el movimiento
      await supabase.from('movimientos_proveedores').insert([{
        proveedor_id: provSeleccionado.id,
        tipo: 'factura_compra',
        monto: montoNum,
        comprobante: datosFactura.comprobante,
        detalle: datosFactura.detalle || 'Compra / Ingreso de mercadería'
      }])

      // 2. Aumentar el saldo del proveedor
      const nuevoSaldo = Number(provSeleccionado.saldo || 0) + montoNum
      await supabase.from('proveedores').update({ saldo: nuevoSaldo }).eq('id', provSeleccionado.id)

      setIsFacturaOpen(false)
      setDatosFactura({ monto: "", comprobante: "", detalle: "" })
      cargarDatosBase()
      alert("Factura cargada correctamente. El saldo a pagar ha aumentado.")
    } catch (error: any) {
      alert("Error al cargar factura: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- 3. REGISTRAR PAGO (RESTA DEUDA Y SACA PLATA DE LA CAJA) ---
  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(datosPago.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    if (!datosPago.caja_origen_id) return alert("Seleccione de qué caja sale el dinero")

    const cajaSeleccionada = cajas.find(c => c.id === datosPago.caja_origen_id)
    if (Number(cajaSeleccionada.saldo || 0) < montoNum) return alert(`No hay fondos suficientes en la caja ${cajaSeleccionada.nombre}`)

    setIsSaving(true)
    try {
      // 1. Restar plata de la Caja Principal
      const nuevoSaldoCaja = Number(cajaSeleccionada.saldo) - montoNum
      await supabase.from('cajas').update({ saldo: nuevoSaldoCaja }).eq('id', datosPago.caja_origen_id)

      // 2. Anotar el Egreso en la Cinta de la Caja
      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'egreso_gasto',
        caja_origen_id: datosPago.caja_origen_id,
        monto: montoNum,
        metodo_pago: cajaSeleccionada.nombre.includes('Efectivo') || cajaSeleccionada.nombre.includes('Mostrador') ? 'Efectivo' : 'Transferencia',
        detalle: `Pago a Proveedor: ${provSeleccionado.nombre}`,
        notas: `Ref: ${datosPago.comprobante}`
      }])

      // 3. Guardar el movimiento en la cuenta del proveedor
      await supabase.from('movimientos_proveedores').insert([{
        proveedor_id: provSeleccionado.id,
        tipo: 'pago_proveedor',
        monto: montoNum,
        caja_origen_id: datosPago.caja_origen_id,
        comprobante: datosPago.comprobante,
        detalle: datosPago.detalle || 'Pago a cuenta'
      }])

      // 4. Achicar la deuda del proveedor
      const nuevoSaldoProv = Number(provSeleccionado.saldo || 0) - montoNum
      await supabase.from('proveedores').update({ saldo: nuevoSaldoProv }).eq('id', provSeleccionado.id)

      setIsPagoOpen(false)
      setDatosPago({ monto: "", caja_origen_id: "", comprobante: "", detalle: "" })
      cargarDatosBase()
      alert("¡Pago registrado! La plata se descontó de la caja y se achicó la deuda.")
    } catch (error: any) {
      alert("Error al procesar el pago: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- 4. VER RESUMEN DE CUENTA ---
  const abrirLedger = async (prov: any) => {
    setProvSeleccionado(prov)
    setIsLedgerOpen(true)
    setMovimientosLedger([]) // limpia mientras carga
    
    try {
      const { data, error } = await supabase
        .from('movimientos_proveedores')
        .select('*') // Le sacamos la búsqueda cruzada que daba error
        .eq('proveedor_id', prov.id)
        .order('fecha', { ascending: false })
      
      if (error) throw error;
      setMovimientosLedger(data || [])
    } catch (error) {
      console.error("Error al cargar historial", error)
    }
  }

  const getTotalDeuda = () => proveedores.reduce((acc, prov) => acc + Number(prov.saldo || 0), 0)

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-300">
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Cuentas Corrientes</h2>
          <p className="text-sm text-muted-foreground">Gestión de deudas y saldos a favor.</p>
        </div>
      </div>

      <Tabs defaultValue="proveedores" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 shrink-0">
          <TabsTrigger value="clientes" className="data-[state=active]:bg-card data-[state=active]:text-blue-600">
            <Users className="w-4 h-4 mr-2" /> Clientes (A Cobrar)
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="data-[state=active]:bg-card data-[state=active]:text-rose-600">
            <Building2 className="w-4 h-4 mr-2" /> Proveedores (A Pagar)
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA A: CLIENTES (A la espera de tu código) --- */}
        <TabsContent value="clientes" className="flex-1 flex flex-col min-h-0 bg-card rounded-lg border border-border p-8 items-center justify-center text-center m-0">
          <Users className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Módulo en Construcción</h3>
          <p className="text-muted-foreground max-w-md">
            Acá listaremos los saldos a favor y las deudas agrupadas por Cliente. <br/>
            (A la espera de la integración con el archivo <code className="bg-secondary px-1 py-0.5 rounded text-xs">clients-view.tsx</code>).
          </p>
        </TabsContent>


        {/* --- PESTAÑA B: PROVEEDORES --- */}
        <TabsContent value="proveedores" className="flex-1 flex flex-col min-h-0 m-0">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
            <Card className="border-border shadow-sm md:col-span-2 flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total a Pagar en la Calle</p>
                <h3 className="text-3xl font-black text-rose-600 font-mono">
                  ${getTotalDeuda().toLocaleString()}
                </h3>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-full">
                <Receipt className="w-8 h-8 text-rose-600" />
              </div>
            </Card>

            <Button onClick={() => setIsNuevoProveedorOpen(true)} className="h-full min-h-[100px] border-2 border-dashed border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary flex flex-col gap-2">
              <Plus className="w-6 h-6 text-primary" />
              <span>Nuevo Proveedor</span>
            </Button>
          </div>

          <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Proveedor / Empresa</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Saldo Actual</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground animate-pulse">Cargando proveedores...</TableCell></TableRow>
                  ) : proveedores.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Aún no hay proveedores registrados.</TableCell></TableRow>
                  ) : (
                    proveedores.map((prov) => (
                      <TableRow key={prov.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <div className="font-bold text-foreground uppercase tracking-wide">{prov.nombre}</div>
                          {prov.cuit && <div className="text-xs text-muted-foreground font-mono">CUIT: {prov.cuit}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{prov.telefono || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">
                          ${Number(prov.saldo).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(prov.saldo) > 0 ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Con Deuda</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Al Día</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => abrirLedger(prov)}>
                              <Search className="w-3 h-3 mr-1" /> Resumen
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 bg-slate-100 hover:bg-slate-200 text-slate-700" 
                              onClick={() => { setProvSeleccionado(prov); setIsFacturaOpen(true); }}>
                              <FileText className="w-3 h-3 mr-1" /> Cargar Fra
                            </Button>
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" 
                              disabled={Number(prov.saldo) <= 0}
                              onClick={() => { setProvSeleccionado(prov); setIsPagoOpen(true); }}>
                              <Wallet className="w-3 h-3 mr-1" /> Pagar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- MODALES --- */}

      {/* Modal: Crear Proveedor */}
      <Dialog open={isNuevoProveedorOpen} onOpenChange={setIsNuevoProveedorOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Nuevo Proveedor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre / Razón Social <span className="text-rose-500">*</span></Label>
              <Input placeholder="Ej: Repuestos El Chapa SRL" value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input placeholder="Ej: 30-12345678-9" value={nuevoProveedor.cuit} onChange={e => setNuevoProveedor({...nuevoProveedor, cuit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="Ej: 3512345678" value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input placeholder="Ej: Vende lubricantes marca X..." value={nuevoProveedor.notas} onChange={e => setNuevoProveedor({...nuevoProveedor, notas: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNuevoProveedorOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearProveedor} disabled={isSaving || !nuevoProveedor.nombre} className="bg-primary text-primary-foreground">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cargar Factura (Suma deuda) */}
      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-rose-600">
              <ArrowUpRight className="w-5 h-5" /> Registrar Compra (Aumentar Deuda)
            </DialogTitle>
          </DialogHeader>
          {provSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Proveedor</p>
                <p className="font-bold text-foreground">{provSeleccionado.nombre}</p>
              </div>
              <div className="space-y-2">
                <Label>Monto de la Factura ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12" autoFocus
                  value={datosFactura.monto} onChange={e => setDatosFactura({...datosFactura, monto: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nº Comprobante / Factura</Label>
                <Input placeholder="Ej: FC A 0001-00001234" 
                  value={datosFactura.comprobante} onChange={e => setDatosFactura({...datosFactura, comprobante: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Detalle de los artículos (Opcional)</Label>
                <Input placeholder="Ej: 2 tachos de aceite 10w40..." 
                  value={datosFactura.detalle} onChange={e => setDatosFactura({...datosFactura, detalle: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFacturaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCargarFactura} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Registrar Deuda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Pago (Resta deuda) */}
      <Dialog open={isPagoOpen} onOpenChange={setIsPagoOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-emerald-600">
              <Wallet className="w-5 h-5" /> Registrar Pago
            </DialogTitle>
          </DialogHeader>
          {provSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Proveedor</p>
                  <p className="font-bold text-foreground">{provSeleccionado.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Deuda Actual</p>
                  <p className="font-mono font-bold text-rose-600">${Number(provSeleccionado.saldo).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monto a Pagar ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12 border-emerald-300 focus-visible:ring-emerald-500" autoFocus
                  value={datosPago.monto} onChange={e => setDatosPago({...datosPago, monto: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>¿De qué caja sale la plata?</Label>
                <Select value={datosPago.caja_origen_id} onValueChange={(val: string) => setDatosPago({...datosPago, caja_origen_id: val})}>
                  <SelectTrigger className="h-10 border-emerald-200">
                    <SelectValue placeholder="Seleccionar Caja origen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cajas.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} <span className="text-muted-foreground font-mono text-xs">(Disp: ${Number(c.saldo).toLocaleString()})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recibo Nº (Opcional)</Label>
                  <Input value={datosPago.comprobante} onChange={e => setDatosPago({...datosPago, comprobante: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Input placeholder="Ej: Pago parcial..." value={datosPago.detalle} onChange={e => setDatosPago({...datosPago, detalle: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPagoOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrarPago} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Pagar y Descontar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial (Ledger) */}
      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> 
                Resumen de Cuenta: {provSeleccionado?.nombre}
              </span>
              <span className="font-mono text-xl mr-4 text-rose-600">
                Debe: ${Number(provSeleccionado?.saldo || 0).toLocaleString()}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto mt-4 border rounded-md border-border">
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Detalle / Ref</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosLedger.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay movimientos registrados.</TableCell></TableRow>
                ) : (
                  movimientosLedger.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-sm font-mono">
                        {new Date(mov.fecha).toLocaleDateString('es-AR')} {new Date(mov.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                      </TableCell>
                      <TableCell>
                        {mov.tipo === 'factura_compra' ? (
                          <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50"><ArrowUpRight className="w-3 h-3 mr-1"/> Compra</Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50"><ArrowDownRight className="w-3 h-3 mr-1"/> Pago</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{mov.detalle}</p>
                        <div className="flex gap-2 items-center mt-1">
                          {mov.comprobante && <span className="text-xs text-muted-foreground">Doc: {mov.comprobante}</span>}
                          {mov.caja_origen_id && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
                              Vía {cajas.find(c => c.id === mov.caja_origen_id)?.nombre || 'Caja Desconocida'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${mov.tipo === 'factura_compra' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {mov.tipo === 'factura_compra' ? '+' : '-'}${Number(mov.monto).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}