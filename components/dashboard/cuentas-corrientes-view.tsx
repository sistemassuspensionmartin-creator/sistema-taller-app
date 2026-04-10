"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Building2, Users, Plus, FileText, ArrowDownRight, ArrowUpRight, 
  Wallet, Search, Receipt, Loader2, User, HandCoins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export function CuentasCorrientesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Datos Globales
  const [busquedaLedgerProv, setBusquedaLedgerProv] = useState("")
  const [proveedores, setProveedores] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [cajas, setCajas] = useState<any[]>([])
  const [movimientosLedger, setMovimientosLedger] = useState<any[]>([])

  // Buscadores
  const [busquedaProveedor, setBusquedaProveedor] = useState("")
  const [busquedaCliente, setBusquedaCliente] = useState("")
  
  // ESTADOS: PROVEEDORES
  const [isNuevoProveedorOpen, setIsNuevoProveedorOpen] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", telefono: "", cuit: "", notas: "" })
  const [isFacturaOpen, setIsFacturaOpen] = useState(false)
  const [provSeleccionado, setProvSeleccionado] = useState<any>(null)
  const [datosFactura, setDatosFactura] = useState({ monto: "", comprobante: "", detalle: "" })
  const [isPagoOpen, setIsPagoOpen] = useState(false)
  const [datosPago, setDatosPago] = useState({ monto: "", caja_origen_id: "", comprobante: "", detalle: "" })
  const [isLedgerProvOpen, setIsLedgerProvOpen] = useState(false)

  // ESTADOS: CLIENTES
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [isCargoClienteOpen, setIsCargoClienteOpen] = useState(false)
  const [datosCargoCliente, setDatosCargoCliente] = useState({ monto: "", comprobante: "", detalle: "" })
  const [isCobroClienteOpen, setIsCobroClienteOpen] = useState(false)
  const [datosCobroCliente, setDatosCobroCliente] = useState({ monto: "", caja_destino_id: "", comprobante: "", detalle: "" })
  const [isLedgerClienteOpen, setIsLedgerClienteOpen] = useState(false)

  const cargarDatosBase = async () => {
    setIsLoading(true)
    try {
      const [{ data: provs }, { data: cjs }, { data: clis }] = await Promise.all([
        supabase.from('proveedores').select('*').order('nombre'),
        supabase.from('cajas').select('*').order('nombre'),
        supabase.from('clientes').select('*').order('fecha_registro', { ascending: false })
      ])
      
      setProveedores(provs || [])
      setCajas(cjs || [])
      setClientes(clis || [])
    } catch (error) {
      console.error("Error al cargar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { cargarDatosBase() }, [])

  // =========================================================================
  // LÓGICA DE PROVEEDORES
  // =========================================================================
  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.nombre) return alert("El nombre es obligatorio")
    setIsSaving(true)
    try {
      const { error } = await supabase.from('proveedores').insert([nuevoProveedor])
      if (error) throw error
      setIsNuevoProveedorOpen(false)
      setNuevoProveedor({ nombre: "", telefono: "", cuit: "", notas: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al crear: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const handleCargarFactura = async () => {
    const montoNum = parseFloat(datosFactura.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    setIsSaving(true)
    try {
      await supabase.from('movimientos_proveedores').insert([{
        proveedor_id: provSeleccionado.id, tipo: 'factura_compra', monto: montoNum,
        comprobante: datosFactura.comprobante, detalle: datosFactura.detalle || 'Compra / Ingreso de mercadería'
      }])
      const nuevoSaldo = Number(provSeleccionado.saldo || 0) + montoNum
      await supabase.from('proveedores').update({ saldo: nuevoSaldo }).eq('id', provSeleccionado.id)
      setIsFacturaOpen(false)
      setDatosFactura({ monto: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al cargar factura: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(datosPago.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    if (!datosPago.caja_origen_id) return alert("Seleccione de qué caja sale el dinero")

    const cajaSeleccionada = cajas.find(c => c.id === datosPago.caja_origen_id)
    if (Number(cajaSeleccionada.saldo || 0) < montoNum) return alert(`No hay fondos suficientes en la caja ${cajaSeleccionada.nombre}`)

    setIsSaving(true)
    try {
      const nuevoSaldoCaja = Number(cajaSeleccionada.saldo) - montoNum
      await supabase.from('cajas').update({ saldo: nuevoSaldoCaja }).eq('id', datosPago.caja_origen_id)

      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'egreso_gasto', caja_origen_id: datosPago.caja_origen_id, monto: montoNum,
        metodo_pago: cajaSeleccionada.nombre.includes('Efectivo') || cajaSeleccionada.nombre.includes('Mostrador') ? 'Efectivo' : 'Transferencia',
        detalle: `Pago a Proveedor: ${provSeleccionado.nombre}`, notas: `Ref: ${datosPago.comprobante}`
      }])

      await supabase.from('movimientos_proveedores').insert([{
        proveedor_id: provSeleccionado.id, tipo: 'pago_proveedor', monto: montoNum, caja_origen_id: datosPago.caja_origen_id,
        comprobante: datosPago.comprobante, detalle: datosPago.detalle || 'Pago a cuenta'
      }])

      const nuevoSaldoProv = Number(provSeleccionado.saldo || 0) - montoNum
      await supabase.from('proveedores').update({ saldo: nuevoSaldoProv }).eq('id', provSeleccionado.id)

      setIsPagoOpen(false)
      setDatosPago({ monto: "", caja_origen_id: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al procesar el pago: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const abrirLedgerProv = async (prov: any) => {
    setProvSeleccionado(prov)
    setIsLedgerProvOpen(true)
    setMovimientosLedger([]) 
    try {
      const { data } = await supabase.from('movimientos_proveedores').select('*').eq('proveedor_id', prov.id).order('fecha', { ascending: false })
      setMovimientosLedger(data || [])
    } catch (error) { console.error("Error", error) }
  }

  // =========================================================================
  // LÓGICA DE CLIENTES
  // =========================================================================
  const getNombreCliente = (c: any) => c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`.trim()

  const handleSumarDeudaCliente = async () => {
    const montoNum = parseFloat(datosCargoCliente.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    setIsSaving(true)
    try {
      await supabase.from('movimientos_clientes').insert([{
        cliente_id: clienteSeleccionado.id, tipo: 'cargo_deuda', monto: montoNum,
        comprobante: datosCargoCliente.comprobante, detalle: datosCargoCliente.detalle || 'Cargo / Trabajo realizado'
      }])
      const nuevoSaldo = Number(clienteSeleccionado.saldo || 0) + montoNum
      await supabase.from('clientes').update({ saldo: nuevoSaldo }).eq('id', clienteSeleccionado.id)
      setIsCargoClienteOpen(false)
      setDatosCargoCliente({ monto: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al cargar deuda: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const handleCobrarCliente = async () => {
    const montoNum = parseFloat(datosCobroCliente.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    if (!datosCobroCliente.caja_destino_id) return alert("Seleccione a qué caja entra el dinero")

    const cajaSeleccionada = cajas.find(c => c.id === datosCobroCliente.caja_destino_id)
    setIsSaving(true)
    try {
      const nuevoSaldoCaja = Number(cajaSeleccionada.saldo) + montoNum
      await supabase.from('cajas').update({ saldo: nuevoSaldoCaja }).eq('id', datosCobroCliente.caja_destino_id)

      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'ingreso_cobro', caja_destino_id: datosCobroCliente.caja_destino_id, monto: montoNum,
        metodo_pago: cajaSeleccionada.nombre.includes('Efectivo') || cajaSeleccionada.nombre.includes('Mostrador') ? 'Efectivo' : 'Transferencia',
        detalle: `Cobro a Cliente: ${getNombreCliente(clienteSeleccionado)}`, notas: `Ref: ${datosCobroCliente.comprobante}`
      }])

      await supabase.from('movimientos_clientes').insert([{
        cliente_id: clienteSeleccionado.id, tipo: 'pago_ingreso', monto: montoNum, caja_destino_id: datosCobroCliente.caja_destino_id,
        comprobante: datosCobroCliente.comprobante, detalle: datosCobroCliente.detalle || 'Pago / Seña recibida'
      }])

      // Restamos al saldo. Si debía $100 y paga $150, el saldo queda en -$50 (A favor del cliente).
      const nuevoSaldoCli = Number(clienteSeleccionado.saldo || 0) - montoNum
      await supabase.from('clientes').update({ saldo: nuevoSaldoCli }).eq('id', clienteSeleccionado.id)

      setIsCobroClienteOpen(false)
      setDatosCobroCliente({ monto: "", caja_destino_id: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al procesar el cobro: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const abrirLedgerCliente = async (cli: any) => {
    setClienteSeleccionado(cli)
    setIsLedgerClienteOpen(true)
    setMovimientosLedger([]) 
    try {
      const { data } = await supabase.from('movimientos_clientes').select('*').eq('cliente_id', cli.id).order('fecha', { ascending: false })
      setMovimientosLedger(data || [])
    } catch (error) { console.error("Error", error) }
  }


  // =========================================================================
  // RENDERIZADO
  // =========================================================================
  const getTotalDeudaProveedores = () => proveedores.reduce((acc, prov) => acc + Number(prov.saldo || 0), 0)
  const getTotalCobrarClientes = () => clientes.reduce((acc, cli) => acc + (Number(cli.saldo) > 0 ? Number(cli.saldo) : 0), 0)

  const proveedoresFiltrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) || (p.cuit && p.cuit.includes(busquedaProveedor)))
  const clientesFiltrados = clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
    (c.apellido && c.apellido.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
    (c.razon_social && c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
    (c.documento && c.documento.includes(busquedaCliente))
  )
  const ledgerProvFiltrado = movimientosLedger.filter(mov => {
    if (!busquedaLedgerProv) return true;
    const b = busquedaLedgerProv.toLowerCase();
    const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
    const monto = mov.monto.toString();
    const detalle = (mov.detalle || '').toLowerCase();
    const ref = (mov.comprobante || '').toLowerCase();
    return fecha.includes(b) || monto.includes(b) || detalle.includes(b) || ref.includes(b);
  });

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-300">
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Cuentas Corrientes</h2>
          <p className="text-sm text-muted-foreground">Gestión de deudas, cobros y saldos a favor.</p>
        </div>
      </div>

      <Tabs defaultValue="clientes" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 shrink-0">
          <TabsTrigger value="clientes" className="data-[state=active]:bg-card data-[state=active]:text-blue-600">
            <Users className="w-4 h-4 mr-2" /> Clientes (A Cobrar)
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="data-[state=active]:bg-card data-[state=active]:text-rose-600">
            <Building2 className="w-4 h-4 mr-2" /> Proveedores (A Pagar)
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA A: CLIENTES --- */}
        <TabsContent value="clientes" className="flex-1 flex flex-col min-h-0 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
            <Card className="border-border shadow-sm md:col-span-3 flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total a Cobrar</p>
                <h3 className="text-3xl font-black text-blue-600 font-mono">
                  ${getTotalCobrarClientes().toLocaleString()}
                </h3>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <HandCoins className="w-8 h-8 text-blue-600" />
              </div>
            </Card>
          </div>

          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente por nombre o CUIT..." className="pl-9 bg-card border-border" value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} />
            </div>
          </div>

          <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Cliente / Razón Social</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground animate-pulse">Cargando clientes...</TableCell></TableRow>
                  ) : clientesFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No se encontraron clientes.</TableCell></TableRow>
                  ) : (
                    clientesFiltrados.map((cli) => {
                      const nombre = getNombreCliente(cli);
                      const saldo = Number(cli.saldo || 0);
                      return (
                        <TableRow key={cli.id} className="hover:bg-secondary/20">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {cli.tipo_cliente === 'empresa' ? <Building2 className="w-4 h-4 text-muted-foreground" /> : <User className="w-4 h-4 text-muted-foreground" />}
                              <div className="font-bold text-foreground">{nombre}</div>
                            </div>
                            {cli.documento && <div className="text-xs text-muted-foreground font-mono ml-6">CUIT/DNI: {cli.documento}</div>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{cli.telefono || '-'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-lg">
                            <span className={saldo > 0 ? "text-rose-600" : saldo < 0 ? "text-blue-600" : "text-foreground"}>
                              {saldo < 0 ? `+ $${Math.abs(saldo).toLocaleString()}` : `$${saldo.toLocaleString()}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {saldo > 0 ? (
                              <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Nos Debe</Badge>
                            ) : saldo < 0 ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Saldo a Favor</Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Al Día</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => abrirLedgerCliente(cli)}>
                                <Search className="w-3 h-3 mr-1" /> Ficha
                              </Button>
                              <Button size="sm" variant="secondary" className="h-8 bg-slate-100 hover:bg-slate-200 text-slate-700" 
                                onClick={() => { setClienteSeleccionado(cli); setIsCargoClienteOpen(true); }}>
                                <FileText className="w-3 h-3 mr-1" /> Cargar Deuda
                              </Button>
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" 
                                onClick={() => { setClienteSeleccionado(cli); setIsCobroClienteOpen(true); }}>
                                <HandCoins className="w-3 h-3 mr-1" /> Ingresar Pago
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA B: PROVEEDORES --- */}
        <TabsContent value="proveedores" className="flex-1 flex flex-col min-h-0 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
            <Card className="border-border shadow-sm md:col-span-2 flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total a Pagar</p>
                <h3 className="text-3xl font-black text-rose-600 font-mono">
                  ${getTotalDeudaProveedores().toLocaleString()}
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

          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o CUIT..." className="pl-9 bg-card border-border" value={busquedaProveedor} onChange={(e) => setBusquedaProveedor(e.target.value)} />
            </div>
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
                  ) : proveedoresFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">{busquedaProveedor ? "Sin resultados." : "Aún no hay proveedores."}</TableCell></TableRow>
                  ) : (
                    proveedoresFiltrados.map((prov) => (
                      <TableRow key={prov.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <div className="font-bold text-foreground uppercase tracking-wide">{prov.nombre}</div>
                          {prov.cuit && <div className="text-xs text-muted-foreground font-mono">CUIT: {prov.cuit}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{prov.telefono || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">${Number(prov.saldo).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          {Number(prov.saldo) > 0 ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Con Deuda</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Al Día</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => abrirLedgerProv(prov)}><Search className="w-3 h-3 mr-1" /> Resumen</Button>
                            <Button size="sm" variant="secondary" className="h-8 bg-slate-100 hover:bg-slate-200 text-slate-700" onClick={() => { setProvSeleccionado(prov); setIsFacturaOpen(true); }}><FileText className="w-3 h-3 mr-1" /> Cargar Fra</Button>
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={Number(prov.saldo) <= 0} onClick={() => { setProvSeleccionado(prov); setIsPagoOpen(true); }}><Wallet className="w-3 h-3 mr-1" /> Pagar</Button>
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


      {/* ================= MODALES DE CLIENTES ================= */}
      
      {/* Modal: Cargar Deuda al Cliente */}
      <Dialog open={isCargoClienteOpen} onOpenChange={setIsCargoClienteOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-rose-600"><ArrowUpRight className="w-5 h-5" /> Sumar Deuda al Cliente</DialogTitle></DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground uppercase font-bold">Cliente</p>
                <p className="font-bold text-foreground">{getNombreCliente(clienteSeleccionado)}</p>
              </div>
              <div className="space-y-2"><Label>Monto de la Deuda ($)</Label><Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosCargoCliente.monto} onChange={e => setDatosCargoCliente({...datosCargoCliente, monto: e.target.value})} /></div>
              <div className="space-y-2"><Label>Nº Presupuesto / Factura (Opcional)</Label><Input placeholder="Ej: PRE-0012" value={datosCargoCliente.comprobante} onChange={e => setDatosCargoCliente({...datosCargoCliente, comprobante: e.target.value})} /></div>
              <div className="space-y-2"><Label>Detalle / Motivo</Label><Input placeholder="Ej: Cambio de aceite no facturado..." value={datosCargoCliente.detalle} onChange={e => setDatosCargoCliente({...datosCargoCliente, detalle: e.target.value})} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCargoClienteOpen(false)}>Cancelar</Button>
            <Button onClick={handleSumarDeudaCliente} disabled={isSaving} className="bg-rose-600 text-white hover:bg-rose-700">{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Cargar Deuda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ingresar Cobro / Seña del Cliente */}
      <Dialog open={isCobroClienteOpen} onOpenChange={setIsCobroClienteOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-blue-600"><HandCoins className="w-5 h-5" /> Registrar Ingreso de Dinero</DialogTitle></DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg border border-border">
                <div><p className="text-xs text-muted-foreground uppercase font-bold">Cliente</p><p className="font-bold text-foreground">{getNombreCliente(clienteSeleccionado)}</p></div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Actual</p>
                  <p className={`font-mono font-bold ${Number(clienteSeleccionado.saldo) > 0 ? "text-rose-600" : "text-blue-600"}`}>
                    {Number(clienteSeleccionado.saldo) < 0 ? `A Favor: $${Math.abs(Number(clienteSeleccionado.saldo)).toLocaleString()}` : `Debe: $${Number(clienteSeleccionado.saldo || 0).toLocaleString()}`}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2"><Label>Monto Entregado ($)</Label><Input type="number" className="text-lg font-mono font-bold h-12 border-blue-300 focus-visible:ring-blue-500" autoFocus value={datosCobroCliente.monto} onChange={e => setDatosCobroCliente({...datosCobroCliente, monto: e.target.value})} /></div>
              <div className="space-y-2"><Label>¿A qué caja ingresa la plata?</Label>
                <Select value={datosCobroCliente.caja_destino_id} onValueChange={(val: string) => setDatosCobroCliente({...datosCobroCliente, caja_destino_id: val})}>
                  <SelectTrigger className="h-10 border-blue-200"><SelectValue placeholder="Seleccionar Caja destino..." /></SelectTrigger>
                  <SelectContent>{cajas.map(c => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Recibo Nº (Opcional)</Label><Input value={datosCobroCliente.comprobante} onChange={e => setDatosCobroCliente({...datosCobroCliente, comprobante: e.target.value})} /></div>
                <div className="space-y-2"><Label>Notas</Label><Input placeholder="Ej: Seña por repuestos..." value={datosCobroCliente.detalle} onChange={e => setDatosCobroCliente({...datosCobroCliente, detalle: e.target.value})} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCobroClienteOpen(false)}>Cancelar</Button>
            <Button onClick={handleCobrarCliente} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Cobrar e Ingresar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial Cliente */}
      <Dialog open={isLedgerClienteOpen} onOpenChange={setIsLedgerClienteOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Ficha de Cuenta: {clienteSeleccionado && getNombreCliente(clienteSeleccionado)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4 border rounded-md border-border">
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0">
                <TableRow><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead>Detalle / Ref</TableHead><TableHead className="text-right">Monto</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {movimientosLedger.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin movimientos.</TableCell></TableRow>
                ) : (
                  movimientosLedger.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-muted-foreground text-sm font-mono">{new Date(mov.fecha).toLocaleDateString('es-AR')} {new Date(mov.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</TableCell>
                      <TableCell>
                        {mov.tipo === 'cargo_deuda' ? <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50"><ArrowUpRight className="w-3 h-3 mr-1"/> Cargo</Badge> : <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><ArrowDownRight className="w-3 h-3 mr-1"/> Pago</Badge>}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{mov.detalle}</p>
                        <div className="flex gap-2 items-center mt-1">
                          {mov.comprobante && <span className="text-xs text-muted-foreground">Doc: {mov.comprobante}</span>}
                          {mov.caja_destino_id && <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">Entró a {cajas.find(c => c.id === mov.caja_destino_id)?.nombre || 'Caja'}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${mov.tipo === 'cargo_deuda' ? 'text-rose-600' : 'text-blue-600'}`}>
                        {mov.tipo === 'cargo_deuda' ? '+' : '-'}${Number(mov.monto).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= MODALES DE PROVEEDORES (YA LOS TENÍAMOS) ================= */}
    
      
      {/* Modal: Crear Proveedor */}
      <Dialog open={isNuevoProveedorOpen} onOpenChange={setIsNuevoProveedorOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Nuevo Proveedor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre / Razón Social *</Label><Input value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CUIT</Label><Input value={nuevoProveedor.cuit} onChange={e => setNuevoProveedor({...nuevoProveedor, cuit: e.target.value})} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsNuevoProveedorOpen(false)}>Cancelar</Button><Button onClick={handleCrearProveedor} disabled={isSaving || !nuevoProveedor.nombre}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cargar Factura Proveedor */}
      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-rose-600"><ArrowUpRight className="w-5 h-5" /> Registrar Compra</DialogTitle></DialogHeader>
          {provSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Monto Factura ($)</Label><Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosFactura.monto} onChange={e => setDatosFactura({...datosFactura, monto: e.target.value})} /></div>
              <div className="space-y-2"><Label>Nº Comprobante</Label><Input value={datosFactura.comprobante} onChange={e => setDatosFactura({...datosFactura, comprobante: e.target.value})} /></div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setIsFacturaOpen(false)}>Cancelar</Button><Button onClick={handleCargarFactura} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white">Registrar Deuda</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Pagar Proveedor */}
      <Dialog open={isPagoOpen} onOpenChange={setIsPagoOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-emerald-600"><Wallet className="w-5 h-5" /> Registrar Pago</DialogTitle></DialogHeader>
          {provSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Monto a Pagar ($)</Label><Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosPago.monto} onChange={e => setDatosPago({...datosPago, monto: e.target.value})} /></div>
              <div className="space-y-2"><Label>Caja de origen</Label>
                <Select value={datosPago.caja_origen_id} onValueChange={(val: string) => setDatosPago({...datosPago, caja_origen_id: val})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Caja origen..." /></SelectTrigger>
                  <SelectContent>{cajas.map(c => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setIsPagoOpen(false)}>Cancelar</Button><Button onClick={handleRegistrarPago} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">Pagar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial Proveedor (Versión Ampliada y con Buscador) */}
      <Dialog open={isLedgerProvOpen} onOpenChange={setIsLedgerProvOpen}>
        {/* Cambiamos max-w-2xl por max-w-4xl para que sea bien ancho */}
        <DialogContent className="max-w-4xl border-border bg-card h-[85vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b border-border">
            <DialogTitle className="text-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> 
                Resumen de Cuenta: {provSeleccionado?.nombre}
              </span>
              <span className="font-mono text-xl text-rose-600">
                Deuda Actual: ${Number(provSeleccionado?.saldo || 0).toLocaleString()}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0 p-6">
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por fecha (ej: 10/4), monto, detalle o comprobante..." 
                className="pl-9 bg-secondary/50 border-border"
                value={busquedaLedgerProv}
                onChange={(e) => setBusquedaLedgerProv(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md border-border">
              <Table>
                <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm shadow-sm">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead>Detalle / Ref</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerProvFiltrado.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      {busquedaLedgerProv ? "No se encontraron movimientos con esa búsqueda." : "No hay movimientos registrados en la cuenta de este proveedor."}
                    </TableCell></TableRow>
                  ) : (
                    ledgerProvFiltrado.map(mov => (
                      <TableRow key={mov.id} className="hover:bg-secondary/20">
                        <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                          <span className="font-bold text-foreground">{new Date(mov.fecha).toLocaleDateString('es-AR')}</span>
                        </TableCell>
                        <TableCell>
                          {mov.tipo === 'factura_compra' ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 shadow-sm">
                              <ArrowUpRight className="w-3 h-3 mr-1"/> Compra
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 shadow-sm">
                              <ArrowDownRight className="w-3 h-3 mr-1"/> Pago
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{mov.detalle || 'Sin detalle especificado'}</p>
                          <div className="flex gap-2 items-center mt-1">
                            {mov.comprobante && <span className="text-xs text-muted-foreground">Doc: <span className="font-mono">{mov.comprobante}</span></span>}
                            {mov.caja_origen_id && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
                                Vía {cajas.find(c => c.id === mov.caja_origen_id)?.nombre || 'Caja Desconocida'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold text-lg ${mov.tipo === 'factura_compra' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {mov.tipo === 'factura_compra' ? '+' : '-'}${Number(mov.monto).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}