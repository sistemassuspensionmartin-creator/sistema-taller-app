"use client"

import { useState, useEffect } from "react"
import { Plus, Search, User, Phone, Mail, Edit, Trash2, Loader2, Save, Building2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

export function ClientsView() {
  const [clientes, setClientes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // ESTADO DEL FORMULARIO CON LOS CAMPOS NUEVOS
  const [formData, setFormData] = useState({
    tipo_cliente: "persona", // persona o empresa
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    calle: "",
    barrio: "",
    ciudad: "",
    documento: "", // Usado para CUIT/DNI
    razon_social: "",
    condicion_iva: "Consumidor Final",
    domicilio_fiscal: "",
    notas: ""
  })

  const fetchClientes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('clientes').select('*').order('fecha_registro', { ascending: false })
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Error al cargar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchClientes() }, [])

  // BOTÓN MÁGICO: Copiar Domicilio a Fiscal
  const copiarDomicilio = () => {
    const direccionCompleta = `${formData.calle} ${formData.barrio ? ', ' + formData.barrio : ''} ${formData.ciudad ? ', ' + formData.ciudad : ''}`.trim().replace(/^,|,$/g, '')
    setFormData({ ...formData, domicilio_fiscal: direccionCompleta })
  }

  const handleGuardarCliente = async () => {
    // Validaciones básicas según si es persona o empresa
    if (formData.tipo_cliente === "persona" && (!formData.nombre.trim() || !formData.apellido.trim() || !formData.telefono.trim())) {
      alert("Nombre, Apellido y Teléfono son obligatorios para Personas.")
      return
    }
    if (formData.tipo_cliente === "empresa" && (!formData.razon_social.trim() || !formData.documento.trim() || !formData.telefono.trim())) {
      alert("Razón Social, CUIT y Teléfono son obligatorios para Empresas.")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('clientes').insert([formData])
      if (error) throw error

      setIsModalOpen(false)
      setFormData({
        tipo_cliente: "persona", nombre: "", apellido: "", telefono: "", email: "",
        calle: "", barrio: "", ciudad: "", documento: "", razon_social: "",
        condicion_iva: "Consumidor Final", domicilio_fiscal: "", notas: ""
      })
      fetchClientes() 
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el cliente.")
    } finally {
      setIsSaving(false)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Directorio de Clientes</h2>
          <p className="text-sm text-muted-foreground">Administrá los datos y contactos de tu taller.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground">
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
                <TableHead>Condición IVA</TableHead>
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
                  <TableRow key={cliente.id} className="hover:bg-secondary/50 cursor-pointer">
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
                    <TableCell><span className="text-xs px-2 py-1 bg-secondary rounded-md border border-border">{cliente.condicion_iva}</span></TableCell>
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

      {/* MODAL NUEVO CLIENTE (DISEÑO PERSONALIZADO) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-foreground font-bold">Registrar Nuevo Cliente</DialogTitle>
            <p className="text-sm text-muted-foreground">Complete los datos. Los campos marcados con * son obligatorios.</p>
          </DialogHeader>

          {/* SELECTOR PERSONA / EMPRESA */}
          <div className="bg-secondary/30 p-4 rounded-lg mb-6 flex justify-center border border-border">
            <RadioGroup 
              defaultValue="persona" 
              className="flex space-x-6"
              value={formData.tipo_cliente}
              onValueChange={(val: string) => setFormData({...formData, tipo_cliente: val})}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="persona" id="persona" />
                <Label htmlFor="persona" className="font-semibold cursor-pointer">Persona Física</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="empresa" id="empresa" />
                <Label htmlFor="empresa" className="font-semibold cursor-pointer">Empresa</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-8">
            
            {/* BLOQUE PERSONA: DATOS PERSONALES */}
            {formData.tipo_cliente === "persona" && (
              <>
                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                    <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">Datos Personales</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre <span className="text-destructive">*</span></Label>
                      <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Juan Carlos" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido <span className="text-destructive">*</span></Label>
                      <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Martínez" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                    <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">Domicilio</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Calle y Altura</Label>
                      <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Av. Corrientes 1234" value={formData.calle} onChange={(e) => setFormData({...formData, calle: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Barrio</Label>
                        <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Almagro" value={formData.barrio} onChange={(e) => setFormData({...formData, barrio: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ciudad</Label>
                        <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: CABA" value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* BLOQUE CONTACTO COMÚN A AMBOS */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">Contacto</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Teléfono <span className="text-destructive">*</span></Label>
                  <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: +54 11 4567-8901" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: cliente@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
            </section>

            {/* BLOQUE FACTURACIÓN (ARCA/AFIP) */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4 flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">Facturación (ARCA/AFIP)</h3>
                
                {/* BOTÓN MÁGICO PARA COPIAR DOMICILIO (Solo se ve si es Persona) */}
                {formData.tipo_cliente === "persona" && (
                  <Button variant="ghost" size="sm" onClick={copiarDomicilio} className="text-xs h-7 text-primary hover:bg-primary/10">
                    <Copy className="h-3 w-3 mr-1" /> Usar mismo domicilio
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CUIT / DNI {formData.tipo_cliente === "empresa" && <span className="text-destructive">*</span>}</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900 border-border font-mono text-sm" placeholder="Ej: 20-12345678-9" value={formData.documento} onChange={(e) => setFormData({...formData, documento: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón Social {formData.tipo_cliente === "empresa" && <span className="text-destructive">*</span>}</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Empresa SRL" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} />
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
                  <div className="space-y-2">
                    <Label>Domicilio Fiscal</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900 border-border" placeholder="Ej: Av. Corrientes 1234, CABA" value={formData.domicilio_fiscal} onChange={(e) => setFormData({...formData, domicilio_fiscal: e.target.value})} />
                  </div>
                </div>
              </div>
            </section>

            {/* BLOQUE INTERNO */}
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">Interno</h3>
              </div>
              <div className="space-y-2">
                <Label>Notas del Taller</Label>
                <Textarea 
                  className="bg-slate-50 dark:bg-slate-900 border-border min-h-[80px]" 
                  placeholder="Notas internas sobre el cliente (preferencias, observaciones, etc.)"
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                />
              </div>
            </section>

          </div>
          
          <DialogFooter className="mt-8 border-t border-border pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarCliente} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}