"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Save, UploadCloud, Store, FileText, MessageSquare, Image as ImageIcon, 
  Loader2, CheckCircle2, Users, Download, Database, UserCog, Trash2, 
  MoreVertical, ShieldCheck, Banknote, Wrench, UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // NUEVOS ESTADOS PARA USUARIOS
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false)
  
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

  // 1. CARGAR DATOS (Ahora incluye usuarios)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Cargar Configuración
        const { data: configData, error: configError } = await supabase.from('configuracion').select('*').limit(1).single()
        if (configError && configError.code !== 'PGRST116') throw configError
        if (configData) setConfig(configData)

        // Cargar Usuarios
        const { data: usersData } = await supabase.from('perfiles').select('*').order('nombre')
        setUsuarios(usersData || [])
        
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // 2. SUBIR LOGO A STORAGE (Sin cambios)
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

  // 3. GUARDAR CAMBIOS DE TEXTO (Sin cambios)
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

  // 4. FUNCIÓN PARA EXPORTAR CSV (Sin cambios)
  const handleExportar = async (tabla: string) => {
    try {
      const { data, error } = await supabase.from(tabla).select('*')
      if (error) throw error
      if (!data || data.length === 0) return alert(`No hay datos en la tabla ${tabla} para exportar.`)
      const cabeceras = Object.keys(data[0]).join(',')
      const filas = data.map((row: any) => 
        Object.values(row).map(val => {
          if (val === null || val === undefined) return '""'
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(',')
      ).join('\n')
      const csvContent = `${cabeceras}\n${filas}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
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

  // 5. HELPER PARA ROLES
  const renderRolBadge = (rol: string) => {
    switch (rol) {
      case 'admin': return <Badge className="bg-slate-900"><ShieldCheck className="w-3 h-3 mr-1"/> Admin</Badge>
      case 'cajero': return <Badge className="bg-emerald-500"><Banknote className="w-3 h-3 mr-1"/> Caja</Badge>
      default: return <Badge variant="outline"><Wrench className="w-3 h-3 mr-1"/> Mecánico</Badge>
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Configuración del Sistema</h2>
          <p className="text-sm text-muted-foreground">Personalizá la identidad, presupuestos, permisos y exportación de datos.</p>
        </div>
        <Button onClick={handleGuardarConfiguracion} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full shadow-sm rounded-lg overflow-hidden border border-border bg-card">
        <div className="border-b border-border bg-secondary/30 overflow-x-auto">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger value="general" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><Store className="w-4 h-4 mr-2" /> General</TabsTrigger>
            <TabsTrigger value="logo" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><ImageIcon className="w-4 h-4 mr-2" /> Logo</TabsTrigger>
            <TabsTrigger value="presupuestos" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><FileText className="w-4 h-4 mr-2" /> Presupuestos</TabsTrigger>
            <TabsTrigger value="mensajes" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><MessageSquare className="w-4 h-4 mr-2" /> Mensajería</TabsTrigger>
            <TabsTrigger value="usuarios" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><Users className="w-4 h-4 mr-2" /> Usuarios y Permisos</TabsTrigger>
            <TabsTrigger value="exportar" className="rounded-none py-3 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary"><Download className="w-4 h-4 mr-2" /> Exportar Datos</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* --- PESTAÑAS ANTERIORES SE MANTIENEN IGUAL --- */}
          <TabsContent value="general" className="m-0 space-y-4">
             {/* ... (tu código de general) */}
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

          <TabsContent value="logo" className="m-0">
             {/* ... (tu código de logo) */}
             <div className="max-w-md">
               <p className="text-sm text-muted-foreground mb-6">Esta imagen se usará en la cabecera de la web y en todos los documentos exportables.</p>
               <div className="w-full aspect-square md:max-w-xs rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-secondary/20 overflow-hidden relative group mb-4">
                 {config.logo_url ? <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-4 bg-white" /> : <Store className="w-12 h-12 mb-2 opacity-30" />}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white" onClick={() => fileInputRef.current?.click()}>
                   <UploadCloud className="w-8 h-8 mb-2" />
                   <span className="text-sm font-medium">Click para cambiar</span>
                 </div>
               </div>
               <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadLogo} />
             </div>
          </TabsContent>

          <TabsContent value="presupuestos" className="m-0 space-y-4 max-w-4xl">
            <div className="bg-primary/10 text-primary p-4 rounded-lg flex items-start gap-3 mb-6">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Estos términos legales se imprimirán al pie de todos los presupuestos.</p>
            </div>
            <Textarea className="min-h-[250px] text-base" value={config.terminos_presupuesto || ""} onChange={e => setConfig({...config, terminos_presupuesto: e.target.value})} />
          </TabsContent>

          <TabsContent value="mensajes" className="m-0 space-y-6 max-w-4xl">
            {/* Variables info box */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-5 rounded-lg text-sm text-emerald-800">
              <div className="flex items-center gap-2 mb-2 font-bold text-base"><MessageSquare className="w-5 h-5" /> Variables Dinámicas</div>
              <p className="mb-3">Etiquetas disponibles: {"{{cliente}}"}, {"{{vehiculo}}"}, {"{{patente}}"}, {"{{total}}"}.</p>
            </div>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">Envío de Presupuesto (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_presupuesto || ""} onChange={e => setConfig({...config, msj_presupuesto: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">Aviso de Auto Listo (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_listo || ""} onChange={e => setConfig({...config, msj_listo: e.target.value})} />
              </div>
            </div>
          </TabsContent>

          {/* --- PESTAÑA 5: USUARIOS Y PERMISOS (REEMPLAZADA) --- */}
          <TabsContent value="usuarios" className="m-0 space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-bold">Personal del Taller</h3>
                <p className="text-sm text-muted-foreground">Gestioná los accesos y roles de tu equipo.</p>
              </div>
              <Button className="bg-[#FF9E00] hover:bg-[#e68a00] text-white font-bold">
                <UserPlus className="w-4 h-4 mr-2" /> Nuevo Usuario
              </Button>
            </div>

            <Card className="shadow-none border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead className="font-bold uppercase text-[10px]">Nombre</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Email</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Rol</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                        No hay usuarios registrados. Los verás aquí cuando crees perfiles en la base de datos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold">{u.nombre} {u.apellido}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell>{renderRolBadge(u.rol)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><UserCog className="w-4 h-4 mr-2"/> Editar Rol</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600"><Trash2 className="w-4 h-4 mr-2"/> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg text-sm text-blue-800">
              <p className="font-bold mb-1 uppercase text-[10px]">Niveles de Acceso:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li><b>Admin:</b> Acceso total a caja, configuración y reportes.</li>
                <li><b>Caja:</b> Puede cobrar, ver movimientos de caja y clientes.</li>
                <li><b>Mecánico:</b> Solo puede ver órdenes de trabajo y stock.</li>
              </ul>
            </div>
          </TabsContent>

          {/* --- PESTAÑA 6: EXPORTAR DATOS --- */}
          <TabsContent value="exportar" className="m-0 space-y-6 max-w-4xl">
             <div className="bg-secondary/30 p-6 rounded-lg border border-border">
               <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><Database className="w-5 h-5 text-primary" /> Backups y Exportación</h3>
               <p className="text-sm text-muted-foreground mb-6">Descargá la información de tu base de datos en formato CSV.</p>
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
               </div>
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}