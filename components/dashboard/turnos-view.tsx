"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Car, User, Ban, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Horarios reales del taller
const HORARIOS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
]

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

const SERVICIOS = [
  "Revisión", "Tren delantero", "Frenos", "Alineado", 
  "Balanceado", "Alineado + Balanceado", "Cambio de Aceite", "Cubiertas"
]

// Siglas y colores para que el calendario se vea limpio
const SERVICE_UI: Record<string, { sigla: string, color: string }> = {
  "Revisión": { sigla: "REV", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  "Tren delantero": { sigla: "TD", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  "Frenos": { sigla: "FRE", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  "Alineado": { sigla: "ALI", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  "Balanceado": { sigla: "BAL", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  "Alineado + Balanceado": { sigla: "A+B", color: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20" },
  "Cambio de Aceite": { sigla: "ACE", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  "Cubiertas": { sigla: "CUB", color: "bg-stone-500/10 text-stone-500 border-stone-500/20" },
}

// Autos registrados simulados (Con presupuestos pendientes)
const AUTOS_REGISTRADOS = [
  { 
    patente: "AB 123 CD", modelo: "Toyota Corolla", dueño: "Juan Martínez", telefono: "+54 11 4567-8901",
    presupuestos: [{ id: "PR-001", detalle: "Cambio de pastillas y discos", monto: 85000 }]
  },
  { 
    patente: "AC 456 EF", modelo: "Ford Ranger", dueño: "Esteban Q.", telefono: "+54 11 1111-2222",
    presupuestos: [{ id: "PR-045", detalle: "Service 50.000km", monto: 120000 }]
  },
  { 
    patente: "AD 789 GH", modelo: "VW Golf", dueño: "María G.", telefono: "+54 11 3333-4444",
    presupuestos: []
  },
]

export function TurnosView() {
  const [fechaActual, setFechaActual] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<any>(null)
  
  // Días marcados como no laborables (Guardamos la fecha en formato string YYYY-MM-DD)
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([])

  // Estado para el formulario de turno
  const [tipoRegistro, setTipoRegistro] = useState("registrado")
  const [busquedaPatente, setBusquedaPatente] = useState("")
  const [autoEncontrado, setAutoEncontrado] = useState<any>(null)

  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    servicio: "",
    patente: "",
    marcaModelo: "",
    nombreDueño: "",
    telefono: "",
    observaciones: "",
    presupuestoAsociado: ""
  })

  // Turnos simulados
  const [turnos, setTurnos] = useState([
    { id: 1, fecha: new Date().toISOString().split("T")[0], hora: "08:30", cliente: "Juan Martínez", auto: "Toyota Corolla", patente: "AB 123 CD", servicio: "Frenos", observaciones: "Hace ruido al frenar de golpe", presupuestoAsociado: "PR-001" },
    { id: 2, fecha: new Date().toISOString().split("T")[0], hora: "08:30", cliente: "Ana Rod.", auto: "Peugeot 208", patente: "XX 999 YY", servicio: "Tren delantero", observaciones: "Revisar precaps", presupuestoAsociado: "" },
    { id: 3, fecha: new Date().toISOString().split("T")[0], hora: "10:30", cliente: "María G.", auto: "VW Golf", patente: "AD 789 GH", servicio: "Alineado + Balanceado", observaciones: "Vibra a 120km/h", presupuestoAsociado: "" },
  ])

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

  const toggleDiaNoLaborable = (fechaString: string) => {
    if (diasNoLaborables.includes(fechaString)) {
      setDiasNoLaborables(diasNoLaborables.filter(d => d !== fechaString))
    } else {
      setDiasNoLaborables([...diasNoLaborables, fechaString])
    }
  }

  const buscarAuto = () => {
    const auto = AUTOS_REGISTRADOS.find(a => a.patente.toLowerCase() === busquedaPatente.toLowerCase())
    if (auto) {
      setAutoEncontrado(auto)
      setFormData({
        ...formData,
        patente: auto.patente,
        marcaModelo: auto.modelo,
        nombreDueño: auto.dueño,
        telefono: auto.telefono,
        presupuestoAsociado: ""
      })
    } else {
      alert("Patente no encontrada en el sistema.")
      setAutoEncontrado(null)
    }
  }

  const handleGuardarTurno = () => {
    const nuevoTurno = {
      id: Math.random(),
      fecha: formData.fecha,
      hora: formData.hora,
      servicio: formData.servicio,
      cliente: formData.nombreDueño,
      auto: formData.marcaModelo,
      patente: formData.patente,
      observaciones: formData.observaciones,
      presupuestoAsociado: formData.presupuestoAsociado
    }
    setTurnos([...turnos, nuevoTurno])
    setIsModalOpen(false)
    setFormData({ fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuestoAsociado: "" })
    setAutoEncontrado(null)
    setBusquedaPatente("")
  }

  const abrirDetalleTurno = (turno: any) => {
    setTurnoSeleccionado(turno)
    setIsDetailModalOpen(true)
  }

  return (
    // FIX DE SCROLL: flex-col y min-h-0 son claves acá
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4">
      {/* Header y Controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Agenda de Turnos</h2>
          <p className="text-sm text-muted-foreground">Gestión semanal (Lunes a Viernes)</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-secondary rounded-md border border-border p-1">
            <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8 hover:bg-background">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 text-sm font-medium text-foreground min-w-[140px] justify-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {fechaActual.toLocaleDateString("es-AR", { month: "long" }).toUpperCase()}
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
      <Card className="border-border bg-card flex-1 flex flex-col min-h-0">
        {/* Cabecera de Días */}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-secondary/50 shrink-0">
          <div className="p-3 text-center border-r border-border flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {fechasSemana.map(fecha => {
            const fechaString = fecha.toISOString().split("T")[0]
            const esNoLaborable = diasNoLaborables.includes(fechaString)
            return (
              <div key={fechaString} className={`p-2 text-center border-r border-border last:border-0 flex flex-col items-center relative transition-colors ${esNoLaborable ? 'bg-destructive/10' : ''}`}>
                <span className="text-xs font-semibold text-muted-foreground uppercase">{DIAS_SEMANA[fecha.getDay() - 1]}</span>
                <span className={`font-bold text-2xl ${esNoLaborable ? 'text-destructive/50' : 'text-card-foreground'}`}>{fecha.getDate()}</span>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`absolute top-1 right-1 h-6 w-6 rounded-full ${esNoLaborable ? 'text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:bg-secondary'}`}
                  title={esNoLaborable ? "Habilitar Día" : "Marcar como No Laborable"}
                  onClick={() => toggleDiaNoLaborable(fechaString)}
                >
                  <Ban className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* FIX SCROLL: Contenedor de scroll nativo que ocupa todo el resto del espacio disponible */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50">
          <div className="min-w-full">
            {HORARIOS.map(hora => (
              <div key={hora} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                <div className="p-2 text-center border-r border-border text-xs font-bold text-muted-foreground bg-secondary/20 flex items-start justify-center pt-3">
                  {hora}
                </div>
                {fechasSemana.map(fecha => {
                  const fechaString = fecha.toISOString().split("T")[0]
                  const turnosEnCelda = turnos.filter(t => t.fecha === fechaString && t.hora === hora)
                  const esNoLaborable = diasNoLaborables.includes(fechaString)
                  
                  return (
                    <div 
                      key={`${fechaString}-${hora}`} 
                      className={`p-1 border-r border-border last:border-0 min-h-[90px] flex flex-col gap-1 transition-colors ${esNoLaborable ? 'bg-destructive/5 cursor-not-allowed' : ''}`}
                    >
                      {!esNoLaborable && turnosEnCelda.map(turno => (
                        <div 
                          key={turno.id} 
                          onClick={() => abrirDetalleTurno(turno)}
                          className="group relative flex flex-col rounded border border-border bg-card p-1.5 text-xs shadow-sm hover:border-primary/50 transition-colors cursor-pointer overflow-hidden"
                        >
                          <div className="font-bold text-foreground truncate">{turno.patente}</div>
                          <div className="text-muted-foreground truncate text-[10px] mb-1">{turno.auto}</div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold border ${SERVICE_UI[turno.servicio]?.color || "bg-secondary text-foreground"}`}>
                              {SERVICE_UI[turno.servicio]?.sigla || "SRV"}
                            </Badge>
                            {turno.presupuestoAsociado && (
                              <FileText className="h-3 w-3 text-primary" title="Presupuesto Asociado" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Modal de Nuevo Turno */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground">Agendar Nuevo Turno</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete los datos para registrar la cita.
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
                  <SelectContent className="border-border bg-popover max-h-[200px]">
                    {HORARIOS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-card-foreground">Servicio</Label>
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
                    <Search className="w-4 h-4 mr-2" /> Buscar Registrado
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="data-[state=active]:bg-background">
                    <User className="w-4 h-4 mr-2" /> Ingreso Manual
                  </TabsTrigger>
                </TabsList>
                
                <div className="p-4 mt-2 bg-background rounded-md border border-border">
                  <TabsContent value="registrado" className="m-0 space-y-4">
                    <div className="flex gap-2 items-end">
                      <div className="space-y-2 flex-1">
                        <Label className="text-card-foreground">Patente del Vehículo</Label>
                        <Input 
                          placeholder="Ej: AB 123 CD" 
                          className="bg-secondary border-border uppercase" 
                          value={busquedaPatente} 
                          onChange={(e: any) => setBusquedaPatente(e.target.value)}
                          onKeyDown={(e: any) => e.key === 'Enter' && buscarAuto()}
                        />
                      </div>
                      <Button onClick={buscarAuto} className="bg-primary text-primary-foreground">Buscar</Button>
                    </div>

                    {autoEncontrado && (
                      <div className="p-3 bg-secondary/50 rounded-md border border-border space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Vehículo:</span> <span className="font-semibold text-foreground">{autoEncontrado.modelo}</span></div>
                          <div><span className="text-muted-foreground">Dueño:</span> <span className="font-semibold text-foreground">{autoEncontrado.dueño}</span></div>
                          <div className="col-span-2"><span className="text-muted-foreground">Teléfono:</span> <span className="text-foreground">{autoEncontrado.telefono}</span></div>
                        </div>
                        
                        {autoEncontrado.presupuestos.length > 0 ? (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <Label className="text-primary font-bold flex items-center gap-2">
                              <FileText className="w-4 h-4" /> Presupuestos Pendientes
                            </Label>
                            <Select value={formData.presupuestoAsociado} onValueChange={(val: string) => setFormData({...formData, presupuestoAsociado: val})}>
                              <SelectTrigger className="bg-background border-primary/50 text-foreground">
                                <SelectValue placeholder="Asociar un presupuesto (Opcional)" />
                              </SelectTrigger>
                              <SelectContent className="border-border bg-popover">
                                <SelectItem value="ninguno">No asociar ninguno</SelectItem>
                                {autoEncontrado.presupuestos.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.id} - {p.detalle} (${p.monto.toLocaleString()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground pt-2 border-t border-border">No registra presupuestos pendientes.</div>
                        )}
                      </div>
                    )}
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
                          value={formData.marcaModelo} onChange={(e: any) => setFormData({...formData, marcaModelo: e.target.value})}/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-card-foreground">Nombre del Dueño</Label>
                        <Input placeholder="Ej: Carlos López" className="bg-secondary border-border" 
                          value={formData.nombreDueño} onChange={(e: any) => setFormData({...formData, nombreDueño: e.target.value})}/>
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

            {/* Fila 3: Observaciones */}
            <div className="space-y-2">
              <Label className="text-card-foreground">Observaciones del Turno</Label>
              <Textarea 
                placeholder="Ej: El cliente dice que vibra el volante a los 100km/h. Dejar las llaves al guardia." 
                className="bg-secondary border-border resize-none min-h-[80px]"
                value={formData.observaciones}
                onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})}
              />
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

      {/* Modal de Detalle de Turno */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Detalle del Turno
            </DialogTitle>
          </DialogHeader>

          {turnoSeleccionado && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div>
                  <div className="text-2xl font-bold text-foreground">{turnoSeleccionado.hora}</div>
                  <div className="text-sm text-muted-foreground">{turnoSeleccionado.fecha}</div>
                </div>
                <Badge className={`text-xs px-2 py-1 border ${SERVICE_UI[turnoSeleccionado.servicio]?.color || "bg-secondary text-foreground"}`}>
                  {turnoSeleccionado.servicio}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Vehículo</p>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" /> {turnoSeleccionado.auto}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Patente</p>
                  <p className="font-mono bg-secondary px-2 py-0.5 rounded text-foreground inline-block">
                    {turnoSeleccionado.patente}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Cliente</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> {turnoSeleccionado.cliente}
                  </p>
                </div>
              </div>

              {turnoSeleccionado.presupuestoAsociado && (
                <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <FileText className="w-4 h-4" /> Presupuesto Asociado
                  </div>
                  <span className="font-mono text-xs">{turnoSeleccionado.presupuestoAsociado}</span>
                </div>
              )}

              {turnoSeleccionado.observaciones && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Observaciones</p>
                  <p className="text-sm text-foreground bg-secondary/30 p-3 rounded-md italic">
                    "{turnoSeleccionado.observaciones}"
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="border-border text-foreground hover:bg-secondary w-full">
              Cerrar Detalle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}