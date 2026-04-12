"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Save, UploadCloud, Store, FileText, MessageSquare, Image as ImageIcon, 
  Loader2, CheckCircle2, Users, Download, Database, 
  UserPlus, ShieldCheck, Banknote, Wrench, MoreVertical, UserCog, Trash2 // <-- Agregados para usuarios
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- IMPORTS AGREGADOS SOLO PARA EL MÓDULO DE USUARIOS ---
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// ---------------------------------------------------------

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // --- ESTADOS AGREGADOS PARA USUARIOS ---
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    email: "",
    rol: "mecanico"
  })
  // ---------------------------------------

  // Estados para Logo
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estado de Configuración
  const [config, setConfig] = useState<any>({
    id: 1,
    nombre_taller: "",
    telefono: "",
    direccion: "",
    cuit: "",
    email: "",
    horario: "",
    instagram: "",
    terminos_presupuesto: "",
    msj_presupuesto: "",
    msj_listo: "",
    msj_postventa_wpp: "",
    msj_postventa_email_asunto: "",
    msj_postventa_email_cuerpo: "",
    logo_url: ""
  })

  // 1. CARGAR DATOS
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true)
      try {
        // Carga de configuración original
        const { data, error } = await supabase.from('configuracion').select('*').limit(1).single()
        if (error && error.code !== 'PGRST116') throw error
        if (data) setConfig(data)

        // Carga de usuarios agregada
        const { data: usersData } = await supabase.from('perfiles').select('*').order('nombre')
        if (usersData) setUsuarios(usersData)

      } catch (error) {
        console.error("Error al cargar configuración:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // --- FUNCIÓN AGREGADA PARA CREAR USUARIO ---
  const handleCrearUsuario = async () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.email) return alert("Nombre y Email son obligatorios")
    setIsSaving(true)
    try {
      const tempId = crypto.randomUUID() // ID temporal hasta conectar con Auth real
      const { error } = await supabase.from('perfiles').insert([{
        id: tempId,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }])
      if (error) throw error
      
      alert("Usuario creado correctamente.")
      setIsUserModalOpen(false)
      setNuevoUsuario({ nombre: "", apellido: "", email: "", rol: "mecanico" })
      
      // Recargar lista de usuarios
      const { data: usersData } = await supabase.from('perfiles').select('*').order('nombre')
      if (usersData) setUsuarios(usersData)
    } catch (error: any) {
      alert("Error al crear usuario: " + error.message)
    } finally { 
      setIsSaving(false) 
    }
  }

  // Helper para los colores de los roles
  const renderRolBadge = (rol: string) => {
    switch (rol) {
      case 'admin': return <Badge className="bg-slate-900"><ShieldCheck className="w-3 h-3 mr-1"/> Admin</Badge>
      case 'cajero': return <Badge className="bg-emerald-500"><Banknote className="w-3 h-3 mr-1"/> Caja</Badge>
      default: return <Badge variant="outline"><Wrench className="w-3 h-3 mr-1"/> Mecánico</Badge>
    }
  }
  // -------------------------------------------

  // 2. SUBIR LOGO A STORAGE
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) return alert("Por favor, subí un archivo de imagen válido (JPG, PNG).")

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
      
      setConfig({ ...config, logo_url: data.publicUrl })
      await supabase.from('configuracion').upsert({ id: config.id || 1, logo_url: data.publicUrl })

      alert("¡Logo subido y guardado correctamente!")
    } catch (error: any) {
      alert("Hubo un error al subir la imagen: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  // 3. GUARDAR CAMBIOS DE TEXTO
  const handleGuardarConfiguracion = async () => {
    setIsSaving(true)
    try {
      const payload = { ...config, id: config.id || 1 }
      const { error } = await supabase.from('configuracion').upsert(payload)
      if (error) throw error
      alert("¡Configuración guardada correctamente!")
    } catch (error: any) {
      alert("Hubo un error al guardar: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 4. FUNCIÓN PARA EXPORTAR CSV
  const handleExportar = async (tabla: string) => {
    try {
      const { data, error } = await supabase.from(tabla).select('*')
      if (error) throw error
      if (!data || data.length === 0) return alert(`No hay datos en la tabla ${tabla} para exportar.`)

      // Armar el CSV
      const cabeceras = Object.keys(data[0]).join(',')
      const filas = data.map((row: any) => 
        Object.values(row).map(val => {
          if (val === null || val === undefined) return '""'
          return `"${String(val).replace(/"/g, '""')}"` // Escapar comillas
        }).join(',')
      ).join('\n')

      const csvContent = `${cabeceras}\n${filas}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      
      // Descargar
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${tabla}_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (error: any) {
      alert("Error al exportar: " + error.message)
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configuración del Sistema</h2>
          <p className="text-sm text-muted-foreground">Personalizá la identidad, presupuestos, permisos y exportación de datos.</p>
        </div>
        <Button onClick={handleGuardarConfiguracion} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full shadow-sm rounded-lg overflow-hidden border border-border bg-card">
        {/* MENÚ DE PESTAÑAS (ANCHO COMPLETO) */}
        <div className="border-b border-border bg-secondary/30 overflow-x-auto">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger value="general" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><Store className="w-4 h-4 mr-2" /> General</TabsTrigger>
            <TabsTrigger value="logo" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><ImageIcon className="w-4 h-4 mr-2" /> Logo</TabsTrigger>
            <TabsTrigger value="presupuestos" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><FileText className="w-4 h-4 mr-2" /> Presupuestos</TabsTrigger>
            <TabsTrigger value="mensajes" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><MessageSquare className="w-4 h-4 mr-2" /> Mensajería</TabsTrigger>
            <TabsTrigger value="usuarios" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><Users className="w-4 h-4 mr-2" /> Usuarios y Permisos</TabsTrigger>
            <TabsTrigger value="exportar" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"><Download className="w-4 h-4 mr-2" /> Exportar Datos</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* --- PESTAÑA 1: GENERAL --- */}
          <TabsContent value="general" className="m-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre del Taller / Razón Social</Label>
                <Input value={config.nombre_taller || ""} onChange={e => setConfig({...config, nombre_taller: e.target.value})} placeholder="Ej: Mecánica Integral SRL" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono Comercial</Label>
                <Input value={config.telefono || ""} onChange={e => setConfig({...config, telefono: e.target.value})} placeholder="Ej: +54 9 351 1234567" />
              </div>
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input value={config.cuit || ""} onChange={e => setConfig({...config, cuit: e.target.value})} placeholder="Ej: 30-12345678-9" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección Física</Label>
                <Input value={config.direccion || ""} onChange={e => setConfig({...config, direccion: e.target.value})} placeholder="Ej: Av. Principal 123, Córdoba" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={config.email || ""} onChange={e => setConfig({...config, email: e.target.value})} placeholder="taller@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Instagram / Redes</Label>
                <Input value={config.instagram || ""} onChange={e => setConfig({...config, instagram: e.target.value})} placeholder="Ej: @mitaller.ok" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Horarios de Atención</Label>
                <Input value={config.horario || ""} onChange={e => setConfig({...config, horario: e.target.value})} placeholder="Ej: Lun a Vie de 8:00 a 18:00hs" />
              </div>
            </div>
          </TabsContent>

          {/* --- PESTAÑA 2: LOGO --- */}
          <TabsContent value="logo" className="m-0">
            <div className="max-w-md">
              <p className="text-sm text-muted-foreground mb-6">Esta imagen se usará en la cabecera de la web y en todos los documentos exportables (Presupuestos, Órdenes de Trabajo).</p>
              
              <div className="w-full aspect-video md:aspect-square md:max-w-xs rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-secondary/20 overflow-hidden relative group mb-4">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-4 bg-white dark:bg-slate-900" />
                ) : (
                  <div className="text-center text-muted-foreground flex flex-col items-center">
                    <Store className="w-12 h-12 mb-2 opacity-30" />
                    <span className="text-sm">Sin logo cargado</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium">Click para cambiar</span>
                </div>
              </div>
              
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadLogo} />
              
              <Button variant="outline" className="w-full md:max-w-xs" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                {config.logo_url ? "Actualizar Imagen" : "Subir Imagen"}
              </Button>
            </div>
          </TabsContent>

          {/* --- PESTAÑA 3: PRESUPUESTOS --- */}
          <TabsContent value="presupuestos" className="m-0 space-y-4 max-w-4xl">
            <div className="bg-primary/10 text-primary p-4 rounded-lg flex items-start gap-3 mb-6">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Estos términos legales y condiciones de trabajo se imprimirán automáticamente al pie de todos los presupuestos que generes en formato PDF o mandes por WhatsApp.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-lg">Términos, Condiciones y Validez</Label>
              <Textarea 
                className="min-h-[250px] text-base" 
                value={config.terminos_presupuesto || ""} 
                onChange={e => setConfig({...config, terminos_presupuesto: e.target.value})} 
                placeholder="Ej: Los presupuestos tienen una validez de 7 días. Los repuestos están sujetos a cotización del dólar..." 
              />
            </div>
          </TabsContent>

          {/* --- PESTAÑA 4: MENSAJERÍA --- */}
          <TabsContent value="mensajes" className="m-0 space-y-6 max-w-4xl">
            
            {/* CUADRO DE VARIABLES RESTAURADO */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-5 rounded-lg text-sm text-emerald-800 dark:text-emerald-400">
              <div className="flex items-center gap-2 mb-2 font-bold text-base">
                <MessageSquare className="w-5 h-5" /> Variables Dinámicas Disponibles
              </div>
              <p className="mb-3">Podés usar estas "etiquetas" en tus textos. Al enviar el mensaje, el sistema las reemplazará automáticamente por los datos reales del cliente:</p>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{"{{cliente}}"}</span>
                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{"{{vehiculo}}"}</span>
                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{"{{patente}}"}</span>
                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{"{{total}}"}</span>
                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{"{{taller}}"}</span>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-600"/> Envío de Presupuesto (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_presupuesto || ""} onChange={e => setConfig({...config, msj_presupuesto: e.target.value})} placeholder="Hola {{cliente}}, te adjuntamos el presupuesto..." />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-600"/> Aviso de Auto Listo (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_listo || ""} onChange={e => setConfig({...config, msj_listo: e.target.value})} placeholder="Hola {{cliente}}, tu {{vehiculo}} ya está listo..." />
              </div>
              
              <div className="border-t border-border pt-4"></div>
              
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-600"/> Seguimiento Post-Venta (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_postventa_wpp || ""} onChange={e => setConfig({...config, msj_postventa_wpp: e.target.value})} placeholder="Hola {{cliente}}, queríamos saber cómo sentiste el auto..." />
              </div>
            </div>
          </TabsContent>

          {/* --- PESTAÑA 5: USUARIOS Y PERMISOS (MODIFICADA COMO PEDISTE) --- */}
          <TabsContent value="usuarios" className="m-0 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Gestión de Empleados</h3>
                <p className="text-sm text-muted-foreground">Creá usuarios para tus mecánicos o recepcionistas y definí sus roles.</p>
              </div>
              <Button onClick={() => setIsUserModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                <UserPlus className="w-4 h-4 mr-2" /> Nuevo Usuario
              </Button>
            </div>

            <Card className="shadow-none border border-border">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Nombre</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Rol</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                        No hay usuarios registrados. Hacé clic en "Nuevo Usuario" para agregar a tu equipo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nombre} {u.apellido}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>{renderRolBadge(u.rol)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer">
                                <UserCog className="w-4 h-4 mr-2"/> Editar Rol
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2"/> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* --- PESTAÑA 6: EXPORTAR DATOS --- */}
          <TabsContent value="exportar" className="m-0 space-y-6 max-w-4xl">
            <div className="bg-secondary/30 p-6 rounded-lg border border-border">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><Database className="w-5 h-5 text-primary" /> Backups y Exportación</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Descargá la información de tu base de datos en formato CSV (compatible con Microsoft Excel y Google Sheets). Ideal para dárselo a tu contador o hacer cruces de datos.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5" onClick={() => handleExportar('clientes')}>
                  <Download className="w-6 h-6 text-blue-600" /> Exportar Clientes
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5" onClick={() => handleExportar('vehiculos')}>
                  <Download className="w-6 h-6 text-orange-600" /> Exportar Vehículos
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5" onClick={() => handleExportar('presupuestos')}>
                  <Download className="w-6 h-6 text-emerald-600" /> Exportar Presupuestos
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5" onClick={() => handleExportar('proveedores')}>
                  <Download className="w-6 h-6 text-rose-600" /> Exportar Proveedores
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5" onClick={() => handleExportar('movimientos_caja')}>
                  <Download className="w-6 h-6 text-purple-600" /> Historial de Caja
                </Button>
              </div>
            </div>
          </TabsContent>

        </div>
      </Tabs>

      {/* --- MODAL DE NUEVO USUARIO (FUERA DE LOS TABS) --- */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Completá los datos para darle acceso al sistema.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Juan" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input placeholder="Ej: Pérez" value={nuevoUsuario.apellido} onChange={e => setNuevoUsuario({...nuevoUsuario, apellido: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="mecanico@taller.com" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Rol / Permisos</Label>
              <Select value={nuevoUsuario.rol} onValueChange={(v: string) => setNuevoUsuario({...nuevoUsuario, rol: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Todo)</SelectItem>
                  <SelectItem value="cajero">Caja y Ventas</SelectItem>
                  <SelectItem value="mecanico">Mecánico (Solo Tareas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearUsuario} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSaving ? "Guardando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}