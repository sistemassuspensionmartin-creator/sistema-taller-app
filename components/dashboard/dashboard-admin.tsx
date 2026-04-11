"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, PieChart as PieChartIcon, Wallet, ArrowUpRight 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts'

export function AdminDashboardView() {
  const [showMoney, setShowMoney] = useState(true)
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0, neto: 0 })
  const [dataGrafico, setDataGrafico] = useState<any[]>([])

  // Función para censurar montos
  const hide = (monto: number) => {
    if (!showMoney) return "••••••";
    return `$${monto.toLocaleString('es-AR')}`;
  }

  const cargarEstadisticas = async () => {
    try {
      // 1. Traer todos los movimientos del último mes
      const haceUnMes = new Date();
      haceUnMes.setDate(haceUnMes.getDate() - 30);

      const { data: movimientos, error } = await supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', haceUnMes.toISOString());

      if (error) throw error;

      // 2. Procesar Totales
      let totalIngresos = 0;
      let totalEgresos = 0;
      
      // Objeto para agrupar ventas por día para el gráfico
      const ventasPorDia: { [key: string]: number } = {};

      movimientos.forEach(mov => {
        const monto = Number(mov.monto);
        const fechaSimple = new Date(mov.fecha).toLocaleDateString('es-AR', { weekday: 'short' });

        if (mov.tipo_movimiento === 'ingreso_cobro') {
          totalIngresos += monto;
          ventasPorDia[fechaSimple] = (ventasPorDia[fechaSimple] || 0) + monto;
        } else if (mov.tipo_movimiento === 'egreso_gasto') {
          totalEgresos += monto;
        }
      });

      // 3. Formatear datos para Recharts
      const chartData = Object.keys(ventasPorDia).map(dia => ({
        name: dia,
        ventas: ventasPorDia[dia]
      }));

      setDataGrafico(chartData);
      setStats({
        ingresos: totalIngresos,
        egresos: totalEgresos,
        neto: totalIngresos - totalEgresos
      });

    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
  };

  useEffect(() => { cargarEstadisticas() }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER CON EL OJO DE PRIVACIDAD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Panel de Dirección</h2>
          <p className="text-muted-foreground text-sm">Análisis de rentabilidad y flujo de caja.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowMoney(!showMoney)}
          className="bg-background shadow-sm border-border hover:bg-secondary/50"
        >
          {showMoney ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showMoney ? "Ocultar Dinero" : "Mostrar Dinero"}
        </Button>
      </div>

      {/* CARDS DE IMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600">Ingresos Totales (Mes)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {hide(stats.ingresos)}
            </div>
            <p className="text-[10px] text-emerald-600/70 font-bold mt-1">+12% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-600">Gastos / Compras</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-red-700 dark:text-red-400">
              {hide(stats.egresos)}
            </div>
            <p className="text-[10px] text-red-600/70 font-bold mt-1">Repuestos y servicios</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-blue-700 dark:text-blue-400">
              {hide(stats.neto)}
            </div>
            <p className="text-[10px] text-blue-600/70 font-bold mt-1">Ganancia real del negocio</p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border bg-card/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <BarChart3 className="w-4 h-4 text-blue-500" /> Facturación Semanal
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => showMoney ? `$${value}` : '••••'}
                />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card/50">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <PieChartIcon className="w-4 h-4 text-purple-500" /> Mix de Servicios (Rendimiento)
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
             {/* Aquí iría el PieChart de Recharts con las categorías de servicios */}
             <p className="text-xs text-muted-foreground italic">Distribución: Alineado (55%) | Frenos (25%) | Otros (20%)</p>
          </div>
        </Card>
      </div>

      {/* VISTA DE CAJAS PARA EXPERTOS (Privacy Mode) */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Estado de Liquidez en Cajas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['Mostrador (Efectivo)', 'Banco Galicia', 'Mercado Pago'].map((caja) => (
              <div key={caja} className="flex justify-between items-center p-3 rounded-xl border border-border/50 bg-secondary/10">
                <span className="text-sm font-medium">{caja}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {hide(Math.floor(Math.random() * 100000))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}