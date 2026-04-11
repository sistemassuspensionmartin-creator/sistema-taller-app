"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, 
  BarChart3, Wallet, Landmark, Calendar,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

export function AdminDashboardView() {
  const [showMoney, setShowMoney] = useState(true)
  const [stats, setStats] = useState({ 
    ingresos: 0, ingresosPrev: 0,
    egresos: 0, egresosPrev: 0,
    neto: 0, netoPrev: 0 
  })
  const [dataGrafico, setDataGrafico] = useState<any[]>([])
  const [cajasReales, setCajasReales] = useState<any[]>([])

  const cargarMetricasBI = async () => {
    try {
      // 1. Traer Cajas
      const { data: cData } = await supabase.from('cajas').select('*').order('nombre');
      if (cData) setCajasReales(cData);

      // 2. Traer Movimientos (Últimos 60 días para comparar)
      const hoy = new Date();
      const hace60 = new Date(); hace60.setDate(hoy.getDate() - 60);
      const hace30 = new Date(); hace30.setDate(hoy.getDate() - 30);

      const { data: movs } = await supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', hace60.toISOString())
        .order('fecha', { ascending: true });

      if (movs) {
        let ingActual = 0, ingPrev = 0;
        let egrActual = 0, egrPrev = 0;
        const agrupado: any = {};

        movs.forEach(m => {
          const monto = Number(m.monto);
          const fechaM = new Date(m.fecha);
          const esMesActual = fechaM >= hace30;

          if (m.tipo_movimiento === 'ingreso_cobro') {
            if (esMesActual) {
              ingActual += monto;
              const label = fechaM.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
              agrupado[label] = (agrupado[label] || 0) + monto;
            } else {
              ingPrev += monto;
            }
          } else if (m.tipo_movimiento === 'egreso_gasto') {
            if (esMesActual) egrActual += monto;
            else egrPrev += monto;
          }
        });

        setStats({
          ingresos: ingActual, ingresosPrev: ingPrev,
          egresos: egrActual, egresosPrev: egrPrev,
          neto: ingActual - egrActual, netoPrev: ingPrev - egrPrev
        });

        setDataGrafico(Object.keys(agrupado).map(k => ({ date: k, valor: agrupado[k] })));
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { cargarMetricasBI() }, [])

  const calcularDelta = (actual: number, prev: number) => {
    if (prev === 0) return 0;
    return ((actual - prev) / prev) * 100;
  };

  const formatCifra = (v: number) => showMoney ? `$${v.toLocaleString('es-AR')}` : "••••••";

  const renderDelta = (actual: number, prev: number) => {
    const delta = calcularDelta(actual, prev);
    const isPos = delta >= 0;
    return (
      <div className={`flex items-center gap-1 text-[11px] font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(delta).toFixed(1)}% vs mes anterior
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 font-sans tracking-tight">
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="w-5 h-5 text-indigo-600" /> Inteligencia de Negocio
          </h2>
          <p className="text-xs text-slate-500 font-medium">Reporte consolidado: {new Date().toLocaleDateString()}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowMoney(!showMoney)} className="text-slate-400 hover:text-indigo-600">
          {showMoney ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showMoney ? "Modo Auditor" : "Mostrar Valores"}
        </Button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Ventas Netas", val: stats.ingresos, prev: stats.ingresosPrev, color: "indigo" },
          { label: "Egresos Operativos", val: stats.egresos, prev: stats.egresosPrev, color: "rose" },
          { label: "Margen de Caja", val: stats.neto, prev: stats.netoPrev, color: "slate" },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-none border-slate-100 bg-white">
            <CardContent className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <div className="text-2xl font-mono font-black text-slate-900 mb-2">{formatCifra(kpi.val)}</div>
              {renderDelta(kpi.val, kpi.prev)}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* GRÁFICO TÉCNICO */}
        <Card className="lg:col-span-3 shadow-none border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Curva de Ingresos (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataGrafico}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'}}
                    formatter={(v: any) => [formatCifra(v), "Ingreso"]}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ESTRUCTURA DE ACTIVOS */}
        <Card className="shadow-none border-slate-100 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Distribución de Activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cajasReales.map(c => (
              <div key={c.id} className="border-b border-white pb-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase">{c.nombre}</p>
                <p className="text-sm font-mono font-black text-slate-800">{formatCifra(c.saldo)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}