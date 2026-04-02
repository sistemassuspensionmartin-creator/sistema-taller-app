"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Store, Phone, MapPin, FileText, Mail, FileSignature, Clock, Instagram, Users, Shield, Database, Download, Plus, Trash2, Edit, Wrench, MessageCircle, CheckCircle2, Star } from "lucide-react"
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
    msj_presupuesto: "", msj_listo: "",
    msj_postventa_wpp: "", msj_postventa_email_asunto: "", msj_postventa_email_cuerpo: ""
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
          msj_presupuesto: data.msj_presupuesto || "",
          msj_listo: data.msj_listo || "",
          msj_postventa_wpp: data.msj_postventa_wpp || "",
          msj_postventa_email_asunto: data.msj_postventa_email_asunto || "",
          msj_postventa_email_cuerpo: data.msj_postventa_email_cuerpo || ""
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

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-[#25D366]/10 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-[#128C7E] dark:text-[#25D366]">
                <MessageCircle className="w-5 h-5" /> Plantillas de WhatsApp Automatizadas
              </CardTitle>
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

          {/* NUEVA SECCIÓN: POST-VENTA */}
          <Card className="border-border shadow-sm border-blue-200 dark:border-blue-900">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Star className="w-5 h-5" /> Encuesta de Satisfacción (Post-Venta)
              </CardTitle>
              <CardDescription className="text-blue-700/70 dark:text-blue-400/70">
                Mensajes para enviar al cliente unos días después de entregarle el vehículo, pidiendo una reseña.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lado de WhatsApp */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-border">
                  <Label className="font-bold flex items-center gap-2 text-green-600"><MessageCircle className="w-4 h-4"/> Opción: Enviar por WhatsApp</Label>
                  <Textarea 
                    className="min-h-[160px] bg-white dark:bg-slate-950 border-border resize-none" 
                    value={formData.msj_postventa_wpp} 
                    onChange={(e) => setFormData({...formData, msj_postventa_wpp: e.target.value})} 
                  />
                </div>

                {/* Lado de Email */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-border">
                  <Label className="font-bold flex items-center gap-2 text-blue-600"><Mail className="w-4 h-4"/> Opción: Enviar por Correo Electrónico</Label>
                  <div className="space-y-2">
                    <Label className="text-xs">Asunto del Correo:</Label>
                    <Input 
                      className="bg-white dark:bg-slate-950 border-border" 
                      value={formData.msj_postventa_email_asunto} 
                      onChange={(e) => setFormData({...formData, msj_postventa_email_asunto: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Cuerpo del Correo:</Label>
                    <Textarea 
                      className="min-h-[96px] bg-white dark:bg-slate-950 border-border resize-none" 
                      value={formData.msj_postventa_email_cuerpo} 
                      onChange={(e) => setFormData({...formData, msj_postventa_email_cuerpo: e.target.value})} 
                    />
                  </div>
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

        <TabsContent value="usuarios">
          <p>Sección de usuarios</p>
        </TabsContent>

        <TabsContent value="sistema">
          <p>Sección de sistema</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}