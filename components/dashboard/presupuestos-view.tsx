"use client"

import { useState, useEffect } from "react"
import { Search, Printer, ArrowLeft, Save, Trash2, Plus, MessageCircle, EyeOff, Eye, FileText, Lock, ClipboardList, Loader2, Car, User, Phone, X, Pencil, CheckCircle, Link2, CalendarDays, Wrench, Package, CircleDashed, PenTool, RotateCcw, Gauge, Clock, Banknote, DollarSign, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { PresupuestoImprimible, OrdenTrabajoImprimible, FacturaImprimible } from "./impresion-templates"

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "Borrador": return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700";
    case "En Espera": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "Aprobado": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "Rechazado": return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "Facturado": return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "Cobrado": return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    default: return "bg-secondary text-foreground border-border";
  }
}

const TipoBadge = ({ tipo }: { tipo: string }) => {
  switch (tipo) {
    case 'Repuesto':
      return <Badge className="bg-blue-100 text-blue-700 border-none hover:bg-blue-100 shadow-none gap-1.5 px-2.5 py-1 font-medium"><Package className="w-3.5 h-3.5"/> Repuesto</Badge>;
    case 'Servicio':
      return <Badge className="bg-orange-100 text-orange-700 border-none hover:bg-orange-100 shadow-none gap-1.5 px-2.5 py-1 font-medium"><Wrench className="w-3.5 h-3.5"/> Servicio</Badge>;
    case 'Mano de Obra':
      return <Badge className="bg-purple-100 text-purple-700 border-none hover:bg-purple-100 shadow-none gap-1.5 px-2.5 py-1 font-medium"><PenTool className="w-3.5 h-3.5"/> Mano de Obra</Badge>;
    case 'Neumático':
      return <Badge className="bg-slate-100 text-slate-700 border-none hover:bg-slate-100 shadow-none gap-1.5 px-2.5 py-1 font-medium"><CircleDashed className="w-3.5 h-3.5"/> Neumático</Badge>;
    default:
      return <Badge variant="outline">{tipo}</Badge>;
  }
}

// --- NUEVO COMPONENTE: BUSCADOR AISLADO PARA NO PERDER EL FOCO ---
const BuscadorRepuesto = ({ fila, catalogo, aplicarItemCatalogo }: any) => {
  const [busqueda, setBusqueda] = useState("");
  const catalogoFiltrado = catalogo.filter((c: any) => c.tipo === fila.tipo);

  return (
    <Select 
      onOpenChange={(open: boolean) => { if(open) setBusqueda("") }} 
      onValueChange={(val: string) => aplicarItemCatalogo(fila.id, val)}
    >
      <SelectTrigger className="w-[180px] h-10 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0 print:hidden">
        <SelectValue placeholder={`Elegir ${fila.tipo}...`} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border shadow-sm">
          <Input 
            placeholder="Buscar..." 
            value={busqueda} 
            onChange={(e: any) => setBusqueda(e.target.value)}
            onKeyDown={(e: any) => e.stopPropagation()} 
            onClick={(e: any) => e.stopPropagation()}
            className="h-8 text-xs bg-secondary/50"
          />
        </div>
        {catalogoFiltrado.filter((c: any) => c.detalle.toLowerCase().includes(busqueda.toLowerCase())).length === 0 ? (
          <SelectItem value="none" disabled>Sin resultados</SelectItem>
        ) : (
          catalogoFiltrado
            .filter((c: any) => c.detalle.toLowerCase().includes(busqueda.toLowerCase()))
            .map((c: any) => <SelectItem key={c.id} value={c.id}>{c.detalle}</SelectItem>)
        )}
      </SelectContent>
    </Select>
  );
}


