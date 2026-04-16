"use client"

import { useState, useEffect } from "react"
import { Search, Printer, ArrowLeft, Save, Trash2, Plus, MessageCircle, EyeOff, Eye, FileText, Lock, ClipboardList, Loader2, Car, User, Phone, X, Pencil, CheckCircle, Link2, CalendarDays, Wrench, Package, CircleDashed, PenTool } from "lucide-react"
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

export function PresupuestosView({ 
  onNavigateToTurnos, 
  onNavigateToTaller, 
  presupuestoAbreDetalle, 
  onClearPresupuestoDetalle, 
  onVolver,
  userRole // <-- RECIBIMOS EL ROL
}: { 
  onNavigateToTurnos?: (vehiculoInfo: any) => void, 
  onNavigateToTaller?: () => void, 
  presupuestoAbreDetalle?: string | null, 
  onClearPresupuestoDetalle?: () => void, 
  onVolver?: () => void,
  userRole?: string | null 
}) {
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [isEditing, setIsEditing] = useState(false)
  const [mostrarCostos, setMostrarCostos] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [configuracion, setConfiguracion] = useState<any>({})

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
  const [filas, setFilas] = useState<any[]>([
    { id: '1', tipo: "Servicio", detalle: "", cant: "1", costo: "0", precio: "0" }
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
      const [resClientes, resVehiculos, resCatalogo, resPresupuestos, resConfig] = await Promise.all([
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('vehiculos').select('*'),
        supabase.from('catalogo').select('*').order('detalle'),
        supabase.from('presupuestos').select('*, vehiculos(*, clientes(*)), presupuesto_items(*)').order('created_at', { ascending: false }),
        supabase.from('configuracion').select('*').eq('id', 1).single()
      ])
      
      setClientes(resClientes.data || [])
      setVehiculos(resVehiculos.data || [])
      setCatalogo(resCatalogo.data || [])
      setPresupuestos(resPresupuestos.data || [])
      if (resConfig.data) setConfiguracion(resConfig.data)
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

  const agregarFilaVacia = () => setFilas([...filas, { id: Date.now().toString(), tipo: "Repuesto", detalle: "", cant: "1", costo: "0", precio: "0" }])

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
    if (item) setFilas(filas.map(f => f.id === idFila ? { ...f, detalle: item.detalle, costo: item.costo_base || "0", precio: item.precio_base || "0" } : f))
  }

  const eliminarFila = (id: string) => setFilas(filas.filter(f => f.id !== id))

  const vehiculoActual = vehiculos.find(v => v.patente === vehiculoSeleccionado)
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado)

  const subtotalNeto = filas.reduce((acc, fila) => acc + ((parseFloat(fila.precio) || 0) * (parseFloat(fila.cant) || 1)), 0)
  const costoTotal = filas.reduce((acc, fila) => acc + ((parseFloat(fila.costo) || 0) * (parseFloat(fila.cant) || 1)), 0)
  const totalFinal = subtotalNeto - (parseFloat(descuento.toString()) || 0)
  const gananciaEstimada = totalFinal - costoTotal

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
      setIsEditing(false) 

      if (p.presupuesto_items && p.presupuesto_items.length > 0) {
        setFilas(p.presupuesto_items.map((item: any) => ({
          id: item.id || Date.now().toString() + Math.random(),
          tipo: item.tipo,
          detalle: item.detalle,
          cant: item.cantidad?.toString() || "1",
          costo: item.costo_unitario?.toString() || "0",
          precio: item.precio_unitario?.toString() || "0"
        })))
      } else {
        setFilas([])
      }
    } else {
      setEditandoId(null)
      setNumeroCorrelativo("")
      setClienteSeleccionado("")
      setVehiculoSeleccionado("")
      setFecha(new Date().toISOString().split('T')[0])
      setEstado("Borrador")
      setFilas([{ id: '1', tipo: "Servicio", detalle: "", cant: "1", costo: "0", precio: "0" }])
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
          precio: item.precio_unitario?.toString() || "0"
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
      const { error } = await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      
      setPresupuestos(presupuestos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
    } catch (error: any) {
      alert("Error al actualizar el estado: " + error.message);
    }
  }

  const handleGuardarPresupuesto = async () => {
    if (!clienteSeleccionado) return alert("Falta seleccionar el cliente. Por favor, búsquelo en la lista.");
    if (!vehiculoSeleccionado) return alert("Falta seleccionar el vehículo. Elija uno del menú desplegable.");

    const filasValidas = filas.filter(f => f.detalle.trim() !== "")
    if (filasValidas.length === 0) return alert("El presupuesto debe tener al menos un ítem con detalle.")

    setIsSaving(true)
    try {
      let presId = editandoId;
      const descParsed = parseFloat(descuento.toString()) || 0;
      let numAleatorio = 0; 

      if (editandoId) {
        const { error: presError } = await supabase.from('presupuestos').update({
          vehiculo_patente: vehiculoSeleccionado,
          fecha_emision: fecha,
          validez_dias: parseInt(validez) || 15,
          descuento: descParsed,
          total_final: totalFinal,
          estado: estado,
          observaciones_publicas: notasCliente,
          notas_internas: notasInternas
        }).eq('id', editandoId)

        if (presError) throw new Error("Error al actualizar presupuesto: " + presError.message)
        await supabase.from('presupuesto_items').delete().eq('presupuesto_id', editandoId);
        
      } else {
        numAleatorio = Math.floor(1000 + Math.random() * 9000);
        const { data: presData, error: presError } = await supabase.from('presupuestos').insert([{
          numero_correlativo: numAleatorio, 
          vehiculo_patente: vehiculoSeleccionado,
          fecha_emision: fecha,
          validez_dias: parseInt(validez) || 15,
          descuento: descParsed,
          total_final: totalFinal,
          estado: estado,
          observaciones_publicas: notasCliente,
          notas_internas: notasInternas
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
        precio_unitario: parseFloat(f.precio) || 0
      }))

      const { error: itemsError } = await supabase.from('presupuesto_items').insert(itemsToInsert)
      if (itemsError) throw new Error("Error al guardar ítems: " + itemsError.message)

      if (presupuestosAEliminar.length > 0) {
        await supabase.from('presupuesto_items').delete().in('presupuesto_id', presupuestosAEliminar);
        await supabase.from('presupuestos').delete().in('id', presupuestosAEliminar);
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
      await supabase.from('presupuestos').update({ estado: "En Espera" }).eq('id', editandoId);
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
    
    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank')
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

  const generarDocumento = async (tipo: 'presupuesto' | 'orden', datosHistoricos?: any) => {
    if (tipo === 'presupuesto') await actualizarAEnEsperaSiEsBorrador();

    const esHistorico = !!datosHistoricos;
    const v_cliente = esHistorico ? datosHistoricos.vehiculos?.clientes : clienteActual;
    const v_vehiculo = esHistorico ? datosHistoricos.vehiculos : vehiculoActual;
    
    if (!v_cliente || !v_vehiculo) return alert("Faltan datos del cliente o vehículo para generar el documento.");

    const v_filas = esHistorico ? (datosHistoricos.presupuesto_items || []) : filas.filter(f => f.detalle.trim() !== "");
    const v_total = esHistorico ? datosHistoricos.total_final : totalFinal;

    const datosFormateadosParaPlantilla = {
      cliente_nombre: v_cliente.tipo_cliente === 'empresa' ? v_cliente.razon_social : `${v_cliente.nombre} ${v_cliente.apellido || ''}`,
      cliente_telefono: v_cliente.telefono,
      vehiculo_patente: v_vehiculo.patente,
      vehiculo_modelo: `${v_vehiculo.marca || ''} ${v_vehiculo.modelo || ''}`.trim(),
      vehiculo_anio: v_vehiculo.año || v_vehiculo.anio || v_vehiculo.year || '',
      vehiculo_color: v_vehiculo.color || '',
      vehiculo_kilometros: v_vehiculo.kilometros || v_vehiculo.km || v_vehiculo.kilometraje || '',
      numero_correlativo: esHistorico ? datosHistoricos.numero_correlativo : (numeroCorrelativo || "BORRADOR"),
      fecha_emision: esHistorico ? datosHistoricos.fecha_emision : fecha,
      items: v_filas,
      total_final: v_total,
      validez_dias: validez,
      observaciones_publicas: esHistorico ? datosHistoricos.observaciones_publicas : notasCliente,
      notas_internas: esHistorico ? datosHistoricos.notas_internas : notasInternas,
      config: configuracion
    };

    setPrintType(tipo);
    setPrintData(datosFormateadosParaPlantilla);

    setTimeout(() => {
      window.print();
    }, 300);
  }

  const procesarAprobacion = async (opcion: "turnos" | "inmediato") => {
    try {
      const { data: tallerExistente, error: errExistente } = await supabase
        .from('ordenes_trabajo')
        .select('id')
        .eq('presupuesto_id', editandoId);
        
      if (errExistente) throw errExistente;

      if (tallerExistente && tallerExistente.length > 0) {
        alert("⚠️ ATENCIÓN: Este presupuesto ya tiene una Orden de Trabajo ingresada en el Taller. No se puede volver a ingresar.");
        setIsAprobarModalOpen(false);
        return;
      }

      if (opcion === "turnos") {
        setIsAprobarModalOpen(false);
        if (onNavigateToTurnos) {
          onNavigateToTurnos({ 
            patente: vehiculoSeleccionado,
            presupuesto_id: editandoId 
          });
        }
      } else if (opcion === "inmediato") {
        await supabase.from('presupuestos').update({ estado: "Aprobado" }).eq('id', editandoId);
        setEstado("Aprobado");
        setIsAprobarModalOpen(false);

        const nombreCompleto = clienteActual?.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual?.nombre} ${clienteActual?.apellido || ''}`.trim();
        
        const { error: tallerError } = await supabase.from('ordenes_trabajo').insert([{
          presupuesto_id: editandoId,
          vehiculo_patente: vehiculoSeleccionado,
          cliente_nombre: nombreCompleto || "Cliente",
          estado: 'A Ingresar'
        }]);

        if (tallerError) throw tallerError;
        
        setVista("lista");
        if (onNavigateToTaller) onNavigateToTaller();
      }
    } catch (error) {
      alert("Error al procesar la aprobación.");
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
                    {/* Botones de administrador: Aprobar, Asociar, Editar */}
                    {userRole !== 'mecanico' && (
                      <>
                        {estado !== "Aprobado" && estado !== "Facturado" && (
                          <Button variant="default" onClick={() => setIsAprobarModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none mr-4">
                            <CheckCircle className="w-4 h-4 mr-2"/> Aprobar Presupuesto
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsAsociarModalOpen(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400">
                          <Link2 className="w-4 h-4 mr-2"/> Asociar
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(true)} className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                          <Pencil className="w-4 h-4 mr-2"/> Activar Edición
                        </Button>
                        <div className="h-6 w-px bg-border mx-2"></div>
                      </>
                    )}
                  </>
                )}

                {isEditing && userRole !== 'mecanico' && (
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

                {/* Lo único que puede hacer el mecánico: Orden Papel */}
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
                    <Select value={estado} onValueChange={setEstado} disabled={!isEditing}>
                      <SelectTrigger className={`h-10 border-border font-medium disabled:opacity-100 ${getEstadoColor(estado)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Borrador">Borrador</SelectItem>
                        <SelectItem value="En Espera">En Espera</SelectItem>
                        <SelectItem value="Aprobado">Aprobado</SelectItem>
                        <SelectItem value="Rechazado">Rechazado</SelectItem>
                        <SelectItem value="Facturado">Facturado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> Cliente Vinculado</Label>
                    <Input 
                      readOnly 
                      placeholder={isEditing ? "Se completa al buscar arriba..." : "Sin registrar"}
                      value={clienteActual ? (clienteActual.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual.nombre} ${clienteActual.apellido}`) : ""} 
                      className="bg-secondary/20 text-foreground font-bold h-10 border-border pointer-events-none" 
                    />
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
                    <Input 
                      readOnly 
                      placeholder="-"
                      value={clienteActual?.telefono || ""} 
                      className="bg-secondary/20 text-foreground font-medium font-mono h-10 border-border pointer-events-none" 
                    />
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

                        return (
                          <TableRow key={fila.id} className="hover:bg-transparent">
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
                                  <Select onValueChange={(val: string) => aplicarItemCatalogo(fila.id, val)}>
                                    <SelectTrigger className="w-[180px] h-10 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0 print:hidden">
                                      <SelectValue placeholder={`Elegir ${fila.tipo}...`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {catalogoFiltrado.length === 0 ? (
                                        <SelectItem value="none" disabled>No hay {fila.tipo.toLowerCase()}s</SelectItem>
                                      ) : (
                                        catalogoFiltrado.map(c => <SelectItem key={c.id} value={c.id}>{c.detalle}</SelectItem>)
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Input value={fila.detalle} onChange={(e: any) => actualizarFila(fila.id, 'detalle', e.target.value)} readOnly={!isEditing} placeholder={isEditing ? "Escriba el detalle..." : ""} className={`h-10 flex-1 ${!isEditing ? 'bg-transparent border-transparent px-0 font-medium' : 'bg-white dark:bg-slate-950'}`} />
                              </div>
                            </TableCell>
                            <TableCell><Input value={fila.cant} onChange={(e: any) => actualizarFila(fila.id, 'cant', e.target.value)} readOnly={!isEditing} className={`h-10 text-center font-mono ${!isEditing ? 'bg-transparent border-transparent px-0 font-bold' : 'bg-white dark:bg-slate-950'}`} /></TableCell>
                            
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
                              <TableCell className="print:hidden"><Button variant="ghost" size="icon" onClick={() => eliminarFila(fila.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></TableCell>
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
              
              {/* Oculto el botón Nuevo al mecánico */}
              {userRole !== 'mecanico' && (
                <Button onClick={() => handleAbrirPresupuesto()} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto</Button>
              )}
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
                          <TableCell className="font-mono font-bold">PRE-{p.numero_correlativo}</TableCell>
                          <TableCell>{new Date(p.fecha_emision).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground group-hover:text-emerald-600 transition-colors">
                              {p.vehiculos?.clientes?.tipo_cliente === 'empresa' 
                                ? p.vehiculos?.clientes?.razon_social 
                                : `${p.vehiculos?.clientes?.nombre || ''} ${p.vehiculos?.clientes?.apellido || ''}`}
                            </div>
                            <div className="text-xs text-muted-foreground">{p.vehiculos?.marca} {p.vehiculos?.modelo} ({p.vehiculo_patente})</div>
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
    </>
  )
}