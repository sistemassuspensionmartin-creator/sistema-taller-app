"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Store, Phone, MapPin, FileText, Mail, FileSignature } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    nombre_taller: "",
    telefono: "",
    direccion: "",
    cuit: "",
    email: "",
    terminos_presupuesto: ""
  })

  // 1. CARGAR LA CONFIGURACIÓN ACTUAL
  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      // Buscamos siempre la fila con id = 1
      const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single()
      if (error) throw error
      if (data) {
        setFormData(data)
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  // 2. GUARDAR LOS CAMBIOS
  const handleGuardarCambios = async () => {
    if (!formData.nombre_taller.trim()) {
      return alert("El nombre del taller es obligatorio.")
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('configuracion')
        .update(formData)
        .eq('id', 1)

      if (error) throw error
      
      alert("¡Configuración guardada con éxito!")
    } catch (error) {
      console.error("Error al guardar:", error)
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
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configuración del Taller</h2>
          <p className="text-sm text-muted-foreground">Administrá los datos de tu empresa para que aparezcan en los presupuestos y facturas.</p>
        </div>
        <Button onClick={handleGuardarCambios} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-6">
        {/* TARJETA: DATOS DE LA EMPRESA */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Datos del Negocio
            </CardTitle>
            <CardDescription>Esta información será la cabecera de tus documentos PDF.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nombre del Taller / Razón Social <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" 
                    value={formData.nombre_taller} 
                    onChange={(e) => setFormData({...formData, nombre_taller: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CUIT del Taller</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ej: 30-12345678-9" 
                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-border font-mono" 
                    value={formData.cuit} 
                    onChange={(e) => setFormData({...formData, cuit: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Teléfono Comercial</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ej: +54 9 11 4444-5555" 
                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" 
                    value={formData.telefono} 
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="taller@ejemplo.com" 
                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Física</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ej: Av. Principal 1234, Ciudad" 
                  className="pl-9 bg-slate-50 dark:bg-slate-900 border-border" 
                  value={formData.direccion} 
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TARJETA: PREFERENCIAS DE PRESUPUESTOS */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" /> Preferencias de Presupuestos
            </CardTitle>
            <CardDescription>Configurá las aclaraciones o letras chicas que irán al pie de tus cotizaciones.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label>Términos y Condiciones (Letra chica)</Label>
              <Textarea 
                placeholder="Ej: Validez del presupuesto: 15 días. Los repuestos eléctricos no tienen cambio..." 
                className="min-h-[100px] bg-slate-50 dark:bg-slate-900 border-border" 
                value={formData.terminos_presupuesto} 
                onChange={(e) => setFormData({...formData, terminos_presupuesto: e.target.value})} 
              />
              <p className="text-xs text-muted-foreground mt-2">Este texto aparecerá automáticamente al final de todos los PDFs generados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}