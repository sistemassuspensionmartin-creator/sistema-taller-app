"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Save, UploadCloud, Store, FileText, MessageSquare, Image as ImageIcon, Loader2, CheckCircle2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // --- NUEVOS ESTADOS PARA LA IMAGEN ---
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estado con todos los campos de tu tabla SQL
  const [config, setConfig] = useState<any>({
    id: 1, // Asumimos que la fila principal tiene ID 1
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
    logo_url: "" // <-- El campo nuevo en tu base de datos
  })

  // 1. CARGAR DATOS
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from('configuracion').select('*').limit(1).single()
        if (error && error.code !== 'PGRST116') throw error // Ignora si no hay filas
        if (data) setConfig(data)
      } catch (error) {
        console.error("Error al cargar configuración:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // --- 2. NUEVA FUNCIÓN: SUBIR LOGO A STORAGE ---
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      return alert("Por favor, subí un archivo de imagen válido (JPG, PNG).")
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
      
      setConfig({ ...config, logo_url: data.publicUrl })
      
      await supabase.from('configuracion').upsert({ id: config.id || 1, logo_url: data.publicUrl })

      alert("¡Logo subido y guardado correctamente!")
    } catch (error: any) {
      console.error("Error subiendo logo:", error)
      alert("Hubo un error al subir la imagen: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  // 3. GUARDAR TODOS LOS CAMBIOS DE TEXTO
  const handleGuardarConfiguracion = async () => {
    setIsSaving(true)
    try {
      const payload = { ...config, id: config.id || 1 }
      const { error } = await supabase.from('configuracion').upsert(payload)
      if (error) throw error
      alert("¡Configuración guardada correctamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert("Hubo un error al guardar: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configuración del Sistema</h2>
          <p className="text-sm text-muted-foreground">Personalizá la identidad, presupuestos y mensajes automáticos.</p>
        </div>
        <Button onClick={handleGuardarConfiguracion} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* --- NUEVA COLUMNA IZQUIERDA: EL LOGO --- */}
        <Card className="border-border shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Logo del Taller</CardTitle>
            <CardDescription>Se mostrará en la web y en los PDF de presupuestos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden relative group">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center">
                  <Store className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">Sin logo</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadLogo} />
            
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {config.logo_url ? "Cambiar Logo" : "Subir Logo"}
            </Button>
          </CardContent>
        </Card>

        {/* COLUMNA DERECHA: LOS DATOS (PESTAÑAS) */}
        <div className="md:col-span-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-secondary">
              <TabsTrigger value="general"><Store className="w-4 h-4 mr-2 hidden sm:block" /> General</TabsTrigger>
              <TabsTrigger value="presupuestos"><FileText className="w-4 h-4 mr-2 hidden sm:block" /> Presupuestos</TabsTrigger>
              <TabsTrigger value="mensajes"><MessageSquare className="w-4 h-4 mr-2 hidden sm:block" /> Mensajería</TabsTrigger>
            </TabsList>

            {/* PESTAÑA 1: GENERAL */}
            <TabsContent value="general" className="mt-4">
              <Card className="border-border shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label>Nombre del Taller / Razón Social</Label>
                    <Input value={config.nombre_taller || ""} onChange={e => setConfig({...config, nombre_taller: e.target.value})} placeholder="Ej: Mecánica Integral SRL" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teléfono Comercial</Label>
                      <Input value={config.telefono || ""} onChange={e => setConfig({...config, telefono: e.target.value})} placeholder="Ej: +54 9 351 1234567" />
                    </div>
                    <div className="space-y-2">
                      <Label>CUIT</Label>
                      <Input value={config.cuit || ""} onChange={e => setConfig({...config, cuit: e.target.value})} placeholder="Ej: 30-12345678-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección Física</Label>
                    <Input value={config.direccion || ""} onChange={e => setConfig({...config, direccion: e.target.value})} placeholder="Ej: Av. Principal 123, Córdoba" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={config.email || ""} onChange={e => setConfig({...config, email: e.target.value})} placeholder="taller@ejemplo.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram / Redes</Label>
                      <Input value={config.instagram || ""} onChange={e => setConfig({...config, instagram: e.target.value})} placeholder="Ej: @mitaller.ok" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Horarios de Atención</Label>
                    <Input value={config.horario || ""} onChange={e => setConfig({...config, horario: e.target.value})} placeholder="Ej: Lun a Vie de 8:00 a 18:00hs" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PESTAÑA 2: PRESUPUESTOS */}
            <TabsContent value="presupuestos" className="mt-4">
              <Card className="border-border shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="bg-primary/10 text-primary p-3 rounded-md flex items-start gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">Estos términos se imprimirán automáticamente al pie de todos los presupuestos que generes en formato PDF.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Términos, Condiciones y Validez</Label>
                    <Textarea 
                      className="min-h-[200px]" 
                      value={config.terminos_presupuesto || ""} 
                      onChange={e => setConfig({...config, terminos_presupuesto: e.target.value})} 
                      placeholder="Ej: Los presupuestos tienen una validez de 7 días. Los repuestos están sujetos a cotización del dólar..." 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PESTAÑA 3: MENSAJERÍA */}
            <TabsContent value="mensajes" className="mt-4">
              <Card className="border-border shadow-sm">
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-emerald-600 font-bold flex items-center gap-1"><MessageSquare className="w-4 h-4"/> Plantilla: Envío de Presupuesto (WhatsApp)</Label>
                    <Textarea className="min-h-[80px]" value={config.msj_presupuesto || ""} onChange={e => setConfig({...config, msj_presupuesto: e.target.value})} placeholder="Hola, te adjuntamos el presupuesto de tu vehículo..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-emerald-600 font-bold flex items-center gap-1"><MessageSquare className="w-4 h-4"/> Plantilla: Auto Listo (WhatsApp)</Label>
                    <Textarea className="min-h-[80px]" value={config.msj_listo || ""} onChange={e => setConfig({...config, msj_listo: e.target.value})} placeholder="Hola, te avisamos que tu vehículo ya está listo para retirar..." />
                  </div>
                  
                  <div className="border-t border-border pt-4 mt-2"></div>
                  
                  <div className="space-y-2">
                    <Label className="text-blue-600 font-bold">Plantilla: Post-Venta Seguimiento (WhatsApp)</Label>
                    <Textarea className="min-h-[80px]" value={config.msj_postventa_wpp || ""} onChange={e => setConfig({...config, msj_postventa_wpp: e.target.value})} placeholder="Hola, queríamos saber cómo sentiste el auto después del service..." />
                  </div>
                  <div className="space-y-4 bg-secondary/30 p-4 rounded-lg border border-border">
                    <Label className="text-blue-600 font-bold block">Plantillas de Email Post-Venta</Label>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase">Asunto del Email</Label>
                      <Input value={config.msj_postventa_email_asunto || ""} onChange={e => setConfig({...config, msj_postventa_email_asunto: e.target.value})} placeholder="Seguimiento de tu service en Nuestro Taller" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase">Cuerpo del Email</Label>
                      <Textarea className="min-h-[100px]" value={config.msj_postventa_email_cuerpo || ""} onChange={e => setConfig({...config, msj_postventa_email_cuerpo: e.target.value})} placeholder="Escribí acá el correo predeterminado..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  )
}