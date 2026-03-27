"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Car, User, Edit, Loader2, Save, Gauge, Palette, Calendar } from "lucide-react"
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

export function VehiclesView() {
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const [formData, setFormData] = useState({
    patente: "",
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
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`*, clientes ( id, nombre, apellido, razon_social, tipo_cliente )`)
      
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
      const { data, error } = await supabase.from('clientes').select('id, nombre, apellido, razon_social, tipo_cliente').order('nombre')
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

  // 🇦🇷 MÁGIA ARGENTINA: Formateador Inteligente de Patentes
  const handlePatenteChange = (e: any) => {
    // 1. Quitar todo lo que no sea letra o número y pasar a mayúscula
    let limpia = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()

    // 2. Limitar a 7 caracteres alfanuméricos máximo (Mercosur)
    if (limpia.length > 7) limpia = limpia.slice(0, 7)

    let formateada = limpia

    // 3. Lógica para detectar si es vieja (AAA123) o nueva (AA123AA)
    if (limpia.length >= 3) {
      // ¿El tercer caracter es una letra? -> Formato viejo (AAA 123)
      if (/[A-Z]/.test(limpia[2])) {
        formateada = limpia.slice(0, 3) + (limpia.length > 3 ? " " + limpia.slice(3, 6) : "")
      } 
      // ¿El tercer caracter es un número? -> Formato nuevo (AA 123 AA)
      else {
        formateada = limpia.slice(0, 2) + " " + limpia.slice(2, 5) + (limpia.length > 5 ? " " + limpia.slice(5, 7) : "")
      }
    }

    setFormData({ ...formData, patente: formateada })
  }

  const handleGuardarVehiculo = async () => {
    // Guardamos la patente en la base de datos SIN ESPACIOS para que las búsquedas sean perfectas
    const patenteLimpiaDB = formData.patente.replace(/\s/g, "")

    if (!patenteLimpiaDB || !formData.marca || !formData.modelo || !formData.cliente_id) {
      alert("Patente, Marca, Modelo y Dueño son obligatorios.")
      return
    }

    // Validar que tenga sentido (6 o 7 caracteres limpios)
    if (patenteLimpiaDB.length < 6) {
      alert("La patente debe tener al menos 6 caracteres.")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('vehiculos').insert([{
        patente: patenteLimpiaDB, // Se guarda pegada: AAA123 o AA123AA
        marca: formData.marca,
        modelo: formData.modelo,
        anio: formData.anio ? parseInt(formData.anio) : null,
        color: formData.color,
        kilometraje: formData.kilometraje ? parseInt(formData.kilometraje) : null,
        cliente_id: formData.cliente_id
      }])

      if (error) {
        if (error.code === '23505') {
          alert("Ya existe un vehículo registrado con esta patente en el taller.")
        } else {
          throw error
        }
        return
      }

      setIsModalOpen(false)
      setFormData({ patente: "", marca: "", modelo: "", anio: "", color: "", kilometraje: "", cliente_id: "" })
      fetchVehiculos()
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el vehículo.")
    } finally {
      setIsSaving(false)
    }
  }

  const vehiculosFiltrados = vehiculos.filter(v => 
    v.patente.includes(busqueda.replace(/\s/g, "").toUpperCase()) || // Busca sin importar si el usuario pone espacios
    v.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busqueda.toLowerCase())
  )

  // FUNCIÓN VISUAL: Le pone los espacios a la patente cuando la leemos de la Base de Datos
  const formatearPatenteVisual = (patenteDB: string) => {
    if (!patenteDB) return ""
    if (patenteDB.length === 6) return `${patenteDB.slice(0,3)} ${patenteDB.slice(3,6)}` // AAA 123
    if (patenteDB.length === 7) return `${patenteDB.slice(0,2)} ${patenteDB.slice(2,5)} ${patenteDB.slice(5,7)}` // AA 123 AA
    return patenteDB
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Flota de Vehículos</h2>
          <p className="text-sm text-muted-foreground">Administrá los autos de tus clientes.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por patente, marca o modelo..." className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-foreground font-bold">Registrar Vehículo</DialogTitle>
            <p className="text-sm text-muted-foreground">Asigná un nuevo vehículo a un cliente existente.</p>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Dueño del Vehículo <span className="text-destructive">*</span></Label>
              <Select value={formData.cliente_id} onValueChange={(val: string) => setFormData({...formData, cliente_id: val})}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-border">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`}
                    </SelectItem>
                  ))}
                  {clientes.length === 0 && <SelectItem value="disabled" disabled>No hay clientes cargados</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-4">
              <div className="space-y-2">
                <Label>Patente Argentina <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Ej: AA 123 AA  o  AAA 123" 
                  className="bg-white dark:bg-slate-950 font-mono text-lg uppercase tracking-widest text-center" 
                  value={formData.patente} 
                  onChange={handlePatenteChange}
                  maxLength={9} // 7 caracteres + 2 espacios posibles
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Volkswagen" className="bg-white dark:bg-slate-950" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Amarok V6" className="bg-white dark:bg-slate-950" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input type="number" placeholder="2024" className="bg-white dark:bg-slate-950" value={formData.anio} onChange={(e) => setFormData({...formData, anio: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input placeholder="Ej: Blanco" className="bg-white dark:bg-slate-950" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Km Act.</Label>
                  <Input type="number" placeholder="Ej: 50000" className="bg-white dark:bg-slate-950" value={formData.kilometraje} onChange={(e) => setFormData({...formData, kilometraje: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4 pt-4 border-t border-border gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarVehiculo} disabled={isSaving} className="bg-primary text-primary-foreground">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Vehículo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}