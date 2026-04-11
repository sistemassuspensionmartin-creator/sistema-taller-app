"use client"

import { CierreCajaImprimible, FacturaImprimible } from "./impresion-templates"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Wallet, ArrowRightLeft, FileText, DollarSign, CreditCard, Landmark, 
  Receipt, Search, Plus, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2, Lock, Printer, Building, Banknote, TrendingDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CajaView({ onNavigateToPresupuesto }: { onNavigateToPresupuesto?: (id: string) => void }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [printType, setPrintType] = useState<'cierre' | 'factura' | null>(null)
  
  const [cajas, setCajas] = useState<any[]>([])
  const [categoriasGasto, setCategoriasGasto] = useState<any[]>([])
  
  // NUEVA ESTRUCTURA DE LISTAS
  const [cuentasPendientes, setCuentasPendientes] = useState<any[]>([])
  const [cuentasCobradas, setCuentasCobradas] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  
  const [ultimoCierre, setUltimoCierre] = useState<any>(null)
  
  // TOTALES DEL TURNO
  const [totalesTurno, setTotalesTurno] = useState({ transferencias: 0, tarjetas: 0, cheques: 0 })
  
  const [busqueda, setBusqueda] = useState("")

  const [isCobrarModalOpen, setIsCobrarModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)
  const [isEgresoModalOpen, setIsEgresoModalOpen] = useState(false)
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false)

  // Estados Cobro
  const [presupuestoACobrar, setPresupuestoACobrar] = useState<any>(null)
  const [montoCobro, setMontoCobro] = useState("")
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [notasCobro, setNotasCobro] = useState("")
  const [bancoOrigen, setBancoOrigen] = useState("")
  const [tipoTarjeta, setTipoTarjeta] = useState("Crédito")
  const [marcaTarjeta, setMarcaTarjeta] = useState("Visa")
  const [bancoTarjeta, setBancoTarjeta] = useState("")

  // Estados Movimiento Interno
  const [cajaOrigen, setCajaOrigen] = useState("")
  const [cajaDestino, setCajaDestino] = useState("")
  const [montoMovimiento, setMontoMovimiento] = useState("")
  const [notasMovimiento, setNotasMovimiento] = useState("")

  // Estados Egreso/Gasto
  const [montoEgreso, setMontoEgreso] = useState("")
  const [categoriaEgreso, setCategoriaEgreso] = useState("")
  const [cajaEgreso, setCajaEgreso] = useState("")
  const [notasEgreso, setNotasEgreso] = useState("")

  // Estados Cierre de Caja
  const [efectivoContado, setEfectivoContado] = useState("")
  const [notasCierre, setNotasCierre] = useState("")
  const [movimientosTurnoCierre, setMovimientosTurnoCierre] = useState<any[]>([])

  // Estado Impresión
  const [printData, setPrintData] = useState<any>(null)

  const cargarDatos = async () => {
    setIsLoading(true)
    try {
      // 1. Cajas y Categorías
      const [{ data: cajasData }, { data: catData }] = await Promise.all([
        supabase.from('cajas').select('*').order('nombre'),
        supabase.from('categorias_gasto').select('*').order('nombre')
      ])
      setCajas(cajasData || [])
      setCategoriasGasto(catData || [])

      // 2. Último Cierre (Marca el inicio del turno)
      const { data: ultimoCierreData } = await supabase
        .from('cierres_caja')
        .select('*')
        .order('fecha_cierre', { ascending: false })
        .limit(1)
        .single()
      
      setUltimoCierre(ultimoCierreData || null)
      const fechaInicio = ultimoCierreData ? ultimoCierreData.fecha_cierre : '2000-01-01T00:00:00Z';

      // 3. Movimientos SOLO DE ESTE TURNO
      const { data: movData } = await supabase
        .from('movimientos_caja')
        .select('*, caja_origen:caja_origen_id(nombre), caja_destino:caja_destino_id(nombre)')
        .gte('fecha', fechaInicio)
        .order('fecha', { ascending: false })
      
      setMovimientos(movData || [])

      // Calcular totales digitales del turno
      let transf = 0, tarj = 0, cheq = 0;
      (movData || []).forEach((m: any) => {
        if (m.tipo_movimiento === 'ingreso_cobro') {
          if (m.metodo_pago === 'Transferencia') transf += Number(m.monto);
          if (m.metodo_pago === 'Tarjeta') tarj += Number(m.monto);
          if (m.metodo_pago === 'Cheque') cheq += Number(m.monto);
        }
      });
      setTotalesTurno({ transferencias: transf, tarjetas: tarj, cheques: cheq });

      // 4. Procesar Presupuestos y Cobros Históricos
      const { data: ordenesData } = await supabase
        .from('ordenes_trabajo')
        .select(`vehiculo_patente, cliente_nombre, presupuestos (*)`)
        .not('presupuesto_id', 'is', null)

      const { data: todosLosPagos } = await supabase
        .from('movimientos_caja')
        .select('presupuesto_id, monto')
        .eq('tipo_movimiento', 'ingreso_cobro')

      const presupuestosUnicos = new Map();

      (ordenesData || []).forEach((orden: any) => {
        const pres = orden.presupuestos;
        if (!pres || presupuestosUnicos.has(pres.id)) return;

        const pagosDeEstePresupuesto = (todosLosPagos || []).filter((p: any) => p.presupuesto_id === pres.id);
        const totalPagado = pagosDeEstePresupuesto.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
        
        const total = Number(pres.total_final || 0);
        const restante = total - totalPagado;

        presupuestosUnicos.set(pres.id, {
          id: pres.id,
          numero: pres.numero_correlativo,
          patente: orden.vehiculo_patente,
          cliente: orden.cliente_nombre || 'Sin registrar',
          total: total,
          pagado: totalPagado,
          restante: restante,
          estado_pago: pres.estado_pago || 'Pendiente',
          estado_facturacion: pres.estado_facturacion || 'No Facturado'
        });
      });

      const procesadas = Array.from(presupuestosUnicos.values());

      const pendientes = procesadas.filter(p => p.restante > 0).sort((a:any, b:any) => b.numero - a.numero);
      const cobradosHoy = procesadas.filter(p => {
        if (p.restante > 0) return false;
        const pagoEnEsteTurno = (movData || []).some((m: any) => m.presupuesto_id === p.id && m.tipo_movimiento === 'ingreso_cobro');
        return pagoEnEsteTurno;
      }).sort((a:any, b:any) => b.numero - a.numero);

      setCuentasPendientes(pendientes);
      setCuentasCobradas(cobradosHoy);

    } catch (error) {
      console.error("Error al cargar la caja:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // Corrección estricta: Solo mostrador
  const cajaMostrador = cajas.find(c => c.nombre.toLowerCase().includes('mostrador'));
  const saldoMostrador = cajaMostrador ? Number(cajaMostrador.saldo || 0) : 0;

  const abrirModalCobro = (cuenta: any) => {
    setPresupuestoACobrar(cuenta);
    setMontoCobro(cuenta.restante.toString());
    setMetodoPago("Efectivo");
    setNotasCobro("");
    setBancoOrigen("");
    setBancoTarjeta("");
    setIsCobrarModalOpen(true);
  }

  const procesarCobro = async () => {
    const monto = parseFloat(montoCobro);
    if (isNaN(monto) || monto <= 0) return alert("Ingrese un monto válido.");
    if (monto > presupuestoACobrar.restante) return alert("El monto supera la deuda restante.");

    setIsSaving(true);
    try {
      let cajaDestinoId = null;
      if (metodoPago === 'Efectivo') cajaDestinoId = cajaMostrador?.id;
      if (metodoPago === 'Transferencia') cajaDestinoId = cajas.find(c => c.nombre.includes('Transferencia'))?.id;
      if (metodoPago === 'Tarjeta') cajaDestinoId = cajas.find(c => c.nombre.includes('Tarjeta'))?.id;
      if (metodoPago === 'Cheque') cajaDestinoId = cajas.find(c => c.nombre.includes('Cheque'))?.id;

      if (!cajaDestinoId && metodoPago !== 'Cuenta Corriente') {
        throw new Error("No se encontró la caja destino para este método de pago. Revise los nombres de las cajas.");
      }

      if (cajaDestinoId) {
        const cajaAfectada = cajas.find(c => c.id === cajaDestinoId);
        const nuevoSaldo = Number(cajaAfectada.saldo || 0) + monto;
        await supabase.from('cajas').update({ saldo: nuevoSaldo }).eq('id', cajaDestinoId);
      }

      let detalleMetodo = "";
      if (metodoPago === 'Transferencia' && bancoOrigen) detalleMetodo = ` [Banco: ${bancoOrigen}]`;
      if (metodoPago === 'Tarjeta') detalleMetodo = ` [${marcaTarjeta} ${tipoTarjeta}${bancoTarjeta ? ' - ' + bancoTarjeta : ''}]`;

      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'ingreso_cobro',
        caja_destino_id: cajaDestinoId,
        monto: monto,
        metodo_pago: metodoPago,
        presupuesto_id: presupuestoACobrar.id,
        detalle: `Cobro PRE-${presupuestoACobrar.numero} (${presupuestoACobrar.patente})${detalleMetodo}`,
        notas: notasCobro
      }]);

      const nuevoRestante = presupuestoACobrar.restante - monto;
      const nuevoEstado = nuevoRestante <= 0 ? 'Cobrado' : 'Parcial';
      
      await supabase.from('presupuestos').update({ estado_pago: nuevoEstado }).eq('id', presupuestoACobrar.id);
      if(nuevoEstado === 'Cobrado') {
          await supabase.from('presupuestos').update({ estado: 'Facturado' }).eq('id', presupuestoACobrar.id);
      }

      alert("¡Cobro registrado con éxito!");
      setIsCobrarModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const procesarMovimientoInterno = async () => {
    const monto = parseFloat(montoMovimiento);
    if (isNaN(monto) || monto <= 0) return alert("Ingrese un monto válido.");
    if (!cajaOrigen || !cajaDestino) return alert("Seleccione caja de origen y destino.");
    if (cajaOrigen === cajaDestino) return alert("La caja de origen y destino no pueden ser la misma.");

    const cajaOrigObj = cajas.find(c => c.id === cajaOrigen);
    if (Number(cajaOrigObj.saldo || 0) < monto) return alert("No hay saldo suficiente en la caja de origen.");

    setIsSaving(true);
    try {
      await supabase.from('cajas').update({ saldo: Number(cajaOrigObj.saldo || 0) - monto }).eq('id', cajaOrigen);
      const cajaDestObj = cajas.find(c => c.id === cajaDestino);
      await supabase.from('cajas').update({ saldo: Number(cajaDestObj.saldo || 0) + monto }).eq('id', cajaDestino);

      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'transferencia_interna',
        caja_origen_id: cajaOrigen,
        caja_destino_id: cajaDestino,
        monto: monto,
        metodo_pago: 'Efectivo',
        detalle: notasMovimiento || "Movimiento interno de fondos"
      }]);

      alert("Movimiento realizado con éxito.");
      setIsMovimientoModalOpen(false);
      setMontoMovimiento("");
      setNotasMovimiento("");
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // --- LÓGICA DE GASTOS Y EGRESOS ---
  const procesarEgreso = async () => {
    const monto = parseFloat(montoEgreso);
    if (isNaN(monto) || monto <= 0) return alert("Ingrese un monto válido.");
    if (!cajaEgreso) return alert("Seleccione de qué caja sale el dinero.");
    if (!categoriaEgreso) return alert("Seleccione una categoría de gasto.");

    const cajaObj = cajas.find(c => c.id === cajaEgreso);
    if (Number(cajaObj.saldo || 0) < monto) return alert("No hay saldo suficiente en la caja seleccionada.");

    setIsSaving(true);
    try {
      // 1. Restar el saldo de la caja seleccionada
      await supabase.from('cajas').update({ saldo: Number(cajaObj.saldo || 0) - monto }).eq('id', cajaEgreso);

      // 2. Anotar en el historial
      const catNombre = categoriasGasto.find(c => c.id === categoriaEgreso)?.nombre || 'Gasto General';
      
      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'egreso_gasto',
        caja_origen_id: cajaEgreso,
        monto: monto,
        metodo_pago: 'Efectivo', // Asumimos efectivo, pero en el futuro se puede extender
        detalle: `Gasto: ${catNombre}`,
        notas: notasEgreso
      }]);

      alert("Egreso registrado con éxito.");
      setIsEgresoModalOpen(false);
      setMontoEgreso("");
      setNotasEgreso("");
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const abrirModalCierre = async () => {
    setIsSaving(true);
    try {
      const fechaInicio = ultimoCierre ? ultimoCierre.fecha_cierre : '2000-01-01T00:00:00Z';
      const { data: movsDesdeCierre } = await supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', fechaInicio)
        .order('fecha', { ascending: true }); 

      setMovimientosTurnoCierre(movsDesdeCierre || []);
      setEfectivoContado(saldoMostrador.toString()); 
      setNotasCierre("");
      setIsCierreModalOpen(true);
    } catch (err) {
      alert("Error al calcular datos.");
    } finally {
      setIsSaving(false);
    }
  }

  const procesarCierre = async () => {
    const real = parseFloat(efectivoContado);
    if (isNaN(real) || real < 0) return alert("Ingrese un monto real válido.");

    const diferencia = real - saldoMostrador;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('cierres_caja').insert([{
        saldo_esperado_efectivo: saldoMostrador,
        saldo_real_efectivo: real,
        diferencia: diferencia,
        total_tarjetas: totalesTurno.tarjetas,
        total_transferencias: totalesTurno.transferencias,
        total_cheques: totalesTurno.cheques,
        notas: notasCierre
      }]);

      if (error) throw new Error("No se pudo guardar el reporte de cierre.");

      if (diferencia !== 0) {
        await supabase.from('cajas').update({ saldo: real }).eq('id', cajaMostrador?.id);
        await supabase.from('movimientos_caja').insert([{
          tipo_movimiento: diferencia > 0 ? 'ajuste_sobrante' : 'ajuste_faltante',
          caja_destino_id: cajaMostrador?.id,
          monto: Math.abs(diferencia),
          metodo_pago: 'Efectivo',
          detalle: `Ajuste automático por cierre de caja. ${diferencia > 0 ? 'Sobrante' : 'Faltante'}.`
        }]);
      }

      setPrintData({
        ultimoCierre: ultimoCierre?.fecha_cierre || null,
        efectivo_esperado: saldoMostrador,
        efectivo_real: real,
        diferencia: diferencia,
        transferencias: totalesTurno.transferencias,
        tarjetas: totalesTurno.tarjetas,
        cheques: totalesTurno.cheques,
        notas: notasCierre,
        movimientos: movimientosTurnoCierre
      });

      alert("¡Caja cerrada! Preparando el comprobante PDF...");
      setIsCierreModalOpen(false);
      cargarDatos(); 

      setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 500);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const marcarComoFacturado = async (id: string, numero: string) => {
    if(!confirm(`¿Desea emitir la factura electrónica para el presupuesto PRE-${numero}?`)) return;

    setIsSaving(true);
    try {
      // 1. Buscamos los datos completos del presupuesto para la factura
      const { data: presFull } = await supabase
        .from('presupuestos')
        .select('*, vehiculos(*, clientes(*)), presupuesto_items(*)')
        .eq('id', id)
        .single();

      // 2. Llamamos a nuestra API Simuladora de AFIP
      const response = await fetch('/api/afip/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: '20123456789', monto: presFull.total_final })
      });
      const afipData = await response.json();

      if (!afipData.success) throw new Error("AFIP rechazó el comprobante");

      // 3. Guardamos la factura en nuestra base de datos (Tabla que creamos antes)
      const { data: facturaGuardada } = await supabase.from('facturas').insert([{
        presupuesto_id: id,
        tipo_factura: 'B', // Por defecto para pruebas
        punto_venta: afipData.punto_venta,
        numero_factura: afipData.numero_factura,
        cae: afipData.cae,
        cae_vencimiento: afipData.cae_vencimiento,
        total_final: presFull.total_final,
        es_simulacion: true
      }]).select().single();

      // 4. Cambiamos el estado en el presupuesto
      await supabase.from('presupuestos').update({ estado_facturacion: 'Facturado' }).eq('id', id);
      
      // 5. PREPARAMOS EL PDF (Usamos la plantilla legal que creamos)
      const datosParaFactura = {
        ...facturaGuardada,
        config: cajas[0]?.id ? { nombre_taller: 'Suspensión Martin', cuit: '20-12345678-9', direccion: 'Av. Argentina 1658' } : {}, // Aquí iría tu config real
        cliente_nombre: presFull.vehiculos?.clientes?.nombre + ' ' + presFull.vehiculos?.clientes?.apellido,
        cliente_documento: presFull.vehiculos?.clientes?.documento,
        items: presFull.presupuesto_items,
        fecha_emision: new Date().toISOString()
      };

      setPrintData(datosParaFactura);
      setPrintType('factura'); // Necesitamos este nuevo estado

      alert("¡Factura autorizada por AFIP!");
      cargarDatos();

      setTimeout(() => {
        window.print();
        setPrintData(null);
        setPrintType(null);
      }, 500);

    } catch (err: any) {
      alert("Error en facturación: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const filtrarLista = (lista: any[]) => {
    return lista.filter(c => 
      c.patente?.includes(busqueda.replace(/\s/g, "").toUpperCase()) || 
      c.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.numero?.toString().includes(busqueda)
    );
  }

  return (
    <>
      <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-300 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Tablero de Turno (Mostrador)</h2>
            <p className="text-sm text-muted-foreground">Gestión ágil de cobros y caja diaria.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* NUEVO BOTÓN DE GASTOS */}
            <Button onClick={() => setIsEgresoModalOpen(true)} variant="outline" className="border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              <TrendingDown className="mr-2 h-4 w-4" /> Registrar Gasto
            </Button>
            <Button onClick={() => setIsMovimientoModalOpen(true)} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Movimiento Interno
            </Button>
            <Button onClick={abrirModalCierre} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg">
              <Lock className="mr-2 h-4 w-4" /> Cierre de Caja
            </Button>
          </div>
        </div>

        {/* 4 TARJETAS DEL DÍA A DÍA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <Card className="border-border shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1 uppercase tracking-wider">Efectivo Cajón</p>
                  <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
                    ${saldoMostrador.toLocaleString()}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-lg"><Wallet className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">Transf. Turno</p>
                  <h3 className="text-2xl font-black text-foreground font-mono">
                    ${totalesTurno.transferencias.toLocaleString()}
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Building className="h-4 w-4 text-blue-600" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-orange-600 mb-1 uppercase tracking-wider">Tarjetas Turno</p>
                  <h3 className="text-2xl font-black text-foreground font-mono">
                    ${totalesTurno.tarjetas.toLocaleString()}
                  </h3>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><CreditCard className="h-4 w-4 text-orange-600" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-purple-600 mb-1 uppercase tracking-wider">Cheques Turno</p>
                  <h3 className="text-2xl font-black text-foreground font-mono">
                    ${totalesTurno.cheques.toLocaleString()}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><Banknote className="h-4 w-4 text-purple-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PESTAÑAS DEL TURNO */}
        <Tabs defaultValue="pendientes" className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-2">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-secondary/30 h-11 border border-border/50">
              <TabsTrigger value="pendientes" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">A Cobrar</TabsTrigger>
              <TabsTrigger value="cobrados" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Cobrados Hoy</TabsTrigger>
              <TabsTrigger value="movimientos" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Movimientos Turno</TabsTrigger>
            </TabsList>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar patente..." className="pl-9 h-10 bg-background shadow-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>
          
          {/* PESTAÑA A: PENDIENTES */}
          <TabsContent value="pendientes" className="flex-1 flex flex-col min-h-0 border border-border rounded-xl shadow-sm bg-card mt-0">
            <div className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader className="bg-secondary/20 sticky top-0 backdrop-blur-sm shadow-sm">
                  <TableRow>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Vehículo / Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right text-emerald-600">Pagado</TableHead>
                    <TableHead className="text-right text-red-500">Falta Cobrar</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-secondary/30 animate-pulse rounded"></div></TableCell></TableRow>
                    ))
                  ) : filtrarLista(cuentasPendientes).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No hay vehículos con deudas pendientes.</TableCell></TableRow>
                  ) : (
                    filtrarLista(cuentasPendientes).map(cuenta => (
                      <TableRow key={cuenta.id} className="hover:bg-secondary/20 transition-colors">
                        <TableCell 
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          onClick={() => onNavigateToPresupuesto && onNavigateToPresupuesto(cuenta.id)}
                          title="Ir al detalle del presupuesto"
                        >
                          PRE-{cuenta.numero}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold tracking-widest uppercase">{cuenta.patente}</div>
                          <div className="text-xs text-muted-foreground">{cuenta.cliente}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">${cuenta.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600 font-bold">${cuenta.pagado.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500 text-lg">${cuenta.restante.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => abrirModalCobro(cuenta)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            <DollarSign className="w-4 h-4 mr-1" /> Cobrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PESTAÑA B: COBRADOS HOY */}
          <TabsContent value="cobrados" className="flex-1 flex flex-col min-h-0 border border-border rounded-xl shadow-sm bg-card mt-0">
            <div className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader className="bg-secondary/20 sticky top-0 backdrop-blur-sm shadow-sm">
                  <TableRow>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Vehículo / Cliente</TableHead>
                    <TableHead className="text-right">Total Cobrado</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Facturación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrarLista(cuentasCobradas).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                      <p className="italic">No hay presupuestos terminados de cobrar en este turno.</p>
                      <p className="text-xs opacity-70 mt-1">Se limpia automáticamente en cada cierre de caja.</p>
                    </TableCell></TableRow>
                  ) : (
                    filtrarLista(cuentasCobradas).map(cuenta => (
                      <TableRow key={cuenta.id} className="hover:bg-secondary/20 transition-colors bg-emerald-50/10">
                        <TableCell 
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          onClick={() => onNavigateToPresupuesto && onNavigateToPresupuesto(cuenta.id)}
                          title="Ir al detalle del presupuesto"
                        >
                          PRE-{cuenta.numero}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold tracking-widest uppercase">{cuenta.patente}</div>
                          <div className="text-xs text-muted-foreground">{cuenta.cliente}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700">${cuenta.total.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Pagado Hoy</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button size="sm" variant={cuenta.estado_facturacion === 'Facturado' ? "secondary" : "outline"} disabled={cuenta.estado_facturacion === 'Facturado'} onClick={() => marcarComoFacturado(cuenta.id, cuenta.numero)} className={cuenta.estado_facturacion !== 'Facturado' ? "border-blue-200 text-blue-700 hover:bg-blue-50" : ""}>
                            {cuenta.estado_facturacion === 'Facturado' ? <><CheckCircle2 className="w-4 h-4 mr-1"/> Facturado</> : <><Receipt className="w-4 h-4 mr-1" /> Facturar</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PESTAÑA C: MOVIMIENTOS */}
          <TabsContent value="movimientos" className="flex-1 flex flex-col min-h-0 border border-border rounded-xl shadow-sm bg-card mt-0">
            <div className="flex-1 overflow-y-auto p-0">
              <Table>
                <TableHeader className="bg-secondary/20 sticky top-0 shadow-sm">
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Método / Caja</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                        {new Date(mov.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        {mov.tipo_movimiento === 'ingreso_cobro' ? <Badge className="bg-emerald-100 text-emerald-800 shadow-none"><ArrowDownRight className="w-3 h-3 mr-1"/> Ingreso</Badge> :
                         mov.tipo_movimiento === 'transferencia_interna' ? <Badge className="bg-blue-100 text-blue-800 shadow-none"><ArrowRightLeft className="w-3 h-3 mr-1"/> Interno</Badge> :
                         mov.tipo_movimiento === 'egreso_gasto' ? <Badge className="bg-red-100 text-red-800 shadow-none"><TrendingDown className="w-3 h-3 mr-1"/> Gasto</Badge> :
                         <Badge variant="destructive">Ajuste</Badge>}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {mov.detalle}
                        {mov.notas && <span className="block text-xs text-muted-foreground font-normal mt-0.5 italic">{mov.notas}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium text-sm text-muted-foreground"><CreditCard className="w-3 h-3"/> {mov.metodo_pago}</div>
                        {mov.caja_destino && mov.tipo_movimiento !== 'egreso_gasto' && <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Destino: {mov.caja_destino.nombre}</div>}
                        {mov.caja_origen && mov.tipo_movimiento === 'egreso_gasto' && <div className="text-[10px] text-red-600/70 mt-0.5 font-bold uppercase tracking-wider">Salió de: {mov.caja_origen.nombre}</div>}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${mov.tipo_movimiento === 'ingreso_cobro' ? 'text-emerald-600' : mov.tipo_movimiento === 'egreso_gasto' ? 'text-red-600' : 'text-foreground'}`}>
                        {mov.tipo_movimiento === 'ingreso_cobro' ? '+' : mov.tipo_movimiento === 'egreso_gasto' ? '-' : ''}${Number(mov.monto).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimientos.length === 0 && !isLoading && (
                    <TableRow><TableCell colSpan={5} className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mb-2 opacity-20" />
                      <p className="italic">La cinta auditora está limpia. Aún no registraste movimientos en este turno.</p>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* --- MODAL DE EGRESOS / GASTOS --- */}
        <Dialog open={isEgresoModalOpen} onOpenChange={setIsEgresoModalOpen}>
          <DialogContent className="max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-red-700 dark:text-red-500">
                <TrendingDown className="w-6 h-6" /> Registrar Gasto / Egreso
              </DialogTitle>
              <DialogDescription>Asigná el motivo y de dónde sale el dinero físico o digital.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoría del Gasto</Label>
                <Select value={categoriaEgreso} onValueChange={setCategoriaEgreso}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar categoría..."/></SelectTrigger>
                  <SelectContent>
                    {categoriasGasto.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>¿De qué caja sale el dinero?</Label>
                <Select value={cajaEgreso} onValueChange={setCajaEgreso}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Caja de origen..."/></SelectTrigger>
                  <SelectContent>
                    {cajas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre} (Disp: ${Number(c.saldo).toLocaleString()})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monto a Pagar ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12 border-red-300 ring-red-500 focus-visible:ring-red-500" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Detalle o Factura (Opcional)</Label>
                <Input placeholder="Ej: Compra de focos Fravega Fra. 001..." value={notasEgreso} onChange={(e) => setNotasEgreso(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEgresoModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={procesarEgreso} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Confirmar Egreso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- MODAL DE COBRO --- */}
        <Dialog open={isCobrarModalOpen} onOpenChange={setIsCobrarModalOpen}>
          <DialogContent className="max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                <DollarSign className="w-6 h-6" /> Registrar Pago
              </DialogTitle>
            </DialogHeader>

            {presupuestoACobrar && (
              <div className="space-y-4 py-4">
                <div className="bg-secondary/30 p-3 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Patente</p>
                    <p className="font-mono font-bold text-lg">{presupuestoACobrar.patente}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Resta Cobrar</p>
                    <p className="font-mono font-bold text-xl text-red-500">${presupuestoACobrar.restante.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monto a Cobrar ($)</Label>
                  <Input type="number" className="text-lg font-mono font-bold h-12 border-emerald-300 ring-emerald-500 focus-visible:ring-emerald-500" value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} autoFocus />
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo (Va a Mostrador)</SelectItem>
                      <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta Débito/Crédito</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cuenta Corriente">Cuenta Corriente (Deuda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {metodoPago === 'Transferencia' && (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <Label className="text-xs font-bold uppercase text-blue-600">Banco de Origen (Cliente)</Label>
                    <Input placeholder="Ej: Banco Galicia, MercadoPago..." value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} />
                  </div>
                )}

                {metodoPago === 'Tarjeta' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-emerald-600">Tipo</Label>
                      <Select value={tipoTarjeta} onValueChange={setTipoTarjeta}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Crédito">Crédito</SelectItem>
                          <SelectItem value="Débito">Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-emerald-600">Marca</Label>
                      <Select value={marcaTarjeta} onValueChange={setMarcaTarjeta}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visa">Visa</SelectItem>
                          <SelectItem value="Mastercard">Mastercard</SelectItem>
                          <SelectItem value="Amex">Amex</SelectItem>
                          <SelectItem value="Otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase text-emerald-600">Banco Emisor</Label>
                      <Input placeholder="Ej: Santander, BBVA..." value={bancoTarjeta} onChange={(e) => setBancoTarjeta(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label>Notas Adicionales (Opcional)</Label>
                  <Input placeholder="Ej: Seña del 50%..." value={notasCobro} onChange={(e) => setNotasCobro(e.target.value)} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCobrarModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={procesarCobro} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Confirmar Cobro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- MODAL MOVIMIENTO INTERNO --- */}
        <Dialog open={isMovimientoModalOpen} onOpenChange={setIsMovimientoModalOpen}>
          <DialogContent className="max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-blue-700 dark:text-blue-500">
                <ArrowRightLeft className="w-6 h-6" /> Movimiento Interno
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Extraer De:</Label>
                  <Select value={cajaOrigen} onValueChange={setCajaOrigen}>
                    <SelectTrigger><SelectValue placeholder="Origen..."/></SelectTrigger>
                    <SelectContent>
                      {cajas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Depositar En:</Label>
                  <Select value={cajaDestino} onValueChange={setCajaDestino}>
                    <SelectTrigger><SelectValue placeholder="Destino..."/></SelectTrigger>
                    <SelectContent>
                      {cajas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto a Mover ($)</Label>
                <Input type="number" className="text-lg font-mono font-bold h-12" value={montoMovimiento} onChange={(e) => setMontoMovimiento(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Motivo / Observaciones</Label>
                <Input placeholder="Ej: Retiro para depositar en Banco..." value={notasMovimiento} onChange={(e) => setNotasMovimiento(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsMovimientoModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={procesarMovimientoInterno} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Transferir Fondos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- MODAL CIERRE DE CAJA --- */}
        <Dialog open={isCierreModalOpen} onOpenChange={setIsCierreModalOpen}>
          <DialogContent className="max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Lock className="w-6 h-6" /> Cierre de Caja Diario
              </DialogTitle>
              <DialogDescription>
                Auditoría desde el último cierre: {ultimoCierre?.fecha_cierre ? new Date(ultimoCierre.fecha_cierre).toLocaleString('es-AR') : 'Nunca'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              
              <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-1">Reporte de Medios Digitales</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Transferencias procesadas:</span><span className="font-mono font-bold">${totalesTurno.transferencias.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tarjetas procesadas:</span><span className="font-mono font-bold">${totalesTurno.tarjetas.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cheques recibidos:</span><span className="font-mono font-bold">${totalesTurno.cheques.toLocaleString()}</span></div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base text-muted-foreground">Saldo Esperado en Sistema:</Label>
                  <span className="text-xl font-mono font-bold text-foreground">${saldoMostrador.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-emerald-700 dark:text-emerald-400 font-bold">Dinero Físico Real (Billetes contados):</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 font-mono font-bold text-muted-foreground">$</span>
                    <Input type="number" className="pl-7 text-2xl font-mono font-bold h-14 bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} autoFocus />
                  </div>
                </div>

                {efectivoContado !== "" && parseFloat(efectivoContado) !== saldoMostrador && (
                  <div className={`p-3 rounded-lg flex justify-between items-center font-bold ${parseFloat(efectivoContado) > saldoMostrador ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                    <span>{parseFloat(efectivoContado) > saldoMostrador ? 'Sobrante detectado:' : 'Faltante detectado:'}</span>
                    <span className="font-mono">${Math.abs(parseFloat(efectivoContado) - saldoMostrador).toLocaleString()}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label>Observaciones del Cierre</Label>
                  <Input placeholder="Ej: Faltan $100 de un vuelto no cobrado..." value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)} />
                </div>
              </div>

            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCierreModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={procesarCierre} disabled={isSaving || !efectivoContado} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Printer className="w-4 h-4 mr-2"/>} Cerrar e Imprimir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ZONA DE IMPRESIÓN */}
      <div className="hidden print:block fixed inset-0 w-full min-h-screen bg-white z-[9999] overflow-visible">
        {printType === 'cierre' && <CierreCajaImprimible datos={printData} />}
        {printType === 'factura' && <FacturaImprimible datos={printData} />}
      </div>
    </>
  )
}