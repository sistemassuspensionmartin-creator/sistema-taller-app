"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Definimos los horarios del taller (cada 30 min)
const HORARIOS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
]

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

// Colores semánticos para los servicios
const SERVICE_COLORS: Record<string, string> = {
  "Revisión": "bg-slate-500/10 text-slate-500 border-slate-500/20",
  "Frenos": "bg-red-500/10 text-red-500 border-red-500/20",
  "Tren Delantero": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Alineado y Balanceado": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Cambio de Aceite": "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

// Datos de prueba simulando la realidad de tu taller
const mockTurnos = [
  // El malón de las 8:30
  { id: 1, dia: "Lunes", hora: "08:30", cliente: "Juan Pérez", auto: "Toyota Corolla", servicio: "Tren Delantero" },
  { id: 2, dia: "Lunes", hora: "08:30", cliente: "Ana Rod.", auto: "Peugeot 208", servicio: "Frenos" },
  { id: 3, dia: "Lunes", hora: "08:30", cliente: "Carlos L.", auto: "Honda Civic", servicio: "Revisión" },
  
  // Servicios rápidos a lo largo del día
  { id: 4, dia: "Lunes", hora: "10:30", cliente: "Roberto F.", auto: "Kangoo", servicio: "Alineado y Balanceado" },
  { id: 5, dia: "Lunes", hora: "14:00", cliente: "María G.", auto: "VW Golf", servicio: "Cambio de Aceite" },
  
  // Otros días
  { id: 6, dia: "Martes", hora: "08:30", cliente: "Esteban Q.", auto: "Ford Ranger", servicio: "Tren Delantero" },
  { id: 7, dia: "Miércoles", hora: "11:00", cliente: "Laura M.", auto: "Fiat Cronos", servicio: "Alineado y Balanceado" },
]

export function TurnosView() {
  // Estado para simular que cambiamos de semana
  const [semanaActual, setSemanaActual] = useState(new Date())

  // Funciones falsas para mover la semana visualmente
  const prevWeek = () => {
    const newDate = new Date(semanaActual)
    newDate.setDate(newDate.getDate() - 7)
    setSemanaActual(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(semanaActual)
    newDate.setDate(newDate.getDate() + 7)
    setSemanaActual(newDate)
  }

  // Función para encontrar los turnos de un día y hora específicos
  const getTurnosParaCelda = (dia: string, hora: string) => {
    return mockTurnos.filter(t => t.dia === dia && t.hora === hora)
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
          {/* Navegación de semanas */}
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

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Calendario Semanal (Grilla) */}
      <Card className="border-border bg-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col h-full">
          {/* Cabecera de Días */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-secondary/50 shrink-0">
            <div className="p-3 text-center border-r border-border flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            {DIAS.map(dia => (
              <div key={dia} className="p-3 text-center font-medium text-sm text-card-foreground border-r border-border last:border-0">
                {dia}
              </div>
            ))}
          </div>

          {/* Cuerpo del calendario (Scrollable) */}
          <ScrollArea className="flex-1">
            <div className="min-w-full">
              {HORARIOS.map(hora => (
                <div key={hora} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  {/* Columna de la Hora */}
                  <div className="p-3 text-center border-r border-border text-sm font-medium text-muted-foreground bg-secondary/10 flex items-start justify-center pt-4">
                    {hora}
                  </div>
                  
                  {/* Celdas de los Días */}
                  {DIAS.map(dia => {
                    const turnosEnCelda = getTurnosParaCelda(dia, hora)
                    
                    return (
                      <div key={`${dia}-${hora}`} className="p-2 border-r border-border last:border-0 min-h-[100px] flex flex-col gap-2">
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
    </div>
  )
}