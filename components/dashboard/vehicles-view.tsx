"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Car, User, Edit, Loader2, Save, Gauge, Palette, Calendar, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busquedaPrincipal, setBusquedaPrincipal] = useState("")

  // Estados para el BUSCADOR INTELIGENTE de clientes
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

  const fetchVehiculos = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('vehiculos').select(`*, clientes ( id, nombre, apellido, razon_social, tipo_cliente, documento )`)
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
      const { data, error } = await supabase.from('clientes').select('id, nombre, apellido, razon_social, tipo_cliente, documento').order('nombre')
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    }
  }

  useEffect(() => {
    fetchVehiculos()
    fetchClientesParaSelect()
  }, [])

  // ABRIR MODAL LIMPIO
  const abrirModal = () => {
    setFormData({ patente: "", tipo_vehiculo: "Auto", marca: "", modelo: "", anio: "", color: "", kilometraje: "", cliente_id: "" })
    setBusquedaCliente("")
    setClienteSeleccionadoInfo(null)
    setIsModalOpen(true)
  }

  // FORMATEADOR DE PATENTES
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

  // Filtrado para la tabla principal
  const vehiculosFiltrados = vehiculos.filter(v => 
    v.patente.includes(busquedaPrincipal.replace(/\s/g, "").toUpperCase()) || 
    v.marca.toLowerCase().includes(busquedaPrincipal.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busquedaPrincipal.toLowerCase())
  )

  // Filtrado para el buscador de clientes en el modal
  const clientesParaMostrar = busquedaCliente.trim() === "" ? [] : clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.apellido && c.apellido.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.razon_social && c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.documento && c.documento.includes(busquedaCliente))
  ).slice(0, 5) // Mostramos solo los primeros 5 para no hacer una lista gigante

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
                  <TableRow key={v.patente} className="hover:bg-secondary/50 cursor-pointer">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></Button>
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