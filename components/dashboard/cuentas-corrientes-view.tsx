"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { ejecutarOperacion, nuevaOperacionId, resolverCajaDestino, TIPOS_TARJETA } from "@/lib/operaciones"
import {
  Building2, Users, Plus, FileText, ArrowDownRight, ArrowUpRight,
  Wallet, Search, Receipt, Loader2, User, HandCoins, Trash2, AlertCircle, Edit, FileMinus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
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
  const [nuevoProveedor, setNuevoProveedor] = useState<any>({ id: null, nombre: "", telefono: "", cuit: "", notas: "" })
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

  // ESTADOS EXTRA PARA COBRO AVANZADO
  const [metodoPagoCliente, setMetodoPagoCliente] = useState("Efectivo")
  const [bancoOrigenCliente, setBancoOrigenCliente] = useState("")
  const [tipoTarjetaCliente, setTipoTarjetaCliente] = useState(TIPOS_TARJETA[0])
  const [marcaTarjetaCliente, setMarcaTarjetaCliente] = useState("Visa")
  const [bancoTarjetaCliente, setBancoTarjetaCliente] = useState("")

  // ESTADO: MODAL CONFIRMAR BORRADO (REEMPLAZA AL WINDOW.CONFIRM)
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, mov: any, entidad: 'cliente'|'proveedor'|null}>({
    isOpen: false, mov: null, entidad: null
  });

  const [provAEliminar, setProvAEliminar] = useState<any>(null)
  const [isEliminarProvModalOpen, setIsEliminarProvModalOpen] = useState(false)

  // ESTADO: NOTA DE CRÉDITO (proveedor o cliente)
  const [notaCredito, setNotaCredito] = useState<{ isOpen: boolean, entidad: 'cliente' | 'proveedor' | null, registro: any }>({
    isOpen: false, entidad: null, registro: null
  })
  const [datosNotaCredito, setDatosNotaCredito] = useState({ monto: "", comprobante: "", detalle: "" })

  // Un código por cada vez que se abre un modal: un doble clic no duplica la operación
  const operacionRef = useRef<string>(nuevaOperacionId())
  const nuevaOperacion = () => { operacionRef.current = nuevaOperacionId() }

  const abrirModal = (abrir: () => void) => { nuevaOperacion(); abrir() }

  const abrirNotaCredito = (entidad: 'cliente' | 'proveedor', registro: any) => {
    nuevaOperacion()
    setDatosNotaCredito({ monto: "", comprobante: "", detalle: "" })
    setNotaCredito({ isOpen: true, entidad, registro })
  }

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
  // LÓGICA DE ELIMINAR MOVIMIENTOS
  // =========================================================================
  const ejecutarBorrado = async () => {
    const { mov, entidad } = confirmDelete;
    if (!mov || !entidad) return;

    setIsSaving(true);
    try {
      // La base ajusta el saldo de la cuenta y, si el movimiento movió plata, la devuelve a su caja
      if (entidad === 'cliente') {
        const res = await ejecutarOperacion('cliente_eliminar_movimiento', { p_movimiento_id: mov.id });
        setMovimientosLedger(prev => prev.filter(m => m.id !== mov.id));
        setClienteSeleccionado((prev: any) => ({...prev, saldo: Number(res.saldo)}));
      } else {
        const res = await ejecutarOperacion('proveedor_eliminar_movimiento', { p_movimiento_id: mov.id });
        setMovimientosLedger(prev => prev.filter(m => m.id !== mov.id));
        setProvSeleccionado((prev: any) => ({...prev, saldo: Number(res.saldo)}));
      }

      setConfirmDelete({ isOpen: false, mov: null, entidad: null });
      cargarDatosBase();
    } catch (error: any) {
      alert("Error al eliminar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleIntentarEliminarProveedor = (prov: any) => {
    const saldoProv = Number(prov.saldo || 0)
    if (saldoProv !== 0) {
      alert(`No se puede eliminar al proveedor "${prov.nombre}". Posee un saldo pendiente de $${saldoProv.toLocaleString('es-AR')}. Para eliminarlo, su saldo debe ser exactamente $0.`)
      return
    }
    setProvAEliminar(prov)
    setIsEliminarProvModalOpen(true)
  }

 const ejecutarEliminarProveedor = async () => {
    if (!provAEliminar) return
    setIsSaving(true)
    try {
      // 1. Limpiamos movimientos asociados si los tuviera (el saldo ya validamos que es 0)
      await supabase.from('movimientos_proveedores').delete().eq('proveedor_id', provAEliminar.id)
      
      // 2. Eliminamos al proveedor
      const { error } = await supabase.from('proveedores').delete().eq('id', provAEliminar.id)
      if (error) throw error

      setIsEliminarProvModalOpen(false)
      setProvAEliminar(null)
      cargarDatosBase()
      alert("Proveedor eliminado con éxito.")
    } catch (error: any) {
      alert("Error al eliminar proveedor: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const abrirEditarProveedor = (prov: any) => {
    setNuevoProveedor({ id: prov.id, nombre: prov.nombre || "", telefono: prov.telefono || "", cuit: prov.cuit || "", notas: prov.notas || "" });
    setIsNuevoProveedorOpen(true);
  }

  const handleGuardarProveedor = async () => {
    if (!nuevoProveedor.nombre) return alert("El nombre es obligatorio")
    setIsSaving(true)
    try {
      const { id, ...datos } = nuevoProveedor; // Separamos el ID de los datos
      
      if (id) {
        // Si hay ID, ACTUALIZAMOS
        const { error } = await supabase.from('proveedores').update(datos).eq('id', id);
        if (error) throw error;
      } else {
        // Si no hay ID, CREAMOS
        const { error } = await supabase.from('proveedores').insert([datos]);
        if (error) throw error;
      }
      
      setIsNuevoProveedorOpen(false)
      setNuevoProveedor({ id: null, nombre: "", telefono: "", cuit: "", notas: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al guardar: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const handleCargarFactura = async () => {
    if (isSaving) return
    const montoNum = parseFloat(datosFactura.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    setIsSaving(true)
    try {
      await ejecutarOperacion('proveedor_registrar_factura', {
        p_operacion: operacionRef.current,
        p_proveedor_id: provSeleccionado.id,
        p_monto: montoNum,
        p_comprobante: datosFactura.comprobante,
        p_detalle: datosFactura.detalle
      })
      setIsFacturaOpen(false)
      setDatosFactura({ monto: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al cargar factura: " + error.message) }
    finally { setIsSaving(false) }
  }

  const handleRegistrarPago = async () => {
    if (isSaving) return
    const montoNum = parseFloat(datosPago.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    if (!datosPago.caja_origen_id) return alert("Seleccione de qué caja sale el dinero")

    setIsSaving(true)
    try {
      // La base valida los fondos con el saldo real y resta de la caja de forma atómica
      await ejecutarOperacion('proveedor_registrar_pago', {
        p_operacion: operacionRef.current,
        p_proveedor_id: provSeleccionado.id,
        p_caja_id: datosPago.caja_origen_id,
        p_monto: montoNum,
        p_comprobante: datosPago.comprobante,
        p_detalle: datosPago.detalle
      })

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

  const getNombreCliente = (c: any) => c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`.trim()

  const handleSumarDeudaCliente = async () => {
    if (isSaving) return
    const montoNum = parseFloat(datosCargoCliente.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    setIsSaving(true)
    try {
      await ejecutarOperacion('cliente_registrar_cargo', {
        p_operacion: operacionRef.current,
        p_cliente_id: clienteSeleccionado.id,
        p_monto: montoNum,
        p_comprobante: datosCargoCliente.comprobante,
        p_detalle: datosCargoCliente.detalle
      })
      setIsCargoClienteOpen(false)
      setDatosCargoCliente({ monto: "", comprobante: "", detalle: "" })
      cargarDatosBase()
    } catch (error: any) { alert("Error al cargar deuda: " + error.message) } 
    finally { setIsSaving(false) }
  }

  const handleCobrarCliente = async () => {
    if (isSaving) return
    const montoNum = parseFloat(datosCobroCliente.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")

    const cajaDestinoId = resolverCajaDestino(cajas, metodoPagoCliente, tipoTarjetaCliente);
    if (!cajaDestinoId) {
      return alert(`No se encontró una caja específica para ${metodoPagoCliente}. Verificá los nombres de tus cajas.`);
    }

    let detalleExtra = "";
    if (metodoPagoCliente === 'Transferencia' && bancoOrigenCliente) detalleExtra = ` [${bancoOrigenCliente}]`;
    if (metodoPagoCliente === 'Tarjeta') detalleExtra = ` [${marcaTarjetaCliente} ${tipoTarjetaCliente}]`;

    setIsSaving(true)

    try {
      // La base suma a la caja, registra ambos movimientos y descuenta la deuda, todo junto
      const res = await ejecutarOperacion('cliente_registrar_pago', {
        p_operacion: operacionRef.current,
        p_cliente_id: clienteSeleccionado.id,
        p_caja_id: cajaDestinoId,
        p_metodo: metodoPagoCliente,
        p_monto: montoNum,
        p_comprobante: datosCobroCliente.comprobante,
        p_detalle: datosCobroCliente.detalle || `Pago recibido en ${metodoPagoCliente}${detalleExtra}`,
        p_detalle_caja: `Cobro a Cuenta Corriente: ${getNombreCliente(clienteSeleccionado)}${detalleExtra}`
      })

      setClienteSeleccionado((prev: any) => ({...prev, saldo: Number(res.saldo)}));

      // 8. Limpieza y cierre
      setIsCobroClienteOpen(false)
      setDatosCobroCliente({ monto: "", caja_destino_id: "", comprobante: "", detalle: "" })
      
      // Limpiamos estados de banco/tarjeta
      setBancoOrigenCliente("")
      setBancoTarjetaCliente("")
      
      cargarDatosBase()
      alert("¡Cobro registrado! El saldo se actualizó y el dinero entró a la caja.")
      
    } catch (error: any) { 
      alert("Error al procesar el cobro: " + error.message) 
    } finally { 
      setIsSaving(false) 
    }
  }
  
  // Nota de crédito: descuenta deuda sin mover plata de ninguna caja
  const handleGuardarNotaCredito = async () => {
    if (isSaving) return
    const { entidad, registro } = notaCredito
    const montoNum = parseFloat(datosNotaCredito.monto)
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido")
    setIsSaving(true)
    try {
      const parametros = {
        p_operacion: operacionRef.current,
        p_monto: montoNum,
        p_comprobante: datosNotaCredito.comprobante,
        p_detalle: datosNotaCredito.detalle
      }
      if (entidad === 'proveedor') {
        const res = await ejecutarOperacion('proveedor_nota_credito', { ...parametros, p_proveedor_id: registro.id })
        if (provSeleccionado?.id === registro.id) setProvSeleccionado((prev: any) => ({ ...prev, saldo: Number(res.saldo) }))
      } else {
        const res = await ejecutarOperacion('cliente_nota_credito', { ...parametros, p_cliente_id: registro.id })
        if (clienteSeleccionado?.id === registro.id) setClienteSeleccionado((prev: any) => ({ ...prev, saldo: Number(res.saldo) }))
      }
      setNotaCredito({ isOpen: false, entidad: null, registro: null })
      cargarDatosBase()
      alert("¡Nota de crédito registrada con éxito!")
    } catch (error: any) {
      alert("Error al registrar la nota de crédito: " + error.message)
    } finally {
      setIsSaving(false)
    }
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

  const getTotalDeudaProveedores = () => proveedores.reduce((acc, prov) => acc + Number(prov.saldo || 0), 0)
  const getTotalCobrarClientes = () => clientes.reduce((acc, cli) => acc + (Number(cli.saldo) > 0 ? Number(cli.saldo) : 0), 0)

  const proveedoresFiltrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) || (p.cuit && p.cuit.includes(busquedaProveedor)))
  const clientesFiltrados = clientes.filter(c => 
    // Magia: Solo mostrar si el saldo no es cero, O si estamos buscando alguien en particular
    (Number(c.saldo) !== 0 || busquedaCliente !== "") && 
    (
      (c.nombre && c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
      (c.apellido && c.apellido.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
      (c.razon_social && c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())) || 
      (c.documento && c.documento.includes(busquedaCliente))
    )
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

  const totalDeudaProveedores = getTotalDeudaProveedores();
  const totalProveedoresNegativo = totalDeudaProveedores < 0;

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
                                onClick={() => abrirModal(() => { setClienteSeleccionado(cli); setIsCargoClienteOpen(true); })}>
                                <FileText className="w-3 h-3 mr-1" /> Cargar Deuda
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-amber-700 border-amber-200 hover:bg-amber-50"
                                onClick={() => abrirNotaCredito('cliente', cli)}>
                                <FileMinus className="w-3 h-3 mr-1" /> Nota Crédito
                              </Button>
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => abrirModal(() => { setClienteSeleccionado(cli); setIsCobroClienteOpen(true); })}>
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

        <TabsContent value="proveedores" className="flex-1 flex flex-col min-h-0 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
            <Card className="border-border shadow-sm md:col-span-2 flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total a Pagar</p>
                <h3 className={`text-3xl font-black font-mono ${totalProveedoresNegativo ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${totalDeudaProveedores.toLocaleString()}
                </h3>
              </div>
              <div className={`p-4 rounded-full ${totalProveedoresNegativo ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                <Receipt className={`w-8 h-8 ${totalProveedoresNegativo ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
            </Card>
            <Button onClick={() => { setNuevoProveedor({ id: null, nombre: "", telefono: "", cuit: "", notas: "" }); setIsNuevoProveedorOpen(true); }} className="h-full min-h-[100px] border-2 border-dashed border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary flex flex-col gap-2">
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
                          ) : Number(prov.saldo) < 0 ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Saldo a Favor</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Al Día</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => abrirEditarProveedor(prov)} title="Editar Proveedor">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${Number(prov.saldo || 0) === 0 ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'}`} 
                              onClick={() => handleIntentarEliminarProveedor(prov)} 
                              title={Number(prov.saldo || 0) === 0 ? "Eliminar Proveedor" : "No se puede eliminar: tiene saldo pendiente"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8" onClick={() => abrirLedgerProv(prov)}><Search className="w-3 h-3 mr-1" /> Resumen</Button>
                            <Button size="sm" variant="secondary" className="h-8 bg-slate-100 hover:bg-slate-200 text-slate-700" onClick={() => abrirModal(() => { setProvSeleccionado(prov); setIsFacturaOpen(true); })}><FileText className="w-3 h-3 mr-1" /> Cargar Fra</Button>
                            <Button size="sm" variant="outline" className="h-8 text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => abrirNotaCredito('proveedor', prov)}><FileMinus className="w-3 h-3 mr-1" /> Nota Crédito</Button>
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => abrirModal(() => { setProvSeleccionado(prov); setIsPagoOpen(true); })}><Wallet className="w-3 h-3 mr-1" /> Pagar</Button>
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
      
      <Dialog open={isCargoClienteOpen} onOpenChange={setIsCargoClienteOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-rose-600"><ArrowUpRight className="w-5 h-5" /> Sumar Deuda al Cliente</DialogTitle></DialogHeader>
          {clienteSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground uppercase font-bold">Cliente</p>
                <p className="font-bold text-foreground">{getNombreCliente(clienteSeleccionado)}</p>
              </div>
              <div className="space-y-2">
                <Label>Monto de la Deuda ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosCargoCliente.monto} onChange={e => setDatosCargoCliente({...datosCargoCliente, monto: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nº Presupuesto / Factura (Opcional)</Label>
                <Input placeholder="Ej: PRE-0012" value={datosCargoCliente.comprobante} onChange={e => setDatosCargoCliente({...datosCargoCliente, comprobante: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Detalle / Motivo</Label>
                <Input placeholder="Ej: Cambio de aceite no facturado..." value={datosCargoCliente.detalle} onChange={e => setDatosCargoCliente({...datosCargoCliente, detalle: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCargoClienteOpen(false)}>Cancelar</Button>
            <Button onClick={handleSumarDeudaCliente} disabled={isSaving} className="bg-rose-600 text-white hover:bg-rose-700">{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Cargar Deuda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCobroClienteOpen} onOpenChange={setIsCobroClienteOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-blue-600">
              <HandCoins className="w-6 h-6" /> Registrar Ingreso de Dinero
            </DialogTitle>
          </DialogHeader>

          {clienteSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                <div>
                  <p className="text-xs text-blue-600/70 uppercase tracking-wider font-bold">Cliente</p>
                  <p className="font-bold text-lg text-blue-900 dark:text-blue-100">{getNombreCliente(clienteSeleccionado)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600/70 uppercase tracking-wider font-bold">Deuda Actual</p>
                  <p className="font-mono font-bold text-xl text-blue-600 dark:text-blue-400">
                    ${Number(clienteSeleccionado.saldo || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monto Entregado ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12 border-blue-300 focus-visible:ring-blue-500" autoFocus value={datosCobroCliente.monto} onChange={e => setDatosCobroCliente({...datosCobroCliente, monto: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={metodoPagoCliente} onValueChange={setMetodoPagoCliente}>
                  <SelectTrigger className="h-10 border-blue-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo (Va a Mostrador)</SelectItem>
                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta Débito/Crédito</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {metodoPagoCliente === 'Transferencia' && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <Label className="text-xs font-bold uppercase text-blue-600">Banco de Origen (Cliente)</Label>
                  <Input placeholder="Ej: Banco Galicia, MercadoPago..." value={bancoOrigenCliente} onChange={(e) => setBancoOrigenCliente(e.target.value)} />
                </div>
              )}

              {metodoPagoCliente === 'Tarjeta' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-blue-600">Tipo</Label>
                    <Select value={tipoTarjetaCliente} onValueChange={setTipoTarjetaCliente}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_TARJETA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-blue-600">Marca</Label>
                    <Select value={marcaTarjetaCliente} onValueChange={setMarcaTarjetaCliente}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visa">Visa</SelectItem>
                        <SelectItem value="Mastercard">Mastercard</SelectItem>
                        <SelectItem value="Amex">Amex</SelectItem>
                        <SelectItem value="Otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-bold uppercase text-blue-600">Banco Emisor</Label>
                    <Input placeholder="Ej: Santander, BBVA..." value={bancoTarjetaCliente} onChange={(e) => setBancoTarjetaCliente(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-2">
                  <Label>Recibo Nº (Opcional)</Label>
                  <Input value={datosCobroCliente.comprobante} onChange={e => setDatosCobroCliente({...datosCobroCliente, comprobante: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Input placeholder="Ej: Abono mensual..." value={datosCobroCliente.detalle} onChange={e => setDatosCobroCliente({...datosCobroCliente, detalle: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCobroClienteOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleCobrarCliente} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null} Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL ANCHO: HISTORIAL CLIENTE --- */}
      <Dialog open={isLedgerClienteOpen} onOpenChange={setIsLedgerClienteOpen}>
        <DialogContent className="!max-w-[90vw] w-full border-border bg-card h-[85vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b border-border">
            <DialogTitle className="text-xl flex items-center justify-between pr-10">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Ficha de Cuenta: {clienteSeleccionado && getNombreCliente(clienteSeleccionado)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="border rounded-md border-border">
              <Table>
                <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm shadow-sm">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead>Detalle / Ref</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosLedger.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Sin movimientos.</TableCell></TableRow>
                  ) : (
                    movimientosLedger.map(mov => (
                      <TableRow key={mov.id} className="hover:bg-secondary/20">
                        <TableCell className="text-muted-foreground text-sm font-mono">{new Date(mov.fecha).toLocaleDateString('es-AR')} {new Date(mov.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</TableCell>
                        <TableCell>
                          {mov.tipo === 'cargo_deuda' ? <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50"><ArrowUpRight className="w-3 h-3 mr-1"/> Cargo</Badge>
                            : mov.tipo === 'nota_credito' ? <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50"><FileMinus className="w-3 h-3 mr-1"/> Nota Crédito</Badge>
                            : mov.tipo === 'anulacion' || mov.tipo === 'pago_abono' ? <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50"><ArrowDownRight className="w-3 h-3 mr-1"/> Anulación</Badge>
                            : <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><ArrowDownRight className="w-3 h-3 mr-1"/> Pago</Badge>}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{mov.detalle}</p>
                          <div className="flex gap-2 items-center mt-1">
                            {mov.comprobante && <span className="text-xs text-muted-foreground">Doc: {mov.comprobante}</span>}
                            {mov.caja_destino_id && <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">Entró a {cajas.find(c => c.id === mov.caja_destino_id)?.nombre || 'Caja'}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${mov.tipo === 'cargo_deuda' ? 'text-rose-600' : 'text-blue-600'}`}>
                          {mov.tipo === 'cargo_deuda' ? '+' : '-'}${Math.abs(Number(mov.monto)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete({isOpen: true, mov, entidad: 'cliente'})}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
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

      {/* ================= MODALES DE PROVEEDORES ================= */}
    
      <Dialog open={isNuevoProveedorOpen} onOpenChange={setIsNuevoProveedorOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> 
              {nuevoProveedor.id ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre / Razón Social *</Label><Input value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CUIT</Label><Input value={nuevoProveedor.cuit} onChange={e => setNuevoProveedor({...nuevoProveedor, cuit: e.target.value})} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNuevoProveedorOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarProveedor} disabled={isSaving || !nuevoProveedor.nombre}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} 
              {nuevoProveedor.id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2 text-rose-600"><ArrowUpRight className="w-5 h-5" /> Registrar Compra</DialogTitle></DialogHeader>
          {provSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Factura ($)</Label>
                  <Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosFactura.monto} onChange={e => setDatosFactura({...datosFactura, monto: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Comprobante</Label>
                  <Input className="h-12" value={datosFactura.comprobante} onChange={e => setDatosFactura({...datosFactura, comprobante: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>Detalle / Referencia (Opcional)</Label>
                <Input placeholder="Ej: Amortiguadores, Aceite, Filtros..." value={datosFactura.detalle} onChange={e => setDatosFactura({...datosFactura, detalle: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setIsFacturaOpen(false)}>Cancelar</Button><Button onClick={handleCargarFactura} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white">Registrar Deuda</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* --- MODAL ANCHO: HISTORIAL PROVEEDOR --- */}
      <Dialog open={isLedgerProvOpen} onOpenChange={setIsLedgerProvOpen}>
        <DialogContent className="!max-w-[90vw] w-[90vw] border-border bg-card h-[85vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b border-border">
            <DialogTitle className="text-xl flex items-center justify-between pr-10">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> 
                Resumen de Cuenta: {provSeleccionado?.nombre}
              </span>
              
              <span className={`font-mono text-xl ${Number(provSeleccionado?.saldo || 0) < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerProvFiltrado.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                          ) : mov.tipo === 'nota_credito' ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 shadow-sm">
                              <FileMinus className="w-3 h-3 mr-1"/> Nota Crédito
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
                        <TableCell>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete({isOpen: true, mov, entidad: 'proveedor'})}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
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

      {/* --- NUEVO MODAL DE CONFIRMACIÓN DE BORRADO --- */}
      <Dialog open={confirmDelete.isOpen} onOpenChange={(open:any) => setConfirmDelete({isOpen: open, mov: null, entidad: null})}>
        <DialogContent className="max-w-sm p-6 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-2xl top-[35%] translate-y-[-50%] outline-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">
              ¿Eliminar Registro?
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              ¿Estás seguro de que querés eliminar este movimiento? El saldo de la cuenta se ajustará automáticamente{confirmDelete.mov?.tipo === 'pago_proveedor' || confirmDelete.mov?.tipo === 'pago_ingreso' ? ' y el dinero vuelve a la caja por la que se registró.' : '. Este movimiento no movió dinero de ninguna caja.'}
            </DialogDescription>
            <div className="flex gap-3 w-full mt-4">
              <Button onClick={() => setConfirmDelete({isOpen: false, mov: null, entidad: null})} variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold">
                Cancelar
              </Button>
              <Button onClick={ejecutarBorrado} disabled={isSaving} className="flex-1 h-12 rounded-xl text-base font-bold bg-red-600 hover:bg-red-700 text-white shadow-md">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL NOTA DE CRÉDITO (PROVEEDOR O CLIENTE) --- */}
      <Dialog open={notaCredito.isOpen} onOpenChange={(open: boolean) => !open && setNotaCredito({ isOpen: false, entidad: null, registro: null })}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-amber-700"><FileMinus className="w-5 h-5" /> Registrar Nota de Crédito</DialogTitle>
            <DialogDescription>
              Descuenta el monto de la deuda {notaCredito.entidad === 'proveedor' ? 'con el proveedor' : 'del cliente'}. No mueve dinero de ninguna caja.
            </DialogDescription>
          </DialogHeader>
          {notaCredito.registro && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">{notaCredito.entidad === 'proveedor' ? 'Proveedor' : 'Cliente'}</p>
                  <p className="font-bold text-foreground">{notaCredito.entidad === 'proveedor' ? notaCredito.registro.nombre : getNombreCliente(notaCredito.registro)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Actual</p>
                  <p className="font-mono font-bold text-lg">${Number(notaCredito.registro.saldo || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monto de la Nota de Crédito ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12" autoFocus value={datosNotaCredito.monto} onChange={e => setDatosNotaCredito({...datosNotaCredito, monto: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nº Comprobante (Opcional)</Label>
                <Input placeholder="Ej: NC-0001-00001234" value={datosNotaCredito.comprobante} onChange={e => setDatosNotaCredito({...datosNotaCredito, comprobante: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Motivo (Opcional)</Label>
                <Input placeholder="Ej: Devolución de mercadería, bonificación..." value={datosNotaCredito.detalle} onChange={e => setDatosNotaCredito({...datosNotaCredito, detalle: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotaCredito({ isOpen: false, entidad: null, registro: null })} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarNotaCredito} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Registrar Nota de Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL CONFIRMAR ELIMINACIÓN DE PROVEEDOR --- */}
      <Dialog open={isEliminarProvModalOpen} onOpenChange={setIsEliminarProvModalOpen}>
        <DialogContent className="max-w-sm p-6 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-2xl top-[35%] translate-y-[-50%] outline-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">
              ¿Eliminar Proveedor?
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              ¿Estás seguro de que querés eliminar a <strong>{provAEliminar?.nombre}</strong> del directorio? Su saldo es $0. Esta acción no se puede deshacer.
            </DialogDescription>
            <div className="flex gap-3 w-full mt-4">
              <Button onClick={() => setIsEliminarProvModalOpen(false)} variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold">
                Cancelar
              </Button>
              <Button onClick={ejecutarEliminarProveedor} disabled={isSaving} className="flex-1 h-12 rounded-xl text-base font-bold bg-red-600 hover:bg-red-700 text-white shadow-md">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}