"use client"

import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Car, User, Ban, FileText, Search, Phone, ExternalLink, CheckCircle2, XCircle, CalendarClock, Loader2, BookmarkPlus } from "lucide-react"
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

import { supabase } from "@/lib/supabase"

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

// --- FUNCIÓN MAGICA CORREGIDA PARA ZONA HORARIA ARGENTINA ---
// Obtiene la fecha local en formato YYYY-MM-DD sin importar la hora UTC
const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// DEFINIMOS LAS PROPS QUE ACEPTA LA VISTA
interface TurnosViewProps {
  turnoAgendarInfo?: any;
  onClearTurnoAgendarInfo?: () => void;
  // --- NUEVA PROP PARA NAVEGACIÓN ---
  onNavigateToBudgetDetail?: (budgetId: string) => void;
}

export function TurnosView({ 
  turnoAgendarInfo, 
  onClearTurnoAgendarInfo,
  onNavigateToBudgetDetail // RECIBIMOS LA PROP
}: TurnosViewProps) {
  const [fechaActual, setFechaActual] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<any>(null)
  const [isReprogramming, setIsReprogramming] = useState(false)
  const [reprogramData, setReprogramData] = useState({ fecha: "", hora: "" })

  const [sugerenciasVehiculos, setSugerenciasVehiculos] = useState<any[]>([])
  
  const [diasNoLaborables, setDiasNoLaborables] = useState<string[]>([])
  const [tipoRegistro, setTipoRegistro] = useState("registrado")
  const [busquedaPatente, setBusquedaPatente] = useState("")
  const [autoEncontrado, setAutoEncontrado] = useState<any>(null)

  const [formData, setFormData] = useState({
    fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuesto_id: ""
  })

  const [turnos, setTurnos] = useState<any[]>([])

  // --- USAMOS LA FUNCIÓN CORREGIDA PARA "HOY" ---
  const hoyString = getLocalDateString(new Date())

  // Cargar turnos desde Supabase
  const fetchTurnos = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select('*, presupuestos(numero_correlativo)')
      
      if (error) throw error
      setTurnos(data || [])
    } catch (error) {
      console.error("Error al cargar turnos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTurnos()
  }, [])

  // EFECTO MODO AGENDAMIENTO
  useEffect(() => {
    const cargarAutoPredefinido = async (patente: string, pres_id: string) => {
      setIsSearching(true);
      try {
        const { data: auto, error } = await supabase
          .from('vehiculos')
          .select('*, clientes(nombre, apellido, razon_social, tipo_cliente, telefono)')
          .eq('patente', patente)
          .single();

        if (error || !auto) return;

        const { data: presups } = await supabase
          .from('presupuestos')
          .select('id, numero_correlativo, total_final, detalle, estado')
          .eq('vehiculo_patente', auto.patente)
          .in('estado', ['Borrador', 'En Espera', 'Aprobado']); 

        const nombreCliente = auto.clientes ? (auto.clientes.tipo_cliente === 'empresa' ? auto.clientes.razon_social : `${auto.clientes.nombre} ${auto.clientes.apellido || ''}`.trim()) : 'Sin dueño';
        const telefonoCliente = auto.clientes?.telefono || '';

        setAutoEncontrado({
          ...auto,
          dueño: nombreCliente,
          telefono: telefonoCliente,
          presupuestos: presups || []
        });

        // Auto-selecciona el presupuesto si hay ID
        const presIdASeleccionar = pres_id || (presups && presups.length > 0 ? presups[0].id : "");

        setFormData(prev => ({ 
          ...prev, 
          patente: auto.patente, 
          marcaModelo: `${auto.marca} ${auto.modelo}`, 
          nombreDueño: nombreCliente, 
          telefono: telefonoCliente, 
          presupuesto_id: presIdASeleccionar
        }));
        
        setBusquedaPatente(auto.patente);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }

    if (turnoAgendarInfo) {
      cargarAutoPredefinido(turnoAgendarInfo.patente, turnoAgendarInfo.presupuesto_id);
    }
  }, [turnoAgendarInfo])


  const fechaHoyReal = new Date()
  fechaHoyReal.setHours(0, 0, 0, 0)
  
  const limitePasado = new Date(fechaHoyReal)
  limitePasado.setDate(limitePasado.getDate() - 14)
  const isPrevDisabled = fechaActual <= limitePasado

  // --- LÓGICA DE SEMANAS CORREGIDA ---
  const obtenerFechasSemana = (fechaBase: Date) => {
    const fechas = []
    const diaSemana = fechaBase.getDay()
    const diff = fechaBase.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) 
    const lunes = new Date(fechaBase)
    lunes.setDate(diff)
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

  const buscarAuto = async () => {
    const pBusqueda = busquedaPatente.trim();
    if(!pBusqueda) return;

    setIsSearching(true);
    setSugerenciasVehiculos([]); 
    try {
      const { data: auto, error } = await supabase
        .from('vehiculos')
        .select('*, clientes(nombre, apellido, razon_social, tipo_cliente, telefono)')
        .ilike('patente', `%${pBusqueda}%`)
        .single();

      if (error || !auto) {
        alert("Patente no encontrada en el sistema.");
        setAutoEncontrado(null); 
        return;
      }

      const { data: presups } = await supabase
        .from('presupuestos')
        .select('id, numero_correlativo, total_final, detalle, estado')
        .eq('vehiculo_patente', auto.patente)
        .in('estado', ['Borrador', 'En Espera', 'Aprobado']); 

      const nombreCliente = auto.clientes ? (auto.clientes.tipo_cliente === 'empresa' ? auto.clientes.razon_social : `${auto.clientes.nombre} ${auto.clientes.apellido || ''}`.trim()) : 'Sin dueño';
      const telefonoCliente = auto.clientes?.telefono || '';

      setAutoEncontrado({
        ...auto,
        dueño: nombreCliente,
        telefono: telefonoCliente,
        presupuestos: presups || []
      });

      // Auto-asigna el presupuesto
      const presIdAuto = presups && presups.length > 0 ? presups[0].id : "";

      setFormData({ 
        ...formData, 
        patente: auto.patente, 
        marcaModelo: `${auto.marca} ${auto.modelo}`, 
        nombreDueño: nombreCliente, 
        telefono: telefonoCliente, 
        presupuesto_id: presIdAuto 
      });

    } catch (err) {
      console.error(err);
      alert("Hubo un error al buscar la patente.");
    } finally {
      setIsSearching(false);
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

  const handleGuardarTurno = async () => {
    if (!formData.fecha || !formData.hora || !formData.servicio || !formData.patente) {
      alert("⚠️ Faltan completar campos obligatorios. Asegúrese de seleccionar la Fecha, Hora y el Servicio.");
      return
    }

    const selectedDate = new Date(formData.fecha + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("❌ No se pueden agendar turnos para fechas pasadas.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fecha: formData.fecha, 
        hora: formData.hora, 
        servicio: formData.servicio, 
        cliente: formData.nombreDueño, 
        telefono: formData.telefono, 
        auto: formData.marcaModelo, 
        patente: formData.patente, 
        observaciones: formData.observaciones, 
        presupuesto_id: formData.presupuesto_id === "ninguno" || !formData.presupuesto_id ? null : formData.presupuesto_id, 
        estado: "pendiente"
      };

      const { error } = await supabase.from('turnos').insert([payload]);
      if (error) throw error;

      // Transacción: Aprobamos presupuesto SOLO si hay ID
      if (payload.presupuesto_id) {
        await supabase.from('presupuestos').update({ estado: "Aprobado" }).eq('id', payload.presupuesto_id);
      }

      setIsModalOpen(false)
      setFormData({ fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuesto_id: "" })
      setAutoEncontrado(null); 
      setBusquedaPatente("")
      
      if (onClearTurnoAgendarInfo) onClearTurnoAgendarInfo();

      fetchTurnos() 
      alert(payload.presupuesto_id ? "¡Turno agendado y presupuesto aprobado con éxito!" : "¡Turno agendado con éxito!");

    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert("Error al agendar el turno: " + error.message)
    } finally {
      setIsSaving(false);
    }
  }

  const abrirDetalleTurno = (turno: any) => {
    setTurnoSeleccionado(turno)
    setIsReprogramming(false)
    setReprogramData({ fecha: turno.fecha, hora: turno.hora })
    setIsDetailModalOpen(true)
  }

  const cambiarEstadoTurno = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      
      if (nuevoEstado === "asistio") {
        const turno = turnos.find(t => t.id === id);
        if (turno) {
          const { error: tallerError } = await supabase.from('ordenes_trabajo').insert([{
            presupuesto_id: turno.presupuesto_id || null,
            vehiculo_patente: turno.patente,
            cliente_nombre: turno.cliente,
            estado: 'A Ingresar',
            notas_mecanico: turno.observaciones || null
          }]);
          if (tallerError) throw tallerError;
          alert("¡Turno confirmado! El vehículo ya está en el tablero del Taller esperando al mecánico.");
        }
      }

      fetchTurnos(); 
      setIsDetailModalOpen(false)
    } catch (error: any) {
      console.error("Error al cambiar estado:", error)
      alert("Error al actualizar el estado: " + error.message)
    }
  }

  // --- NUEVA FUNCIÓN: VALIDA INGRESO POR FECHA ---
  const handleValidarIngreso = (turno: any) => {
    // Calculamos "hoy" local
    const hoyLocal = getLocalDateString(new Date());

    if (turno.fecha !== hoyLocal) {
      alert(`⚠️ ATENCIÓN: No se puede ingresar el vehículo. El turno está agendado para el día ${turno.fecha} y hoy es ${hoyLocal}. 

Si el vehículo llegó antes, primero debe reprogramar el turno para el día de la fecha en la agenda.`);
      return;
    }

    // Si la fecha coincide, procedemos al ingreso
    cambiarEstadoTurno(turno.id, "asistio");
  }

  const guardarReprogramacion = async () => {
    if (!reprogramData.fecha || !reprogramData.hora) {
      alert("Debe seleccionar una fecha y hora válidas.")
      return
    }

    const selectedDate = new Date(reprogramData.fecha + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("❌ No se puede reprogramar un turno para una fecha pasada.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('turnos').update({ 
        fecha: reprogramData.fecha, 
        hora: reprogramData.hora, 
        estado: "pendiente" 
      }).eq('id', turnoSeleccionado.id);

      if (error) throw error;

      fetchTurnos();
      setIsReprogramming(false)
      setIsDetailModalOpen(false)
      alert("Turno reprogramado con éxito.")
    } catch (error: any) {
      console.error("Error al reprogramar:", error)
      alert("Error al reprogramar el turno: " + error.message)
    } finally {
      setIsSaving(false);
    }
  }

  const getTurnoStyle = (estado: string, esPasado: boolean) => {
    let baseStyle = "group relative flex flex-col rounded border p-1.5 text-xs shadow-sm transition-all cursor-pointer overflow-hidden";
    
    // --- ESTILO PASADO CORREGIDO ---
    if (esPasado) {
      return `${baseStyle} bg-slate-100 border-slate-300 dark:bg-slate-800/20 opacity-60 grayscale`;
    }
    if (estado === "asistio") return `${baseStyle} bg-green-100 border-green-500/50 dark:bg-green-900/20 opacity-90`;
    if (estado === "cancelado") return `${baseStyle} bg-red-50 border-red-500/30 dark:bg-red-900/10 opacity-50 grayscale`;
    return `${baseStyle} bg-card border-border hover:border-primary/50`; 
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-4">
      {turnoAgendarInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in slide-in-from-top-4 shrink-0">
          <div className="flex gap-3">
            <BookmarkPlus className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Modo Agendamiento Activo</h3>
              <p className="text-sm opacity-90">Navegue por el calendario para buscar disponibilidad. Al hacer clic en <b>"Nuevo Turno"</b>, los datos de la patente <b>{turnoAgendarInfo.patente}</b> se cargarán automáticamente.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shrink-0" onClick={() => {
            if(onClearTurnoAgendarInfo) onClearTurnoAgendarInfo();
            setAutoEncontrado(null);
            setBusquedaPatente("");
            setFormData({ fecha: "", hora: "", servicio: "", patente: "", marcaModelo: "", nombreDueño: "", telefono: "", observaciones: "", presupuesto_id: "" });
          }}>
            Cancelar Agendamiento
          </Button>
        </div>
      )}

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

          <Button onClick={() => setIsModalOpen(true)} className={`${turnoAgendarInfo ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-background animate-pulse' : 'bg-primary hover:bg-primary/90'} text-primary-foreground transition-all`}>
            <Plus className="mr-2 h-4 w-4" />
            {turnoAgendarInfo ? "Agendar Vehículo" : "Nuevo Turno"}
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-secondary/50 shrink-0 relative">
          <div className="p-3 text-center border-r border-border flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {fechasSemana.map(fecha => {
            // --- USAMOS LA FUNCIÓN CORREGIDA ---
            const fechaString = getLocalDateString(fecha)
            const esHoy = fechaString === hoyString
            const esPasado = fechaString < hoyString
            const esNoLaborable = diasNoLaborables.includes(fechaString)
            
            let headerBg = "bg-transparent"
            let esHoyStyle = esHoy ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"
            let esPasadoStyle = esPasado ? "grayscale opacity-60" : ""

            if (esNoLaborable) headerBg = "bg-destructive/10"

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

        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50">
          <div className="min-w-full relative">
            {HORARIOS.map(hora => (
              <div key={hora} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-0">
                <div className="p-2 text-center border-r border-border text-xs font-bold text-muted-foreground bg-secondary/20 flex items-start justify-center pt-3">
                  {hora}
                </div>
                {fechasSemana.map(fecha => {
                  // --- USAMOS LA FUNCIÓN CORREGIDA ---
                  const fechaString = getLocalDateString(fecha)
                  const turnosEnCelda = turnos.filter(t => t.fecha === fechaString && t.hora === hora)
                  const esHoy = fechaString === hoyString
                  const esPasado = fechaString < hoyString
                  const esNoLaborable = diasNoLaborables.includes(fechaString)
                  
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
                            {turno.presupuesto_id && <FileText className="h-3 w-3 text-primary" />}
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
                        {turnoSeleccionado.estado === "asistio" && <Badge className="bg-green-100 text-green-700 border-green-200">Ingresó</Badge>}
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

              {turnoSeleccionado.presupuesto_id && (
                // --- BOTÓN DE PRESUPUESTO ACTUALIZADO ---
                <button 
                  onClick={() => {
                    // Llama a la navegación que definimos en el puente
                    onNavigateToBudgetDetail?.(turnoSeleccionado.presupuesto_id);
                    setIsDetailModalOpen(false); // Cierra este modal
                  }}
                  className="w-full mt-2 p-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <FileText className="w-4 h-4" /> Presupuesto Asociado
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">
                      {turnoSeleccionado.presupuestos?.numero_correlativo ? `PRE-${turnoSeleccionado.presupuestos.numero_correlativo}` : 'Ver'}
                    </span>
                    <ExternalLink className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
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
                <Button variant="ghost" onClick={() => setIsReprogramming(false)} className="w-full sm:w-auto" disabled={isSaving}>Cancelar</Button>
                <Button onClick={guardarReprogramacion} className="bg-primary text-primary-foreground w-full sm:w-auto" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirmar Cambios
                </Button>
              </>
            ) : (
              <div className="flex flex-col w-full gap-2">
                <div className="grid grid-cols-3 gap-2 w-full">
                    {turnoSeleccionado?.estado !== "cancelado" && turnoSeleccionado?.estado !== "asistio" && (
                        // --- BOTÓN INGRESÓ CON VALIDACIÓN ---
                        <Button variant="outline" onClick={() => handleValidarIngreso(turnoSeleccionado)} className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
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
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card h-[85vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 p-6 border-b border-border">
            <DialogTitle className="text-xl text-card-foreground">Agendar Nuevo Turno</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete los datos para registrar la cita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                      <div className="space-y-2 flex-1 relative">
                        <Label className="text-card-foreground">Patente del Vehículo</Label>
                        <div className="relative">
                          <Input 
                            placeholder="Ej: AB 123 CD" 
                            className="bg-secondary border-border uppercase" 
                            value={busquedaPatente} 
                            onChange={async (e: any) => {
                              const val = e.target.value;
                              setBusquedaPatente(val);
                              const limpia = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                              if (limpia.length >= 2) {
                                const { data } = await supabase
                                  .from('vehiculos')
                                  .select('patente, marca, modelo')
                                  .ilike('patente', `%${limpia}%`)
                                  .limit(5);
                                setSugerenciasVehiculos(data || []);
                              } else {
                                setSugerenciasVehiculos([]);
                              }
                            }}
                            onKeyDown={(e: any) => {
                              if (e.key === 'Enter') {
                                setSugerenciasVehiculos([]);
                                buscarAuto();
                              }
                            }}
                          />
                          {sugerenciasVehiculos.length > 0 && (
                            <div className="absolute top-[45px] left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                              {sugerenciasVehiculos.map(v => (
                                <div 
                                  key={v.patente} 
                                  className="p-3 hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 flex justify-between items-center"
                                  onClick={() => {
                                    setBusquedaPatente(v.patente);
                                    setSugerenciasVehiculos([]);
                                    buscarAuto();
                                  }}
                                >
                                  <div className="font-mono font-bold tracking-widest">{v.patente}</div>
                                  <div className="text-xs text-muted-foreground">{v.marca} {v.modelo}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button onClick={buscarAuto} disabled={isSearching} className="bg-primary text-primary-foreground">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                      </Button>
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
                              <FileText className="w-4 h-4" /> Presupuestos Activos
                            </Label>
                            <Select value={formData.presupuesto_id} onValueChange={(val: string) => setFormData({...formData, presupuesto_id: val})}>
                              <SelectTrigger className="bg-background border-primary/50 text-foreground">
                                <SelectValue placeholder="Asociar un presupuesto (Opcional)" />
                              </SelectTrigger>
                              <SelectContent className="border-border bg-popover">
                                <SelectItem value="ninguno">No asociar ninguno</SelectItem>
                                {autoEncontrado.presupuestos.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    PRE-{p.numero_correlativo} - {p.estado} (${p.total_final?.toLocaleString()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground pt-2 border-t border-border">No registra presupuestos pendientes en sistema.</div>
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

          <DialogFooter className="shrink-0 p-4 border-t border-border bg-card rounded-b-lg">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="text-muted-foreground hover:bg-secondary">
                Cancelar
              </Button>
              <Button onClick={handleGuardarTurno} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Agendar Turno
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}