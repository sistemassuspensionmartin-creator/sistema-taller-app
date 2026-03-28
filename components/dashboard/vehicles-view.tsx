"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Car, User, Edit, Loader2, Save, Gauge, Palette, Calendar, X, CheckCircle2, ArrowLeft, Phone, UserCheck, UserMinus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

import { supabase } from "@/lib/supabase"

const MARCAS_COMUNES = [
  "Volkswagen", "Ford", "Chevrolet", "Toyota", "Renault", 
  "Peugeot", "Fiat", "Honda", "Nissan", "Citroën", 
  "Jeep", "Audi", "BMW", "Mercedes-Benz", "Hyundai", 
  "Kia", "Chery", "Suzuki", "Otra"
]

export function VehiclesView() {
  // Estado para controlar qué pantalla vemos
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  
  // Estados originales
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busquedaPrincipal, setBusquedaPrincipal] = useState("")

  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [clienteSeleccionadoInfo, setClienteSeleccionadoInfo] = useState<any>(null)

  const [formData, setFormData] = useState({
    patente: "",
    tipo_vehiculo: "Auto",
    marca: "",
    modelo: "",
    anio: "",
    color: "",
    kilometraje: "",
    cliente_id: ""
  })

  // Nuevos estados para la Vista de Detalle
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null)
  const [historialPresupuestos, setHistorialPresupuestos] = useState<any[]>([])
  const [modoTransferencia, setModoTransferencia] = useState(false)
  const [nuevoDuenoId, setNuevoDuenoId] = useState<string>("")
  const [isTransferring, setIsTransferring] = useState(false)

  const fetchVehiculos = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('vehiculos').select(`*, clientes ( id, nombre, apellido, razon_social, tipo_cliente, documento, telefono, email )`)
      if (error) throw error
      setVehiculos(data || [])
    } catch (error) {
      console.error("Error al cargar vehículos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientesParaSelect = async () => {
    try {
      const { data, error } = await supabase.from('clientes').select('id, nombre, apellido, razon_social, tipo_cliente, documento, telefono, email').order('nombre')
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    }
  }

  useEffect(() => {
    if (vista === "lista") {
      fetchVehiculos()
      fetchClientesParaSelect()
      setVehiculoSeleccionado(null)
      setModoTransferencia(false)
    }
  }, [vista])

  // Lógica de apertura de detalle
  const abrirDetalle = async (vehiculo: any) => {
    setVehiculoSeleccionado(vehiculo)
    setVista("detalle")
    setModoTransferencia(false)
    
    // Buscar historial de presupuestos de este auto en la BD
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('vehiculo_patente', vehiculo.patente)
        .order('fecha_emision', { ascending: false })

      if (error) throw error;
      setHistorialPresupuestos(data || [])
    } catch (error) {
      console.error("Error al cargar historial:", error)
    }
  }

  // Lógica de transferencia
  const handleTransferirDueno = async () => {
    if (!nuevoDuenoId) return alert("Seleccione una opción.");
    
    const esDesvinculacion = nuevoDuenoId === "desvincular";
    const accionTexto = esDesvinculacion ? "desvincular este vehículo" : "transferir este vehículo al nuevo dueño";
    
    if (!confirm(`¿Estás seguro de que querés ${accionTexto}?`)) return;

    setIsTransferring(true)
    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ cliente_id: esDesvinculacion ? null : nuevoDuenoId })
        .eq('patente', vehiculoSeleccionado.patente);

      if (error) throw error;

      alert("¡Cambio de titularidad guardado con éxito!");
      
      const clienteNuevo = esDesvinculacion ? null : clientes.find(c => c.id === nuevoDuenoId);
      
      // Actualizamos la vista de detalle actual
      setVehiculoSeleccionado({
        ...vehiculoSeleccionado,
        cliente_id: esDesvinculacion ? null : nuevoDuenoId,
        clientes: clienteNuevo
      });

      // Actualizamos la tabla principal por si volvemos atrás
      setVehiculos(vehiculos.map(v => 
        v.patente === vehiculoSeleccionado.patente 
          ? { ...v, cliente_id: esDesvinculacion ? null : nuevoDuenoId, clientes: clienteNuevo } 
          : v
      ));

      setModoTransferencia(false);
      setNuevoDuenoId("");

    } catch (error: any) {
      console.error("Error al transferir:", error)
      alert("Error al cambiar titularidad: " + error.message)
    } finally {
      setIsTransferring(false)
    }
  }

  // LÓGICA DE CREACIÓN (Tuya, intacta)
  const abrirModal = () => {
    setFormData({ patente: "", tipo_vehiculo: "Auto", marca: "", modelo: "", anio: "", color: "", kilometraje: "", cliente_id: "" })
    setBusquedaCliente("")
    setClienteSeleccionadoInfo(null)
    setIsModalOpen(true)
  }

  const handlePatenteChange = (e: any) => {
    let limpia = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (limpia.length > 7) limpia = limpia.slice(0, 7)
    let formateada = limpia
    if (limpia.length >= 3) {
      if (/[A-Z]/.test(limpia[2])) {
        formateada = limpia.slice(0, 3) + (limpia.length > 3 ? " " + limpia.slice(3, 6) : "")
      } else {
        formateada = limpia.slice(0, 2) + " " + limpia.slice(2, 5) + (limpia.length > 5 ? " " + limpia.slice(5, 7) : "")
      }
    }
    setFormData({ ...formData, patente: formateada })
  }

  const handleGuardarVehiculo = async () => {
    const patenteLimpiaDB = formData.patente.replace(/\s/g, "")

    if (!patenteLimpiaDB || !formData.marca || !formData.modelo || !formData.cliente_id || !formData.tipo_vehiculo) {
      alert("Patente, Tipo, Marca, Modelo y Dueño son obligatorios.")
      return
    }

    if (patenteLimpiaDB.length < 6) {
      alert("La patente debe tener al menos 6 caracteres.")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('vehiculos').insert([{
        patente: patenteLimpiaDB,
        tipo_vehiculo: formData.tipo_vehiculo,
        marca: formData.marca,
        modelo: formData.modelo,
        anio: formData.anio ? parseInt(formData.anio) : null,
        color: formData.color,
        kilometraje: formData.kilometraje ? parseInt(formData.kilometraje) : null,
        cliente_id: formData.cliente_id
      }])

      if (error) {
        if (error.code === '23505') alert("Ya existe un vehículo registrado con esta patente en el taller.")
        else throw error
        return
      }

      setIsModalOpen(false)
      fetchVehiculos()
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el vehículo.")
    } finally {
      setIsSaving(false)
    }
  }

  const vehiculosFiltrados = vehiculos.filter(v => 
    v.patente.includes(busquedaPrincipal.replace(/\s/g, "").toUpperCase()) || 
    v.marca.toLowerCase().includes(busquedaPrincipal.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busquedaPrincipal.toLowerCase())
  )

  const clientesParaMostrar = busquedaCliente.trim() === "" ? [] : clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.apellido && c.apellido.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.razon_social && c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.documento && c.documento.includes(busquedaCliente))
  ).slice(0, 5)

  const seleccionarCliente = (cliente: any) => {
    setFormData({ ...formData, cliente_id: cliente.id })
    setClienteSeleccionadoInfo(cliente)
    setBusquedaCliente("")
  }

  const deseleccionarCliente = () => {
    setFormData({ ...formData, cliente_id: "" })
    setClienteSeleccionadoInfo(null)
  }

  const formatearPatenteVisual = (patenteDB: string) => {
    if (!patenteDB) return ""
    if (patenteDB.length === 6) return `${patenteDB.slice(0,3)} ${patenteDB.slice(3,6)}` 
    if (patenteDB.length === 7) return `${patenteDB.slice(0,2)} ${patenteDB.slice(2,5)} ${patenteDB.slice(5,7)}` 
    return patenteDB
  }

  // ==========================================
  // RENDER: VISTA DE DETALLE
  // ==========================================
  if (vista === "detalle" && vehiculoSeleccionado) {
    const c = vehiculoSeleccionado.clientes;
    const nombreCliente = c ? (c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`) : 'Sin Propietario Vinculado';

    return (
      <div className="space-y-6 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setVista("lista")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2"/> Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-[#008A4B] text-white px-3 py-1 rounded-md font-mono tracking-widest text-lg">
                  {formatearPatenteVisual(vehiculoSeleccionado.patente)}
                </span>
                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              </h2>
            </div>
          </div>
          <Button variant="outline" className="bg-background">
            <Edit className="w-4 h-4 mr-2"/> Editar Datos
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FICHA TÉCNICA */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                <Car className="w-5 h-5" /> Ficha Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div><span className="text-muted-foreground block mb-1">Marca</span><p className="font-medium text-base">{vehiculoSeleccionado.marca}</p></div>
                <div><span className="text-muted-foreground block mb-1">Modelo</span><p className="font-medium text-base">{vehiculoSeleccionado.modelo}</p></div>
                <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Año</span><p className="font-medium">{vehiculoSeleccionado.anio || '-'}</p></div>
                <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Palette className="w-3 h-3"/> Color</span><p className="font-medium">{vehiculoSeleccionado.color || '-'}</p></div>
                <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Gauge className="w-3 h-3"/> Kilometraje</span><p className="font-medium">{vehiculoSeleccionado.kilometraje ? `${vehiculoSeleccionado.kilometraje.toLocaleString()} km` : '-'}</p></div>
                <div><span className="text-muted-foreground block mb-1">Tipo</span><p className="font-medium capitalize">{vehiculoSeleccionado.tipo_vehiculo || '-'}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* DATOS DEL PROPIETARIO & TRANSFERENCIA */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                <User className="w-5 h-5" /> Propietario Actual
              </CardTitle>
              {!modoTransferencia && (
                <Button variant="ghost" size="sm" onClick={() => setModoTransferencia(true)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  Cambiar Propietario
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {modoTransferencia ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-border">
                  <Label className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                    <UserCheck className="w-4 h-4"/> Seleccionar Nuevo Propietario
                  </Label>
                  <Select value={nuevoDuenoId} onValueChange={setNuevoDuenoId}>
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Elija un cliente existente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desvincular" className="text-red-600 font-medium">
                        <div className="flex items-center gap-2"><UserMinus className="w-4 h-4"/> Desvincular Vehículo (Dejar sin dueño)</div>
                      </SelectItem>
                      {clientes.map(cl => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.tipo_cliente === 'empresa' ? cl.razon_social : `${cl.nombre} ${cl.apellido || ''}`} ({cl.documento || 'S/DNI'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => {setModoTransferencia(false); setNuevoDuenoId("");}} disabled={isTransferring}>Cancelar</Button>
                    <Button onClick={handleTransferirDueno} disabled={!nuevoDuenoId || isTransferring} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isTransferring ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmar Transferencia"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {c ? (
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="col-span-2"><span className="text-muted-foreground block mb-1">Nombre / Razón Social</span><p className="font-bold text-lg">{nombreCliente}</p></div>
                      <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</span><p className="font-medium font-mono">{c.telefono || '-'}</p></div>
                      <div><span className="text-muted-foreground block mb-1">DNI / CUIT</span><p className="font-medium">{c.documento || '-'}</p></div>
                      <div className="col-span-2"><span className="text-muted-foreground block mb-1">Email</span><p className="font-medium">{c.email || '-'}</p></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center">
                      <UserMinus className="w-12 h-12 mb-3 opacity-20" />
                      <p>Este vehículo no está vinculado a ningún cliente.</p>
                      <Button variant="link" onClick={() => setModoTransferencia(true)} className="text-blue-600 mt-2">Asignar a un cliente</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* HISTORIAL DE PRESUPUESTOS */}
        <div className="pt-4">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-emerald-600"/> Historial de Presupuestos y Órdenes
          </h3>
          <Card className="border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Nro</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Total Estimado</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialPresupuestos.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No hay presupuestos registrados para este vehículo.</TableCell></TableRow>
                ) : (
                  historialPresupuestos.map(hp => (
                    <TableRow key={hp.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono font-bold">PRE-{hp.numero_correlativo}</TableCell>
                      <TableCell>{new Date(hp.fecha_emision).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="font-bold font-mono text-emerald-700 dark:text-emerald-500">${hp.total_final?.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{hp.estado}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: VISTA LISTA PRINCIPAL (Y MODAL)
  // ==========================================
  return (
    <div className="space-y-6 pb-8">
      {/* CABECERA Y TABLA PRINCIPAL */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Flota de Vehículos</h2>
          <p className="text-sm text-muted-foreground">Administrá los autos de tus clientes.</p>
        </div>
        <Button onClick={abrirModal} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por patente, marca o modelo..." className="pl-9" value={busquedaPrincipal} onChange={(e) => setBusquedaPrincipal(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead>Patente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : vehiculosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay vehículos registrados.</TableCell></TableRow>
              ) : (
                vehiculosFiltrados.map((v) => (
                  <TableRow key={v.patente} className="hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => abrirDetalle(v)}>
                    <TableCell>
                      <span className="font-mono font-bold bg-secondary px-2 py-1 rounded border border-border tracking-widest text-foreground whitespace-nowrap">
                        {formatearPatenteVisual(v.patente)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{v.marca} {v.modelo}</div>
                      <div className="text-xs text-muted-foreground">{v.tipo_vehiculo}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" /> 
                        {v.clientes?.tipo_cliente === 'empresa' ? v.clientes?.razon_social : `${v.clientes?.nombre} ${v.clientes?.apellido || ''}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {v.anio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> Año {v.anio}</span>}
                        {v.color && <span className="flex items-center gap-1"><Palette className="h-3 w-3"/> {v.color}</span>}
                        {v.kilometraje && <span className="flex items-center gap-1"><Gauge className="h-3 w-3"/> {v.kilometraje.toLocaleString()} km</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Ojo acá con e.stopPropagation() para que al tocar el botón de editar no te abra el detalle por error */}
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); /* Acá podrías llamar a un modal de edición rápida si querés */ }} className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL NUEVO VEHÍCULO REDISEÑADO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-foreground font-bold">Registrar Vehículo</DialogTitle>
            <p className="text-sm text-muted-foreground">Vincule un nuevo vehículo a un cliente del taller.</p>
          </DialogHeader>

          <div className="space-y-8">
            
            {/* SECCIÓN 1: BUSCADOR DE DUEÑO */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Dueño del Vehículo <span className="text-destructive">*</span></h3>
              </div>
              
              {!clienteSeleccionadoInfo ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cliente por nombre, empresa o CUIT/DNI..." 
                    className="pl-9 bg-slate-50 dark:bg-slate-900" 
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                  {/* Lista de resultados desplegable */}
                  {clientesParaMostrar.length > 0 && (
                    <div className="absolute top-11 left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                      {clientesParaMostrar.map(c => (
                        <div 
                          key={c.id} 
                          className="p-3 hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 flex justify-between items-center"
                          onClick={() => seleccionarCliente(c)}
                        >
                          <div>
                            <div className="font-medium">{c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`}</div>
                            <div className="text-xs text-muted-foreground">Documento: {c.documento || "N/A"}</div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">Seleccionar</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {busquedaCliente && clientesParaMostrar.length === 0 && (
                     <div className="absolute top-11 left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                       No se encontró ningún cliente. ¿Ya lo registraste en la pestaña Clientes?
                     </div>
                  )}
                </div>
              ) : (
                /* TARJETA DE CLIENTE CONFIRMADO */
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-100">
                        {clienteSeleccionadoInfo.tipo_cliente === 'empresa' ? clienteSeleccionadoInfo.razon_social : `${clienteSeleccionadoInfo.nombre} ${clienteSeleccionadoInfo.apellido || ''}`}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Cliente confirmado</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={deseleccionarCliente} className="h-8 bg-white dark:bg-slate-950 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    Cambiar
                  </Button>
                </div>
              )}
            </section>

            {/* SECCIÓN 2: DATOS DEL VEHÍCULO */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Datos del Vehículo</h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label>Patente <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="AA 123 AA" 
                    className="bg-slate-50 dark:bg-slate-900 font-mono text-center uppercase tracking-widest" 
                    value={formData.patente} 
                    onChange={handlePatenteChange}
                    maxLength={9}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Tipo <span className="text-destructive">*</span></Label>
                  <Select value={formData.tipo_vehiculo} onValueChange={(val: string) => setFormData({...formData, tipo_vehiculo: val})}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="Camioneta">Camioneta</SelectItem>
                      <SelectItem value="Furgón">Furgón</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Marca <span className="text-destructive">*</span></Label>
                  <Select value={formData.marca} onValueChange={(val: string) => setFormData({...formData, marca: val})}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900"><SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {MARCAS_COMUNES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Modelo <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Amarok" className="bg-slate-50 dark:bg-slate-900" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: DETALLES ADICIONALES */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Detalles (Opcional)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input type="number" placeholder="2024" className="bg-slate-50 dark:bg-slate-900" value={formData.anio} onChange={(e) => setFormData({...formData, anio: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input placeholder="Ej: Blanco" className="bg-slate-50 dark:bg-slate-900" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Kilometraje</Label>
                  <Input type="number" placeholder="Ej: 50000" className="bg-slate-50 dark:bg-slate-900" value={formData.kilometraje} onChange={(e) => setFormData({...formData, kilometraje: e.target.value})} />
                </div>
              </div>
            </section>
          </div>
          
          <DialogFooter className="mt-8 border-t border-border pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarVehiculo} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Vehículo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}