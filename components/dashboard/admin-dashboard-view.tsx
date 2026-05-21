"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, 
  BarChart3, Wallet, Landmark, Calendar,
  ArrowUpRight, ArrowDownRight, Activity, CreditCard, Search, ArrowRightLeft, Loader2, Download, Printer
} from "lucide-react"
import { CierreCajaImprimible } from "./impresion-templates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar
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

  // Estados para Auditoría Histórica
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0])
  const [movimientosHistoricos, setMovimientosHistoricos] = useState<any[]>([])
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [cierresHistoricos, setCierresHistoricos] = useState<any[]>([])

  // Estados para imprimir
  const [printData, setPrintData] = useState<any>(null)
  const [printType, setPrintType] = useState<'cierre' | null>(null)

  // Función para armar el PDF de un cierre viejo
  const handleDescargarCierre = (cierre: any) => {
    // Filtramos los movimientos que ocurrieron ANTES o en el mismo momento de este cierre puntual
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

    // Le damos medio segundo a React para que dibuje el PDF oculto y mandamos a imprimir
    setTimeout(() => {
      window.print();
      setPrintType(null);
      setPrintData(null);
    }, 500);
  }

  // Función para buscar en la máquina del tiempo
  const buscarHistorial = async (fecha: string) => {
    setIsLoadingHistorico(true);
    setFechaHistorial(fecha);
    try {
      const fechaInicio = `${fecha}T00:00:00.000Z`;
      const fechaFin = `${fecha}T23:59:59.999Z`;

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

        movs.forEach((m: any) => {
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
    <div className="space-y-6 pb-10 font-sans tracking-tight print:hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="w-5 h-5 text-indigo-600" /> Inteligencia de Negocio
          </h2>
          <p className="text-xs text-slate-500 font-medium">Panel de Control Gerencial</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => setShowMoney(!showMoney)} className="text-slate-600 border-slate-200 w-full sm:w-auto">
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

        {/* PESTAÑA 2: TESORERÍA (Las cajas más grandes) */}
        <TabsContent value="cajas" className="animate-in fade-in duration-300 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cajasReales.map(c => (
              <Card key={c.id} className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600"/> {c.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-mono font-black text-slate-900">{formatCifra(c.saldo)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Saldo actual</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

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

        {/* PESTAÑA 4: GASTOS (Esqueleto preparado) */}
        <TabsContent value="gastos" className="animate-in fade-in duration-300">
          <Card className="shadow-none border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingDown className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">Módulo en construcción</h3>
              <p className="text-sm text-slate-500 max-w-md">Próximamente podrás ver un desglose automático de todos los egresos del taller agrupados por categoría (Sueldos, Insumos, Impuestos) para controlar fugas de capital.</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      {/* ZONA DE IMPRESIÓN OCULTA */}
      <div className="hidden print:block fixed inset-0 w-full min-h-screen bg-white z-[9999] overflow-visible">
        {printType === 'cierre' && <CierreCajaImprimible datos={printData} />}
      </div>
    </div>
  )
}