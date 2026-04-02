"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Wallet, ArrowRightLeft, FileText, DollarSign, CreditCard, Landmark, 
  Receipt, Search, Plus, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2 
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

export function CajaView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [cajas, setCajas] = useState<any[]>([])
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  
  const [busqueda, setBusqueda] = useState("")

  // Modales
  const [isCobrarModalOpen, setIsCobrarModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)

  // Estados para Cobrar
  const [presupuestoACobrar, setPresupuestoACobrar] = useState<any>(null)
  const [montoCobro, setMontoCobro] = useState("")
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [notasCobro, setNotasCobro] = useState("")

  // Estados para Movimiento Interno
  const [cajaOrigen, setCajaOrigen] = useState("")
  const [cajaDestino, setCajaDestino] = useState("")
  const [montoMovimiento, setMontoMovimiento] = useState("")
  const [notasMovimiento, setNotasMovimiento] = useState("")

  const cargarDatos = async () => {
    setIsLoading(true)
    try {
      // 1. Cargar Cajas
      const { data: cajasData } = await supabase.from('cajas').select('*').order('nombre')
      setCajas(cajasData || [])

      // 2. Cargar Movimientos Recientes
      const { data: movData } = await supabase
        .from('movimientos_caja')
        .select('*, caja_origen:caja_origen_id(nombre), caja_destino:caja_destino_id(nombre)')
        .order('fecha', { ascending: false })
        .limit(50)
      setMovimientos(movData || [])

      // 3. Cargar Autos y Pagos cruzados
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes_trabajo')
        .select(`vehiculo_patente, cliente_nombre, presupuestos (*)`)
        .not('presupuesto_id', 'is', null)

      if (ordenesError) throw ordenesError;

      const { data: pagosData, error: pagosError } = await supabase
        .from('movimientos_caja')
        .select('presupuesto_id, monto')
        .eq('tipo_movimiento', 'ingreso_cobro')

      if (pagosError) throw pagosError;

      // ELIMINADOR DE DUPLICADOS: Usamos un Map para que cada presupuesto pase una sola vez
      const presupuestosUnicos = new Map();

      (ordenesData || []).forEach((orden: any) => {
        const pres = orden.presupuestos;
        
        // Si el presupuesto no existe, o ya lo metimos en la lista, lo ignoramos
        if (!pres || presupuestosUnicos.has(pres.id)) return;

        const pagosDeEstePresupuesto = (pagosData || []).filter((p: any) => p.presupuesto_id === pres.id);
        const totalPagado = pagosDeEstePresupuesto.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
        
        const total = Number(pres.total_final || 0);
        const restante = total - totalPagado;

        // Lo guardamos en el Map con su ID como llave
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

      // Convertimos el Map de vuelta a un Array y lo ordenamos
      const procesadas = Array.from(presupuestosUnicos.values());
      setCuentasPorCobrar(procesadas.sort((a: any, b: any) => b.restante - a.restante))

    } catch (error) {
      console.error("Error al cargar la caja:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  const cajaMostrador = cajas.find(c => c.tipo === 'operativa');
  const saldoMostrador = cajaMostrador ? Number(cajaMostrador.saldo || 0) : 0;
  const saldoGeneral = cajas.filter(c => c.tipo !== 'operativa').reduce((acc, c) => acc + Number(c.saldo || 0), 0);

  const abrirModalCobro = (cuenta: any) => {
    setPresupuestoACobrar(cuenta);
    setMontoCobro(cuenta.restante.toString());
    setMetodoPago("Efectivo");
    setNotasCobro("");
    setIsCobrarModalOpen(true);
  }

  const procesarCobro = async () => {
    const monto = parseFloat(montoCobro);
    if (isNaN(monto) || monto <= 0) return alert("Ingrese un monto válido.");
    if (monto > presupuestoACobrar.restante) return alert("El monto supera la deuda restante.");

    setIsSaving(true);
    try {
      let cajaDestinoId = null;
      if (metodoPago === 'Efectivo') cajaDestinoId = cajas.find(c => c.nombre === 'Caja Mostrador')?.id;
      if (metodoPago === 'Transferencia') cajaDestinoId = cajas.find(c => c.nombre === 'Caja Transferencia')?.id;
      if (metodoPago === 'Tarjeta') cajaDestinoId = cajas.find(c => c.nombre === 'Caja Tarjeta')?.id;
      if (metodoPago === 'Cheque') cajaDestinoId = cajas.find(c => c.nombre === 'Caja Cheque')?.id;

      if (!cajaDestinoId && metodoPago !== 'Cuenta Corriente') {
        throw new Error("No se encontró la caja destino para este método de pago.");
      }

      // 1. Registrar el Pago
      const { error: errorPago } = await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'ingreso_cobro',
        caja_destino_id: cajaDestinoId,
        monto: monto,
        metodo_pago: metodoPago,
        presupuesto_id: presupuestoACobrar.id,
        detalle: `Cobro PRE-${presupuestoACobrar.numero} (${presupuestoACobrar.patente})`,
        notas: notasCobro
      }]);
      if (errorPago) throw errorPago;

      // 2. Sumar el saldo a la Caja con ALARMA de error
      if (cajaDestinoId) {
        const cajaAfectada = cajas.find(c => c.id === cajaDestinoId);
        const nuevoSaldo = Number(cajaAfectada.saldo || 0) + monto;
        
        const { error: updateCajaError } = await supabase.from('cajas').update({ saldo: nuevoSaldo }).eq('id', cajaDestinoId);
        if (updateCajaError) throw new Error("No se pudo sumar el saldo a la caja. Verifique los permisos.");
      }

      // 3. Actualizar el estado del Presupuesto
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
      alert("Error al registrar el cobro: " + err.message);
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
      const { error: errorMov } = await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'transferencia_interna',
        caja_origen_id: cajaOrigen,
        caja_destino_id: cajaDestino,
        monto: monto,
        metodo_pago: 'Efectivo',
        detalle: notasMovimiento || "Movimiento interno de fondos"
      }]);
      if (errorMov) throw errorMov;

      const { error: errorOrigen } = await supabase.from('cajas').update({ saldo: Number(cajaOrigObj.saldo || 0) - monto }).eq('id', cajaOrigen);
      if (errorOrigen) throw errorOrigen;

      const cajaDestObj = cajas.find(c => c.id === cajaDestino);
      const { error: errorDestino } = await supabase.from('cajas').update({ saldo: Number(cajaDestObj.saldo || 0) + monto }).eq('id', cajaDestino);
      if (errorDestino) throw errorDestino;

      alert("Movimiento realizado con éxito.");
      setIsMovimientoModalOpen(false);
      setMontoMovimiento("");
      setNotasMovimiento("");
      cargarDatos();
    } catch (err: any) {
      alert("Error al procesar el movimiento: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const marcarComoFacturado = async (id: string, numero: string) => {
    if(!confirm(`¿Confirmás que el presupuesto PRE-${numero} fue facturado?\n\nEsta acción es solo a nivel registro y no se puede deshacer.`)) return;

    try {
      await supabase.from('presupuestos').update({ estado_facturacion: 'Facturado' }).eq('id', id);
      setCuentasPorCobrar(cuentasPorCobrar.map(c => c.id === id ? { ...c, estado_facturacion: 'Facturado' } : c));
    } catch (err) {
      alert("Error al actualizar estado.");
    }
  }

  const cuentasFiltradas = cuentasPorCobrar.filter(c => 
    c.patente?.includes(busqueda.replace(/\s/g, "").toUpperCase()) || 
    c.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.numero?.toString().includes(busqueda)
  );

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Tesorería y Caja</h2>
          <p className="text-sm text-muted-foreground">Gestión de cobros, facturación y flujo de fondos.</p>
        </div>
        <Button onClick={() => setIsMovimientoModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <ArrowRightLeft className="mr-2 h-4 w-4" /> Movimiento Interno
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <Card className="border-border shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-1">Caja Mostrador (Efectivo Físico)</p>
                <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 font-mono">
                  ${saldoMostrador.toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-full">
                <Wallet className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
            </div>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-4">Dinero actualmente en el cajón del local.</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Caja General (Patrimonio)</p>
                <h3 className="text-3xl font-bold text-foreground font-mono">
                  ${saldoGeneral.toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-secondary rounded-full">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Suma de Cajas Fuerte, Transferencias, Tarjetas y Cheques.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cuentas" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 max-w-md shrink-0">
          <TabsTrigger value="cuentas">Cuentas por Cobrar</TabsTrigger>
          <TabsTrigger value="movimientos">Historial de Movimientos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cuentas" className="flex-1 flex flex-col min-h-0 mt-4 border border-border rounded-xl shadow-sm bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por patente o cliente..." 
                className="pl-9 bg-background" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Badge variant="secondary" className="hidden sm:flex">Vehículos en Taller</Badge>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="bg-secondary/20 sticky top-0 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Vehículo / Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right text-emerald-600">Pagado</TableHead>
                  <TableHead className="text-right text-red-500">Deuda Restante</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-5 w-20 bg-secondary/60 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="space-y-2"><div className="h-4 w-32 bg-secondary/60 rounded animate-pulse"></div><div className="h-3 w-24 bg-secondary/40 rounded animate-pulse"></div></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-secondary/60 rounded animate-pulse ml-auto"></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-secondary/60 rounded animate-pulse ml-auto"></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-secondary/60 rounded animate-pulse ml-auto"></div></TableCell>
                      <TableCell><div className="h-6 w-24 bg-secondary/60 rounded-full animate-pulse mx-auto"></div></TableCell>
                      <TableCell><div className="flex justify-end gap-2"><div className="h-8 w-20 bg-secondary/60 rounded animate-pulse"></div><div className="h-8 w-8 bg-secondary/60 rounded animate-pulse"></div></div></TableCell>
                    </TableRow>
                  ))
                ) : cuentasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">No hay vehículos con deudas pendientes en el taller.</TableCell></TableRow>
                ) : (
                  cuentasFiltradas.map(cuenta => (
                    <TableRow key={cuenta.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono font-bold text-muted-foreground">PRE-{cuenta.numero}</TableCell>
                      <TableCell>
                        <div className="font-bold tracking-widest uppercase">{cuenta.patente}</div>
                        <div className="text-xs text-muted-foreground">{cuenta.cliente}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">${cuenta.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-bold">${cuenta.pagado.toLocaleString()}</TableCell>
                      
                      <TableCell className={`text-right font-mono font-bold ${cuenta.restante > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        ${cuenta.restante.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {cuenta.estado_pago === 'Cobrado' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none shadow-none">Cobrado</Badge>
                          ) : cuenta.estado_pago === 'Parcial' ? (
                            <Badge className="bg-amber-100 text-amber-800 border-none shadow-none">Pago Parcial</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300">Pendiente</Badge>
                          )}
                          
                          {cuenta.estado_facturacion === 'Facturado' && (
                            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Facturado</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            disabled={cuenta.restante <= 0}
                            onClick={() => abrirModalCobro(cuenta)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-1" /> Cobrar
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant={cuenta.estado_facturacion === 'Facturado' ? "secondary" : "outline"}
                            disabled={cuenta.estado_facturacion === 'Facturado'}
                            onClick={() => marcarComoFacturado(cuenta.id, cuenta.numero)}
                            className={cuenta.estado_facturacion !== 'Facturado' ? "border-blue-200 text-blue-700 hover:bg-blue-50" : ""}
                          >
                            {cuenta.estado_facturacion === 'Facturado' ? "Facturado" : <><Receipt className="w-4 h-4 mr-1" /> Facturar</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimientos" className="flex-1 flex flex-col min-h-0 mt-4 border border-border rounded-xl shadow-sm bg-card">
          <div className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="bg-secondary/20 sticky top-0">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Método / Caja</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map(mov => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(mov.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      {mov.tipo_movimiento === 'ingreso_cobro' ? <Badge className="bg-emerald-100 text-emerald-800 shadow-none"><ArrowDownRight className="w-3 h-3 mr-1"/> Ingreso</Badge> :
                       mov.tipo_movimiento === 'transferencia_interna' ? <Badge className="bg-blue-100 text-blue-800 shadow-none"><ArrowRightLeft className="w-3 h-3 mr-1"/> Interno</Badge> :
                       <Badge variant="destructive">Egreso</Badge>}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {mov.detalle}
                      {mov.notas && <span className="block text-xs text-muted-foreground font-normal mt-0.5 italic">{mov.notas}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-medium text-sm"><CreditCard className="w-3 h-3 text-muted-foreground"/> {mov.metodo_pago}</div>
                      {mov.caja_destino && <div className="text-[10px] text-muted-foreground mt-0.5">A: {mov.caja_destino.nombre}</div>}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${mov.tipo_movimiento === 'ingreso_cobro' ? 'text-emerald-600' : 'text-foreground'}`}>
                      ${Number(mov.monto).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {movimientos.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay movimientos registrados recientes.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

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
                <Input 
                  type="number" 
                  className="text-lg font-mono font-bold h-12"
                  value={montoCobro}
                  onChange={(e) => setMontoCobro(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago (Destino)</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo (Va a Caja Mostrador)</SelectItem>
                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta Débito/Crédito</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cuenta Corriente">Cuenta Corriente (Anotar en deuda)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas Adicionales (Opcional)</Label>
                <Input 
                  placeholder="Ej: Seña del 50% / Pagó con Banco Galicia..." 
                  value={notasCobro}
                  onChange={(e) => setNotasCobro(e.target.value)}
                />
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
              <Input 
                type="number" 
                className="text-lg font-mono font-bold h-12"
                value={montoMovimiento}
                onChange={(e) => setMontoMovimiento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo / Observaciones</Label>
              <Input 
                placeholder="Ej: Retiro para pagar al proveedor de pintura..." 
                value={notasMovimiento}
                onChange={(e) => setNotasMovimiento(e.target.value)}
              />
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
    </div>
  )
}