export function PresupuestosView({
  onNavigateToTurnos,
  onNavigateToTaller,
  presupuestoAbreDetalle,
  onClearPresupuestoDetalle,
  onVolver,
  userRole,
  userName,
  vehiculoPreseleccionado 
}: {
  onNavigateToTurnos?: (vehiculoInfo: any) => void,
  onNavigateToTaller?: () => void,
  presupuestoAbreDetalle?: any,
  onClearPresupuestoDetalle?: () => void,
  onVolver?: () => void,
  userRole?: string | null,
  userName?: string | null,
  vehiculoPreseleccionado?: any 
}) {
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [isEditing, setIsEditing] = useState(false)
  const [mostrarCostos, setMostrarCostos] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)


  // --- ESTADOS PARA COBRO ---
  const [cajas, setCajas] = useState<any[]>([])
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false)
  const [montoCobro, setMontoCobro] = useState("")
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [notasCobro, setNotasCobro] = useState("")
  const [bancoOrigen, setBancoOrigen] = useState("")
  const [tipoTarjeta, setTipoTarjeta] = useState("Crédito")
  const [marcaTarjeta, setMarcaTarjeta] = useState("Visa")
  const [bancoTarjeta, setBancoTarjeta] = useState("")
  const [infoPago, setInfoPago] = useState({ pagado: 0, restante: 0 })
  // Estados para el Sistema de Anulación de Cobros
  const [isAnulacionModalOpen, setIsAnulacionModalOpen] = useState(false)
  const [anulacionError, setAnulacionError] = useState<{ visible: boolean, titulo: string, mensaje: string }>({ visible: false, titulo: "", mensaje: "" })

  const [kmIngreso, setKmIngreso] = useState("")
  const [kmEgreso, setKmEgreso] = useState("")
  const [demoraEstimada, setDemoraEstimada] = useState("")

  const [alertaStock, setAlertaStock] = useState<{ visible: boolean, faltantes: string[], actualizaciones: any[], estadoFinal: string }>({ visible: false, faltantes: [], actualizaciones: [], estadoFinal: '' });

  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [configuracion, setConfiguracion] = useState<any>({})

  const [imprimirAlGuardar, setImprimirAlGuardar] = useState(true);

  const [isGarantiaModalOpen, setIsGarantiaModalOpen] = useState(false);
  const [motivoGarantia, setMotivoGarantia] = useState("");
  const [esGarantiaImpresion, setEsGarantiaImpresion] = useState(false);
  const [motivoGarantiaImpresion, setMotivoGarantiaImpresion] = useState("");

  const [busquedaEntidad, setBusquedaEntidad] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [busquedaLista, setBusquedaLista] = useState("")

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [numeroCorrelativo, setNumeroCorrelativo] = useState<string>("")
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>("")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [validez, setValidez] = useState("15")
  const [estado, setEstado] = useState("Borrador")
  const [notasCliente, setNotasCliente] = useState("Los repuestos pueden sufrir variaciones de precio sin previo aviso. Validez sujeta a stock.")
  const [notasInternas, setNotasInternas] = useState("")
  const [descuento, setDescuento] = useState<string | number>("0")
  
  // --- NUEVO ESTADO PARA DIFFING ---
  const [itemsOriginales, setItemsOriginales] = useState<any[]>([])
  
  const [filas, setFilas] = useState<any[]>([
    { id: '1', tipo: "Servicio", detalle: "", cant: "1", costo: "0", precio: "0", estado_cambio: null, catalogo_id: null, stock_actual: 0 }
  ])

  const [presupuestosAEliminar, setPresupuestosAEliminar] = useState<string[]>([])
  const [isAsociarModalOpen, setIsAsociarModalOpen] = useState(false)
  const [presupuestoAFusionar, setPresupuestoAFusionar] = useState<string>("")
  const [isAprobarModalOpen, setIsAprobarModalOpen] = useState(false)

  const [printType, setPrintType] = useState<'presupuesto' | 'orden' | 'factura' | null>(null)
  const [printData, setPrintData] = useState<any>(null)

  const cargarDatos = async () => {
    setIsLoading(true)
    try {
      const [resClientes, resVehiculos, resCatalogo, resPresupuestos, resConfig, resCajas] = await Promise.all([
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('vehiculos').select('*'),
        supabase.from('catalogo').select('*'),
        supabase.from('presupuestos').select('*, vehiculos(*, clientes(*)), presupuesto_items(*)').order('created_at', { ascending: false }),
        supabase.from('configuracion').select('*').eq('id', 1).single(),
        supabase.from('cajas').select('*').order('nombre')
      ])
      
      setClientes(resClientes.data || [])
      setVehiculos(resVehiculos.data || [])
      // MAGIA: Ordenamiento Inteligente del Catálogo
      const pesoTipo: any = { "Neumático": 1, "Repuesto": 2, "Servicio": 3, "Mano de Obra": 4 };
      const catalogoOrdenado = (resCatalogo.data || []).sort((a: any, b: any) => {
        const pesoA = pesoTipo[a.tipo] || 99;
        const pesoB = pesoTipo[b.tipo] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;

        if (a.tipo === 'Neumático' && b.tipo === 'Neumático') {
          const numsA = a.medida ? a.medida.match(/\d+/g) : [];
          const numsB = b.medida ? b.medida.match(/\d+/g) : [];
          if (numsA && numsB && numsA.length >= 3 && numsB.length >= 3) {
            const anchoA = parseInt(numsA[0], 10), perfilA = parseInt(numsA[1], 10), rodadoA = parseInt(numsA[2], 10);
            const anchoB = parseInt(numsB[0], 10), perfilB = parseInt(numsB[1], 10), rodadoB = parseInt(numsB[2], 10);
            if (rodadoA !== rodadoB) return rodadoA - rodadoB;
            if (anchoA !== anchoB) return anchoA - anchoB;
            if (perfilA !== perfilB) return perfilA - perfilB;
          }
        }
        return a.detalle.localeCompare(b.detalle);
      });
      setCatalogo(catalogoOrdenado);
      setPresupuestos(resPresupuestos.data || [])
      if (resConfig.data) setConfiguracion(resConfig.data)
      setCajas(resCajas.data || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (vista === "lista") {
      cargarDatos()
      setEditandoId(null)
      setIsEditing(false)
    }

    // --- MAGIA: SUSCRIPCIÓN EN TIEMPO REAL ---
    const canalPresupuestos = supabase.channel('sincronizacion-presupuestos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, () => {
         cargarDatos() // Recarga los datos de fondo sin molestar al usuario
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuesto_items' }, () => {
         cargarDatos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canalPresupuestos)
    }
  }, [vista])

  useEffect(() => {
    if (presupuestoAbreDetalle && presupuestos.length > 0) {
      const pres = presupuestos.find(p => p.id === presupuestoAbreDetalle);
      if (pres) {
        handleAbrirPresupuesto(pres);
      }
      if (onClearPresupuestoDetalle) onClearPresupuestoDetalle();
    }
  }, [presupuestoAbreDetalle, presupuestos])

  useEffect(() => {
    if (clienteSeleccionado && !editandoId && isEditing) {
      const autosDelCliente = vehiculos.filter(v => String(v.cliente_id) === String(clienteSeleccionado));
      if (autosDelCliente.length === 1 && vehiculoSeleccionado !== autosDelCliente[0].patente) {
        setVehiculoSeleccionado(autosDelCliente[0].patente);
      }
    }
  }, [clienteSeleccionado, vehiculos, vehiculoSeleccionado, editandoId, isEditing]);

  useEffect(() => {
    if (clienteSeleccionado && !editandoId && isEditing) {
      const autosDelCliente = vehiculos.filter(v => String(v.cliente_id) === String(clienteSeleccionado));
      if (autosDelCliente.length === 1 && vehiculoSeleccionado !== autosDelCliente[0].patente) {
        setVehiculoSeleccionado(autosDelCliente[0].patente);
      }
    }
  }, [clienteSeleccionado, vehiculos, vehiculoSeleccionado, editandoId, isEditing]);

  useEffect(() => {
    const esNuevo = presupuestoAbreDetalle === "nuevo" || (presupuestoAbreDetalle && presupuestoAbreDetalle.id === "nuevo");
    
    if (esNuevo) {
      setVista("detalle");
      setIsEditing(true);
      
      setEditandoId(null);
      setFilas([{ id: '1', tipo: "Servicio", detalle: "", cant: "1", costo: "0", precio: "0", estado_cambio: null }]);
      setEstado("Borrador");
      setDescuento("0");
      setNotasInternas("");
      setKmIngreso("");
      setKmEgreso("");
      setDemoraEstimada("");
      
      const vehiculo = vehiculoPreseleccionado || (presupuestoAbreDetalle.vehiculo ? presupuestoAbreDetalle.vehiculo : null);
      
      if (vehiculo) {
        setVehiculoSeleccionado(vehiculo.patente);
        setClienteSeleccionado(vehiculo.cliente_id);
        if (vehiculo.kilometraje) setKmIngreso(vehiculo.kilometraje.toString());
      } else {
        setVehiculoSeleccionado("");
        setClienteSeleccionado("");
      }

      if (onClearPresupuestoDetalle) onClearPresupuestoDetalle();
    }
  }, [presupuestoAbreDetalle, vehiculoPreseleccionado]);

  const presupuestosFiltrados = presupuestos.filter(p => {
    if (!busquedaLista) return true;
    const search = busquedaLista.toLowerCase();
    const clienteNom = (p.vehiculos?.clientes?.nombre || "").toLowerCase();
    const clienteApe = (p.vehiculos?.clientes?.apellido || "").toLowerCase();
    const clienteRazon = (p.vehiculos?.clientes?.razon_social || "").toLowerCase();
    const patente = (p.vehiculo_patente || "").toLowerCase();
    const nro = (p.numero_correlativo?.toString() || "");

    return clienteNom.includes(search) || clienteApe.includes(search) || clienteRazon.includes(search) || patente.includes(search) || nro.includes(search);
  });

  const terminoBusqueda = busquedaEntidad.toLowerCase().trim()
  const vehiculosBusqueda = terminoBusqueda === "" ? [] : vehiculos.filter(v =>
    (v.patente && v.patente.toLowerCase().includes(terminoBusqueda.replace(/\s/g, ""))) ||
    (v.marca && v.marca.toLowerCase().includes(terminoBusqueda)) ||
    (v.modelo && v.modelo.toLowerCase().includes(terminoBusqueda))
  ).slice(0, 4)

  const clientesBusqueda = terminoBusqueda === "" ? [] : clientes.filter(c => {
    const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase()
    return nombreCompleto.includes(terminoBusqueda) ||
      (c.razon_social && c.razon_social.toLowerCase().includes(terminoBusqueda)) ||
      (c.documento && c.documento.includes(terminoBusqueda))
  }).slice(0, 4)

  const seleccionarVehiculoBuscador = (v: any) => {
    setVehiculoSeleccionado(v.patente)
    setClienteSeleccionado(v.cliente_id)
    setBusquedaEntidad("")
    setMostrarResultados(false)
  }

  const seleccionarClienteBuscador = (c: any) => {
    setClienteSeleccionado(c.id)
    setVehiculoSeleccionado("")
    setBusquedaEntidad("")
    setMostrarResultados(false)
  }

  const vehiculosDelCliente = vehiculos.filter(v => String(v.cliente_id) === String(clienteSeleccionado))

  const agregarFilaVacia = () => setFilas([...filas, { id: Date.now().toString(), tipo: "Repuesto", detalle: "", cant: "1", costo: "0", precio: "0", estado_cambio: userRole === 'mecanico' ? 'nuevo' : null, catalogo_id: null, stock_actual: 0 }])

  const actualizarFila = (id: string, campo: string, valor: any) => {
    if (!isEditing) return;
    setFilas(filas.map(f => {
      if (f.id !== id) return f
      if (campo === 'tipo') return { ...f, tipo: valor, detalle: "", costo: "0", precio: "0" }
      return { ...f, [campo]: valor }
    }))
  }

  const aplicarItemCatalogo = (idFila: string, idCatalogo: string) => {
    if (!isEditing) return;
    const item = catalogo.find(c => c.id === idCatalogo)
    if (item) {
      setFilas(filas.map(f => f.id === idFila ? { ...f, detalle: item.detalle, costo: item.costo_base || "0", precio: item.precio_base || "0", catalogo_id: item.id, stock_actual: item.stock_actual || 0 } : f))
    }
  }

  const eliminarFila = (id: string) => {
    const fila = filas.find(f => f.id === id);
    if (userRole === 'mecanico' && fila?.estado_cambio !== 'nuevo') {
      // El mecánico solo "sugiere" borrar. Lo marcamos y no lo sacamos del array.
      setFilas(filas.map(f => f.id === id ? { ...f, estado_cambio: 'eliminado' } : f));
    } else {
      // Admin o Cajero lo borran directo (o el mecánico borra algo que acaba de agregar y se arrepintió)
      setFilas(filas.filter(f => f.id !== id));
    }
  }

  const vehiculoActual = vehiculos.find(v => v.patente === vehiculoSeleccionado)
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado)

  // Los subtotales ignoran lo que está sugerido como eliminado para dar el número real proyectado
  const filasParaCalculo = filas.filter(f => f.estado_cambio !== 'eliminado');
  const subtotalNeto = filasParaCalculo.reduce((acc, fila) => acc + ((parseFloat(fila.precio) || 0) * (parseFloat(fila.cant) || 1)), 0)
  const costoTotal = filasParaCalculo.reduce((acc, fila) => acc + ((parseFloat(fila.costo) || 0) * (parseFloat(fila.cant) || 1)), 0)
  const totalFinal = subtotalNeto - (parseFloat(descuento.toString()) || 0)
  const gananciaEstimada = totalFinal - costoTotal

  // --- ACÁ ESTÁ EL CAMBIO DE TU FIRMA PARA EVITAR EL REBOTE ---
  const limpiarAvisosVisuales = async (idPres: string) => {
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', idPres).eq('estado_cambio', 'eliminado');
    await supabase.from('presupuesto_items').update({ estado_cambio: null }).eq('presupuesto_id', idPres);
    await supabase.from('presupuestos').update({ 
      visto_admin: true,
      modificado_por_rol: userRole || 'admin', 
      modificado_por_nombre: userName || 'Usuario' 
    }).eq('id', idPres);
  }

  const handleAbrirPresupuesto = (p?: any) => {
    setPresupuestosAEliminar([]);
    
    if (p) {
      setEditandoId(p.id)
      setNumeroCorrelativo(p.numero_correlativo)
      setClienteSeleccionado(p.vehiculos?.cliente_id)
      setVehiculoSeleccionado(p.vehiculo_patente)
      setFecha(p.fecha_emision)
      setValidez(p.validez_dias?.toString() || "15")
      setEstado(p.estado || "Borrador")
      setDescuento(p.descuento || "0")
      setNotasCliente(p.observaciones_publicas || "")
      setNotasInternas(p.notas_internas || "")
      setKmIngreso(p.km_ingreso?.toString() || "")
      setKmEgreso(p.km_egreso?.toString() || "")
      setDemoraEstimada(p.demora_estimada || "")
      setIsEditing(false)

      let itemsTraidos = p.presupuesto_items || [];
      if (userRole === 'mecanico') {
        itemsTraidos = itemsTraidos.filter((i: any) => i.estado_cambio !== 'eliminado');
      }
      setItemsOriginales(itemsTraidos);

      if (itemsTraidos.length > 0) {
        setFilas(itemsTraidos.map((item: any) => {
          const itemCat = catalogo.find(c => c.id === item.catalogo_id); // Buscamos el stock actual en vivo
          return {
            id: item.id || Date.now().toString() + Math.random(),
            tipo: item.tipo,
            detalle: item.detalle,
            cant: item.cantidad?.toString() || "1",
            costo: item.costo_unitario?.toString() || "0",
            precio: item.precio_unitario?.toString() || "0",
            estado_cambio: item.estado_cambio || null,
            catalogo_id: item.catalogo_id || null,
            stock_actual: itemCat ? itemCat.stock_actual : 0
          }
        }))
      } else {
        setFilas([])
      }

      // Si lo abre el mostrador, quitamos la alerta azul silenciosamente de la tabla, 
      // pero MANTENEMOS los colores intactos para que decidan si guardan o borran.
      if (p.visto_admin === false && userRole !== 'mecanico') {
        limpiarAvisosVisuales(p.id);
      }

    } else {
      setEditandoId(null)
      setNumeroCorrelativo("")
      setClienteSeleccionado("")
      setVehiculoSeleccionado("")
      setFecha(new Date().toISOString().split('T')[0])
      setEstado("Borrador")
      setKmIngreso("")
      setKmEgreso("")
      setDemoraEstimada("")
      setItemsOriginales([])
      setFilas([{ id: '1', tipo: "Servicio", detalle: "", cant: "1", costo: "0", precio: "0", estado_cambio: null }])
      setIsEditing(true)
    }
    
    setVista("detalle")
  }

  const handleEliminarPresupuesto = async (id: string) => {
    if (!confirm("¿Estás seguro de que querés eliminar este presupuesto? Esta acción no se puede deshacer.")) return;

    try {
      await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id);
      const { error } = await supabase.from('presupuestos').delete().eq('id', id);
      if (error) throw error;
      
      setVista("lista")
      cargarDatos()
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      alert("Hubo un error al eliminar el presupuesto: " + error.message);
    }
  }

  const confirmarFusion = async () => {
    if (!presupuestoAFusionar) return alert("Seleccione un presupuesto para asociar.");
    
    setIsSaving(true);
    try {
      const { data: itemsAnteriores, error } = await supabase.from('presupuesto_items').select('*').eq('presupuesto_id', presupuestoAFusionar);
      if (error) throw error;

      if (itemsAnteriores && itemsAnteriores.length > 0) {
        const nuevasFilas = itemsAnteriores.map((item: any) => ({
          id: 'fusion_' + Date.now().toString() + Math.random(),
          tipo: item.tipo,
          detalle: item.detalle,
          cant: item.cantidad?.toString() || "1",
          costo: item.costo_unitario?.toString() || "0",
          precio: item.precio_unitario?.toString() || "0",
          estado_cambio: userRole === 'mecanico' ? 'nuevo' : null
        }));
        
        setFilas([...filas, ...nuevasFilas]);
      }

      setPresupuestosAEliminar([...presupuestosAEliminar, presupuestoAFusionar]);
      
      setIsEditing(true);
      setIsAsociarModalOpen(false);
      setPresupuestoAFusionar("");
      
      alert("Ítems importados correctamente. Revise el nuevo total y haga clic en 'Guardar Cambios' para confirmar la asociación.");
    } catch (error: any) {
      alert("Error al intentar fusionar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleCambiarEstadoRapido = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase.from('presupuestos').update({
        estado: nuevoEstado,
        modificado_por_rol: userRole || 'admin'
      }).eq('id', id);
      if (error) throw error;
      
      setPresupuestos(presupuestos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
    } catch (error: any) {
      alert("Error al actualizar el estado: " + error.message);
    }
  }

  const handleGuardarPresupuesto = async () => {
    const patenteParaDB = vehiculoSeleccionado && vehiculoSeleccionado.trim() !== "" ? vehiculoSeleccionado : null;

    // --- NUEVA VALIDACIÓN DE KILOMETRAJE ---
    const kmi = parseInt(kmIngreso) || 0;
    const kme = parseInt(kmEgreso) || 0;

    // Validamos solo si se ingresó un valor de egreso
    if (kmEgreso && kme < kmi) {
      return alert(`❌ Error de Kilometraje: El vehículo no puede salir con menos kilómetros (${kme}) de los que ingresó (${kmi}).`);
    }

    // Filtramos las válidas. Si es administrador, ignoramos las marcadas como 'eliminado' para borrarlas de la base de datos definitivamente.
    const filasValidas = filas.filter(f => f.detalle.trim() !== "" && (userRole === 'mecanico' || f.estado_cambio !== 'eliminado'));
    
    if (filasValidas.length === 0) return alert("El presupuesto debe tener al menos un ítem con detalle.")

    setIsSaving(true)
    try {
      let presId = editandoId;
      const descParsed = parseFloat(descuento.toString()) || 0;
      let numAleatorio = 0;
      const isMecanico = userRole === 'mecanico';

      // --- MAGIA: VALIDACIÓN INTELIGENTE DE ESTADO ---
      let estadoCalculado = estado;

      // Si estamos editando un presupuesto que figuraba como Cobrado o Facturado...
      if (editandoId && (estado === 'Cobrado' || estado === 'Facturado')) {
        // Vamos a la caja a ver cuánta plata neta entró (Ingresos reales - Anulaciones)
        const { data: pagos } = await supabase.from('movimientos_caja')
          .select('monto, tipo_movimiento')
          .eq('presupuesto_id', editandoId);
          
        const pagadoTotal = pagos?.reduce((acc: any, mov: any) => {
          if (mov.tipo_movimiento === 'ingreso_cobro') return acc + Number(mov.monto);
          if (mov.tipo_movimiento === 'egreso_gasto') return acc - Number(mov.monto);
          return acc;
        }, 0) || 0;
        
        if (totalFinal !== pagadoTotal) {
          estadoCalculado = 'Aprobado'; // Lo bajamos de categoría
          setEstado('Aprobado'); // Actualizamos la vista visualmente
        }
      }
      // ------------------------------------------------

      // Agrupamos los datos para no repetir código y asegurar que los vacíos vayan como 'null' (para evitar errores int4)
      const datosPresupuesto = {
        vehiculo_patente: patenteParaDB,
        fecha_emision: fecha,
        validez_dias: parseInt(validez) || 15,
        descuento: descParsed,
        total_final: totalFinal,
        estado: estadoCalculado, // <-- ACÁ INYECTAMOS EL ESTADO INTELIGENTE
        observaciones_publicas: notasCliente,
        notas_internas: notasInternas,
        modificado_por_rol: userRole || 'admin',
        modificado_por_nombre: userName || 'Usuario',
        km_ingreso: kmi > 0 ? kmi : null,
        km_egreso: kme > 0 ? kme : null,
        demora_estimada: demoraEstimada || null,
        visto_admin: !isMecanico
      };

      if (editandoId) {
        const { error: presError } = await supabase.from('presupuestos').update(datosPresupuesto).eq('id', editandoId)

        if (presError) throw new Error("Error al actualizar presupuesto: " + presError.message)
        
        // Mantenemos la estructura de guardado original: borra todo e inserta lo nuevo para no causar bugs.
        await supabase.from('presupuesto_items').delete().eq('presupuesto_id', editandoId);
        
      } else {
        numAleatorio = Math.floor(1000 + Math.random() * 9000);
        const { data: presData, error: presError } = await supabase.from('presupuestos').insert([{
          numero_correlativo: numAleatorio,
          ...datosPresupuesto
        }]).select()

        if (presError) throw new Error("Error al guardar presupuesto: " + presError.message)
        if (!presData || presData.length === 0) throw new Error("Error interno al obtener el ID generado.")
        presId = presData[0].id;
      }

      const itemsToInsert = filasValidas.map(f => ({
        presupuesto_id: presId,
        tipo: f.tipo,
        detalle: f.detalle,
        cantidad: parseFloat(f.cant) || 1,
        costo_unitario: parseFloat(f.costo) || 0,
        precio_unitario: parseFloat(f.precio) || 0,
        estado_cambio: isMecanico ? (f.estado_cambio || null) : null,
        catalogo_id: f.catalogo_id || null
      }))

      const { error: itemsError } = await supabase.from('presupuesto_items').insert(itemsToInsert)
      if (itemsError) throw new Error("Error al guardar ítems: " + itemsError.message)

      if (presupuestosAEliminar.length > 0) {
        await supabase.from('presupuesto_items').delete().in('presupuesto_id', presupuestosAEliminar);
        await supabase.from('presupuestos').delete().in('id', presupuestosAEliminar);
      }

      // --- SINCRONIZACIÓN CON LA FICHA DEL VEHÍCULO ---
      const kmParaFicha = kme > 0 ? kme : kmi;
      if (kmParaFicha > 0 && patenteParaDB) { // Validamos que exista la patente
        const { error: errVehiculo } = await supabase.from('vehiculos')
          .update({ kilometraje: kmParaFicha.toString() }) 
          .eq('patente', patenteParaDB); // Usamos patenteParaDB que es segura
          
        if (errVehiculo) {
          alert("El presupuesto se guardó, pero hubo un error al actualizar la ficha del vehículo: " + errVehiculo.message);
        }
      }

      // --- MAGIA DE STOCK: SINCRONIZACIÓN AL EDITAR ---
      // Solo si el auto YA ESTÁ en el taller, ajustamos el stock sobre la marcha
      const yaEstabaEnTaller = presupuestos.find(p => p.id === editandoId)?.ingresado_al_taller;
      
      if (editandoId && yaEstabaEnTaller) {
        // A. Buscamos qué se borró o se redujo
        for (const original of itemsOriginales) {
          if (!original.catalogo_id) continue;
          const filaActual = filas.find(f => f.id === original.id || f.catalogo_id === original.catalogo_id);
          
          // Si ya no está en la lista o está marcado para eliminar: DEVOLVEMOS al stock
          if (!filaActual || filaActual.estado_cambio === 'eliminado') {
             // CAMBIO: Verificamos si controla stock
             const { data: item } = await supabase.from('catalogo').select('stock_actual, controlar_stock').eq('id', original.catalogo_id).single();
             if (item && item.controlar_stock !== false) await supabase.from('catalogo').update({ stock_actual: (item.stock_actual || 0) + (original.cantidad || 0) }).eq('id', original.catalogo_id);
          } 
          // Si cambió la cantidad, ajustamos la diferencia
          else if (parseFloat(filaActual.cant) !== original.cantidad) {
             const diferencia = original.cantidad - parseFloat(filaActual.cant);
             // CAMBIO: Verificamos si controla stock
             const { data: item } = await supabase.from('catalogo').select('stock_actual, controlar_stock').eq('id', original.catalogo_id).single();
             if (item && item.controlar_stock !== false) await supabase.from('catalogo').update({ stock_actual: (item.stock_actual || 0) + diferencia }).eq('id', original.catalogo_id);
          }
        }

        // B. Buscamos qué hay de NUEVO que no estaba antes: DESCONTAMOS del stock
        for (const fila of filas) {
          if (fila.catalogo_id && !itemsOriginales.some(o => o.id === fila.id)) {
             // CAMBIO: Verificamos si controla stock
             const { data: item } = await supabase.from('catalogo').select('stock_actual, controlar_stock, tipo, detalle').eq('id', fila.catalogo_id).single();
             
             if (item && item.controlar_stock !== false) {
                 const cantDescontada = parseFloat(fila.cant) || 0;
                 
                 // 1. Descontamos del stock
                 await supabase.from('catalogo').update({ stock_actual: (item.stock_actual || 0) - cantDescontada }).eq('id', fila.catalogo_id);
                 
                 // 2. --- NUEVO: AUTODISPARADOR AL EDITAR ---
                 if (item.tipo === 'Neumático' || item.tipo === 'Repuesto') {
                     await supabase.from('pedidos_proveedor').insert([{
                         catalogo_id: fila.catalogo_id,
                         detalle: item.detalle,
                         cantidad: cantDescontada,
                         estado: 'Pedir'
                     }]);
                 }
             }
          }
        }
      }

      alert(editandoId ? "¡Presupuesto actualizado con éxito!" : "¡Presupuesto guardado con éxito!")
      
      if (!editandoId && numAleatorio !== 0) {
        setNumeroCorrelativo(numAleatorio.toString());
      }
      setEditandoId(presId);
      setIsEditing(false);
      cargarDatos();
      
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const actualizarAEnEsperaSiEsBorrador = async () => {
    if (estado === "Borrador" && editandoId) {
      setEstado("En Espera");
      await supabase.from('presupuestos').update({
        estado: "En Espera",
        modificado_por_rol: userRole || 'admin'
      }).eq('id', editandoId);
    }
  }

  const handleWhatsApp = async () => {
    if (!clienteActual || !vehiculoActual) return alert("Seleccione un cliente y vehículo para enviar el mensaje.")
    if (!clienteActual.telefono) return alert("El cliente no tiene un número de teléfono registrado.")
    
    await actualizarAEnEsperaSiEsBorrador();

    const telefonoLimpio = clienteActual.telefono.replace(/\D/g, '')
    
    let mensaje = configuracion.msj_presupuesto || "Hola {{cliente}}, te enviamos el presupuesto para tu {{vehiculo}} ({{patente}}). Total: {{total}}. Saludos!";
    
    mensaje = mensaje
      .replace(/{{cliente}}/g, clienteActual.nombre)
      .replace(/{{vehiculo}}/g, `${vehiculoActual.marca} ${vehiculoActual.modelo}`)
      .replace(/{{patente}}/g, vehiculoActual.patente)
      .replace(/{{total}}/g, `$${totalFinal.toLocaleString()}`)
      .replace(/{{taller}}/g, configuracion.nombre_taller || "nuestro taller");
    
    // 1. Abre la pestaña de WhatsApp
    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank')

    // 2. Automáticamente dispara la generación del PDF
    generarDocumento('presupuesto');
  }

  const handleVerFactura = async (presupuestoId: string) => {
    try {
      const { data: factura, error: errFactura } = await supabase
        .from('facturas')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
        .single();

      if (errFactura || !factura) return alert("No se encontró la factura para este presupuesto.");

      const { data: presFull } = await supabase
        .from('presupuestos')
        .select('*, vehiculos(*, clientes(*)), presupuesto_items(*)')
        .eq('id', presupuestoId)
        .single();

      const datosParaFactura = {
        ...factura,
        config: configuracion,
        cliente_nombre: presFull.vehiculos?.clientes?.nombre + ' ' + (presFull.vehiculos?.clientes?.apellido || ''),
        cliente_documento: presFull.vehiculos?.clientes?.documento,
        items: presFull.presupuesto_items,
        fecha_emision: factura.created_at
      };

      setPrintData(datosParaFactura);
      setPrintType('factura');

      setTimeout(() => {
        window.print();
        setPrintData(null);
        setPrintType(null);
      }, 500);

    } catch (error) {
      alert("Error al recuperar la factura.");
    }
  }

  const generarDocumento = async (tipo: 'presupuesto' | 'orden', datosHistoricos?: any, garantiaForzada?: boolean, motivoForzado?: string) => {
    if (tipo === 'presupuesto') await actualizarAEnEsperaSiEsBorrador();

    const esHistorico = !!datosHistoricos;
    const v_cliente = esHistorico ? datosHistoricos.vehiculos?.clientes : clienteActual;
    const v_vehiculo = esHistorico ? datosHistoricos.vehiculos : vehiculoActual;
    
    // --- MAGIA: DATOS DE CONTINGENCIA SI ES RÁPIDO ---
    const c_doc = v_cliente || { tipo_cliente: 'fisica', nombre: 'Consumidor Final', apellido: '', telefono: '-' };
    const v_doc = v_vehiculo || { patente: 'SIN-PATENTE', marca: 'Mostrador', modelo: '' };

    const v_filas = esHistorico ? (datosHistoricos.presupuesto_items || []) : filas.filter(f => f.detalle.trim() !== "" && f.estado_cambio !== 'eliminado');
    const v_total = esHistorico ? datosHistoricos.total_final : totalFinal;

    const datosFormateadosParaPlantilla = {
      cliente_nombre: c_doc.tipo_cliente === 'empresa' ? c_doc.razon_social : `${c_doc.nombre || ''} ${c_doc.apellido || ''}`.trim(),
      cliente_telefono: c_doc.telefono || '-',
      vehiculo_patente: v_doc.patente || 'SIN-PATENTE',
      vehiculo_modelo: `${v_doc.marca || ''} ${v_doc.modelo || ''}`.trim(),
      vehiculo_anio: v_doc.año || v_doc.anio || v_doc.year || '',
      vehiculo_color: v_doc.color || '',
      vehiculo_kilometros: v_doc.kilometros || v_doc.km || v_doc.kilometraje || '',
      numero_correlativo: esHistorico ? datosHistoricos.numero_correlativo : (numeroCorrelativo || "BORRADOR"),
      fecha_emision: esHistorico ? datosHistoricos.fecha_emision : fecha,
      items: v_filas,
      total_final: v_total,
      validez_dias: validez,
      observaciones_publicas: esHistorico ? datosHistoricos.observaciones_publicas : notasCliente,
      notas_internas: esHistorico ? datosHistoricos.notas_internas : notasInternas,
      config: configuracion,
      km_ingreso: esHistorico ? datosHistoricos.km_ingreso : kmIngreso,
      km_egreso: esHistorico ? datosHistoricos.km_egreso : kmEgreso,
      demora_estimada: esHistorico ? datosHistoricos.demora_estimada : demoraEstimada,
      es_garantia: garantiaForzada || esGarantiaImpresion,
      motivo_garantia: motivoForzado || motivoGarantiaImpresion,
      descuento: esHistorico ? (datosHistoricos.descuento || 0) : (parseFloat(descuento.toString()) || 0),
      subtotal: esHistorico ? (datosHistoricos.total_final + Number(datosHistoricos.descuento || 0)) : subtotalNeto,
    };

    setPrintType(tipo);
    setPrintData(datosFormateadosParaPlantilla);

    setTimeout(() => {
      const tituloOriginal = document.title;
      // Limpiamos la patente de caracteres raros que rompan el PDF
      const patenteSegura = (v_doc.patente || "SIN-PATENTE").replace(/[^a-zA-Z0-9-]/g, "_");
      
      if (tipo === 'presupuesto') {
        document.title = `Presupuesto_${patenteSegura}`;
      } else if (tipo === 'orden') {
        document.title = `OrdenTrabajo_${patenteSegura}`;
      }

      window.print();
      document.title = tituloOriginal;
    }, 300);
  }

  const finalizarIngresoTaller = async (actualizacionesStock: any[], estadoFinal: string) => {
    try {
      // APLICAMOS EL DESCUENTO DE STOCK
      for (const act of actualizacionesStock) {
        const { error: errStock } = await supabase.from('catalogo').update({ stock_actual: act.nuevoStock }).eq('id', act.id);
        if (errStock) await supabase.from('catalogo').update({ stock_actual: 0 }).eq('id', act.id); // Plan B

        // --- NUEVO: AUTODISPARADOR DE PEDIDOS AL INGRESAR ---
        if (act.tipo === 'Neumático' || act.tipo === 'Repuesto') {
          await supabase.from('pedidos_proveedor').insert([{
            catalogo_id: act.id,
            detalle: act.detalle,
            cantidad: act.cantDescontada,
            estado: 'Pedir'
          }]);
        }
      }
      
      await supabase.from('presupuestos').update({
        estado: estadoFinal, ingresado_al_taller: true, modificado_por_rol: userRole || 'admin'
      }).eq('id', editandoId);
      
      setEstado(estadoFinal);
      setIsAprobarModalOpen(false);

      const nombreCompleto = clienteActual?.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual?.nombre || ''} ${clienteActual?.apellido || ''}`.trim();
      
      const { error: tallerError } = await supabase.from('ordenes_trabajo').insert([{
        presupuesto_id: editandoId, vehiculo_patente: vehiculoSeleccionado, cliente_nombre: nombreCompleto || "Cliente", estado: 'A Ingresar'
      }]);

      if (tallerError) throw tallerError;
      
      alert("¡Ingreso exitoso! El vehículo ya está en el tablero del taller.");
      cargarDatos(); 
      setVista("lista");
      if (onNavigateToTaller) onNavigateToTaller();
    } catch (error) {
      alert("Error al finalizar el ingreso.");
    }
  }

  const procesarAprobacion = async (opcion: "turnos" | "inmediato") => {
    // 1. Validación de Presupuesto Rápido (No se puede ingresar al taller sin auto)
    if (!vehiculoSeleccionado || vehiculoSeleccionado === "SIN-PATENTE") {
       return alert("⚠️ Para ingresar el vehículo al Taller o programar un Turno, el presupuesto debe estar asociado a un Auto y un Cliente. Utilice el botón 'Activar Edición' para cargarlos.");
    }

    try {
      // 2. EL CANDADO: Revisamos en la base de datos si ya existe para evitar duplicados
      const { data: tallerExistente, error: errExistente } = await supabase
        .from('ordenes_trabajo')
        .select('id')
        .eq('presupuesto_id', editandoId);
        
      if (errExistente) throw errExistente;

      if (tallerExistente && tallerExistente.length > 0) {
        alert("⚠️ ATENCIÓN: Este presupuesto ya fue ingresado al Taller. No se puede duplicar.");
        setIsAprobarModalOpen(false);
        // Si por algún motivo el botón no había desaparecido, forzamos a que lo haga ahora
        await supabase.from('presupuestos').update({ ingresado_al_taller: true }).eq('id', editandoId);
        cargarDatos();
        return;
      }

      if (opcion === "turnos") {
        setIsAprobarModalOpen(false);
        if (onNavigateToTurnos) {
          onNavigateToTurnos({ patente: vehiculoSeleccionado, presupuesto_id: editandoId });
        }
      } else if (opcion === "inmediato") {
        const presuActual = presupuestos.find(p => p.id === editandoId);
        const estadoFinal = (presuActual?.estado === "Cobrado" || presuActual?.estado === "Facturado") ? presuActual.estado : "Aprobado";

        // --- MAGIA DE STOCK: PRE-CHEQUEO Y ADVERTENCIA ---
        let faltantes: string[] = [];
        let actualizacionesStock: any[] = [];

        for (const fila of filas) {
          if (fila.catalogo_id && (fila.tipo === "Repuesto" || fila.tipo === "Neumático")) {
            const cantPedida = parseFloat(fila.cant) || 0;
            if (cantPedida > 0) {
              // CAMBIO ACÁ: Traemos también el dato 'controlar_stock'
              const { data: item } = await supabase.from('catalogo').select('stock_actual, detalle, controlar_stock').eq('id', fila.catalogo_id).single();
              
              // CAMBIO ACÁ: Solo evaluamos si controlar_stock es TRUE (o si es null por compatibilidad vieja)
              if (item && item.controlar_stock !== false) {
                if ((item.stock_actual || 0) < cantPedida) {
                  faltantes.push(`- ${item.detalle} (Faltan: ${cantPedida - (item.stock_actual || 0)})`);
                }
                actualizacionesStock.push({
                  id: fila.catalogo_id,
                  nuevoStock: (item.stock_actual || 0) - cantPedida,
                  // --- NUEVO PARA EL AUTODISPARADOR ---
                  tipo: fila.tipo,
                  detalle: item.detalle,
                  cantDescontada: cantPedida
                });
              }
            }
          }
        }

        // SI HAY FALTANTES, ABRIMOS EL MODAL LINDO Y CORTAMOS
        if (faltantes.length > 0) {
          setAlertaStock({ visible: true, faltantes, actualizaciones: actualizacionesStock, estadoFinal });
          return; 
        }

        // SI HAY STOCK PERFECTO, TERMINAMOS EL TRABAJO DIRECTO
        await finalizarIngresoTaller(actualizacionesStock, estadoFinal);
      }
    } catch (error) {
      console.error(error);
      alert("Error al procesar la aprobación.");
    }
  }

  const handleReingresoGarantia = async () => {
    if (!motivoGarantia.trim()) return alert("⚠️ Debe ingresar un motivo o falla para registrar la garantía.");
    
    setIsSaving(true);
    try {
      const nombreCompleto = clienteActual?.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual?.nombre || ''} ${clienteActual?.apellido || ''}`.trim();

      const { error: tallerError } = await supabase.from('ordenes_trabajo').insert([{
        presupuesto_id: editandoId,
        vehiculo_patente: vehiculoSeleccionado,
        cliente_nombre: nombreCompleto || "Cliente",
        estado: 'A Ingresar',
        es_garantia: true,
        motivo_garantia: motivoGarantia
      }]);

      if (tallerError) throw tallerError;

      // Seteamos los datos para la impresora
      setEsGarantiaImpresion(true);
      setMotivoGarantiaImpresion(motivoGarantia);

      setIsGarantiaModalOpen(false); // Cerramos el modal primero

      if (imprimirAlGuardar) {
        // Le mandamos los datos directo en la mano a la impresora para que no tenga que esperar a React
        setTimeout(() => {
          generarDocumento('orden', undefined, true, motivoGarantia);
        }, 300);
      } else {
        // Solo mostramos el cartel verde de éxito si NO imprime (porque la impresión ya es un éxito en sí mismo)
        alert("¡Reingreso exitoso! El vehículo volvió al tablero del taller.");
      }

      setMotivoGarantia("");
      cargarDatos();
      
      // ELIMINAMOS la navegación automática al taller (onNavigateToTaller) 
      // para que no le rompa la foto a la impresora. El usuario se queda acá y navega él.

    } catch (error) {
      console.error(error);
      alert("Error al procesar el reingreso por garantía.");
    } finally {
      setIsSaving(false);
    }
  }


  const handleRegistrarCobro = async () => {
    const montoNum = parseFloat(montoCobro);
    if (isNaN(montoNum) || montoNum <= 0) return alert("Ingrese un monto válido.");
    
    // --- CAMBIO 1: Validamos contra lo que RESTA cobrar, no contra el total histórico ---
    if (montoNum > infoPago.restante) return alert("El monto no puede superar lo que resta cobrar.");

    // --- MAGIA: CANDADO ANTI-DESINCRONIZACIÓN ---
    // Frenamos el proceso 1 segundo para revisar la base de datos real
    if (editandoId) {
      const { data: presDB } = await supabase.from('presupuestos').select('total_final, modificado_por_nombre').eq('id', editandoId).single();
      
      // Si la diferencia entre lo que la cajera ve y lo que hay en la base es mayor a 1 peso (alguien lo modificó de fondo):
      if (presDB && Math.abs(Number(presDB.total_final) - totalFinal) > 1) {
        return alert(`⚠️ ERROR DE COBRO FRENADO:\n\n${presDB.modificado_por_nombre || 'Alguien'} acaba de modificar este presupuesto desde otra computadora mientras lo tenías abierto.\n\nEl total real ahora es $${presDB.total_final}.\nPor favor, cerrá esta ventana y volvé a abrir el presupuesto para actualizar los valores antes de cobrar.`);
      }
    }
    // ---------------------------------------------

    setIsSaving(true);
    try {
      // 1. Ruteo automático de Cajas 
      const cajaMostrador = cajas.find(c => c.nombre.toLowerCase().includes('mostrador'));
      let cajaDestinoId = null;
      
      if (metodoPago === 'Efectivo') cajaDestinoId = cajaMostrador?.id;
      if (metodoPago === 'Transferencia') cajaDestinoId = cajas.find(c => c.nombre.toLowerCase().includes('transferencia'))?.id;
      if (metodoPago === 'Cheque') cajaDestinoId = cajas.find(c => c.nombre.toLowerCase().includes('cheque'))?.id;
      
      // --- MAGIA: RUTEO INTELIGENTE DE TARJETAS ---
      if (metodoPago === 'Tarjeta') {
        if (tipoTarjeta === 'Débito (Taller)') {
          cajaDestinoId = cajas.find(c => c.nombre.toLowerCase().includes('debito taller') || c.nombre.toLowerCase().includes('débito taller'))?.id;
        } else if (tipoTarjeta === 'Crédito (Neumater)') {
          cajaDestinoId = cajas.find(c => c.nombre.toLowerCase().includes('neumater') || c.nombre.toLowerCase().includes('neumarter'))?.id;
        } else if (tipoTarjeta === 'Crédito (Taller)') {
          cajaDestinoId = cajas.find(c => c.nombre.toLowerCase().includes('credito taller') || c.nombre.toLowerCase().includes('crédito taller'))?.id;
        }
      }

      if (!cajaDestinoId && metodoPago !== 'Cuenta Corriente') {
        throw new Error("Caja destino no encontrada. Verifique que las cajas existan en la base de datos.");
      }

      if (cajaDestinoId) {
        // CANDADO ANTI-PISADA: Consultamos el saldo REAL en la base de datos en este preciso milisegundo
        const { data: cajaReal } = await supabase.from('cajas').select('saldo').eq('id', cajaDestinoId).single();
        
        if (cajaReal) {
          await supabase.from('cajas').update({ saldo: Number(cajaReal.saldo || 0) + montoNum }).eq('id', cajaDestinoId);
        }
      }

      // --- MAGIA: SI PASA A CUENTA CORRIENTE, ACTIVAMOS EL INTERRUPTOR Y CREAMOS LA DEUDA ---
      if (metodoPago === 'Cuenta Corriente' && clienteSeleccionado) {
        // A) Leemos el saldo actual del cliente
        const { data: cliData } = await supabase.from('clientes').select('saldo').eq('id', clienteSeleccionado).single();
        const nuevoSaldoCli = Number(cliData?.saldo || 0) + montoNum;

        // B) Encendemos la cuenta y le sumamos la deuda al saldo total
        await supabase.from('clientes')
          .update({ tiene_cuenta_corriente: true, saldo: nuevoSaldoCli })
          .eq('id', clienteSeleccionado);
          
        // C) Registramos la deuda real en su historial con el vocabulario correcto
        await supabase.from('movimientos_clientes').insert([{
          cliente_id: clienteSeleccionado,
          monto: montoNum,
          tipo: 'cargo_deuda',
          comprobante: `PRE-${numeroCorrelativo}`,
          detalle: `Deuda por Presupuesto PRE-${numeroCorrelativo}`
        }]);
      }
      // ---------------------------------------------------------------------------------

      // 3. Registro de movimiento en CAJA (INTACTO)
      let detalleExtra = "";
      if (metodoPago === 'Transferencia' && bancoOrigen) detalleExtra = ` [${bancoOrigen}]`;
      if (metodoPago === 'Tarjeta') detalleExtra = ` [${marcaTarjeta} ${tipoTarjeta}]`;

      await supabase.from('movimientos_caja').insert([{
        tipo_movimiento: 'ingreso_cobro',
        caja_destino_id: cajaDestinoId,
        monto: montoNum,
        metodo_pago: metodoPago,
        presupuesto_id: editandoId,
        detalle: `Cobro PRE-${numeroCorrelativo} (${vehiculoSeleccionado})${detalleExtra}`,
        notas: notasCobro
      }]);

      // --- CAMBIO 2: Actualizar presupuesto sumando pagos históricos ---
      const nuevoPagado = infoPago.pagado + montoNum;
      
      // Si lo que pagó antes + lo que paga ahora llega al Total, se marca como Cobrado
      const nuevoEstado = nuevoPagado >= totalFinal ? "Cobrado" : "Aprobado";
      
      await supabase.from('presupuestos').update({ 
        estado: nuevoEstado, 
        estado_pago: nuevoEstado === "Cobrado" ? "Cobrado" : "Parcial",
        modificado_por_rol: userRole || 'admin'
      }).eq('id', editandoId);

      setEstado(nuevoEstado);
      setIsCobroModalOpen(false);
      alert("¡Cobro registrado! El dinero ya impactó en la caja correspondiente.");
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleAnularCobro = async () => {
    if (!editandoId) return;
    setIsSaving(true);

    try {
      // 1. Buscamos todos los cobros reales que ingresaron por este presupuesto
      const { data: movimientos, error: errMovs } = await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('presupuesto_id', editandoId)
        .eq('tipo_movimiento', 'ingreso_cobro');

      if (errMovs) throw errMovs;

      if (!movimientos || movimientos.length === 0) {
        setAnulacionError({
          visible: true,
          titulo: "No se encontraron cobros",
          mensaje: "Este presupuesto no registra movimientos de dinero activos en la caja."
        });
        setIsSaving(false);
        return;
      }

      // 2. CANDADO DE SEGURIDAD: Verificar si los cobros se hicieron HOY
      const hoy = new Date().toLocaleDateString('es-AR');
      const tieneCobrosViejos = movimientos.some((m: any) => new Date(m.fecha).toLocaleDateString('es-AR') !== hoy);

      if (tieneCobrosViejos) {
        setAnulacionError({
          visible: true,
          titulo: "Acción Bloqueada por Auditoría",
          mensaje: "No podés anular el cobro de este trabajo porque se realizó en días anteriores y esa caja ya fue cerrada. Por seguridad contable, solicitá un ajuste al administrador."
        });
        setIsSaving(false);
        return;
      }

      // 3. ¡PROCESAMOS LA REVERSIÓN AUDITABLE!
      for (const mov of movimientos) {
        const montoNum = Number(mov.monto);

        // A) Si afectó a una Caja Física, le restamos el dinero generando el contra-asiento
        if (mov.caja_destino_id) {
          const { data: cajaReal } = await supabase.from('cajas').select('saldo').eq('id', mov.caja_destino_id).single();
          if (cajaReal) {
            await supabase.from('cajas').update({ saldo: Number(cajaReal.saldo || 0) - montoNum }).eq('id', mov.caja_destino_id);
          }
        }

        // B) Si fue a Cuenta Corriente, le restamos la deuda del perfil del cliente
        if (mov.metodo_pago === 'Cuenta Corriente' && clienteSeleccionado) {
          const { data: cliReal } = await supabase.from('clientes').select('saldo').eq('id', clienteSeleccionado).single();
          const nuevoSaldoCli = Number(cliReal?.saldo || 0) - montoNum;
          
          await supabase.from('clientes').update({ 
            saldo: nuevoSaldoCli,
            tiene_cuenta_corriente: nuevoSaldoCli > 0 
          }).eq('id', clienteSeleccionado);

          // Registramos la contra-orden en su cuenta corriente
          await supabase.from('movimientos_clientes').insert([{
            cliente_id: clienteSeleccionado,
            monto: -montoNum,
            tipo: 'pago_abono', // Lo compensamos simulando una entrega/crédito
            comprobante: `ANUL-PRE-${numeroCorrelativo}`,
            detalle: `ANULACIÓN: Devolución de cargo por presupuesto PRE-${numeroCorrelativo}`
          }]);
        }

        // C) Insertamos el Contra-Movimiento en la caja para la Cinta de Auditoría
        await supabase.from('movimientos_caja').insert([{
          tipo_movimiento: 'egreso_gasto',
          caja_origen_id: mov.caja_destino_id,
          monto: montoNum,
          metodo_pago: mov.metodo_pago,
          presupuesto_id: editandoId,
          detalle: `REVERSIÓN: Anulación Cobro PRE-${numeroCorrelativo} (${vehiculoSeleccionado})`,
          notas: `Anulado en mostrador por corrección de cobro.`
        }]);
      }

      // 4. Devolvemos el presupuesto al estado "Aprobado"
      await supabase.from('presupuestos').update({
        estado: 'Aprobado',
        estado_pago: null,
        modificado_por_rol: userRole || 'admin',
        modificado_por_nombre: userName || 'Usuario'
      }).eq('id', editandoId);

      setEstado('Aprobado');
      setIsAnulacionModalOpen(false);
      alert("¡Cobro anulado con éxito! Las cajas se balancearon y el presupuesto volvió a estar disponible para cobrar.");
      cargarDatos();

    } catch (error: any) {
      alert("Error en la base de datos al revertir: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-6 pb-8 print:hidden">
        {vista === "detalle" ? (
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
              <Button variant="ghost" onClick={() => {
                setVista("lista");
                setEditandoId(null);
                setIsEditing(false);
                if (onClearPresupuestoDetalle) onClearPresupuestoDetalle();
                if (onVolver) onVolver();
              }} className="text-muted-foreground hover:text-foreground w-fit">
                <ArrowLeft className="h-4 w-4 mr-2"/> Volver
              </Button>
              
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing && editandoId && (
                  <>
                    {/* Botón Cobrar: Se oculta si ya está 100% Cobrado o Facturado */}
                    {estado !== "Facturado" && estado !== "Cobrado" && userRole !== 'mecanico' && (
                      <Button variant="default" onClick={async () => {
                        setIsSaving(true);
                        try {
                          // Calculamos el neto real: Cobros menos Anulaciones
                          const { data: pagos } = await supabase.from('movimientos_caja').select('monto, tipo_movimiento').eq('presupuesto_id', editandoId);
                          const pagadoTotal = pagos?.reduce((acc: any, mov: any) => {
                            if (mov.tipo_movimiento === 'ingreso_cobro') return acc + Number(mov.monto);
                            if (mov.tipo_movimiento === 'egreso_gasto') return acc - Number(mov.monto);
                            return acc;
                          }, 0) || 0;
                          const restante = totalFinal - pagadoTotal;
                          
                          setInfoPago({ pagado: pagadoTotal, restante: restante });
                          setMontoCobro(restante > 0 ? restante.toString() : "0");
                          setMetodoPago("Efectivo");
                          setNotasCobro("");
                          setIsCobroModalOpen(true);
                        } catch (e) {
                          alert("Error al verificar cobros previos.");
                        } finally {
                          setIsSaving(false);
                        }
                      }} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm border-none mr-2">
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Banknote className="w-4 h-4 mr-2"/>} Registrar Cobro
                      </Button>
                    )}

                    {/* Botón Ingresar: Desaparece si 'ingresado_al_taller' es TRUE */}
                    {estado !== "Facturado" && userRole !== 'mecanico' && !presupuestos.find(p => p.id === editandoId)?.ingresado_al_taller && (
                      <Button variant="default" onClick={() => setIsAprobarModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none mr-4">
                        <CheckCircle className="w-4 h-4 mr-2"/> {estado === "Cobrado" ? "Ingresar Vehículo al Taller" : "Aprobar sin Cobrar"}
                      </Button>
                    )}
                    {userRole !== 'mecanico' && (
                      <Button variant="outline" onClick={() => setIsAsociarModalOpen(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400">
                        <Link2 className="w-4 h-4 mr-2"/> Asociar
                      </Button>
                    )}

                    {/* Botón Quirúrgico: Anular Cobro (Visible solo para presupuestos ya cobrados/facturados) */}
                    {userRole !== 'mecanico' && (estado === "Cobrado" || estado === "Facturado") && (
                      <Button 
                        variant="outline"
                        onClick={() => setIsAnulacionModalOpen(true)}
                        className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400 mr-2"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" /> Anular Cobro
                      </Button>
                    )}

                    {/* --- NUEVO BOTÓN MÁGICO: REINGRESO POR GARANTÍA --- */}
                    {userRole !== 'mecanico' && (estado === "Cobrado" || estado === "Facturado") && presupuestos.find(p => p.id === editandoId)?.ingresado_al_taller && (
                      <Button onClick={() => setIsGarantiaModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-sm border-none">
                        🛡️ Reingreso por Garantía
                      </Button>
                    )}
                    {/* ---------------------------------------------------- */}

                    {estado !== "Facturado" && (
                      <>
                        <Button variant="outline" onClick={() => setIsEditing(true)} className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                          <Pencil className="w-4 h-4 mr-2"/> Activar Edición
                        </Button>
                        <div className="h-6 w-px bg-border mx-2"></div>
                      </>
                    )}
                  </>
                )}

                {isEditing && (
                  <>
                    <Button variant="ghost" onClick={() => { if(editandoId) { setIsEditing(false); handleAbrirPresupuesto(presupuestos.find(p=>p.id === editandoId)); } else { setVista("lista"); } }} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4 mr-2"/> Cancelar Edición
                    </Button>
                    <Button onClick={handleGuardarPresupuesto} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} {editandoId ? "Guardar Cambios" : "Crear Presupuesto"}
                    </Button>
                    <div className="h-6 w-px bg-border mx-2"></div>
                  </>
                )}

                <Button variant="outline" onClick={() => generarDocumento('orden')} className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                  <ClipboardList className="w-4 h-4 mr-2"/> Orden Papel
                </Button>
                
                {userRole !== 'mecanico' && (
                  <>
                    <Button variant="outline" onClick={() => generarDocumento('presupuesto')} className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                      <Printer className="w-4 h-4 mr-2"/> PDF / Imprimir
                    </Button>
                    <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm border-none ml-2">
                      <MessageCircle className="w-4 h-4 mr-2"/> WhatsApp
                    </Button>
                    {estado === "Facturado" && editandoId && (
                      <Button variant="outline" onClick={() => handleVerFactura(editandoId)} className="bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm">
                        <FileText className="w-4 h-4 mr-2"/> Ver Factura AFE
                      </Button>
                    )}
                  </>
                )}

              </div>
            </div>
            <Card className={`border-border shadow-sm transition-all ${isEditing ? 'ring-2 ring-emerald-500/20' : ''}`}>
              <CardHeader className="bg-secondary/10 border-b border-border pb-4">
                <CardTitle className="text-lg flex justify-between items-center text-emerald-700 dark:text-emerald-500">
                  <div className="flex items-center gap-2"><FileText className="w-5 h-5" /> Datos del Presupuesto</div>
                  {editandoId && <Badge variant="outline" className="font-mono text-base bg-background px-3 py-1">PRE-{numeroCorrelativo}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 print:hidden">
                  
                  {isEditing && (
                    <div className="md:col-span-6 space-y-2 relative">
                      <Label>Buscador Inteligente <span className="text-muted-foreground text-xs font-normal">(Patente, Nombre o DNI)</span></Label>
                      <div className="flex">
                        <Input
                          placeholder="Escriba aquí para buscar..."
                          className="bg-white dark:bg-slate-950 h-10 rounded-r-none border-r-0 border-emerald-500 ring-emerald-500 focus-visible:ring-emerald-500 shadow-sm"
                          value={busquedaEntidad}
                          onChange={(e: any) => { setBusquedaEntidad(e.target.value); setMostrarResultados(true); }}
                          onFocus={() => setMostrarResultados(true)}
                          onBlur={() => setTimeout(() => setMostrarResultados(false), 300)}
                        />
                        <Button variant="outline" className="rounded-l-none bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100 px-4 h-10 border-l-0"><Search className="h-4 w-4"/></Button>
                      </div>

                      {mostrarResultados && busquedaEntidad.length > 0 && (vehiculosBusqueda.length > 0 || clientesBusqueda.length > 0) && (
                        <div className="absolute top-[72px] left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                          {vehiculosBusqueda.map(v => {
                            const c = clientes.find(cl => cl.id === v.cliente_id)
                            return (
                              <div key={v.id} onMouseDown={() => seleccionarVehiculoBuscador(v)} className="p-2.5 hover:bg-emerald-600 hover:text-white cursor-pointer flex items-center gap-3 border-b border-border/50 text-sm transition-colors group">
                                <span className="bg-[#008A4B] text-white px-2 py-1 rounded font-mono font-bold tracking-widest">{v.patente}</span>
                                <span className="font-medium">- {c?.tipo_cliente === 'empresa' ? c.razon_social : `${c?.nombre} ${c?.apellido}`} ({v.marca} {v.modelo})</span>
                              </div>
                            )
                          })}
                          {clientesBusqueda.map(c => (
                            <div key={c.id} onMouseDown={() => seleccionarClienteBuscador(c)} className="p-3 hover:bg-secondary cursor-pointer flex items-center gap-2 border-b border-border/50 text-sm transition-colors">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-bold">{c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido}`}</span>
                              <span className="text-muted-foreground text-xs">({c.documento || 'Sin DNI'})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={isEditing ? "md:col-span-2 space-y-2" : "md:col-span-4 space-y-2"}>
                    <Label>Fecha de Emisión</Label>
                    <Input type="date" value={fecha} onChange={(e: any) => setFecha(e.target.value)} disabled={!isEditing} className="bg-slate-50 dark:bg-slate-900 h-10 disabled:opacity-100 disabled:font-medium" />
                  </div>
                  <div className={isEditing ? "md:col-span-2 space-y-2" : "md:col-span-4 space-y-2"}>
                    <Label>Validez (Días)</Label>
                    <Input type="number" value={validez} onChange={(e: any) => setValidez(e.target.value)} readOnly={!isEditing} className={`h-10 ${!isEditing ? 'bg-secondary/20 font-medium' : 'bg-slate-50 dark:bg-slate-900'}`} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <Label>Estado</Label>
                    <Select value={estado} onValueChange={setEstado} disabled={!isEditing || userRole === 'mecanico'}>
                      <SelectTrigger className={`h-10 border-border font-medium disabled:opacity-100 ${getEstadoColor(estado)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Borrador">Borrador</SelectItem>
                        <SelectItem value="En Espera">En Espera</SelectItem>
                        <SelectItem value="Aprobado">Aprobado</SelectItem>
                        <SelectItem value="Rechazado">Rechazado</SelectItem>
                        <SelectItem value="Facturado">Facturado</SelectItem>
                        <SelectItem value="Cobrado">Cobrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                  
                  {/* --- CLIENTE VINCULADO CON ALERTA DE DEUDA --- */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3"/> Cliente Vinculado
                    </Label>
                    
                    {/* Caja visual para el cliente, reemplaza al input readOnly aburrido */}
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-secondary/20 px-3 py-2">
                      <span className="text-sm font-bold truncate">
                        {clienteActual ? 
                          (clienteActual.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual.nombre} ${clienteActual.apellido}`) 
                          : (isEditing ? "Se completa al buscar arriba..." : "Sin registrar")
                        }
                      </span>
                      
                      {/* LA MAGIA: Etiqueta de deuda que aparece solo si debe plata */}
                      {clienteActual && Number(clienteActual.saldo) > 0 && (
                        <span 
                          title={`Deuda pendiente: $${Number(clienteActual.saldo).toLocaleString()}`} 
                          className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full shrink-0 ml-2"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" /> Deuda
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3"/> Vehículo a Reparar {isEditing && <span className="text-destructive">*</span>}</Label>
                    <select
                      className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-bold ${!isEditing ? 'bg-secondary/20 pointer-events-none appearance-none' : 'bg-white dark:bg-slate-950'}`}
                      value={vehiculoSeleccionado}
                      onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                      disabled={!isEditing || !clienteSeleccionado}
                    >
                      <option value="" disabled>
                        {clienteSeleccionado ? "Seleccione un vehículo..." : (isEditing ? "Esperando cliente..." : "Sin registrar")}
                      </option>
                      {vehiculosDelCliente.map(v => (
                        <option key={v.patente} value={v.patente}>
                          {v.marca} {v.modelo} ({v.patente})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</Label>
                    
                    {userRole !== 'mecanico' ? (
                      <Input
                        readOnly
                        placeholder="-"
                        value={clienteActual?.telefono || ""}
                        className="bg-secondary/20 text-foreground font-medium font-mono h-10 border-border pointer-events-none"
                      />
                    ) : (
                      <div className="flex h-10 w-full items-center justify-center rounded-md border border-border/50 bg-secondary/20 text-xs italic text-muted-foreground pointer-events-none">
                        *** Protegido ***
                      </div>
                    )}
                  </div>

                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 mt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3"/> KM Ingreso</Label>
                    <Input type="number" value={kmIngreso} onChange={(e: any) => setKmIngreso(e.target.value)} readOnly={!isEditing} className={`h-10 font-mono ${!isEditing ? 'bg-secondary/20 pointer-events-none font-bold text-foreground' : 'bg-white dark:bg-slate-950'}`} placeholder="Ej: 145000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3"/> KM Egreso (Al entregar)</Label>
                    <Input type="number" value={kmEgreso} onChange={(e: any) => setKmEgreso(e.target.value)} readOnly={!isEditing} className={`h-10 font-mono ${!isEditing ? 'bg-secondary/20 pointer-events-none font-bold text-foreground' : 'bg-white dark:bg-slate-950'}`} placeholder="Completar al retirar..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Demora Estimada</Label>
                    <Input value={demoraEstimada} onChange={(e: any) => setDemoraEstimada(e.target.value)} readOnly={!isEditing} className={`h-10 ${!isEditing ? 'bg-secondary/20 pointer-events-none font-bold text-foreground' : 'bg-white dark:bg-slate-950'}`} placeholder="Ej: Jueves por la tarde..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-border shadow-sm transition-all ${isEditing ? 'ring-2 ring-emerald-500/20' : ''}`}>
              <CardHeader className="bg-secondary/10 border-b border-border py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Detalle de Repuestos y Trabajos</CardTitle>
                {userRole !== 'mecanico' && (
                  <Button variant="outline" size="sm" onClick={() => setMostrarCostos(!mostrarCostos)} className={`print:hidden ${mostrarCostos ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" : "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900"}`}>
                    {mostrarCostos ? <Eye className="w-4 h-4 mr-2"/> : <EyeOff className="w-4 h-4 mr-2"/>} {mostrarCostos ? "Ocultar Costos" : "Costos Ocultos"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/5 hover:bg-secondary/5">
                        <TableHead className="w-[155px] print:hidden">Tipo</TableHead>
                        <TableHead>Descripción del Trabajo / Repuesto</TableHead>
                        <TableHead className="w-[80px] text-center">Cant.</TableHead>
                        {mostrarCostos && userRole !== 'mecanico' && <TableHead className="w-[120px] text-right text-amber-600 print:hidden">Costo Unit.</TableHead>}
                        {userRole !== 'mecanico' && <TableHead className="w-[140px] text-right text-emerald-600">Precio Venta</TableHead>}
                        {userRole !== 'mecanico' && <TableHead className="w-[140px] text-right">Subtotal</TableHead>}
                        {isEditing && <TableHead className="w-[50px] print:hidden"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filas.map((fila) => {
                        const catalogoFiltrado = catalogo.filter(c => c.tipo === fila.tipo)
                        
                        let colorFila = "hover:bg-transparent";
                        if (!isEditing && userRole !== 'mecanico') {
                          if (fila.estado_cambio === 'nuevo') {
                            colorFila = "bg-green-100/50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30";
                          } else if (fila.estado_cambio === 'eliminado') {
                            colorFila = "bg-red-100/50 dark:bg-red-900/20 opacity-60 line-through hover:bg-red-100 dark:hover:bg-red-900/30 pointer-events-none";
                          }
                        }

                        return (
                          <TableRow key={fila.id} className={`transition-colors ${colorFila}`}>
                            <TableCell className="print:hidden">
                              {isEditing ? (
                                <Select value={fila.tipo} onValueChange={(v: string) => actualizarFila(fila.id, 'tipo', v)}>
                                  <SelectTrigger className="h-10 bg-white dark:bg-slate-950 w-full px-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Servicio"><TipoBadge tipo="Servicio" /></SelectItem>
                                    <SelectItem value="Mano de Obra"><TipoBadge tipo="Mano de Obra" /></SelectItem>
                                    <SelectItem value="Repuesto"><TipoBadge tipo="Repuesto" /></SelectItem>
                                    <SelectItem value="Neumático"><TipoBadge tipo="Neumático" /></SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="pointer-events-none">
                                  <TipoBadge tipo={fila.tipo} />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {isEditing && (
                                  <BuscadorRepuesto 
                                    fila={fila} 
                                    catalogo={catalogo} 
                                    aplicarItemCatalogo={aplicarItemCatalogo} 
                                  />
                                )}
                                <Input value={fila.detalle} onChange={(e: any) => actualizarFila(fila.id, 'detalle', e.target.value)} readOnly={!isEditing} placeholder={isEditing ? "Escriba el detalle..." : ""} className={`h-10 flex-1 ${!isEditing ? 'bg-transparent border-transparent px-0 font-medium' : 'bg-white dark:bg-slate-950'}`} />
                              </div>
                            </TableCell>
                            <TableCell className="align-top pt-3">
                              <div className="flex flex-col items-center justify-start gap-1">
                                <Input value={fila.cant} onChange={(e: any) => actualizarFila(fila.id, 'cant', e.target.value)} readOnly={!isEditing} className={`h-10 text-center font-mono ${!isEditing ? 'bg-transparent border-transparent px-0 font-bold' : 'bg-white dark:bg-slate-950'}`} />
                                
                                {/* CARTELITO DE STOCK INSUFICIENTE */}
                                {isEditing && (fila.tipo === 'Repuesto' || fila.tipo === 'Neumático') && fila.catalogo_id && parseFloat(fila.cant) > (fila.stock_actual || 0) && (
                                  <span className="text-[10px] text-red-600 font-bold flex items-center text-center bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-0.5 shrink-0" /> Solo hay {fila.stock_actual || 0}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Columnas ocultas al mecánico */}
                            {mostrarCostos && userRole !== 'mecanico' && (
                              <TableCell className="print:hidden"><Input value={fila.costo} onChange={(e: any) => actualizarFila(fila.id, 'costo', e.target.value)} readOnly={!isEditing} className={`h-10 text-right font-mono ${!isEditing ? 'bg-transparent border-transparent px-0 text-amber-700' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900 focus-visible:ring-amber-400'}`} /></TableCell>
                            )}
                            {userRole !== 'mecanico' && (
                              <>
                                <TableCell><Input value={fila.precio} onChange={(e: any) => actualizarFila(fila.id, 'precio', e.target.value)} readOnly={!isEditing} className={`h-10 text-right font-mono ${!isEditing ? 'bg-transparent border-transparent px-0 font-medium' : 'bg-white dark:bg-slate-950'}`} /></TableCell>
                                <TableCell className="text-right font-bold font-mono text-base pt-4">${((parseFloat(fila.precio) || 0) * (parseFloat(fila.cant) || 1)).toLocaleString()}</TableCell>
                              </>
                            )}

                            {isEditing && (
                              <TableCell className="print:hidden">
                                {fila.estado_cambio === 'eliminado' ? (
                                  <Button variant="ghost" size="icon" onClick={() => actualizarFila(fila.id, 'estado_cambio', null)} title="Restaurar ítem" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"><RotateCcw className="w-4 h-4"/></Button>
                                ) : (
                                  <Button variant="ghost" size="icon" onClick={() => eliminarFila(fila.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {isEditing && (
                  <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/30 print:hidden">
                    <Button variant="outline" size="sm" onClick={agregarFilaVacia} className="bg-background"><Plus className="w-4 h-4 mr-2"/> Agregar Fila</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
              <div className="space-y-6">
                <Card className={`border-border shadow-sm ${isEditing ? 'ring-2 ring-emerald-500/20' : ''}`}>
                  <CardContent className="p-4 space-y-2">
                    <Label className="font-semibold text-foreground">Observaciones para el Cliente <span className="text-muted-foreground font-normal text-xs">(Sale en el PDF)</span></Label>
                    <Textarea value={notasCliente} onChange={(e: any) => setNotasCliente(e.target.value)} readOnly={!isEditing} className={`min-h-[80px] ${!isEditing ? 'bg-secondary/10 border-transparent resize-none' : 'bg-slate-50 dark:bg-slate-900 border-border'}`} />
                  </CardContent>
                </Card>
                <Card className={`border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 shadow-sm print:hidden ${isEditing ? 'ring-2 ring-amber-500/30' : ''}`}>
                  <CardContent className="p-4 space-y-2">
                    <Label className="font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2"><Lock className="w-4 h-4"/> Notas Internas Ocultas <span className="text-amber-600/70 font-normal text-xs">(Sale en Orden de Trabajo)</span></Label>
                    <Textarea value={notasInternas} onChange={(e: any) => setNotasInternas(e.target.value)} readOnly={!isEditing} placeholder={isEditing ? "Información solo visible para el taller..." : "Sin notas internas."} className={`min-h-[80px] ${!isEditing ? 'bg-transparent border-transparent resize-none' : 'bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-900 focus-visible:ring-amber-400'}`} />
                  </CardContent>
                </Card>
              </div>
              
              {/* Ocultamos los totales para el mecánico */}
              {userRole !== 'mecanico' && (
                <div className="flex flex-col justify-between">
                  <Card className="border-border shadow-md mb-6">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center text-muted-foreground"><span>Subtotal Neto:</span><span className="font-mono text-lg">${subtotalNeto.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Descuento / Atención:</span>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">-$</span>
                          <Input value={descuento} onChange={(e: any) => setDescuento(e.target.value)} readOnly={!isEditing} className={`h-10 pl-7 text-right font-mono ${!isEditing ? 'bg-transparent border-transparent px-0 font-bold' : 'bg-slate-50 dark:bg-slate-900'}`} />
                        </div>
                      </div>
                      <div className="border-t border-border pt-4 mt-2 flex justify-between items-center"><span className="text-xl font-bold text-foreground">Total Final:</span><span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalFinal.toLocaleString()}</span></div>
                      {mostrarCostos && (<div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex justify-between items-center animate-in fade-in duration-300 print:hidden"><span className="font-semibold text-emerald-800 dark:text-emerald-400">Ganancia Neta Estimada:</span><span className="text-xl font-bold text-emerald-700 dark:text-emerald-500 font-mono">${gananciaEstimada.toLocaleString()}</span></div>)}
                    </CardContent>
                  </Card>

                  {!isEditing && editandoId && (
                    <div className="flex justify-end print:hidden">
                      <Button variant="outline" onClick={() => handleEliminarPresupuesto(editandoId)} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar Presupuesto Permanentemente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODALES OCULTOS EN IMPRESION */}
            <div className="print:hidden">
              <Dialog open={isAsociarModalOpen} onOpenChange={setIsAsociarModalOpen}>
                <DialogContent className="border-border bg-card max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                      <Link2 className="w-5 h-5 text-blue-600" /> Asociar Presupuesto
                    </DialogTitle>
                    <DialogDescription>
                      Seleccioná otro presupuesto abierto de este mismo vehículo. Los repuestos se fusionarán y el presupuesto viejo será eliminado de la lista.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4">
                    <Label className="mb-2 block">Presupuestos Disponibles (Borrador o En Espera)</Label>
                    <Select value={presupuestoAFusionar} onValueChange={setPresupuestoAFusionar}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                        <SelectValue placeholder="Elegir presupuesto a fusionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {presupuestos
                          .filter(p => p.vehiculo_patente === vehiculoSeleccionado && p.id !== editandoId && (p.estado === 'Borrador' || p.estado === 'En Espera'))
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              PRE-{p.numero_correlativo} - ${p.total_final?.toLocaleString()} ({p.estado})
                            </SelectItem>
                          ))
                        }
                        {presupuestos.filter(p => p.vehiculo_patente === vehiculoSeleccionado && p.id !== editandoId && (p.estado === 'Borrador' || p.estado === 'En Espera')).length === 0 && (
                          <SelectItem value="none" disabled>No hay otros presupuestos abiertos para este vehículo.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAsociarModalOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmarFusion} disabled={!presupuestoAFusionar || isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Fusionar Ítems
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAprobarModalOpen} onOpenChange={setIsAprobarModalOpen}>
                <DialogContent className="border-border bg-card max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                      <CheckCircle className="w-6 h-6 text-emerald-600" /> Presupuesto Aprobado
                    </DialogTitle>
                    <DialogDescription>
                      ¡Excelente! El cliente aprobó el trabajo. ¿Cómo desea ingresar el vehículo al sistema del taller?
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 gap-4 py-4">
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                      onClick={() => procesarAprobacion("turnos")}
                    >
                      <CalendarDays className="w-6 h-6 mb-1" />
                      <span className="font-bold">Programar Turno</span>
                      <span className="text-xs opacity-80 font-normal">Agendar en el calendario para otro día</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                      onClick={() => procesarAprobacion("inmediato")}
                    >
                      <Wrench className="w-6 h-6 mb-1" />
                      <span className="font-bold">Recepción Inmediata</span>
                      <span className="text-xs opacity-80 font-normal">El vehículo ya está en el taller</span>
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAprobarModalOpen(false)}>Cancelar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-2xl font-semibold text-foreground">Presupuestos y Órdenes</h2><p className="text-sm text-muted-foreground">Administrá las cotizaciones y órdenes de trabajo del taller.</p></div>
              
              {/* Ahora el mecánico también puede crear presupuestos nuevos (diagnósticos) */}
              <Button onClick={() => handleAbrirPresupuesto()} className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> 
                {userRole === 'mecanico' ? "Nuevo Diagnóstico" : "Nuevo Presupuesto"}
              </Button>
            </div>
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border bg-secondary/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por cliente, patente o Nro..." 
                    className="pl-9 bg-background" 
                    value={busquedaLista}
                    onChange={(e) => setBusquedaLista(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20">
                      <TableHead>Nro</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente y Vehículo</TableHead>
                      
                      {/* Ocultamos el Total al mecánico en la lista */}
                      {userRole !== 'mecanico' && <TableHead className="text-right">Total</TableHead>}
                      
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones Rápidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {isLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-6 w-24 bg-secondary/60 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-5 w-28 bg-secondary/40 rounded animate-pulse"></div></TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="h-5 w-48 bg-secondary/60 rounded animate-pulse"></div>
                                  <div className="h-4 w-32 bg-secondary/40 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                              {userRole !== 'mecanico' && <TableCell className="text-right"><div className="h-6 w-28 bg-secondary/60 rounded animate-pulse ml-auto"></div></TableCell>}
                              <TableCell className="text-center"><div className="h-8 w-32 bg-secondary/60 rounded animate-pulse mx-auto"></div></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <div className="h-8 w-8 bg-secondary/60 rounded animate-pulse"></div>
                                  {userRole !== 'mecanico' && <div className="h-8 w-8 bg-secondary/60 rounded animate-pulse"></div>}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : presupuestosFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={userRole !== 'mecanico' ? 6 : 5} className="h-32 text-center text-muted-foreground">No se encontraron presupuestos.</TableCell></TableRow>
                    ) : (
                      presupuestosFiltrados.map((p) => (
                        <TableRow key={p.id} className="hover:bg-secondary/50 cursor-pointer group transition-colors" onClick={() => handleAbrirPresupuesto(p)}>
                          <TableCell className="font-mono font-bold">
                            PRE-{p.numero_correlativo}
                            {/* --- MAGIA VISUAL: PUNTITO AZUL DE ALERTA --- */}
                            {p.visto_admin === false && userRole !== 'mecanico' && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" title="Cambios sin ver"></span>}
                          </TableCell>
                          <TableCell>{new Date(p.fecha_emision).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>
                            {p.vehiculo_patente ? (
                              <>
                                <div className="font-medium text-foreground group-hover:text-emerald-600 transition-colors">
                                  {p.vehiculos?.clientes?.tipo_cliente === 'empresa' 
                                    ? p.vehiculos?.clientes?.razon_social 
                                    : `${p.vehiculos?.clientes?.nombre || ''} ${p.vehiculos?.clientes?.apellido || ''}`}
                                </div>
                                <div className="text-xs text-muted-foreground">{p.vehiculos?.marca} {p.vehiculos?.modelo} ({p.vehiculo_patente})</div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center">
                                  ⚡ Rápido (Mostrador)
                                </span>
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Ocultamos el precio en la fila al mecánico */}
                          {userRole !== 'mecanico' && (
                            <TableCell className="text-right font-bold font-mono">${p.total_final?.toLocaleString()}</TableCell>
                          )}
                          
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {/* El mecánico ve una etiqueta estática. Los demás ven el selector. */}
                            {userRole === 'mecanico' ? (
                              <Badge className={`${getEstadoColor(p.estado)}`}>{p.estado}</Badge>
                            ) : (
                              <Select value={p.estado} onValueChange={(val: string) => handleCambiarEstadoRapido(p.id, val)}>
                                <SelectTrigger className={`h-8 text-xs w-[130px] mx-auto border ${getEstadoColor(p.estado)}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Borrador">Borrador</SelectItem>
                                  <SelectItem value="En Espera">En Espera</SelectItem>
                                  <SelectItem value="Aprobado">Aprobado</SelectItem>
                                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                                  <SelectItem value="Facturado">Facturado</SelectItem>
                                  <SelectItem value="Cobrado">Cobrado</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>

                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => generarDocumento('orden', p)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Orden de Trabajo"><ClipboardList className="h-4 w-4" /></Button>
                              {userRole !== 'mecanico' && (
                                <Button variant="ghost" size="icon" onClick={() => generarDocumento('presupuesto', p)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="PDF Presupuesto"><Printer className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* ZONA DE IMPRESIÓN (Solo visible al tocar Ctrl+P o Imprimir)  */}
      <div className="hidden print:block fixed inset-0 w-full min-h-screen bg-white z-[9999] overflow-visible">
        {printType === 'presupuesto' && <PresupuestoImprimible datos={printData} />}
        {printType === 'orden' && <OrdenTrabajoImprimible datos={printData} />}
        {printType === 'factura' && <FacturaImprimible datos={printData} />} 
      </div>
    {/* --- MODAL DE COBRO --- */}
              <Dialog open={isCobroModalOpen} onOpenChange={setIsCobroModalOpen}>
                <DialogContent className="max-w-md border-border bg-card">
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2 text-purple-700 dark:text-purple-500">
                      <DollarSign className="w-6 h-6" /> Registrar Pago
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-purple-600/70 uppercase tracking-wider font-bold">Total</p>
                        <p className="font-mono font-bold text-lg text-purple-900 dark:text-purple-100">${totalFinal.toLocaleString()}</p>
                      </div>
                      
                      {/* Cajita del medio SIEMPRE VISIBLE */}
                      <div className="text-center border-l border-r border-purple-200 px-4 mx-2 w-1/3">
                        <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Ya Pagado</p>
                        <p className="font-mono font-bold text-lg text-emerald-600">${infoPago.pagado.toLocaleString()}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-red-600/70 uppercase tracking-wider font-bold">Resta Cobrar</p>
                        <p className="font-mono font-bold text-xl text-red-500">${infoPago.restante.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Monto a Cobrar ($)</Label>
                      <Input type="number" className="text-lg font-mono font-bold h-12 border-purple-300 ring-purple-500 focus-visible:ring-purple-500" value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} autoFocus />
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
                        <Label className="text-xs font-bold uppercase text-purple-600">Banco de Origen (Cliente)</Label>
                        <Input placeholder="Ej: Banco Galicia, MercadoPago..." value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} />
                      </div>
                    )}

                    {metodoPago === 'Tarjeta' && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-purple-600">Tipo</Label>
                          <Select value={tipoTarjeta} onValueChange={setTipoTarjeta}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {/* --- ACÁ ESTÁN LAS 3 OPCIONES NUEVAS --- */}
                              <SelectItem value="Débito (Taller)">Débito (Taller)</SelectItem>
                              <SelectItem value="Crédito (Taller)">Crédito (Taller)</SelectItem>
                              <SelectItem value="Crédito (Neumater)">Crédito (Neumater)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-purple-600">Marca</Label>
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
                          <Label className="text-xs font-bold uppercase text-purple-600">Banco Emisor</Label>
                          <Input placeholder="Ej: Santander, BBVA..." value={bancoTarjeta} onChange={(e) => setBancoTarjeta(e.target.value)} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label>Notas Adicionales (Opcional)</Label>
                      <Input placeholder="Ej: Seña del 50%..." value={notasCobro} onChange={(e) => setNotasCobro(e.target.value)} />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsCobroModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleRegistrarCobro} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Confirmar Cobro
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* MODAL LINDO DE STOCK INSUFICIENTE */}
      <Dialog open={alertaStock.visible} onOpenChange={(open: boolean) => !open && setAlertaStock({ ...alertaStock, visible: false })}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
              <AlertTriangle className="w-6 h-6" /> Stock Insuficiente
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <p className="text-sm text-foreground">
              El sistema detectó que no hay stock suficiente para cubrir este ingreso. ¿Desea ingresar el vehículo al taller de todas formas?
            </p>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
              <ul className="space-y-2 text-sm text-red-800 dark:text-red-300 font-medium">
                {alertaStock.faltantes.map((faltante, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {faltante}
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              Nota: El stock quedará en 0 o en negativo para que recuerde realizar el pedido al proveedor.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAlertaStock({ ...alertaStock, visible: false })}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 text-white hover:bg-red-700 border-none" 
              onClick={() => {
                setAlertaStock({ ...alertaStock, visible: false });
                finalizarIngresoTaller(alertaStock.actualizaciones, alertaStock.estadoFinal);
              }}
            >
              Ingresar de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL REINGRESO GARANTÍA */}
      <Dialog open={isGarantiaModalOpen} onOpenChange={setIsGarantiaModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
              🛡️ Reingreso por Garantía
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-foreground">
              Se creará una nueva orden en el Tablero del Taller vinculada a este presupuesto. 
              Por favor, describa la falla reportada por el cliente:
            </p>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Motivo del Reclamo / Falla *</label>
              <textarea 
                className="w-full h-24 p-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                placeholder="Ej: Sigue haciendo ruido en la rueda delantera derecha al frenar..."
                value={motivoGarantia}
                onChange={(e) => setMotivoGarantia(e.target.value)}
              />
            </div>

            {/* --- CHECKBOX DE IMPRESIÓN --- */}
            <div className="flex items-center space-x-2 pt-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800">
              <input
                 type="checkbox"
                 id="imprimir_garantia"
                 checked={imprimirAlGuardar}
                 onChange={(e) => setImprimirAlGuardar(e.target.checked)}
                 className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
              />
              <label htmlFor="imprimir_garantia" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Imprimir Orden de Trabajo automáticamente
              </label>
            </div>
            {/* ----------------------------- */}

            <p className="text-[10px] text-muted-foreground italic">
              Nota: Esto no altera el cobro ni el stock original. Solo notifica al mecánico.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGarantiaModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleReingresoGarantia} disabled={isSaving} className="bg-red-600 text-white hover:bg-red-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
              Ingresar al Taller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ============================================================== */}
      {/* MODALES GERENCIALES: ANULACIÓN DE COBROS Y ADVERTENCIAS CONTABLES */}
      {/* ============================================================== */}
      
      {/* MODAL 1: CONFIRMACIÓN DE ANULACIÓN */}
      <Dialog open={isAnulacionModalOpen} onOpenChange={setIsAnulacionModalOpen}>
        <DialogContent className="max-w-md border-rose-200 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-rose-700 dark:text-rose-500 font-black uppercase tracking-tight">
              <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" /> ¿Anular Cobro del Trabajo?
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-medium pt-2">
              Esta acción dará marcha atrás al flujo de caja del mostrador para el presupuesto <span className="font-mono font-bold text-slate-900">PRE-{numeroCorrelativo}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 space-y-2.5 my-2">
            <p className="text-xs text-rose-900 dark:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ Impacto Contable Automático:
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-medium list-disc pl-4">
              <li>Se generará un contra-asiento de egreso por <span className="font-bold text-rose-600">${totalFinal.toLocaleString()}</span> para balancear las cajas.</li>
              <li>El presupuesto volverá al estado <span className="font-bold text-emerald-600">Aprobado</span> listo para ser re-cobrado correctamente.</li>
              <li>La operación quedará firmada en la cinta de auditoría con tu usuario.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3 mt-2">
            <Button variant="ghost" onClick={() => setIsAnulacionModalOpen(false)} disabled={isSaving}>Conservar Cobro</Button>
            <Button onClick={handleAnularCobro} disabled={isSaving} className="bg-rose-600 text-white hover:bg-rose-700 border-none font-bold">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RotateCcw className="w-4 h-4 mr-2"/>} Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: BLOQUEO POR REGLA DE AUDITORÍA */}
      <Dialog open={anulacionError.visible} onOpenChange={(open: boolean) => setAnulacionError({ ...anulacionError, visible: open })}>
        <DialogContent className="max-w-md border-amber-300 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-amber-700 font-black uppercase tracking-tight">
              <Lock className="w-5 h-5 text-amber-600" /> {anulacionError.titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 flex gap-3 items-start">
            <div className="p-3 bg-amber-50 rounded-full text-amber-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed pt-1">
              {anulacionError.mensaje}
            </p>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button className="bg-amber-600 hover:bg-amber-700 border-none text-white font-bold text-xs uppercase tracking-wider" onClick={() => setAnulacionError({ ...anulacionError, visible: false })}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}