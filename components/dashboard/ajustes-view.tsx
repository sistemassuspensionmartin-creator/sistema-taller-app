"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Save, UploadCloud, Store, FileText, MessageSquare, Image as ImageIcon, 
  Loader2, CheckCircle2, Users, Download, Database, UserCog, Trash2, 
  MoreVertical, ShieldCheck, Banknote, Wrench, UserPlus, Instagram, Phone, MapPin, Mail, Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
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
  
  // Estados para Usuarios
  const [usuarios, setUsuarios] = useState<any[]>([])
  
  // Estados para Logo
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estado de Configuración (TODOS tus campos originales restaurados)
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

  // 1. CARGAR TODO EL SISTEMA
  const cargarTodo = async () => {
    setIsLoading(true)
    try {
      // Cargar Configuración del Taller
      const { data: configData, error: configError } = await supabase.from('configuracion').select('*').limit(1).single()
      if (configError && configError.code !== 'PGRST116') throw configError
      if (configData) setConfig(configData)

      // Cargar Lista de Usuarios/Perfiles
      const { data: usersData } = await supabase.from('perfiles').select('*').order('nombre')
      setUsuarios(usersData || [])

    } catch (error) {
      console.error("Error al sincronizar ajustes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { cargarTodo() }, [])

  // 2. LÓGICA DE LOGO (Tuya original)
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return alert("Subí una imagen válida.")

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
      
      const newConfig = { ...config, logo_url: data.publicUrl }
      setConfig(newConfig)
      await supabase.from('configuracion').upsert({ id: config.id || 1, logo_url: data.publicUrl })
      alert("Logo actualizado con éxito.")
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally { setIsUploading(false) }
  }

  // 3. GUARDAR CONFIGURACIÓN GENERAL
  const handleGuardarConfiguracion = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('configuracion').upsert({ ...config, id: config.id || 1 })
      if (error) throw error
      alert("¡Configuración guardada!")
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    } finally { setIsSaving(false) }
  }

  // 4. EXPORTACIÓN DE DATOS (Tu lógica de CSV original)
  const handleExportar = async (tabla: string) => {
    try {
      const { data, error } = await supabase.from(tabla).select('*')
      if (error) throw error
      if (!data || data.length === 0) return alert("No hay datos.")
      const cabeceras = Object.keys(data[0]).join(',')
      const filas = data.map((row: any) => 
        Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob([`${cabeceras}\n${filas}`], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', `${tabla}_backup.csv`)
      link.click()
    } catch (error: any) { alert(error.message) }
  }

  // Helper para insignias de roles
  const renderRolBadge = (rol: string) => {
    switch (rol) {
      case 'admin': return <Badge className="bg-slate-900"><ShieldCheck className="w-3 h-3 mr-1"/> Admin</Badge>
      case 'cajero': return <Badge className="bg-emerald-500"><Banknote className="w-3 h-3 mr-1"/> Caja</Badge>
      default: return <Badge variant="outline"><Wrench className="w-3 h-3 mr-1"/> Mecánico</Badge>
    }
  }

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configuración del Sistema</h2>
          <p className="text-sm text-slate-500 font-medium">Gestioná la identidad de Suspensión MARTIN, mensajes y accesos.</p>
        </div>
        <Button onClick={handleGuardarConfiguracion} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg transition-all">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full shadow-xl rounded-2xl overflow-hidden border border-slate-100 bg-white">
        
        {/* LISTADO DE PESTAÑAS (Estética original restaurada) */}
        <div className="border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger value="general" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><Store className="w-4 h-4 mr-2" /> General</TabsTrigger>
            <TabsTrigger value="logo" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><ImageIcon className="w-4 h-4 mr-2" /> Logo</TabsTrigger>
            <TabsTrigger value="presupuestos" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><FileText className="w-4 h-4 mr-2" /> Presupuestos</TabsTrigger>
            <TabsTrigger value="mensajes" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><MessageSquare className="w-4 h-4 mr-2" /> Mensajería</TabsTrigger>
            <TabsTrigger value="usuarios" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><Users className="w-4 h-4 mr-2" /> Usuarios</TabsTrigger>
            <TabsTrigger value="exportar" className="rounded-none py-4 px-6 font-bold uppercase text-[10px] data-[state=active]:border-b-2 data-[state=active]:border-emerald-600"><Download className="w-4 h-4 mr-2" /> Exportar</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-8">
          
          {/* --- GENERAL --- */}
          <TabsContent value="general" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Razón Social</Label>
                <Input value={config.nombre_taller || ""} onChange={e => setConfig({...config, nombre_taller: e.target.value})} />
              </div>
              <div className="space-y-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Teléfono</Label><Input value={config.telefono || ""} onChange={e => setConfig({...config, telefono: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">CUIT</Label><Input value={config.cuit || ""} onChange={e => setConfig({...config, cuit: e.target.value})} /></div>
              <div className="space-y-2 md:col-span-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Dirección</Label><Input value={config.direccion || ""} onChange={e => setConfig({...config, direccion: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Email Taller</Label><Input value={config.email || ""} onChange={e => setConfig({...config, email: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Instagram</Label><Input value={config.instagram || ""} onChange={e => setConfig({...config, instagram: e.target.value})} /></div>
              <div className="space-y-2 md:col-span-2"><Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Horarios</Label><Input value={config.horario || ""} onChange={e => setConfig({...config, horario: e.target.value})} /></div>
            </div>
          </TabsContent>

          {/* --- LOGO --- */}
          <TabsContent value="logo" className="m-0">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="w-64 h-64 rounded-3xl border-4 border-dashed border-slate-100 flex items-center justify-center bg-slate-50/50 overflow-hidden relative group">
                {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain p-6" /> : <Store className="w-12 h-12 opacity-20" />}
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer">
                  <UploadCloud className="w-8 h-8 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-widest">Cambiar Logo</span>
                </div>
              </div>
              <div className="max-w-xs space-y-4">
                <h3 className="font-black uppercase tracking-tight text-xl text-slate-800">Identidad Visual</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Este logo aparecerá en tus facturas AFIP, presupuestos y cierres de caja.</p>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleUploadLogo} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                  {isUploading ? "Subiendo..." : "Seleccionar Archivo"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* --- PRESUPUESTOS --- */}
          <TabsContent value="presupuestos" className="m-0 space-y-6">
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">Los términos legales aparecerán al pie de cada presupuesto PDF generado.</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase tracking-widest text-[10px] text-slate-400">Condiciones de Servicio</Label>
              <Textarea className="min-h-[300px] font-medium leading-relaxed" value={config.terminos_presupuesto || ""} onChange={e => setConfig({...config, terminos_presupuesto: e.target.value})} />
            </div>
          </TabsContent>

          {/* --- MENSAJERÍA (Restaurado Full) --- */}
          <TabsContent value="mensajes" className="m-0 space-y-8 max-w-4xl">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-3 font-black text-emerald-900 text-sm uppercase tracking-tighter"><MessageSquare className="w-5 h-5" /> Variables Disponibles</div>
              <div className="flex flex-wrap gap-2">
                {["cliente", "vehiculo", "patente", "total", "taller"].map(v => (
                  <code key={v} className="bg-white px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 text-xs font-bold">{"{{"}{v}{"}}"}</code>
                ))}
              </div>
            </div>

            <div className="grid gap-8">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Aviso Nuevo Presupuesto (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_presupuesto || ""} onChange={e => setConfig({...config, msj_presupuesto: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Aviso Trabajo Terminado (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_listo || ""} onChange={e => setConfig({...config, msj_listo: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Seguimiento Post-Venta (WhatsApp)</Label>
                <Textarea className="min-h-[100px]" value={config.msj_postventa_wpp || ""} onChange={e => setConfig({...config, msj_postventa_wpp: e.target.value})} />
              </div>
            </div>
          </TabsContent>

          {/* --- USUARIOS (Módulo nuevo integrado) --- */}
          <TabsContent value="usuarios" className="m-0 space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Personal del Taller</h3>
                <p className="text-sm text-slate-500">Definí quiénes pueden ver la caja y quiénes solo los trabajos.</p>
              </div>
              <Button className="bg-slate-900 text-white font-bold"><UserPlus className="w-4 h-4 mr-2" /> Nuevo Usuario</Button>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px]">Operador</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Email Acceso</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Permisos</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-bold text-slate-900">{u.nombre} {u.apellido}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                      <TableCell>{renderRolBadge(u.rol)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="font-medium"><UserCog className="w-4 h-4 mr-2"/> Cambiar Rol</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 font-bold"><Trash2 className="w-4 h-4 mr-2"/> Quitar Acceso</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usuarios.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">No hay perfiles creados todavía.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* --- EXPORTAR (Tu estética de colores original) --- */}
          <TabsContent value="exportar" className="m-0 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-28 flex flex-col gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all rounded-2xl" onClick={() => handleExportar('clientes')}>
                <Download className="w-6 h-6 text-blue-600" /> <span className="font-bold uppercase text-[10px]">Exportar Clientes</span>
              </Button>
              <Button variant="outline" className="h-28 flex flex-col gap-3 hover:border-orange-500 hover:bg-orange-50 transition-all rounded-2xl" onClick={() => handleExportar('vehiculos')}>
                <Download className="w-6 h-6 text-orange-600" /> <span className="font-bold uppercase text-[10px]">Exportar Vehículos</span>
              </Button>
              <Button variant="outline" className="h-28 flex flex-col gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-all rounded-2xl" onClick={() => handleExportar('presupuestos')}>
                <Download className="w-6 h-6 text-emerald-600" /> <span className="font-bold uppercase text-[10px]">Exportar Presupuestos</span>
              </Button>
              <Button variant="outline" className="h-28 flex flex-col gap-3 hover:border-rose-500 hover:bg-rose-50 transition-all rounded-2xl" onClick={() => handleExportar('proveedores')}>
                <Download className="w-6 h-6 text-rose-600" /> <span className="font-bold uppercase text-[10px]">Exportar Proveedores</span>
              </Button>
              <Button variant="outline" className="h-28 flex flex-col gap-3 hover:border-purple-500 hover:bg-purple-50 transition-all rounded-2xl" onClick={() => handleExportar('movimientos_caja')}>
                <Download className="w-6 h-6 text-purple-600" /> <span className="font-bold uppercase text-[10px]">Exportar Historial Caja</span>
              </Button>
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}