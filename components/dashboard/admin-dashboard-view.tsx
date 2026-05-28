"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, 
  BarChart3, Wallet, Landmark, Calendar,
  ArrowUpRight, ArrowDownRight, Activity, CreditCard, Search, ArrowRightLeft, Loader2, Download, Printer, PieChart as PieChartIcon, 
} from "lucide-react"
import { CierreCajaImprimible } from "./impresion-templates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState("kpis") // Control de pestañas
  const [showMoney, setShowMoney] = useState(true)
  const [stats, setStats] = useState({ 
    ingresos: 0, ingresosPrev: 0,
    egresos: 0, egresosPrev: 0,
    neto: 0, netoPrev: 0 
  })
  const [dataGrafico, setDataGrafico] = useState<any[]>([])
  const [cajasReales, setCajasReales] = useState<any[]>([])

  // Estados para el Módulo Fiscal
  const [ivaVentas, setIvaVentas] = useState(0)
  const [ivaCompras, setIvaCompras] = useState("")
  const [gastosPorCategoria, setGastosPorCategoria] = useState<any[]>([])

  // Estado para el Mes Seleccionado (Por defecto: Mes Actual)
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const f = new Date();
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
  });

  // Utilidad para mostrar "MAYO 2026" en los títulos
  const formatearNombreMes = (mesAnio: string) => {
    const [a, m] = mesAnio.split('-');
    return new Date(parseInt(a), parseInt(m) - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // MAGIA: Función interna para calcular la fecha estricta de Argentina
  const obtenerFechaLocal = () => {
    const f = new Date();
    const yyyy = f.getFullYear();
    const mm = String(f.getMonth() + 1).padStart(2, '0');
    const dd = String(f.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Estados para Auditoría Histórica (Usando la nueva fecha local corregida)
  const [fechaHistorial, setFechaHistorial] = useState(obtenerFechaLocal())
  const [movimientosHistoricos, setMovimientosHistoricos] = useState<any[]>([])
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [cierresHistoricos, setCierresHistoricos] = useState<any[]>([])

  // Estados para imprimir
  const [printData, setPrintData] = useState<any>(null)
  const [printType, setPrintType] = useState<'cierre' | null>(null)

  // Función para armar el PDF de un cierre viejo
  const handleDescargarCierre = (cierre: any) => {
    const movsDelCierre = movimientosHistoricos.filter(m => new Date(m.fecha) <= new Date(cierre.fecha_cierre));

    setPrintData({
      ultimoCierre: cierre.fecha_cierre,
      efectivo_esperado: cierre.saldo_esperado_efectivo,
      efectivo_real: cierre.saldo_real_efectivo,
      diferencia: cierre.diferencia,
      transferencias: cierre.total_transferencias,
      tarjetas: cierre.total_tarjetas,
      cheques: cierre.total_cheques,
      notas: cierre.notas,
      movimientos: movsDelCierre,
      usuario: "Auditoría Histórica",
    });
    setPrintType('cierre');

    setTimeout(() => {
      window.print();
      setPrintType(null);
      setPrintData(null);
    }, 500);
  }

  // Función para buscar en la máquina del tiempo (100% Dinámica con el Huso Horario)
  const buscarHistorial = async (fecha: string) => {
    setIsLoadingHistorico(true);
    setFechaHistorial(fecha);
    try {
      // MAGIA: Calculamos el huso horario local de la compu en el formato correcto (ej: "-03:00", "+02:00")
      const offsetMinutos = new Date().getTimezoneOffset();
      const signo = offsetMinutos > 0 ? "-" : "+";
      const horasAbs = String(Math.floor(Math.abs(offsetMinutos) / 60)).padStart(2, '0');
      const minAbs = String(Math.abs(offsetMinutos) % 60).padStart(2, '0');
      const zonaHorariaLocal = `${signo}${horasAbs}:${minAbs}`;

      // Ahora armamos la fecha inyectando la zona horaria dinámica
      const fechaInicio = `${fecha}T00:00:00.000${zonaHorariaLocal}`;
      const fechaFin = `${fecha}T23:59:59.999${zonaHorariaLocal}`;

      const { data: movData } = await supabase
        .from('movimientos_caja')
        .select('*, caja_origen:caja_origen_id(nombre), caja_destino:caja_destino_id(nombre)')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false });

      setMovimientosHistoricos(movData || []);

      const { data: cierresData } = await supabase
        .from('cierres_caja')
        .select('*')
        .gte('fecha_cierre', fechaInicio)
        .lte('fecha_cierre', fechaFin)
        .order('fecha_cierre', { ascending: false });

      setCierresHistoricos(cierresData || []);
    } catch (error) {
      console.error("Error al buscar historial:", error);
    } finally {
      setIsLoadingHistorico(false);
    }
  }

  useEffect(() => {
    if (activeTab === "auditoria") {
      buscarHistorial(fechaHistorial);
    }
  }, [activeTab]);

  const cargarMetricasBI = async () => {
    try {
      const { data: cData } = await supabase.from('cajas').select('*').order('nombre');
      if (cData) setCajasReales(cData);

      // MAGIA: Calculamos el primer y último día del mes seleccionado
      const [añoStr, mesStr] = mesSeleccionado.split('-');
      const año = parseInt(añoStr);
      const mes = parseInt(mesStr) - 1; 

      const fechaInicio = `${mesSeleccionado}-01T00:00:00.000-03:00`;
      const ultimoDia = new Date(año, mes + 1, 0).getDate();
      const fechaFin = `${mesSeleccionado}-${String(ultimoDia).padStart(2,'0')}T23:59:59.999-03:00`;

      // Calculamos el mes ANTERIOR para sacar las flechitas verdes/rojas (Deltas)
      const mesAnt = mes === 0 ? 11 : mes - 1;
      const añoAnt = mes === 0 ? año - 1 : año;
      const strMesAnt = `${añoAnt}-${String(mesAnt + 1).padStart(2,'0')}`;
      const fechaInicioPrev = `${strMesAnt}-01T00:00:00.000-03:00`;
      const ultimoDiaPrev = new Date(añoAnt, mesAnt + 1, 0).getDate();
      const fechaFinPrev = `${strMesAnt}-${String(ultimoDiaPrev).padStart(2,'0')}T23:59:59.999-03:00`;

      const { data: movs } = await supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', fechaInicioPrev)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true });

      if (movs) {
        let ingActual = 0, ingPrev = 0;
        let egrActual = 0, egrPrev = 0;
        const agrupado: any = {};
        const catGastos: any = {};

        movs.forEach((m: any) => {
          const monto = Number(m.monto);
          // Convertimos las fechas a un número para compararlas exactas
          const t = new Date(m.fecha).getTime();
          const esMesActual = t >= new Date(fechaInicio).getTime() && t <= new Date(fechaFin).getTime();
          const esMesPrevio = t >= new Date(fechaInicioPrev).getTime() && t <= new Date(fechaFinPrev).getTime();

          if (m.tipo_movimiento === 'ingreso_cobro') {
            if (esMesActual) {
              ingActual += monto;
              const label = new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
              agrupado[label] = (agrupado[label] || 0) + monto;
            } else if (esMesPrevio) {
              ingPrev += monto;
            }
          } else if (m.tipo_movimiento === 'egreso_gasto') {
            if (esMesActual) {
              egrActual += monto;
              
              // DETECTOR INTELIGENTE DE CATEGORÍAS
              let cat = "Otros";
              if (m.detalle) {
                const detLow = m.detalle.toLowerCase();
                if (m.detalle.includes("Gasto: ")) {
                  cat = m.detalle.split("Gasto: ")[1].trim();
                } else if (detLow.includes("proveedor") || detLow.includes("repuesto") || detLow.includes("insumo") || detLow.includes("fravega")) {
                  cat = "Proveedores e Insumos";
                } else if (detLow.includes("sueldo") || detLow.includes("adelanto") || detLow.includes("empleado")) {
                  cat = "Sueldos y Personal";
                } else if (detLow.includes("luz") || detLow.includes("agua") || detLow.includes("internet") || detLow.includes("epec")) {
                  cat = "Servicios Fijos";
                }
              }
              catGastos[cat] = (catGastos[cat] || 0) + monto;

            } else if (esMesPrevio) {
              egrPrev += monto;
            }
          }
        });

        setStats({
          ingresos: ingActual, ingresosPrev: ingPrev,
          egresos: egrActual, egresosPrev: egrPrev,
          neto: ingActual - egrActual, netoPrev: ingPrev - egrPrev
        });

        setDataGrafico(Object.keys(agrupado).map(k => ({ date: k, valor: agrupado[k] })));
        setGastosPorCategoria(Object.keys(catGastos).map(k => ({ name: k, value: catGastos[k] })));
      }

      // --- IVA VENTAS (Exacto del mes seleccionado) ---
      const { data: facturas } = await supabase
        .from('facturas')
        .select('total_final')
        .gte('created_at', fechaInicio)
        .lte('created_at', fechaFin); 
      
      if (facturas && facturas.length > 0) {
        let totalFacturado = 0;
        facturas.forEach((f: any) => totalFacturado += Number(f.total_final || 0));
        const neto = totalFacturado / 1.21;
        setIvaVentas(totalFacturado - neto);
      } else {
        setIvaVentas(0);
      }
    } catch (e) { console.error(e) }
  }

  // Ahora escucha los cambios: si tocás el mes, se recarga todo instantáneamente
  useEffect(() => { cargarMetricasBI() }, [mesSeleccionado])

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
    <>
      <div className="space-y-6 pb-10 font-sans tracking-tight print:hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="w-5 h-5 text-indigo-600" /> Inteligencia de Negocio
          </h2>
          <p className="text-xs text-slate-500 font-medium">Panel de Control Gerencial</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          
          <div className="flex items-center bg-white border border-slate-200 rounded-md px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
            <input 
              type="month" 
              className="text-sm font-black text-slate-700 focus:outline-none bg-transparent uppercase tracking-wider cursor-pointer"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowMoney(!showMoney)} className="text-slate-600 border-slate-200 w-full sm:w-auto h-9">
            {showMoney ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMoney ? "Modo Seguro" : "Mostrar Valores"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto bg-slate-100/50 p-1 mb-6">
          <TabsTrigger value="kpis" className="text-xs font-bold uppercase tracking-wider py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">Tablero General</TabsTrigger>
          <TabsTrigger value="cajas" className="text-xs font-bold uppercase tracking-wider py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Tesorería (Cajas)</TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs font-bold uppercase tracking-wider py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Auditoría / Reportes</TabsTrigger>
          <TabsTrigger value="gastos" className="text-xs font-bold uppercase tracking-wider py-2.5 data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm">Control de Gastos</TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: TABLERO GENERAL (Lo que ya tenías) */}
        <TabsContent value="kpis" className="space-y-6 animate-in fade-in duration-300">

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
                  {/* @ts-ignore */}
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  {/* @ts-ignore */}
                  <YAxis hide />
                  {/* @ts-ignore */}
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'}}
                    formatter={(v: any) => [formatCifra(v), "Ingreso"]}
                  />
                  {/* @ts-ignore */}
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
    </TabsContent>

        {/* --- BLOQUE 2: BALANCE MENSUAL Y GASTOS --- */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-slate-600"/> Balance Operativo ({formatearNombreMes(mesSeleccionado)})
            </h3>

            {/* 4 TARJETAS DE RENTABILIDAD */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card className="shadow-none border-slate-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                  <div className="text-xl font-mono font-black text-indigo-600">{formatCifra(stats.ingresos)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
                  <div className="text-xl font-mono font-black text-rose-600">{formatCifra(stats.egresos)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200 bg-emerald-50 border-emerald-100">
                <CardContent className="p-4">
                  <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Ganancia Estimada</p>
                  <div className="text-xl font-mono font-black text-emerald-700">{formatCifra(stats.neto)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-slate-200 bg-slate-50">
                <CardContent className="p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Promedio Gasto Diario</p>
                  <div className="text-xl font-mono font-black text-slate-700">{formatCifra(stats.egresos / 30)}</div>
                </CardContent>
              </Card>
            </div>

            {/* GRÁFICO DE GASTOS Y RANKING */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* LA TORTA */}
              <Card className="lg:col-span-2 shadow-none border-slate-200 bg-white">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Distribución de Fugas</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[280px] pt-4">
                  {gastosPorCategoria.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* @ts-ignore */}
                        <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                          {gastosPorCategoria.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'][index % 6]} />
                          ))}
                        </Pie>
                        {/* @ts-ignore */}
                        <Tooltip formatter={(value: any) => formatCifra(Number(value))} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                        {/* @ts-ignore */}
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 uppercase">No hay gastos registrados en este período.</p>
                  )}
                </CardContent>
              </Card>

              {/* LISTA TOP GASTOS */}
              <Card className="shadow-none border-slate-200 bg-slate-50/50 flex flex-col">
                 <CardHeader className="pb-2 border-b border-slate-100 bg-white shrink-0">
                  <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Top Categorías</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  <div className="divide-y divide-slate-100">
                    {gastosPorCategoria.sort((a,b) => b.value - a.value).map((cat, i) => (
                      <div key={i} className="flex justify-between items-center p-4 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: ['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'][i % 6]}}></div>
                          <p className="text-xs font-bold text-slate-700">{cat.name}</p>
                        </div>
                        <p className="text-sm font-mono font-black text-slate-900">{formatCifra(cat.value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        {/* PESTAÑA 3: AUDITORÍA HISTÓRICA */}
        <TabsContent value="auditoria" className="animate-in fade-in duration-300 space-y-4">
          <Card className="shadow-none border-slate-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600"/> Buscador de Movimientos Históricos
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Elegí una fecha para auditar la cinta de operaciones de la caja.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  className="h-9 px-3 rounded-md border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={fechaHistorial} 
                  onChange={(e) => buscarHistorial(e.target.value)} 
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              
              {/* Sección de Cierres de ese día */}
              {cierresHistoricos.length > 0 && (
                <div className="bg-blue-50/50 border-b border-blue-100 p-4">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2"><Printer className="w-4 h-4"/> Reportes de Cierre del Día</h4>
                  <div className="flex gap-2 flex-wrap">
                    {cierresHistoricos.map(cierre => (
                      <Button 
                        key={cierre.id} 
                        variant="outline" 
                        className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100 text-xs"
                        onClick={() => handleDescargarCierre(cierre)}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Descargar Cierre ({new Date(cierre.fecha_cierre).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla de Movimientos */}
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider">Hora</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider">Tipo</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider">Detalle</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider">Método / Caja</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingHistorico ? (
                      <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300"/></TableCell></TableRow>
                    ) : movimientosHistoricos.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium text-sm">No hay registros de movimientos en esta fecha.</TableCell></TableRow>
                    ) : (
                      movimientosHistoricos.map(mov => (
                        <TableRow key={mov.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-slate-500 whitespace-nowrap font-mono text-xs">
                            {new Date(mov.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            {mov.tipo_movimiento === 'ingreso_cobro' ? <Badge className="bg-emerald-100 text-emerald-800 shadow-none hover:bg-emerald-100"><ArrowDownRight className="w-3 h-3 mr-1"/> Ingreso</Badge> :
                             mov.tipo_movimiento === 'transferencia_interna' ? <Badge className="bg-blue-100 text-blue-800 shadow-none hover:bg-blue-100"><ArrowRightLeft className="w-3 h-3 mr-1"/> Interno</Badge> :
                             mov.tipo_movimiento === 'egreso_gasto' ? <Badge className="bg-rose-100 text-rose-800 shadow-none hover:bg-rose-100"><TrendingDown className="w-3 h-3 mr-1"/> Gasto</Badge> :
                             <Badge variant="secondary" className="bg-slate-200 hover:bg-slate-200 text-slate-700">Ajuste</Badge>}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-700">
                            {mov.detalle}
                            {mov.notas && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{mov.notas}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-medium text-xs text-slate-500"><CreditCard className="w-3 h-3"/> {mov.metodo_pago}</div>
                            {mov.caja_destino && mov.tipo_movimiento !== 'egreso_gasto' && <div className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Dest. {mov.caja_destino.nombre}</div>}
                            {mov.caja_origen && mov.tipo_movimiento === 'egreso_gasto' && <div className="text-[9px] text-rose-500/70 mt-1 font-bold uppercase tracking-wider">Sale: {mov.caja_origen.nombre}</div>}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold text-sm ${mov.tipo_movimiento === 'ingreso_cobro' ? 'text-emerald-600' : mov.tipo_movimiento === 'egreso_gasto' ? 'text-rose-600' : 'text-slate-700'}`}>
                            {mov.tipo_movimiento === 'ingreso_cobro' ? '+' : mov.tipo_movimiento === 'egreso_gasto' ? '-' : ''}{formatCifra(Number(mov.monto))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 4: CONTROL DE GASTOS Y POSICIÓN FISCAL */}
        <TabsContent value="gastos" className="animate-in fade-in duration-300 space-y-8">
          
          {/* --- BLOQUE 1: POSICIÓN FISCAL (ARCA/AFIP) --- */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600"/> Posición Fiscal ({formatearNombreMes(mesSeleccionado)})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* TARJETA: IVA VENTAS */}
              <Card className="shadow-none border-slate-200 bg-white">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IVA Ventas (100% Automático)</p>
                  <div className="text-2xl font-mono font-black text-slate-900 mb-1">{formatCifra(ivaVentas)}</div>
                  <p className="text-xs text-slate-500 font-medium">Calculado sobre presupuestos emitidos y cobrados.</p>
                </CardContent>
              </Card>

              {/* TARJETA: IVA COMPRAS (Ingreso Manual) */}
              <Card className="shadow-none border-slate-200 bg-slate-50">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>IVA Compras (Manual)</span>
                    <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Borrador</span>
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      className="w-full pl-7 pr-3 py-2 rounded-md border border-slate-300 text-xl font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-500 bg-white transition-colors"
                      placeholder="0"
                      value={ivaCompras}
                      onChange={(e) => setIvaCompras(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">Sumá el IVA de tus facturas de insumos/repuestos.</p>
                </CardContent>
              </Card>

              {/* TARJETA: SALDO FISCAL (El Semáforo) */}
              <Card className={`shadow-none border-2 transition-colors ${ivaVentas - Number(ivaCompras || 0) > 0 ? 'border-rose-500 bg-rose-50' : 'border-emerald-500 bg-emerald-50'}`}>
                <CardContent className="p-5">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${ivaVentas - Number(ivaCompras || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Saldo a favor de {ivaVentas - Number(ivaCompras || 0) > 0 ? 'ARCA (A Pagar)' : 'Tu Taller'}
                  </p>
                  <div className={`text-3xl font-mono font-black ${ivaVentas - Number(ivaCompras || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatCifra(Math.abs(ivaVentas - Number(ivaCompras || 0)))}
                  </div>
                  <p className={`text-[10px] font-bold mt-2 ${ivaVentas - Number(ivaCompras || 0) > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {ivaVentas - Number(ivaCompras || 0) > 0 ? 'Tenés que liquidar este monto al contador.' : 'Tenés crédito fiscal disponible.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="border-t border-slate-200 my-4"></div>

          {/* --- BLOQUE 2: GASTOS OPERATIVOS --- */}
          <div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600"/> Gastos Operativos ({formatearNombreMes(mesSeleccionado)})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Card className="shadow-none border-slate-200">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Operativo Total</p>
                    <div className="text-3xl font-mono font-black text-rose-600">{formatCifra(stats.egresos)}</div>
                    {renderDelta(stats.egresos, stats.egresosPrev)}
                  </div>
                  <div className="p-4 bg-rose-50 rounded-full shrink-0">
                    <TrendingDown className="w-8 h-8 text-rose-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-none border-slate-200 bg-slate-50">
                 <CardContent className="p-5 flex flex-col justify-center h-full">
                    <p className="text-sm font-black text-slate-800 mb-1">Origen de los datos</p>
                    <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">El total gastado se nutre en tiempo real de todos los retiros registrados como "Egreso/Gasto" desde el mostrador.</p>
                    <Button variant="outline" onClick={() => setActiveTab("auditoria")} className="w-fit text-xs font-bold border-slate-300 text-slate-700 bg-white">
                      <Search className="w-3 h-3 mr-2 text-slate-400"/> Auditar detalles en la Cinta
                    </Button>
                 </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

      </Tabs>
      </div>

      {/* ZONA DE IMPRESIÓN OCULTA (Ahora está AFUERA del print:hidden) */}
      <div className="hidden print:block fixed inset-0 w-full min-h-screen bg-white z-[9999] overflow-visible">
        {printType === 'cierre' && <CierreCajaImprimible datos={printData} />}
      </div>
    </>
  )
}