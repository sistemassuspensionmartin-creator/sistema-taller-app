"use client"

import { useState, useEffect } from "react"
import { Search, Printer, Download, ArrowLeft, Save, Trash2, Plus, MessageCircle, EyeOff, Eye, FileText, Lock, ClipboardList, Loader2, Car, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

export function PresupuestosView() {
  const [vista, setVista] = useState<"lista" | "crear">("crear") // Arranca en crear para que lo pruebes
  const [mostrarCostos, setMostrarCostos] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Datos reales de la BD
  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])

  // Estado del Presupuesto Actual
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>("")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [validez, setValidez] = useState("15")
  const [notasCliente, setNotasCliente] = useState("Los repuestos pueden sufrir variaciones de precio sin previo aviso. Validez sujeta a stock.")
  const [notasInternas, setNotasInternas] = useState("")
  const [descuento, setDescuento] = useState(0)

  // Filas del presupuesto (Empieza con UNA fila vacía por defecto)
  const [filas, setFilas] = useState<any[]>([
    { id: '1', tipo: "Servicio", detalle: "", cant: 1, costo: 0, precio: 0 }
  ])

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setIsLoading(true)
      try {
        const [resClientes, resVehiculos, resCatalogo, resPresupuestos] = await Promise.all([
          supabase.from('clientes').select('*').order('nombre'),
          supabase.from('vehiculos').select('*'),
          supabase.from('catalogo').select('*').order('detalle'),
          supabase.from('presupuestos').select('*, clientes(nombre, apellido, razon_social, tipo_cliente), vehiculos(patente, marca, modelo)').order('created_at', { ascending: false })
        ])
        
        setClientes(resClientes.data || [])
        setVehiculos(resVehiculos.data || [])
        setCatalogo(resCatalogo.data || [])
        setPresupuestos(resPresupuestos.data || [])
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setIsLoading(false)
      }
    }
    cargarDatos()
  }, [vista])

  // Lógica de autocompletado al elegir un vehículo/patente
  const handleSeleccionarPatente = (val: string) => {
    setVehiculoSeleccionado(val)
    const veh = vehiculos.find(v => v.id === val)
    if (veh) setClienteSeleccionado(veh.cliente_id)
  }

  // Manejar el agregado y edición de ítems
  const agregarFilaVacia = () => {
    setFilas([...filas, { id: Date.now().toString(), tipo: "Repuesto", detalle: "", cant: 1, costo: 0, precio: 0 }])
  }

  const actualizarFila = (id: string, campo: string, valor: any) => {
    setFilas(filas.map(f => {
      if (f.id !== id) return f
      // Si cambia el tipo (ej: de Repuesto a Servicio), limpiamos los datos para que no queden mezclados
      if (campo === 'tipo') return { ...f, tipo: valor, detalle: "", costo: 0, precio: 0 }
      return { ...f, [campo]: valor }
    }))
  }

  const aplicarItemCatalogo = (idFila: string, idCatalogo: string) => {
    const item = catalogo.find(c => c.id === idCatalogo)
    if (item) {
      setFilas(filas.map(f => f.id === idFila ? {
        ...f,
        detalle: item.detalle,
        costo: item.costo_base || 0,
        precio: item.precio_base || 0
      } : f))
    }
  }

  const eliminarFila = (id: string) => {
    setFilas(filas.filter(f => f.id !== id))
  }

  // Datos para mostrar en las cajitas read-only
  const vehiculoActual = vehiculos.find(v => v.id === vehiculoSeleccionado)
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado)

  // Cálculos
  const subtotalNeto = filas.reduce((acc, fila) => acc + ((parseFloat(fila.precio) || 0) * (parseInt(fila.cant) || 1)), 0)
  const costoTotal = filas.reduce((acc, fila) => acc + ((parseFloat(fila.costo) || 0) * (parseInt(fila.cant) || 1)), 0)
  const totalFinal = subtotalNeto - descuento
  const gananciaEstimada = totalFinal - costoTotal

  if (vista === "crear") {
    return (
      <div className="space-y-6 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        
        {/* BARRA SUPERIOR DE ACCIONES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <Button variant="ghost" onClick={() => setVista("lista")} className="text-muted-foreground hover:text-foreground w-fit">
            <ArrowLeft className="h-4 w-4 mr-2"/> Volver
          </Button>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-secondary/50 px-3 py-2 rounded-md border border-border font-mono font-bold text-sm mr-2 text-primary">
              NUEVO: PR-0014
            </div>
            <Button variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <ClipboardList className="w-4 h-4 mr-2"/> Orden de Trabajo
            </Button>
            <Button variant="outline" className="bg-background">
              <Printer className="w-4 h-4 mr-2"/> Imprimir / PDF
            </Button>
            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm border-none">
              <MessageCircle className="w-4 h-4 mr-2"/> WhatsApp
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Save className="w-4 h-4 mr-2"/> Guardar
            </Button>
          </div>
        </div>

        {/* 1. DATOS DEL PRESUPUESTO (ARRIBA COMO PEDISTE) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
              <FileText className="w-5 h-5" /> Datos del Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
              <div className="md:col-span-6 space-y-2">
                <Label>Buscar Patente o Cliente <span className="text-destructive">*</span></Label>
                <div className="flex">
                  <Select value={vehiculoSeleccionado} onValueChange={handleSeleccionarPatente}>
                    <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 h-10 rounded-r-none border-r-0"><SelectValue placeholder="EJ: AB 123 CD..." /></SelectTrigger>
                    <SelectContent>
                      {vehiculos.map(v => {
                        const c = clientes.find(cl => cl.id === v.cliente_id)
                        return (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="font-mono font-bold mr-2">{v.patente}</span> - {c?.tipo_cliente === 'empresa' ? c.razon_social : `${c?.nombre} ${c?.apellido}`} ({v.marca} {v.modelo})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="rounded-l-none bg-secondary/20 px-4 h-10 border-l-0"><Search className="h-4 w-4 text-muted-foreground"/></Button>
                </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Fecha de Emisión</Label>
                <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-slate-50 dark:bg-slate-900 h-10" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Validez (Días)</Label>
                <Input type="number" value={validez} onChange={e => setValidez(e.target.value)} className="bg-slate-50 dark:bg-slate-900 h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3"/> Vehículo</Label>
                <Input readOnly value={vehiculoActual ? `${vehiculoActual.marca} ${vehiculoActual.modelo} (${vehiculoActual.patente})` : ""} className="bg-secondary/30 border-dashed text-foreground font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> Cliente</Label>
                <Input readOnly value={clienteActual ? (clienteActual.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual.nombre} ${clienteActual.apellido}`) : ""} className="bg-secondary/30 border-dashed text-foreground font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</Label>
                <Input readOnly value={clienteActual?.telefono || ""} className="bg-secondary/30 border-dashed text-foreground font-medium font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. TABLA DE DETALLE (MEDIO) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detalle Presupuesto</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setMostrarCostos(!mostrarCostos)}
              className={mostrarCostos ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" : "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900"}
            >
              {mostrarCostos ? <Eye className="w-4 h-4 mr-2"/> : <EyeOff className="w-4 h-4 mr-2"/>}
              {mostrarCostos ? "Ocultar Costos" : "Costos Ocultos"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/5 hover:bg-secondary/5">
                    <TableHead className="w-[160px]">Tipo</TableHead>
                    <TableHead>Buscar en Catálogo o Cargar Manual</TableHead>
                    <TableHead className="w-[80px] text-center">Cant.</TableHead>
                    {mostrarCostos && <TableHead className="w-[120px] text-right text-amber-600">Costo Unit.</TableHead>}
                    <TableHead className="w-[140px] text-right text-emerald-600">Precio Venta</TableHead>
                    <TableHead className="w-[140px] text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((fila) => {
                    // Filtramos el catálogo para mostrar solo lo que coincida con el tipo de esta fila
                    const catalogoFiltrado = catalogo.filter(c => c.tipo === fila.tipo)

                    return (
                      <TableRow key={fila.id} className="hover:bg-transparent">
                        <TableCell>
                          <Select value={fila.tipo} onValueChange={(v: string) => actualizarFila(fila.id, 'tipo', v)}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Servicio">Servicio</SelectItem>
                              <SelectItem value="Mano de Obra">Mano de Obra</SelectItem>
                              <SelectItem value="Repuesto">Repuesto</SelectItem>
                              <SelectItem value="Neumático">Neumático</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Desplegable verde del Catálogo */}
                            <Select onValueChange={(val: string) => aplicarItemCatalogo(fila.id, val)}>
                              <SelectTrigger className="w-[180px] h-10 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
                                <SelectValue placeholder={`Elegir ${fila.tipo}...`} />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogoFiltrado.length === 0 ? (
                                  <SelectItem value="none" disabled>No hay {fila.tipo.toLowerCase()}s</SelectItem>
                                ) : (
                                  catalogoFiltrado.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.detalle}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            
                            {/* Input Manual para escribir o modificar */}
                            <Input 
                              value={fila.detalle} 
                              onChange={(e) => actualizarFila(fila.id, 'detalle', e.target.value)} 
                              placeholder="Escriba el detalle..." 
                              className="h-10 bg-white dark:bg-slate-950 flex-1" 
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="1" value={fila.cant} onChange={(e) => actualizarFila(fila.id, 'cant', e.target.value)} className="h-10 text-center font-mono bg-white dark:bg-slate-950" />
                        </TableCell>
                        {mostrarCostos && (
                          <TableCell>
                            <Input type="number" value={fila.costo || ""} onChange={(e) => actualizarFila(fila.id, 'costo', e.target.value)} className="h-10 text-right font-mono border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900 focus-visible:ring-amber-400" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Input type="number" value={fila.precio || ""} onChange={(e) => actualizarFila(fila.id, 'precio', e.target.value)} className="h-10 text-right font-mono bg-white dark:bg-slate-950" />
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-base pt-4">
                          ${((parseFloat(fila.precio) || 0) * (parseInt(fila.cant) || 1)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => eliminarFila(fila.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/30">
              <Button variant="outline" size="sm" onClick={agregarFilaVacia} className="bg-background">
                <Plus className="w-4 h-4 mr-2"/> Agregar Fila
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. TOTALES Y NOTAS (ABAJO) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Columna Izquierda: Textareas */}
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 space-y-2">
                <Label className="font-semibold text-foreground">Observaciones para el Cliente <span className="text-muted-foreground font-normal text-xs">(Sale en el PDF)</span></Label>
                <Textarea 
                  value={notasCliente}
                  onChange={(e) => setNotasCliente(e.target.value)}
                  className="min-h-[80px] bg-slate-50 dark:bg-slate-900 border-border"
                />
              </CardContent>
            </Card>

            <Card className="border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <Label className="font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                  <Lock className="w-4 h-4"/> Notas Internas Ocultas <span className="text-amber-600/70 font-normal text-xs">(Sale en Orden de Trabajo)</span>
                </Label>
                <Textarea 
                  value={notasInternas}
                  onChange={(e) => setNotasInternas(e.target.value)}
                  placeholder="Información solo visible para el taller (ej: comprar filtro en la repuestera de la esquina)..." 
                  className="min-h-[80px] bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-900 focus-visible:ring-amber-400"
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Totales */}
          <div>
            <Card className="border-border shadow-md h-full">
              <CardContent className="p-6 space-y-4 flex flex-col h-full justify-center">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono text-lg">${subtotalNeto.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Descuento / Atención:</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">-$</span>
                    <Input type="number" value={descuento || ""} onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)} className="h-10 pl-7 text-right font-mono bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-2 flex justify-between items-center">
                  <span className="text-xl font-bold text-foreground">Total Final:</span>
                  <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalFinal.toLocaleString()}</span>
                </div>

                {/* Info de ganancia (visible solo si los costos están activos) */}
                {mostrarCostos && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex justify-between items-center animate-in fade-in duration-300">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">Ganancia Neta Estimada:</span>
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-500 font-mono">${gananciaEstimada.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    )
  }

  // VISTA LISTA PRINCIPAL
  return (
    <div className="space-y-6 pb-8">
      {/* CABECERA LISTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Presupuestos y Órdenes</h2>
          <p className="text-sm text-muted-foreground">Administrá las cotizaciones y órdenes de trabajo del taller.</p>
        </div>
        <Button onClick={() => setVista("crear")} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, patente o Nro..." className="pl-9 bg-background" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead>Nro</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente y Vehículo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : presupuestos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No hay presupuestos generados.</TableCell></TableRow>
              ) : (
                presupuestos.map((p) => (
                  <TableRow key={p.id} className="hover:bg-secondary/50">
                    <TableCell className="font-mono font-bold">{p.nro_comprobante}</TableCell>
                    <TableCell>{new Date(p.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{p.clientes?.tipo_cliente === 'empresa' ? p.clientes.razon_social : `${p.clientes?.nombre} ${p.clientes?.apellido}`}</div>
                      <div className="text-xs text-muted-foreground">{p.vehiculos?.marca} {p.vehiculos?.modelo} ({p.vehiculos?.patente})</div>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono">${p.total?.toLocaleString()}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{p.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Orden de Trabajo"><ClipboardList className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="PDF Presupuesto"><Printer className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}