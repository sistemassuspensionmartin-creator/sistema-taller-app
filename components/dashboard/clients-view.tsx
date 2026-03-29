"use client"

import { useState, useEffect } from "react"
import { Plus, Search, User, Phone, Mail, Edit, Loader2, Save, Building2, Copy, MapPin, FileText, Car, Calendar, Palette, Gauge, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export function ClientsView() {
  const [clientes, setClientes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // ESTADOS MODALES CLIENTES
  const [isModalOpen, setIsModalOpen] = useState(false) 
  const [editingId, setEditingId] = useState<string | null>(null) 
  const [isViewModalOpen, setIsViewModalOpen] = useState(false) 
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)

  // ESTADOS VEHÍCULOS
  const [isAddingVehicleTab, setIsAddingVehicleTab] = useState(false)
  const [isSavingVehicle, setIsSavingVehicle] = useState(false)
  const [vehicleFormData, setVehicleFormData] = useState({
    patente: "", tipo_vehiculo: "Auto", marca: "", modelo: "", anio: "", color: "", kilometraje: ""
  })

  const [formData, setFormData] = useState({
    tipo_cliente: "persona", nombre: "", apellido: "", telefono: "", email: "",
    calle: "", barrio: "", ciudad: "", documento: "", razon_social: "", 
    condicion_iva: "Consumidor Final", domicilio_fiscal: "", notas: ""
  })

  const fetchClientes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('clientes').select('*, vehiculos(*)').order('fecha_registro', { ascending: false })
      if (error) throw error
      
      setClientes(data || [])

      if (clienteSeleccionado) {
        const actualizado = data?.find((c: any) => c.id === clienteSeleccionado.id)
        if (actualizado) setClienteSeleccionado(actualizado)
      }
    } catch (error) {
      console.error("Error al cargar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchClientes() }, [])

  const handleCuitChange = (e: any) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 11) value = value.slice(0, 11)
    let formatted = value
    if (value.length > 2 && value.length <= 10) formatted = `${value.slice(0, 2)}-${value.slice(2)}`
    else if (value.length > 10) formatted = `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10)}`
    setFormData({ ...formData, documento: formatted })
  }

  const handlePatenteChange = (e: any) => {
    let limpia = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (limpia.length > 7) limpia = limpia.slice(0, 7)
    let formateada = limpia
    if (limpia.length >= 3) {
      if (/[A-Z]/.test(limpia[2])) formateada = limpia.slice(0, 3) + (limpia.length > 3 ? " " + limpia.slice(3, 6) : "")
      else formateada = limpia.slice(0, 2) + " " + limpia.slice(2, 5) + (limpia.length > 5 ? " " + limpia.slice(5, 7) : "")
    }
    setVehicleFormData({ ...vehicleFormData, patente: formateada })
  }

  const formatearPatenteVisual = (patenteDB: string) => {
    if (!patenteDB) return ""
    if (patenteDB.length === 6) return `${patenteDB.slice(0,3)} ${patenteDB.slice(3,6)}` 
    if (patenteDB.length === 7) return `${patenteDB.slice(0,2)} ${patenteDB.slice(2,5)} ${patenteDB.slice(5,7)}` 
    return patenteDB
  }

  const copiarDomicilio = () => {
    const direccionCompleta = `${formData.calle} ${formData.barrio ? ', ' + formData.barrio : ''} ${formData.ciudad ? ', ' + formData.ciudad : ''}`.trim().replace(/^,|,$/g, '')
    setFormData({ ...formData, domicilio_fiscal: direccionCompleta })
  }

  const abrirCrear = () => {
    setEditingId(null)
    setFormData({ tipo_cliente: "persona", nombre: "", apellido: "", telefono: "", email: "", calle: "", barrio: "", ciudad: "", documento: "", razon_social: "", condicion_iva: "Consumidor Final", domicilio_fiscal: "", notas: "" })
    setIsModalOpen(true)
  }

  const abrirEditar = (cliente: any, e: any) => {
    if (e) e.stopPropagation() 
    setEditingId(cliente.id)
    setFormData({
      tipo_cliente: cliente.tipo_cliente || "persona",
      nombre: cliente.nombre === "-" ? "" : (cliente.nombre || ""), 
      apellido: cliente.apellido || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      calle: cliente.calle || "",
      barrio: cliente.barrio || "",
      ciudad: cliente.ciudad || "",
      documento: cliente.documento || "",
      razon_social: cliente.razon_social || "",
      condicion_iva: cliente.condicion_iva || "Consumidor Final",
      domicilio_fiscal: cliente.domicilio_fiscal || "",
      notas: cliente.notas || ""
    })
    setIsModalOpen(true)
  }

  const abrirDetalles = (cliente: any) => {
    setClienteSeleccionado(cliente)
    setIsAddingVehicleTab(false) 
    setIsViewModalOpen(true)
  }

  const handleGuardarCliente = async () => {
    if (formData.tipo_cliente === "persona" && (!formData.nombre.trim() || !formData.documento.trim() || !formData.telefono.trim())) return alert("Nombre, Documento y Teléfono son obligatorios para Personas.")
    if (formData.tipo_cliente === "empresa" && (!formData.razon_social.trim() || !formData.documento.trim() || !formData.telefono.trim())) return alert("Razón Social, CUIT y Teléfono son obligatorios para Empresas.")
    
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        nombre: formData.tipo_cliente === 'empresa' ? "-" : formData.nombre,
        apellido: formData.tipo_cliente === 'empresa' ? null : formData.apellido,
        razon_social: formData.tipo_cliente === 'persona' ? null : formData.razon_social,
      }

      if (editingId) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clientes').insert([payload])
        if (error) throw error
      }
      setIsModalOpen(false)
      fetchClientes() 
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el cliente: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const abrirFormularioVehiculo = () => {
    setVehicleFormData({ patente: "", tipo_vehiculo: "Auto", marca: "", modelo: "", anio: "", color: "", kilometraje: "" })
    setIsAddingVehicleTab(true)
  }

  const handleGuardarVehiculoDesdeCliente = async () => {
    const patenteLimpia = vehicleFormData.patente.replace(/\s/g, "")
    if (!patenteLimpia || !vehicleFormData.marca || !vehicleFormData.modelo) {
      return alert("Patente, Marca y Modelo son obligatorios.")
    }
    if (patenteLimpia.length < 6) return alert("La patente debe tener al menos 6 caracteres.")

    setIsSavingVehicle(true)
    try {
      const { error } = await supabase.from('vehiculos').insert([{
        patente: patenteLimpia,
        tipo_vehiculo: vehicleFormData.tipo_vehiculo,
        marca: vehicleFormData.marca,
        modelo: vehicleFormData.modelo,
        anio: vehicleFormData.anio ? parseInt(vehicleFormData.anio) : null,
        color: vehicleFormData.color,
        kilometraje: vehicleFormData.kilometraje ? parseInt(vehicleFormData.kilometraje) : null,
        cliente_id: clienteSeleccionado.id 
      }])

      if (error) {
        if (error.code === '23505') alert("Ya existe un vehículo registrado con esta patente.")
        else throw error
        return
      }

      setIsAddingVehicleTab(false)
      fetchClientes() 
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el vehículo.")
    } finally {
      setIsSavingVehicle(false)
    }
  }

  const clientesFiltrados = clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busqueda.toLowerCase())) || 
    (c.apellido && c.apellido.toLowerCase().includes(busqueda.toLowerCase())) || 
    (c.razon_social && c.razon_social.toLowerCase().includes(busqueda.toLowerCase())) || 
    (c.documento && c.documento.includes(busqueda))
  )

  return (
    <div className="space-y-6 pb-8">
      {/* TABLA PRINCIPAL */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Directorio de Clientes</h2>
          <p className="text-sm text-muted-foreground">Administrá los datos y contactos de tu taller.</p>
        </div>
        <Button onClick={abrirCrear} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, CUIT o teléfono..." className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead>Nombre / Razón Social</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>DNI / CUIT</TableHead>
                <TableHead>Flota</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : clientesFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay clientes para mostrar.</TableCell></TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-secondary/50 cursor-pointer" onClick={() => abrirDetalles(cliente)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                          {cliente.tipo_cliente === 'empresa' ? <Building2 className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                        </div>
                        {cliente.tipo_cliente === 'empresa' ? cliente.razon_social : `${cliente.nombre} ${cliente.apellido || ''}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {cliente.telefono}</div>
                      {cliente.email && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3"/> {cliente.email}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{cliente.documento || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex w-fit items-center gap-1">
                        <Car className="h-3 w-3" /> {cliente.vehiculos?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => abrirEditar(cliente, e)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: VER DETALLES DEL CLIENTE (ALTURA FIJA CON h-[85vh])              */}
      {/* ========================================================================= */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl border-border bg-card h-[85vh] flex flex-col p-0 gap-0">
          {clienteSeleccionado && (
            <>
              {/* CABECERA (FIJA) */}
              <div className="bg-secondary/30 p-6 border-b border-border shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {clienteSeleccionado.tipo_cliente === 'empresa' ? clienteSeleccionado.razon_social : `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Información detallada del cliente</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { setIsViewModalOpen(false); abrirEditar(clienteSeleccionado, e); }}>
                    <Edit className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              </div>

              {/* CUERPO (SCROLEABLE) */}
              <div className="p-6 flex-1 overflow-y-auto">
                <Tabs defaultValue="datos" className="w-full">
                  <TabsList className="mb-6 bg-secondary">
                    <TabsTrigger value="datos">Datos Personales</TabsTrigger>
                    <TabsTrigger value="vehiculos">Vehículos ({clienteSeleccionado.vehiculos?.length || 0})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="datos" className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</h3>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-2 rounded-full"><Phone className="h-4 w-4" /></div>
                          <div><p className="font-medium">{clienteSeleccionado.telefono}</p><p className="text-xs text-muted-foreground">Teléfono</p></div>
                        </div>
                        {clienteSeleccionado.email && (
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-2 rounded-full"><Mail className="h-4 w-4" /></div>
                            <div><p className="font-medium">{clienteSeleccionado.email}</p><p className="text-xs text-muted-foreground">Email</p></div>
                          </div>
                        )}
                        {(clienteSeleccionado.calle || clienteSeleccionado.ciudad) && (
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-2 rounded-full"><MapPin className="h-4 w-4" /></div>
                            <div>
                              <p className="font-medium">{clienteSeleccionado.calle} {clienteSeleccionado.barrio && `, ${clienteSeleccionado.barrio}`} {clienteSeleccionado.ciudad && `, ${clienteSeleccionado.ciudad}`}</p>
                              <p className="text-xs text-muted-foreground">Dirección</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border"></div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos de Facturación</h3>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 p-2 rounded-full"><FileText className="h-4 w-4" /></div>
                          <div><p className="font-medium font-mono">{clienteSeleccionado.documento || "-"}</p><p className="text-xs text-muted-foreground">CUIT</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 p-2 rounded-full font-bold text-[10px] w-8 h-8 flex items-center justify-center">IVA</div>
                          <div><p className="font-medium">{clienteSeleccionado.condicion_iva}</p><p className="text-xs text-muted-foreground">Condición de IVA</p></div>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-lg mt-2 border border-border">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Razón Social</p>
                              <p className="font-medium">{clienteSeleccionado.razon_social || `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Domicilio Fiscal</p>
                              <p className="font-medium">{clienteSeleccionado.domicilio_fiscal || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {clienteSeleccionado.notas && (
                      <>
                        <div className="border-t border-border"></div>
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas Internas</h3>
                          <p className="text-sm text-foreground bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800/50">
                            {clienteSeleccionado.notas}
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="vehiculos">
                    {isAddingVehicleTab ? (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                          <Button variant="ghost" size="icon" onClick={() => setIsAddingVehicleTab(false)} className="h-8 w-8"><ArrowLeft className="h-4 w-4"/></Button>
                          <h3 className="text-lg font-bold">Registrar Nuevo Vehículo</h3>
                        </div>

                        <div className="p-6 bg-secondary/30 rounded-lg border border-border space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Patente <span className="text-destructive">*</span></Label>
                              <Input placeholder="AA 123 AA" className="bg-white dark:bg-slate-950 font-mono uppercase text-center tracking-widest" value={vehicleFormData.patente} onChange={handlePatenteChange} maxLength={9} />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo <span className="text-destructive">*</span></Label>
                              <Select value={vehicleFormData.tipo_vehiculo} onValueChange={(val: string) => setVehicleFormData({...vehicleFormData, tipo_vehiculo: val})}>
                                <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Auto">Auto</SelectItem>
                                  <SelectItem value="Camioneta">Camioneta</SelectItem>
                                  <SelectItem value="Furgón">Furgón</SelectItem>
                                  <SelectItem value="SUV">SUV</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            {/* ACÁ RECUPERAMOS EL SELECTOR DE MARCAS */}
                            <div className="space-y-2">
                              <Label>Marca <span className="text-destructive">*</span></Label>
                              <Select value={vehicleFormData.marca} onValueChange={(val: string) => setVehicleFormData({...vehicleFormData, marca: val})}>
                                <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue placeholder="Marca" /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {MARCAS_COMUNES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Modelo <span className="text-destructive">*</span></Label>
                              <Input placeholder="Ej: Amarok" className="bg-white dark:bg-slate-950" value={vehicleFormData.modelo} onChange={(e) => setVehicleFormData({...vehicleFormData, modelo: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 pt-2">
                            <div className="space-y-2"><Label>Año</Label><Input type="number" className="bg-white dark:bg-slate-950" value={vehicleFormData.anio} onChange={(e) => setVehicleFormData({...vehicleFormData, anio: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Color</Label><Input className="bg-white dark:bg-slate-950" value={vehicleFormData.color} onChange={(e) => setVehicleFormData({...vehicleFormData, color: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Km Act.</Label><Input type="number" className="bg-white dark:bg-slate-950" value={vehicleFormData.kilometraje} onChange={(e) => setVehicleFormData({...vehicleFormData, kilometraje: e.target.value})} /></div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="ghost" onClick={() => setIsAddingVehicleTab(false)} disabled={isSavingVehicle}>Cancelar</Button>
                          <Button onClick={handleGuardarVehiculoDesdeCliente} disabled={isSavingVehicle} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSavingVehicle ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>} Guardar Vehículo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Flota del Cliente</h3>
                          <Button size="sm" onClick={abrirFormularioVehiculo} className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none border border-primary/20">
                            <Plus className="w-4 h-4 mr-1"/> Agregar Vehículo
                          </Button>
                        </div>

                        {clienteSeleccionado.vehiculos && clienteSeleccionado.vehiculos.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {clienteSeleccionado.vehiculos.map((v: any) => (
                              <Card key={v.patente} className="border-border bg-secondary/20 hover:border-primary/50 transition-colors shadow-sm">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="font-mono font-bold bg-background px-2 py-1 rounded border border-border tracking-widest text-sm text-foreground shadow-sm">
                                      {formatearPatenteVisual(v.patente)}
                                    </span>
                                    <Badge variant="outline" className="bg-background">{v.tipo_vehiculo}</Badge>
                                  </div>
                                  <p className="font-bold text-lg text-foreground mb-1">{v.marca} {v.modelo}</p>
                                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                    {v.anio && <span className="flex items-center"><Calendar className="h-3 w-3 mr-1"/> {v.anio}</span>}
                                    {v.color && <span className="flex items-center"><Palette className="h-3 w-3 mr-1"/> {v.color}</span>}
                                    {v.kilometraje && <span className="flex items-center"><Gauge className="h-3 w-3 mr-1"/> {v.kilometraje.toLocaleString()} km</span>}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-secondary/10">
                            <Car className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                            <p className="text-muted-foreground mb-4">Este cliente no tiene vehículos registrados.</p>
                            <Button variant="outline" onClick={abrirFormularioVehiculo}>Registrar el primero</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* ========================================================================= */}
      {/* MODAL 2: CREAR / EDITAR CLIENTE (ALTURA FIJA CON h-[85vh])                */}
      {/* ========================================================================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl border-border bg-card h-[85vh] flex flex-col p-0">
          {/* CABECERA FIJA */}
          <DialogHeader className="shrink-0 p-6 border-b border-border">
            <DialogTitle className="text-2xl text-foreground font-bold">
              {editingId ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Complete los datos. Los campos marcados con * son obligatorios.</p>
          </DialogHeader>

          {/* CONTENIDO QUE HACE SCROLL */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            <div className="bg-secondary/30 p-4 rounded-lg flex justify-center border border-border">
              <RadioGroup defaultValue="persona" className="flex space-x-6" value={formData.tipo_cliente} onValueChange={(val: string) => setFormData({...formData, tipo_cliente: val})}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="persona" id="persona" /><Label htmlFor="persona" className="font-semibold cursor-pointer">Persona Física</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="empresa" id="empresa" /><Label htmlFor="empresa" className="font-semibold cursor-pointer">Empresa</Label></div>
              </RadioGroup>
            </div>

            {formData.tipo_cliente === "persona" && (
              <>
                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Datos Personales</h3></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre *</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Apellido *</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} /></div>
                  </div>
                </section>
                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Domicilio</h3></div>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Calle y Altura</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.calle} onChange={(e) => setFormData({...formData, calle: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Barrio</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.barrio} onChange={(e) => setFormData({...formData, barrio: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Ciudad</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} /></div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Contacto</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Número de Teléfono *</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
              </div>
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4 flex justify-between items-center">
                <h3 className="font-bold text-sm text-foreground uppercase">Facturación (ARCA/AFIP)</h3>
                {formData.tipo_cliente === "persona" && (
                  <Button variant="ghost" size="sm" onClick={copiarDomicilio} className="text-xs h-7 text-primary hover:bg-primary/10"><Copy className="h-3 w-3 mr-1" /> Usar mismo domicilio</Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CUIT/DNI {formData.tipo_cliente === "empresa" && "*"}</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900 border-border font-mono text-sm" placeholder="XX-XXXXXXXX-X" value={formData.documento} onChange={handleCuitChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón Social {formData.tipo_cliente === "empresa" && "*"}</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Condición de IVA</Label>
                    <Select value={formData.condicion_iva} onValueChange={(val: string) => setFormData({...formData, condicion_iva: val})}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                        <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                        <SelectItem value="Monotributo">Monotributo</SelectItem>
                        <SelectItem value="Exento">Exento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Domicilio Fiscal</Label><Input className="bg-slate-50 dark:bg-slate-900 border-border" value={formData.domicilio_fiscal} onChange={(e) => setFormData({...formData, domicilio_fiscal: e.target.value})} /></div>
                </div>
              </div>
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Interno</h3></div>
              <div className="space-y-2"><Label>Notas del Taller</Label><Textarea className="bg-slate-50 dark:bg-slate-900 border-border min-h-[80px]" value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} /></div>
            </section>
          </div>
          
          {/* PIE DE PÁGINA FIJO */}
          <DialogFooter className="shrink-0 p-6 border-t border-border bg-card rounded-b-lg">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleGuardarCliente} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : (editingId ? "Actualizar Cliente" : "Guardar Cliente")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}