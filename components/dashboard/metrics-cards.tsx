"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  AlertTriangle, Car, CheckCircle2, CalendarDays, 
  Plus, DollarSign, CalendarPlus, Clock, ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function MetricsCards({  
  onNavigateToPresupuestos, 
  onNavigateToTurnos, 
  onNavigateToCaja 
}: { 
  onNavigateToPresupuestos?: () => void,
  onNavigateToTurnos?: () => void,
  onNavigateToCaja?: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  
  // Métricas
  const [enTaller, setEnTaller] = useState(0)
  const [entregadosHoy, setEntregadosHoy] = useState(0)
  const [turnosHoy, setTurnosHoy] = useState(0)
  
  // Alerta Caja
  const [alertaCaja, setAlertaCaja] = useState(false)
  
  // Agenda
  const [agendaHoy, setAgendaHoy] = useState<any[]>([])

  useEffect(() => {
    const cargarTablero = async () => {
      setIsLoading(true)
      try {
        const hoy = new Date()
        const hoyString = hoy.toLocaleDateString('en-CA') 
        const inicioDeHoyISO = new Date(hoy.setHours(0,0,0,0)).toISOString()

        // 1. Métricas del Taller (En proceso vs Entregados hoy)
        const { data: ordenes } = await supabase.from('ordenes_trabajo').select('estado, fecha_entrega')
        
        let enProcesoCount = 0
        let entregadosHoyCount = 0

        ;(ordenes || []).forEach((o: any) => {
          if (o.estado !== 'Entregado al Cliente' && o.estado !== 'Entregado') {
            enProcesoCount++
          } else if (o.fecha_entrega && o.fecha_entrega.startsWith(hoyString)) {
            entregadosHoyCount++
          }
        })

        setEnTaller(enProcesoCount)
        setEntregadosHoy(entregadosHoyCount)

        // 2. Agenda de Hoy (ADAPTADO A TU TABLA EXACTA)
        const { data: turnos } = await supabase
          .from('turnos')
          .select('*')
          .eq('fecha', hoyString)
          .order('hora', { ascending: true })

        setAgendaHoy(turnos || [])
        setTurnosHoy(turnos?.length || 0)

        // 3. Sistema de Alerta de Caja
        const { data: ultimoCierre } = await supabase
          .from('cierres_caja')
          .select('fecha_cierre')
          .order('fecha_cierre', { ascending: false })
          .limit(1)
          .single()

        const fechaUltimoCierre = ultimoCierre ? ultimoCierre.fecha_cierre : '2000-01-01T00:00:00Z'

        const { data: movimientosOlvidados } = await supabase
          .from('movimientos_caja')
          .select('id')
          .gt('fecha', fechaUltimoCierre)
          .lt('fecha', inicioDeHoyISO)
          .limit(1)

        if (movimientosOlvidados && movimientosOlvidados.length > 0) {
          setAlertaCaja(true)
        }

      } catch (error) {
        console.error("Error al cargar el tablero:", error)
      } finally {
        setIsLoading(false)
      }
    }

    cargarTablero()
  }, [])

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">¡Buen día!</h2>
          <p className="text-muted-foreground">Este es el resumen operativo de tu taller para hoy.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-secondary/50 px-4 py-2 rounded-full">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ALERTA DE CAJA */}
      {alertaCaja && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold">Alerta de Tesorería</h3>
            <p className="text-red-700 text-sm mt-1">
              El sistema detectó movimientos de dinero en días anteriores sin un Cierre de Caja correspondiente. Por favor, realice el cierre para auditar los saldos.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onNavigateToCaja} className="border-red-200 text-red-700 hover:bg-red-100 bg-white">
            Ir a Caja
          </Button>
        </div>
      )}

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ingresos Esperados</p>
              <h3 className="text-3xl font-black text-foreground">{isLoading ? '-' : turnosHoy}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <Car className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">En el Taller</p>
              <h3 className="text-3xl font-black text-foreground">{isLoading ? '-' : enTaller}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Entregados Hoy</p>
              <h3 className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{isLoading ? '-' : entregadosHoy}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* ATAJOS (4 Columnas) */}
        <div className="md:col-span-4 space-y-4">
          <h3 className="text-lg font-bold text-foreground">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 gap-3">
            <Button onClick={onNavigateToPresupuestos} className="h-14 justify-start text-base bg-white text-slate-700 hover:bg-slate-50 border border-border shadow-sm dark:bg-slate-950 dark:text-slate-200">
              <Plus className="mr-3 h-5 w-5 text-blue-600" /> Nuevo Presupuesto
            </Button>
            <Button onClick={onNavigateToTurnos} className="h-14 justify-start text-base bg-white text-slate-700 hover:bg-slate-50 border border-border shadow-sm dark:bg-slate-950 dark:text-slate-200">
              <CalendarPlus className="mr-3 h-5 w-5 text-purple-600" /> Agendar Ingreso
            </Button>
            <Button onClick={onNavigateToCaja} className="h-14 justify-start text-base bg-white text-slate-700 hover:bg-slate-50 border border-border shadow-sm dark:bg-slate-950 dark:text-slate-200">
              <DollarSign className="mr-3 h-5 w-5 text-emerald-600" /> Registrar Cobro
            </Button>
          </div>
        </div>

        {/* AGENDA DEL DÍA (8 Columnas) */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Agenda de Recepción</h3>
            <Button variant="ghost" size="sm" onClick={onNavigateToTurnos} className="text-blue-600 hover:text-blue-800">
              Ver agenda completa <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando agenda...</div>
              ) : agendaHoy.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <CalendarDays className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
                  <p className="text-muted-foreground font-medium">No hay vehículos agendados para ingresar hoy.</p>
                </div>
              ) : (
                agendaHoy.map((turno) => (
                  <div key={turno.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                        <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                        {/* Se ajusta porque tu campo "hora" es de tipo texto */}
                        <span className="font-mono font-bold text-sm">{turno.hora ? turno.hora.substring(0,5) : '--:--'}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          <span className="uppercase tracking-widest text-blue-600">{turno.patente}</span>
                          <span className="text-muted-foreground font-normal">- {turno.cliente}</span>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{turno.servicio || 'Sin motivo especificado'}</p>
                      </div>
                    </div>
                    <div>
                      {turno.estado === 'Ingresado' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 shadow-none hover:bg-emerald-100 border-emerald-200">Ya en Taller</Badge>
                      ) : turno.estado === 'Cancelado' ? (
                        <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Cancelado</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">Esperando Arribo</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}