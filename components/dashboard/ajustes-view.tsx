"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Store, Phone, MapPin, FileText, Mail, FileSignature, Clock, Instagram, Users, Shield, Database, Download, Plus, Trash2, Edit, Wrench, MessageCircle, CheckCircle2 } from "lucide-react"
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
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    nombre_taller: "", telefono: "", direccion: "", cuit: "",
    email: "", horario: "", instagram: "", terminos_presupuesto: "",
    msj_presupuesto: "Hola {{cliente}}, te contactamos de {{taller}}.\n\nTe preparamos el presupuesto para tu {{vehiculo}} ({{patente}}).\n\n*Total estimado: {{total}}*\n\nTe adjunto el PDF con el detalle. ¡Cualquier consulta estamos a disposición!",
    msj_listo: "Hola {{cliente}}, te contactamos de {{taller}}.\n\n¡Te avisamos que tu vehículo ({{patente}}) ya está terminado y listo para retirar! ✅\n\nPodés pasar dentro de nuestro horario: {{horario}}. ¡Te esperamos!"
  })

  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single()
      if (error) throw error
      if (data) {
        setFormData({
          nombre_taller: data.nombre_taller || "", telefono: data.telefono || "",
          direccion: data.direccion || "", cuit: data.cuit || "",
          email: data.email || "", horario: data.horario || "",
          instagram: data.instagram || "", terminos_presupuesto: data.terminos_presupuesto || "",
          msj_presupuesto: data.msj_presupuesto || formData.msj_presupuesto,
          msj_listo: data.msj_listo || formData.msj_listo
        })
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  const handleGuardarCambios = async () => {
    if (!formData.nombre_taller.trim()) return alert("El nombre del taller es obligatorio.")
    setIsSaving(true)
    try {
      const { error } = await supabase.from('configuracion').update(formData).eq('id', 1)
      if (error) throw error
      alert("¡Configuración guardada con éxito!")
    } catch (error) {
      console.error("Error:", error)
      alert("Hubo un error al guardar los cambios.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Ajustes del Sistema</h2>
          <p className="text-sm text-muted-foreground">Administrá tu empresa, notificaciones y usuarios.</p>
        </div>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="mb-6 bg-secondary h-12 w-full justify-start rounded-lg px-2">
          <TabsTrigger value="empresa" className="px-6 data-[state=active]:bg-background">Datos y Notificaciones</TabsTrigger>
          <TabsTrigger value="usuarios" className="px-6 data-[state=active]:bg-background">Usuarios y Permisos</TabsTrigger>
          <TabsTrigger value="sistema" className="px-6 data-[state=active]:bg-background">Sistema y Respaldos</TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: DATOS Y NOTIFICACIONES */}
        <TabsContent value="empresa" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Información Comercial</CardTitle>
                <CardDescription>Esta información aparecerá en tus PDFs generados.</CardDescription>
              </div>
              <Button onClick={handleGuardarCambios} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Cambios
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nombre del Taller <span className="text-destructive">*</span></Label>
                  <div className="relative"><Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.nombre_taller} onChange={(e) => setFormData({...formData, nombre_taller: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <Label>CUIT del Taller</Label>
                  <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: 30-12345678-9" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border font-mono" value={formData.cuit} onChange={(e) => setFormData({...formData, cuit: e.target.value})} /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Teléfono Comercial</Label>
                  <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: +54 9 11 4444-5555" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="taller@ejemplo.com" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Dirección Física</Label>
                  <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: Av. Principal 1234, Ciudad" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Horarios de Atención</Label>
                  <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: Lun a Vie: 8 a 18hs" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.horario} onChange={(e) => setFormData({...formData, horario: e.target.value})} /></div>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="space-y-2 w-full md:w-1/2 md:pr-3">
                  <Label>Cuenta de Instagram</Label>
                  <div className="relative"><Instagram className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: @mitaller.auto" className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NUEVA SECCIÓN: NOTIFICACIONES WHATSAPP */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-[#25D366]/10 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-[#128C7E] dark:text-[#25D366]">
                <MessageCircle className="w-5 h-5" /> Plantillas de WhatsApp Automatizadas
              </CardTitle>
              <CardDescription>Configurá los mensajes que se envían al cliente. Usá las variables para que el sistema las reemplace automáticamente por los datos reales de cada auto.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="bg-secondary/40 p-4 rounded-lg border border-dashed border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <p className="text-xs font-bold uppercase text-muted-foreground shrink-0 mt-1">Variables<br/>Disponibles:</p>
                <div className="flex flex-wrap gap-2">
                  {['{{cliente}}', '{{vehiculo}}', '{{patente}}', '{{total}}', '{{taller}}', '{{horario}}'].map(v => (
                    <Badge key={v} variant="outline" className="font-mono bg-background text-primary border-primary/30 shadow-sm">{v}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground"/> Enviar Presupuesto</Label>
                  <Textarea 
                    className="min-h-[160px] bg-slate-50 dark:bg-slate-900 border-border resize-none" 
                    value={formData.msj_presupuesto} 
                    onChange={(e) => setFormData({...formData, msj_presupuesto: e.target.value})} 
                  />
                  <p className="text-[10px] text-muted-foreground italic">El link del PDF se adjuntará de forma manual al abrir WhatsApp.</p>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-muted-foreground"/> Auto Terminado (Para Retirar)</Label>
                  <Textarea 
                    className="min-h-[160px] bg-slate-50 dark:bg-slate-900 border-border resize-none" 
                    value={formData.msj_listo} 
                    onChange={(e) => setFormData({...formData, msj_listo: e.target.value})} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><FileSignature className="w-5 h-5 text-primary" /> Preferencias de Presupuestos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label>Términos y Condiciones (Letra chica que sale al pie del PDF)</Label>
                <Textarea className="min-h-[100px] bg-slate-50 dark:bg-slate-900 border-border" value={formData.terminos_presupuesto} onChange={(e) => setFormData({...formData, terminos_presupuesto: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: USUARIOS (MAQUETA) */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Gestión de Equipo</CardTitle>
                <CardDescription>Controlá quién tiene acceso a tu sistema de gestión.</CardDescription>
              </div>
              <Button className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Invitar Usuario</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol / Permisos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">Tu Nombre (Admin)</div>
                      <div className="text-xs text-muted-foreground">admin@taller.com</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"><Shield className="w-3 h-3 mr-1"/> Administrador</Badge></TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 shadow-none">Activo</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" disabled>Propietario</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">Juan Mecánico</div>
                      <div className="text-xs text-muted-foreground">juan@taller.com</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="bg-secondary"><Wrench className="w-3 h-3 mr-1"/> Empleado</Badge></TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 shadow-none">Activo</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 3: SISTEMA (MAQUETA) */}
        <TabsContent value="sistema" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Respaldo de Base de Datos</CardTitle>
              <CardDescription>Mantené tu información segura descargando copias locales de tus clientes, vehículos y presupuestos.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/20">
                <div>
                  <h4 className="font-bold text-foreground">Exportar datos a Excel / CSV</h4>
                  <p className="text-sm text-muted-foreground">Genera un archivo con toda la base de datos actual.</p>
                </div>
                <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Descargar Respaldo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}