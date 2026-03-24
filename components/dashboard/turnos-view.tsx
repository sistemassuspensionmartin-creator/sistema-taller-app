"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Car, User, Ban, FileText, Search, Phone, ExternalLink, CheckCircle2, XCircle, CalendarClock } from "lucide-react"
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

const HORARIOS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
]

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

const SERVICIOS = [
  "Revisión", "Tren delantero", "Frenos", "Alineado", 
  "Balanceado", "Alineado + Balanceado", "Cambio de Aceite", "Cubiertas"
]

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

const AUTOS_REGISTRADOS = [
  { patente: "AB 123 CD", modelo: "Toyota Corolla", dueño: "Juan Martínez", telefono: "+54 11 4567-8901", presupuestos: [{ id: "PR-001", detalle: "Cambio de pastillas y discos", monto: 85000 }] },
  { patente: "AC 456 EF", modelo: "Ford Ranger", dueño: "Esteban Q.", telefono: "+54 11 1111-2222", presupuestos: [{ id: "PR-045", detalle: "Service 50.000km", monto: 120000 }] },
  { patente: "AD 789 GH", modelo: "VW Golf", dueño: "María G.", telefono: "+54 11 3333-4444", presupuestos: [] },
]

export function TurnosView() {
  const [fechaActual, setFechaActual] = useState(new Date())
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false) // Nuevo Turno
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false) // Detalle
  
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<any>(null)
  const [isReprogramming, setIsReprogramming] = useState(false)
  const [reprogramData, setReprogramData] = useState({ fecha: "", hora: "" })
  
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([])
  const [tipoRegistro, setTipoRegistro] = useState("registrado")
  const [busquedaPatente, setBusquedaPatente] = useState("")
  const [autoEncontrado, setAutoEncontrado] = useState<any>(null)

  const [formData, setFormData] = useState({
    fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuestoAsociado: ""
  })

  // Obtener fecha de hoy como string para comparaciones
  const hoyString = new Date().toISOString().split("T")[0]

  // Turnos simulados (Agregamos el campo "estado")
  const [turnos, setTurnos] = useState([
    { id: 1, fecha: hoyString, hora: "08:30", cliente: "Juan Martínez", telefono: "+54 11 4567-8901", auto: "Toyota Corolla", patente: "AB 123 CD", servicio: "Frenos", observaciones: "Hace ruido al frenar de golpe", presupuestoAsociado: "PR-001", estado: "pendiente" },
    { id: 2, fecha: hoyString, hora: "08:30", cliente: "Ana Rod.", telefono: "+54 11 9999-8888", auto: "Peugeot 208", patente: "XX 999 YY", servicio: "Tren delantero", observaciones: "Revisar precaps", presupuestoAsociado: "", estado: "asistio" },
    { id: 3, fecha: hoyString, hora: "10:30", cliente: "María G.", telefono: "+54 11 3333-4444", auto: "VW Golf", patente: "AD 789 GH", servicio: "Alineado + Balanceado", observaciones: "Vibra a 120km/h", presupuestoAsociado: "", estado: "cancelado" },
  ])

  // --- LOGICA DE FECHAS Y BLOQUEOS ---
  const fechaHoyReal = new Date()
  fechaHoyReal.setHours(0, 0, 0, 0)
  
  const limitePasado = new Date(fechaHoyReal)
  limitePasado.setDate(limitePasado.getDate() - 14)
  const isPrevDisabled = fechaActual <= limitePasado

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
    if (isPrevDisabled) return
    const newDate = new Date(fechaActual)
    newDate.setDate(newDate.getDate() - 7)
    setFechaActual(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(fechaActual)
    newDate.setDate(newDate.getDate() + 7)
    setFechaActual(newDate)
  }

  const toggleDiaNoLaborable = (fechaStr: string) => {
    if (diasNoLaborables.includes(fechaStr)) {
      setDiasNoLaborables(diasNoLaborables.filter(d => d !== fechaStr))
    } else {
      setDiasNoLaborables([...diasNoLaborables, fechaStr])
    }
  }

  // --- LOGICA DE FORMULARIOS Y ESTADOS ---
  const buscarAuto = () => {
    const auto = AUTOS_REGISTRADOS.find(a => a.patente.toLowerCase() === busquedaPatente.toLowerCase())
    if (auto) {
      setAutoEncontrado(auto)
      setFormData({ ...formData, patente: auto.patente, marcaModelo: auto.modelo, nombreDueño: auto.dueño, telefono: auto.telefono, presupuestoAsociado: "" })
    } else {
      alert("Patente no encontrada en el sistema.")
      autoEncontrado(null)
    }
  }

  const handleFechaSeleccionada = (e: any, isReprogrammingContext = false) => {
    const selectedDateStr = e.target.value
    if (!selectedDateStr) return

    const [year, month, day] = selectedDateStr.split('-')
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    const dayOfWeek = date.getDay()

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      alert("⚠️ El taller atiende de Lunes a Viernes. Seleccione un día hábil.")
      return
    }
    if (diasNoLaborables.includes(selectedDateStr)) {
      alert("⚠️ Ese día ha sido marcado como No Laborable en la agenda.")
      return
    }

    if (isReprogrammingContext) {
      setReprogramData({ ...reprogramData, fecha: selectedDateStr })
    } else {
      setFormData({ ...formData, fecha: selectedDateStr })
    }
  }

  const handleGuardarTurno = () => {
    if (!formData.fecha || !formData.hora || !formData.servicio || !formData.patente) {
      alert("Faltan completar campos obligatorios.")
      return
    }

    // Validación de fecha para no permitir días pasados
    const selectedDate = new Date(formData.fecha + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("❌ No se pueden agendar turnos para fechas pasadas.");
      return;
    }

    const nuevoTurno = {
      id: Math.random(),
      fecha: formData.fecha, hora: formData.hora, servicio: formData.servicio, cliente: formData.nombreDueño, telefono: formData.telefono, auto: formData.marcaModelo, patente: formData.patente, observaciones: formData.observaciones, presupuestoAsociado: formData.presupuestoAsociado === "ninguno" ? "" : formData.presupuestoAsociado, estado: "pendiente"
    }
    setTurnos([...turnos, nuevoTurno])
    setIsModalOpen(false)
    setFormData({ fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuestoAsociado: "" })
    autoEncontrado(null)
    setBusquedaPatente("")
  }

  const abrirDetalleTurno = (turno: any) => {
    setTurnoSeleccionado(turno)
    setIsReprogramming(false)
    setReprogramData({ fecha: turno.fecha, hora: turno.hora })
    setIsDetailModalOpen(true)
  }

  const cambiarEstadoTurno = (id: number, nuevoEstado: string) => {
    setTurnos(turnos.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t))
    setIsDetailModalOpen(false)
  }

  const guardarReprogramacion = () => {
    if (!reprogramData.fecha || !reprogramData.hora) {
      alert("Debe seleccionar una fecha y hora válidas.")
      return
    }

    // --- NUEVA VALIDACIÓN: No reprogramar al pasado ---
    const selectedDate = new Date(reprogramData.fecha + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("❌ No se puede reprogramar un turno para una fecha pasada.");
      return;
    }
    // --------------------------------------------------

    setTurnos(turnos.map(t => t.id === turnoSeleccionado.id ? { ...t, fecha: reprogramData.fecha, hora: reprogramData.hora, estado: "pendiente" } : t))
    setIsReprogramming(false)
    setIsDetailModalOpen(false)
    alert("Turno reprogramado con éxito.")
  }

  // --- RENDERIZADO VISUAL DEL TURNO CON ESTILOS PARA DÍAS PASADOS ---
  const getTurnoStyle = (estado: string, esPasado: boolean) => {
    let baseStyle = "group relative flex flex-col rounded border p-1.5 text-xs shadow-sm transition-all cursor-pointer overflow-hidden";
    if (esPasado) {
      return `${baseStyle} bg-slate-100 border-slate-300 dark:bg-slate-800/20 opacity-60 grayscale`;
    }
    if (estado === "asistio") return `${baseStyle} bg-green-100 border-green-500/50 dark:bg-green-900/20 opacity-90`;
    if (estado === "cancelado") return `${baseStyle} bg-red-50 border-red-500/30 dark:bg-red-900/10 opacity-50 grayscale`;
    return `${baseStyle} bg-card border-border hover:border-primary/50`; // Pendiente (Normal)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4">
      {/* Header y Controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Agenda de Turnos</h2>
          <p className="text-sm text-muted-foreground">Gestión semanal (Lunes a Viernes)</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-secondary rounded-md border border-border p-1">
            <Button variant="ghost" size="icon" onClick={prevWeek} disabled={isPrevDisabled} className="h-8 w-8 hover:bg-background disabled:opacity-30">
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
      <Card className="border-border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Cabecera de Días con COLORES Y ESTILOS DE DÍA PASADO */}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-secondary/50 shrink-0 relative">
          <div className="p-3 text-center border-r border-border flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {fechasSemana.map(fecha => {
            const fechaString = fecha.toISOString().split("T")[0]
            const esHoy = fechaString === hoyString
            const esPasado = fechaString < hoyString
            const esNoLaborable = diasNoLaborables.includes(fechaString)
            
            // Colores de la cabecera
            let headerBg = "bg-transparent"
            let esHoyStyle = esHoy ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"
            let esPasadoStyle = esPasado ? "grayscale opacity-60" : ""

            if (esNoLaborable) headerBg = "bg-destructive/10"
            // Se eliminaron los fondos de cabecera que interferían con el griseado completo del día pasado

            return (
              <div key={fechaString} className={`p-2 text-center border-r border-border last:border-0 flex flex-col items-center relative transition-colors ${headerBg} ${esPasadoStyle}`}>
                <span className={`text-xs font-semibold uppercase ${esHoyStyle}`}>{DIAS_SEMANA[fecha.getDay() - 1]}</span>
                <span className={`font-bold text-2xl ${esNoLaborable ? 'text-destructive/50' : esHoy ? esHoyStyle : 'text-card-foreground'}`}>{fecha.getDate()}</span>
                
                {!esPasado && (
                  <Button 
                    variant="ghost" size="icon" 
                    className={`absolute top-1 right-1 h-6 w-6 rounded-full ${esNoLaborable ? 'text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:bg-secondary/50'}`}
                    title={esNoLaborable ? "Habilitar Día" : "Marcar como No Laborable"}
                    onClick={() => toggleDiaNoLaborable(fechaString)}
                  >
                    <Ban className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Celdas del Calendario */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50">
          <div className="min-w-full relative">
            {HORARIOS.map(hora => (
              <div key={hora} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-0">
                <div className="p-2 text-center border-r border-border text-xs font-bold text-muted-foreground bg-secondary/20 flex items-start justify-center pt-3">
                  {hora}
                </div>
                {fechasSemana.map(fecha => {
                  const fechaString = fecha.toISOString().split("T")[0]
                  const turnosEnCelda = turnos.filter(t => t.fecha === fechaString && t.hora === hora)
                  const esHoy = fechaString === hoyString
                  const esPasado = fechaString < hoyString
                  const esNoLaborable = diasNoLaborables.includes(fechaString)
                  
                  // Fondo de celda con color para día actual (atrás de los turnos)
                  let cellBg = "hover:bg-secondary/10"
                  let esPasadoStyle = esPasado ? "bg-slate-100 dark:bg-slate-900/40 grayscale opacity-60" : ""
                  if (esHoy) cellBg = "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  else if (esNoLaborable) cellBg = "bg-destructive/5 cursor-not-allowed"

                  return (
                    <div key={`${fechaString}-${hora}`} className={`p-1 border-r border-border last:border-0 min-h-[90px] flex flex-col gap-1 transition-colors ${cellBg} ${esPasadoStyle}`}>
                      {!esNoLaborable && turnosEnCelda.map(turno => (
                        <div 
                          key={turno.id} 
                          onClick={() => abrirDetalleTurno(turno)}
                          className={getTurnoStyle(turno.estado, esPasado)}
                        >
                          <div className="font-bold truncate">{turno.patente}</div>
                          <div className="text-muted-foreground truncate text-[10px] mb-1">{turno.auto}</div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold border ${SERVICE_UI[turno.servicio]?.color || "bg-secondary text-foreground"}`}>
                              {SERVICE_UI[turno.servicio]?.sigla || "SRV"}
                            </Badge>
                            {turno.presupuestoAsociado && <FileText className="h-3 w-3 text-primary" />}
                            {turno.estado === "asistio" && <CheckCircle2 className="h-3 w-3 text-green-600 ml-auto" />}
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

      {/* --- MODAL DETALLE DE TURNO --- */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {isReprogramming ? "Reprogramar Turno" : "Detalle del Turno"}
            </DialogTitle>
          </DialogHeader>

          {turnoSeleccionado && (
            <div className="space-y-4 py-2">
              <div className="pb-4 border-b border-border">
                {isReprogramming ? (
                  <div className="grid grid-cols-2 gap-4 bg-secondary/30 p-3 rounded-md border border-border">
                    <div className="space-y-1">
                      <Label className="text-xs">Nueva Fecha</Label>
                      <Input type="date" className="h-8 text-sm" value={reprogramData.fecha} onChange={(e) => handleFechaSeleccionada(e, true)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nueva Hora</Label>
                      <Select value={reprogramData.hora} onValueChange={(val: string) => setReprogramData({...reprogramData, hora: val})}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-[200px]">{HORARIOS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                        {turnoSeleccionado.hora}
                        {turnoSeleccionado.estado === "asistio" && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Ingresó</Badge>}
                        {turnoSeleccionado.estado === "cancelado" && <Badge variant="destructive">Cancelado</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{turnoSeleccionado.fecha}</div>
                    </div>
                    <Badge className={`text-xs px-2 py-1 border ${SERVICE_UI[turnoSeleccionado.servicio]?.color || "bg-secondary"}`}>
                      {turnoSeleccionado.servicio}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Vehículo</p>
                  <p className="font-semibold text-foreground flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> {turnoSeleccionado.auto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Patente</p>
                  <p className="font-mono bg-secondary px-2 py-0.5 rounded text-foreground inline-block">{turnoSeleccionado.patente}</p>
                </div>
                <div className="col-span-2 flex justify-between items-center bg-secondary/20 p-2 rounded-md border border-border">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs uppercase">Cliente</p>
                    <p className="font-medium text-foreground flex items-center gap-2 mb-1"><User className="w-4 h-4 text-primary" /> {turnoSeleccionado.cliente}</p>
                    <p className="text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> {turnoSeleccionado.telefono || "No registrado"}</p>
                  </div>
                </div>
              </div>

              {turnoSeleccionado.presupuestoAsociado && (
                <button className="w-full mt-2 p-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium"><FileText className="w-4 h-4" /> Presupuesto</div>
                  <div className="flex items-center gap-2"><span className="font-mono text-xs text-primary font-bold">{turnoSeleccionado.presupuestoAsociado}</span><ExternalLink className="w-4 h-4 text-primary opacity-50" /></div>
                </button>
              )}

              {turnoSeleccionado.observaciones && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Observaciones</p>
                  <p className="text-sm text-foreground bg-secondary/30 p-3 rounded-md italic">"{turnoSeleccionado.observaciones}"</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4 border-t border-border pt-4">
            {isReprogramming ? (
              <>
                <Button variant="ghost" onClick={() => setIsReprogramming(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={guardarReprogramacion} className="bg-primary text-primary-foreground w-full sm:w-auto">Confirmar Cambios</Button>
              </>
            ) : (
              <div className="flex flex-col w-full gap-2">
                {/* Acomodar botones en la misma línea: Ingreso (Verde), Reprogramar, Cancelar (Rojo) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    {turnoSeleccionado?.estado !== "cancelado" && turnoSeleccionado?.estado !== "asistio" && (
                        <Button variant="outline" onClick={() => cambiarEstadoTurno(turnoSeleccionado.id, "asistio")} className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Ingresó
                        </Button>
                    )}
                    {turnoSeleccionado?.estado !== "cancelado" && (
                        <Button variant="outline" onClick={() => setIsReprogramming(true)} className="border-border text-foreground hover:bg-secondary">
                            <CalendarClock className="w-4 h-4 mr-2" /> Reprogramar
                        </Button>
                    )}
                    {turnoSeleccionado?.estado !== "cancelado" && (
                        <Button variant="outline" onClick={() => cambiarEstadoTurno(turnoSeleccionado.id, "cancelado")} className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <XCircle className="w-4 h-4 mr-2" /> Cancelar
                        </Button>
                    )}
                </div>
                {/* Se eliminó el botón "Cerrar Detalle" */}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE NUEVO TURNO --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground">Agendar Nuevo Turno</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete los datos para registrar la cita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-card-foreground">Fecha</Label>
                <Input type="date" className="bg-secondary border-border" 
                  value={formData.fecha} onChange={handleFechaSeleccionada} />
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

            <div className="space-y-2">
              <Label className="text-card-foreground">Observaciones del Turno</Label>
              <Textarea 
                placeholder="Ej: El cliente dice que vibra el volante a los 100km/h." 
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
    </div>
  )
}