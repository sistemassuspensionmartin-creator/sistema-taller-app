"use client"

import { useState, useEffect } from "react"
import { Plus, Search, User, Phone, Mail, Edit, Trash2, Loader2, Save, Building2, Copy, MapPin, FileText, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

import { supabase } from "@/lib/supabase"

export function ClientsView() {
  const [clientes, setClientes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // ESTADOS PARA LOS MODALES
  const [isModalOpen, setIsModalOpen] = useState(false) // Modal de Crear/Editar
  const [editingId, setEditingId] = useState<string | null>(null) // Para saber si editamos o creamos
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false) // Modal de Ver Detalles
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)

  const [formData, setFormData] = useState({
    tipo_cliente: "persona",
    nombre: "", apellido: "", telefono: "", email: "",
    calle: "", barrio: "", ciudad: "", documento: "",
    razon_social: "", condicion_iva: "Consumidor Final",
    domicilio_fiscal: "", notas: ""
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

  // MÁGIA: Formateador de CUIT en tiempo real
  const handleCuitChange = (e: any) => {
    // 1. Borramos todo lo que no sea número
    let value = e.target.value.replace(/\D/g, "")
    // 2. Limitamos a 11 números máximo
    if (value.length > 11) value = value.slice(0, 11)
    
    // 3. Le ponemos los guiones
    let formatted = value
    if (value.length > 2 && value.length <= 10) {
      formatted = `${value.slice(0, 2)}-${value.slice(2)}`
    } else if (value.length > 10) {
      formatted = `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10)}`
    }
    
    setFormData({ ...formData, documento: formatted })
  }

  const copiarDomicilio = () => {
    const direccionCompleta = `${formData.calle} ${formData.barrio ? ', ' + formData.barrio : ''} ${formData.ciudad ? ', ' + formData.ciudad : ''}`.trim().replace(/^,|,$/g, '')
    setFormData({ ...formData, domicilio_fiscal: direccionCompleta })
  }

  // ABRIR MODAL PARA CREAR
  const abrirCrear = () => {
    setEditingId(null)
    setFormData({
      tipo_cliente: "persona", nombre: "", apellido: "", telefono: "", email: "",
      calle: "", barrio: "", ciudad: "", documento: "", razon_social: "",
      condicion_iva: "Consumidor Final", domicilio_fiscal: "", notas: ""
    })
    setIsModalOpen(true)
  }

  // ABRIR MODAL PARA EDITAR
  const abrirEditar = (cliente: any, e: any) => {
    e.stopPropagation() // Evita que se abra también el modal de ver detalles
    setEditingId(cliente.id)
    setFormData({
      tipo_cliente: cliente.tipo_cliente || "persona",
      nombre: cliente.nombre || "",
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

  // ABRIR MODAL DE DETALLES
  const abrirDetalles = (cliente: any) => {
    setClienteSeleccionado(cliente)
    setIsViewModalOpen(true)
  }

  const handleGuardarCliente = async () => {
    // Validaciones
    if (formData.tipo_cliente === "persona" && (!formData.nombre.trim() || !formData.apellido.trim() || !formData.telefono.trim())) {
      return alert("Nombre, Apellido y Teléfono son obligatorios para Personas.")
    }
    if (formData.tipo_cliente === "empresa" && (!formData.razon_social.trim() || !formData.documento.trim() || !formData.telefono.trim())) {
      return alert("Razón Social, CUIT y Teléfono son obligatorios para Empresas.")
    }

    // Validación estricta de CUIT (11 números)
    const rawDocumento = formData.documento.replace(/\D/g, "")
    if (rawDocumento.length > 0 && rawDocumento.length !== 11) {
      return alert("El CUIT debe tener exactamente 11 números.")
    }

    setIsSaving(true)
    try {
      if (editingId) {
        // ACTUALIZAR (UPDATE)
        const { error } = await supabase.from('clientes').update(formData).eq('id', editingId)
        if (error) throw error
      } else {
        // CREAR NUEVO (INSERT)
        const { error } = await supabase.from('clientes').insert([formData])
        if (error) throw error
      }

      setIsModalOpen(false)
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
                <TableHead>CUIT</TableHead>
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
                    <TableCell><span className="text-xs px-2 py-1 bg-secondary rounded-md border border-border">{cliente.condicion_iva}</span></TableCell>
                    <TableCell className="text-right">
                      {/* Pasamos 'e' a abrirEditar para que no se dispare el click de la fila entera */}
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

      {/* MODAL: VER DETALLES DEL CLIENTE (TIPO FICHA) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto p-0">
          {clienteSeleccionado && (
            <>
              {/* Cabecera de la ficha */}
              <div className="bg-secondary/30 p-6 border-b border-border">
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

              {/* Pestañas (Datos / Vehículos) */}
              <div className="p-6">
                <Tabs defaultValue="datos" className="w-full">
                  <TabsList className="mb-6 bg-secondary">
                    <TabsTrigger value="datos">Datos Personales</TabsTrigger>
                    <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="datos" className="space-y-8">
                    {/* Contacto */}
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

                    {/* Facturación */}
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
                        
                        {/* Bloque gris para Razón Social y Domicilio Fiscal */}
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

                    {/* Notas Internas */}
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
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg bg-secondary/20">
                      <Car className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium">Vehículos del Cliente</h3>
                      <p className="text-sm text-muted-foreground mb-4">La conexión de vehículos estará disponible en el próximo paso.</p>
                      <Button disabled variant="outline"><Plus className="w-4 h-4 mr-2"/> Agregar Vehículo</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: FORMULARIO CREAR/EDITAR CLIENTE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-foreground font-bold">
              {editingId ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Complete los datos. Los campos marcados con * son obligatorios.</p>
          </DialogHeader>

          <div className="bg-secondary/30 p-4 rounded-lg mb-6 flex justify-center border border-border">
            <RadioGroup defaultValue="persona" className="flex space-x-6" value={formData.tipo_cliente} onValueChange={(val: string) => setFormData({...formData, tipo_cliente: val})}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="persona" id="persona" /><Label htmlFor="persona" className="font-semibold cursor-pointer">Persona Física</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="empresa" id="empresa" /><Label htmlFor="empresa" className="font-semibold cursor-pointer">Empresa</Label></div>
            </RadioGroup>
          </div>

          <div className="space-y-8">
            {formData.tipo_cliente === "persona" && (
              <>
                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Datos Personales</h3></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre *</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Apellido *</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} /></div>
                  </div>
                </section>
                <section>
                  <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Domicilio</h3></div>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Calle y Altura</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.calle} onChange={(e) => setFormData({...formData, calle: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Barrio</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.barrio} onChange={(e) => setFormData({...formData, barrio: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Ciudad</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} /></div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Contacto</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Número de Teléfono *</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" className="bg-slate-50 dark:bg-slate-900" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
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
                    <Label>CUIT {formData.tipo_cliente === "empresa" && "*"}</Label>
                    {/* ACÁ ESTÁ CONECTADA LA FUNCIÓN MÁGICA DEL CUIT */}
                    <Input className="bg-slate-50 dark:bg-slate-900 font-mono text-sm" placeholder="XX-XXXXXXXX-X" value={formData.documento} onChange={handleCuitChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón Social {formData.tipo_cliente === "empresa" && "*"}</Label>
                    <Input className="bg-slate-50 dark:bg-slate-900" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Condición de IVA</Label>
                    <Select value={formData.condicion_iva} onValueChange={(val: string) => setFormData({...formData, condicion_iva: val})}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-900"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                        <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                        <SelectItem value="Monotributo">Monotributo</SelectItem>
                        <SelectItem value="Exento">Exento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Domicilio Fiscal</Label><Input className="bg-slate-50 dark:bg-slate-900" value={formData.domicilio_fiscal} onChange={(e) => setFormData({...formData, domicilio_fiscal: e.target.value})} /></div>
                </div>
              </div>
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase">Interno</h3></div>
              <div className="space-y-2"><Label>Notas del Taller</Label><Textarea className="bg-slate-50 dark:bg-slate-900 min-h-[80px]" value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} /></div>
            </section>
          </div>
          
          <DialogFooter className="mt-8 border-t border-border pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarCliente} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : (editingId ? "Actualizar Cliente" : "Guardar Cliente")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}