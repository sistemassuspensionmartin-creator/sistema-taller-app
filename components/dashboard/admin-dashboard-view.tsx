"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, Wallet, Landmark 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts'

export function AdminDashboardView() {
  const [showMoney, setShowMoney] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  
  // ESTADOS REALES
  const [cajasReales, setCajasReales] = useState<any[]>([])
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0, neto: 0 })
  const [dataGrafico, setDataGrafico] = useState<any[]>([])

  const cargarDatosReales = async () => {
    setIsLoading(true)
    try {
      // 1. TRAER SALDOS ACTUALES DE TUS CAJAS
      const { data: cajasData } = await supabase
        .from('cajas')
        .select('*')
        .order('nombre')
      
      if (cajasData) setCajasReales(cajasData)

      // 2. TRAER MOVIMIENTOS DE LOS ÚLTIMOS 30 DÍAS PARA MÉTRICAS
      const hace30Dias = new Date()
      hace30Dias.setDate(hace30Dias.getDate() - 30)

      const { data: movimientos } = await supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', hace30Dias.toISOString())
        .order('fecha', { ascending: true })

      if (movimientos) {
        let ing = 0
        let egr = 0
        const ventasAgrupadas: { [key: string]: number } = {}

        movimientos.forEach(m => {
          const monto = Number(m.monto)
          const fecha = new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })

          if (m.tipo_movimiento === 'ingreso_cobro') {
            ing += monto
            ventasAgrupadas[fecha] = (ventasAgrupadas[fecha] || 0) + monto
          } else if (m.tipo_movimiento === 'egreso_gasto') {
            egr += monto
          }
        })

        setStats({ ingresos: ing, egresos: egr, neto: ing - egr })
        
        // Formatear para el gráfico
        const chartData = Object.keys(ventasAgrupadas).map(day => ({
          name: day,
          ventas: ventasAgrupadas[day]
        }))
        setDataGrafico(chartData)
      }

    } catch (error) {
      console.error("Error al cargar dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { cargarDatosReales() }, [])

  const hide = (monto: number) => showMoney ? `$${monto.toLocaleString('es-AR')}` : "••••••";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER DE PRIVACIDAD */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Panel Administrativo</h2>
          <p className="text-sm text-muted-foreground">Datos consolidados de tus cajas y ventas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowMoney(!showMoney)} className="shadow-sm">
          {showMoney ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showMoney ? "Modo Privado" : "Ver Montos"}
        </Button>
      </div>

      {/* MÉTRICAS DE ESTE MES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Ventas (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700 font-mono">{hide(stats.ingresos)}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-red-600 uppercase tracking-widest">Gastos (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700 font-mono">{hide(stats.egresos)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-600 text-white shadow-lg border-none">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Resultado Neto</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono">{hide(stats.neto)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO REAL DE VENTAS */}
        <Card className="lg:col-span-2 p-6 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-wider">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Flujo de Ingresos Diarios
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.02)'}}
                  formatter={(v: any) => showMoney ? `$${v}` : '***'}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* LISTADO DE TUS CAJAS REALES */}
        <Card className="p-6 shadow-sm border-slate-100">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-wider">
            <Wallet className="w-4 h-4 text-purple-500" /> Saldos Disponibles
          </h3>
          <div className="space-y-3">
            {cajasReales.map((caja) => (
              <div key={caja.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-2">
                   <Landmark className="w-3 h-3 text-slate-400" />
                   <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{caja.nombre}</span>
                </div>
                <span className="font-mono font-black text-slate-900">
                  {hide(caja.saldo)}
                </span>
              </div>
            ))}
            {cajasReales.length === 0 && <p className="text-xs text-center text-slate-400 italic py-4">No se encontraron cajas configuradas.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}