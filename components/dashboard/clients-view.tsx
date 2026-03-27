"use client"

import { useState, useEffect } from "react"
import { Plus, Search, User, Phone, Mail, FileText, Edit, Trash2, Car, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// Importamos tu conexión real a la Base de Datos
import { supabase } from "@/lib/supabase"

export function ClientsView() {
  const [clientes, setClientes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // Estado para el formulario del nuevo cliente
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    documento: "", // DNI o CUIT
    condicion_iva: "Consumidor Final"
  })

  // 1. FUNCIÓN PARA TRAER LOS CLIENTES DESDE SUPABASE
  const fetchClientes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('fecha_registro', { ascending: false }) // Los más nuevos primero

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Error al cargar clientes:", error)
      alert("Hubo un error al cargar la lista de clientes.")
    } finally {
      setIsLoading(false)
    }
  }

  // Ejecutar fetchClientes la primera vez que se abre la pantalla
  useEffect(() => {
    fetchClientes()
  }, [])

  // 2. FUNCIÓN PARA GUARDAR UN CLIENTE NUEVO EN SUPABASE
  const handleGuardarCliente = async () => {
    if (!formData.nombre.trim()) {
      alert("El nombre del cliente es obligatorio.")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([
          { 
            nombre: formData.nombre,
            telefono: formData.telefono,
            email: formData.email,
            documento: formData.documento,
            condicion_iva: formData.condicion_iva
          }
        ])

      if (error) throw error

      // Si todo salió bien: cerramos modal, limpiamos formulario y recargamos la tabla
      setIsModalOpen(false)
      setFormData({ nombre: "", telefono: "", email: "", documento: "", condicion_iva: "Consumidor Final" })
      fetchClientes() 
      
    } catch (error) {
      console.error("Error al guardar cliente:", error)
      alert("No se pudo guardar el cliente en la base de datos.")
    } finally {
      setIsSaving(false)
    }
  }

  // Filtrar clientes en pantalla según lo que escribas en el buscador
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.documento && c.documento.includes(busqueda)) ||
    (c.telefono && c.telefono.includes(busqueda))
  )

  return (
    <div className="space-y-6 pb-8">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Directorio de Clientes</h2>
          <p className="text-sm text-muted-foreground">Administrá los datos y contactos de tu taller.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Buscador y Tabla */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, DNI o teléfono..." 
              className="pl-9 bg-background border-border"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20 hover:bg-secondary/20 border-border">
                <TableHead className="font-semibold text-foreground">Nombre / Razón Social</TableHead>
                <TableHead className="font-semibold text-foreground">Contacto</TableHead>
                <TableHead className="font-semibold text-foreground">DNI / CUIT</TableHead>
                <TableHead className="font-semibold text-foreground">Condición IVA</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                      Cargando clientes desde la base de datos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : clientesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {busqueda ? "No se encontraron clientes con esa búsqueda." : "Tu base de datos está vacía. ¡Agregá tu primer cliente!"}
                  </TableCell>
                </TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full"><User className="h-4 w-4 text-primary" /></div>
                        {cliente.nombre}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {cliente.telefono || "-"}</div>
                      {cliente.email && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3"/> {cliente.email}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {cliente.documento || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 bg-secondary rounded-md text-foreground border border-border">
                        {cliente.condicion_iva}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Editar Cliente">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL NUEVO CLIENTE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Agregar Nuevo Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Nombre y Apellido / Razón Social <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Ej: Juan Pérez o Transportes SRL" 
                className="bg-background border-border" 
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">DNI / CUIT</Label>
                <Input 
                  placeholder="Sin puntos ni guiones" 
                  className="bg-background border-border font-mono text-sm" 
                  value={formData.documento}
                  onChange={(e) => setFormData({...formData, documento: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Condición frente al IVA</Label>
                <Select value={formData.condicion_iva} onValueChange={(val: string) => setFormData({...formData, condicion_iva: val})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                    <SelectItem value="Responsable Inscripto">Resp. Inscripto</SelectItem>
                    <SelectItem value="Monotributo">Monotributo</SelectItem>
                    <SelectItem value="Exento">Exento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ej: 5491144445555" 
                  className="pl-9 bg-background border-border" 
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Email (Opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email"
                  placeholder="cliente@ejemplo.com" 
                  className="pl-9 bg-background border-border" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleGuardarCliente} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Guardar Cliente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}