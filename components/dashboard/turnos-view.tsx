"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Car, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Horarios y Días
const HORARIOS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
]

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

const SERVICIOS = ["Revisión", "Frenos", "Tren Delantero", "Alineado y Balanceado", "Cambio de Aceite", "Motor", "Electricidad"]

const SERVICE_COLORS: Record<string, string> = {
  "Revisión": "bg-slate-500/10 text-slate-500 border-slate-500/20",
  "Frenos": "bg-red-500/10 text-red-500 border-red-500/20",
  "Tren Delantero": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Alineado y Balanceado": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Cambio de Aceite": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Motor": "bg-stone-500/10 text-stone-500 border-stone-500/20",
  "Electricidad": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
}

// Autos registrados de mentira para el buscador
const AUTOS_REGISTRADOS = [
  { patente: "AB 123 CD", modelo: "Toyota Corolla", dueño: "Juan Martínez" },
  { patente: "AC 456 EF", modelo: "Ford Ranger", dueño: "Esteban Q." },
  { patente: "AD 789 GH", modelo: "VW Golf", dueño: "María G." },
]

const mockTurnos = [
  { id: 1, fecha: "2024-04-15", hora: "08:30", cliente: "Juan Pérez", auto: "Toyota Corolla", servicio: "Tren Delantero" },
  { id: 2, fecha: "2024-04-15", hora: "08:30", cliente: "Ana Rod.", auto: "Peugeot 208", servicio: "Frenos" },
  { id: 3, fecha: "2024-04-15", hora: "08:30", cliente: "Carlos L.", auto: "Honda Civic", servicio: "Revisión" },
  { id: 4, fecha: "2024-04-15", hora: "10:30", cliente: "Roberto F.", auto: "Kangoo", servicio: "Alineado y Balanceado" },
  { id: 5, fecha: "2024-04-15", hora: "14:00", cliente: "María G.", auto: "VW Golf", servicio: "Cambio de Aceite" },
  { id: 6, fecha: "2024-04-16", hora: "08:30", cliente: "Esteban Q.", auto: "Ford Ranger", servicio: "Tren Delantero" },
  { id: 7, fecha: "2024-04-17", hora: "11:00", cliente: "Laura M.", auto: "Fiat Cronos", servicio: "Alineado y Balanceado" },
]

