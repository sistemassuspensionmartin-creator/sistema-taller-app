"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Wrench, CheckCircle2, Flag, ArrowRight, User, FileText, Loader2 } from "lucide-react"

const COLUMNAS = [
  { id: "A Ingresar", titulo: "Esperando Ingreso", icono: Clock, color: "text-slate-500", border: "border-slate-200 dark:border-slate-800", bg: "bg-slate-50 dark:bg-slate-900/50" },
  { id: "En Proceso", titulo: "En Proceso (Elevador)", icono: Wrench, color: "text-blue-500", border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/50 dark:bg-blue-900/10" },
  { id: "Terminado", titulo: "Terminado (A Lavar/Entregar)", icono: CheckCircle2, color: "text-emerald-500", border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/50 dark:bg-emerald-900/10" },
  { id: "Entregado", titulo: "Entregado al Cliente", icono: Flag, color: "text-purple-500", border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/50 dark:bg-purple-900/10" },
]

// AGREGAMOS LA PROP 'readOnly' (Por defecto es false)
export function WorkOrdersTable({ onNavigateToPresupuesto, readOnly = false }: { onNavigateToPresupuesto?: (id: string) => void, readOnly?: boolean }) {
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const cargarOrdenes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select('*, presupuestos(numero_correlativo, total_final)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setOrdenes(data || [])
    } catch (error) {
      console.error("Error al cargar órdenes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargarOrdenes()
  }, [])

  const avanzarEstado = async (id: string, estadoActual: string) => {
    const currentIndex = COLUMNAS.findIndex(c => c.id === estadoActual)
    if (currentIndex >= COLUMNAS.length - 1) return 

    const nuevoEstado = COLUMNAS[currentIndex + 1].id
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o))

    try {
      await supabase.from('ordenes_trabajo').update({ estado: nuevoEstado }).eq('id', id)
    } catch (error) {
      alert("Error al mover el vehículo.")
      cargarOrdenes() 
    }
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Control de Taller</h2>
        <p className="text-sm text-muted-foreground">Flujo de trabajo de los vehículos ingresados.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {COLUMNAS.map(columna => {
          const Icono = columna.icono
          const ordenesEnColumna = ordenes.filter(o => o.estado === columna.id)

          return (
            <div key={columna.id} className={`flex flex-col rounded-xl border ${columna.border} ${columna.bg} overflow-hidden h-full max-h-full`}>
              <div className={`p-3 border-b ${columna.border} bg-background/50 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Icono className={`w-4 h-4 ${columna.color}`} />
                  {columna.titulo}
                </div>
                <Badge variant="secondary" className="font-mono">{ordenesEnColumna.length}</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {ordenesEnColumna.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8 italic border-2 border-dashed border-border/50 rounded-lg">
                    Vacío
                  </div>
                ) : (
                  ordenesEnColumna.map(orden => (
                    <Card 
                      key={orden.id} 
                      className={`border-border shadow-sm transition-all group ${orden.presupuesto_id ? 'hover:shadow-md cursor-pointer hover:border-primary/50' : ''}`}
                      onClick={() => {
                        if (orden.presupuesto_id && onNavigateToPresupuesto) {
                          onNavigateToPresupuesto(orden.presupuesto_id);
                        }
                      }}
                    >
                      <CardContent className="p-3 relative">
                        <div className="font-bold text-foreground mb-1">{orden.vehiculo_patente}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <User className="w-3 h-3"/> {orden.cliente_nombre}
                        </div>
                        
                        {orden.presupuestos && (
                          <div className="bg-primary/5 text-primary text-xs font-mono p-1.5 rounded flex justify-between items-center border border-primary/10">
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> PRE-{orden.presupuestos.numero_correlativo}</span>
                            <span className="font-bold">${orden.presupuestos.total_final?.toLocaleString()}</span>
                          </div>
                        )}

                        {/* ACÁ ESTÁ LA MAGIA: Solo mostramos el botón si NO es de solo lectura y no está entregado */}
                        {!readOnly && columna.id !== "Entregado" && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full mt-3 h-7 text-xs bg-background hover:bg-emerald-50 hover:text-emerald-700 border border-border group-hover:border-emerald-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              avanzarEstado(orden.id, orden.estado);
                            }}
                          >
                            Avanzar <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}