export function TurnosView() {
  const [fechaActual, setFechaActual] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Estado para el formulario del nuevo turno
  const [tipoRegistro, setTipoRegistro] = useState("registrado") // "registrado" o "manual"
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    servicio: "",
    patente: "",
    marca: "",
    modelo: "",
    nombre: "",
    telefono: ""
  })

  const obtenerFechasSemana = (fechaBase: Date) => {
    const fechas = []
    const diaSemana = fechaBase.getDay()
    const diff = fechaBase.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) 
    const lunes = new Date(fechaBase.setDate(diff))
    
    for (let i = 0; i < 5; i++) {
      const fecha = new Date(lunes)
      fecha.setDate(lunes.getDate() + i)
      fechas.push(fecha)
    }
    return fechas
  }

  const fechasSemana = obtenerFechasSemana(new Date(fechaActual))

  const prevWeek = () => {
    const newDate = new Date(fechaActual)
    newDate.setDate(newDate.getDate() - 7)
    setFechaActual(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(fechaActual)
    newDate.setDate(newDate.getDate() + 7)
    setFechaActual(newDate)
  }

  const getTurnosParaCelda = (fecha: Date, hora: string) => {
    const fechaString = fecha.toISOString().split("T")[0] 
    return mockTurnos.filter(t => t.fecha === fechaString && t.hora === hora)
  }

  const handleGuardarTurno = () => {
    // Acá en el futuro guardaremos en Supabase
    console.log("Guardando turno:", formData, "Tipo:", tipoRegistro)
    alert("Turno agendado con éxito (Simulación)")
    setIsModalOpen(false)
    // Limpiamos el formulario
    setFormData({ fecha: "", hora: "", servicio: "", patente: "", marca: "", modelo: "", nombre: "", telefono: "" })
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Header y Controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Agenda de Turnos</h2>
          <p className="text-sm text-muted-foreground">Gestión semanal de plazas y servicios</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-secondary rounded-md border border-border p-1">
            <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8 hover:bg-background">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 text-sm font-medium text-foreground min-w-[140px] justify-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Semana Actual
            </div>
            <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8 hover:bg-background">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Calendario Semanal */}
      <Card className="border-border bg-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col h-full">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-secondary/50 shrink-0">
            <div className="p-3 text-center border-r border-border flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            {fechasSemana.map(fecha => (
              <div key={fecha.toISOString()} className="p-3 text-center border-r border-border last:border-0 flex flex-col items-center">
                <span className="text-xs text-muted-foreground uppercase">{DIAS_SEMANA[fecha.getDay() - 1]}</span>
                <span className="font-bold text-2xl text-card-foreground">{fecha.getDate()}</span>
              </div>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="min-w-full">
              {HORARIOS.map(hora => (
                <div key={hora} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <div className="p-3 text-center border-r border-border text-sm font-medium text-muted-foreground bg-secondary/10 flex items-start justify-center pt-4">
                    {hora}
                  </div>
                  {fechasSemana.map(fecha => {
                    const turnosEnCelda = getTurnosParaCelda(fecha, hora)
                    return (
                      <div key={`${fecha.toISOString()}-${hora}`} className="p-2 border-r border-border last:border-0 min-h-[100px] flex flex-col gap-2">
                        {turnosEnCelda.map(turno => (
                          <div 
                            key={turno.id} 
                            className="group relative flex flex-col rounded-md border border-border bg-background p-2 text-xs shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                          >
                            <div className="font-semibold text-foreground truncate">{turno.cliente}</div>
                            <div className="text-muted-foreground truncate mb-1.5">{turno.auto}</div>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border leading-tight ${SERVICE_COLORS[turno.servicio] || "bg-secondary text-foreground"}`}>
                              {turno.servicio}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de Nuevo Turno */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground">Agendar Nuevo Turno</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Seleccione la fecha, el servicio y asigne el vehículo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Fila 1: Cuándo y Qué */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-card-foreground">Fecha</Label>
                <Input type="date" className="bg-secondary border-border" 
                  value={formData.fecha} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-card-foreground">Hora</Label>
                <Select value={formData.hora} onValueChange={(val: string) => setFormData({...formData, hora: val})}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {HORARIOS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-card-foreground">Servicio Principal</Label>
                <Select value={formData.servicio} onValueChange={(val: string) => setFormData({...formData, servicio: val})}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {SERVICIOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 2: Quién (El Cliente/Vehículo) */}
            <div className="border border-border rounded-lg p-1 bg-secondary/30">
              <Tabs defaultValue="registrado" onValueChange={setTipoRegistro}>
                <TabsList className="w-full grid grid-cols-2 bg-transparent">
                  <TabsTrigger value="registrado" className="data-[state=active]:bg-background">
                    <Car className="w-4 h-4 mr-2" /> Vehículo Registrado
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="data-[state=active]:bg-background">
                    <User className="w-4 h-4 mr-2" /> Ingreso Manual (Rápido)
                  </TabsTrigger>
                </TabsList>
                
                <div className="p-4 mt-2 bg-background rounded-md border border-border">
                  <TabsContent value="registrado" className="m-0 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-card-foreground">Buscar por Patente o Cliente</Label>
                      <Select value={formData.patente} onValueChange={(val: string) => setFormData({...formData, patente: val})}>
                        <SelectTrigger className="bg-secondary border-border w-full">
                          <SelectValue placeholder="Seleccione un vehículo registrado..." />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                          {AUTOS_REGISTRADOS.map(auto => (
                            <SelectItem key={auto.patente} value={auto.patente}>
                              {auto.patente} - {auto.modelo} ({auto.dueño})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="m-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-card-foreground">Patente</Label>
                        <Input placeholder="Ej: AA 123 BB" className="bg-secondary border-border uppercase" 
                          value={formData.patente} onChange={(e: any) => setFormData({...formData, patente: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground">Marca y Modelo</Label>
                        <Input placeholder="Ej: VW Gol Trend" className="bg-secondary border-border" 
                          value={formData.modelo} onChange={(e: any) => setFormData({...formData, modelo: e.target.value})}/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground">Nombre del Dueño</Label>
                        <Input placeholder="Ej: Carlos López" className="bg-secondary border-border" 
                          value={formData.nombre} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})}/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground">Teléfono</Label>
                        <Input placeholder="Ej: +54 11..." className="bg-secondary border-border" 
                          value={formData.telefono} onChange={(e: any) => setFormData({...formData, telefono: e.target.value})}/>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:bg-secondary">
              Cancelar
            </Button>
            <Button onClick={handleGuardarTurno} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Agendar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}