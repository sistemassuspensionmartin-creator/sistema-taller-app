"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Car, User, Edit, Loader2, Save, Gauge, Palette, Calendar, X, CheckCircle2, ArrowLeft, Phone, UserCheck, UserMinus, FileText, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

const MARCAS_COMUNES = [
  "Volkswagen", "Ford", "Chevrolet", "Toyota", "Renault", 
  "Peugeot", "Fiat", "Honda", "Nissan", "Citroën", 
  "Jeep", "Audi", "BMW", "Mercedes-Benz", "Hyundai", 
  "Kia", "Chery", "Suzuki", "Otra"
]

export function VehiclesView() {
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busquedaPrincipal, setBusquedaPrincipal] = useState("")

  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [clienteSeleccionadoInfo, setClienteSeleccionadoInfo] = useState<any>(null)

  const [formData, setFormData] = useState({
    patente: "",
    tipo_vehiculo: "Auto",
    marca: "",
    modelo: "",
    anio: "",
    color: "",
    kilometraje: "",
    cliente_id: ""
  })

  // Estados para la Vista de Detalle
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null)
  const [historialPresupuestos, setHistorialPresupuestos] = useState<any[]>([])
  
  // Novedades: Transferencia, Búsqueda de Dueño y Edición de Km
  const [modoTransferencia, setModoTransferencia] = useState(false)
  const [busquedaNuevoDueno, setBusquedaNuevoDueno] = useState("")
  const [nuevoDuenoId, setNuevoDuenoId] = useState<string>("")
  const [isTransferring, setIsTransferring] = useState(false)
  
  const [editandoKm, setEditandoKm] = useState(false)
  const [nuevoKm, setNuevoKm] = useState("")
  const [isUpdatingKm, setIsUpdatingKm] = useState(false)

  const fetchVehiculos = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('vehiculos').select(`*, clientes ( id, nombre, apellido, razon_social, tipo_cliente, documento, telefono, email )`)
      if (error) throw error
      setVehiculos(data || [])
    } catch (error) {
      console.error("Error al cargar vehículos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientesParaSelect = async () => {
    try {
      const { data, error } = await supabase.from('clientes').select('id, nombre, apellido, razon_social, tipo_cliente, documento, telefono, email').order('nombre')
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    }
  }

  useEffect(() => {
    if (vista === "lista") {
      fetchVehiculos()
      fetchClientesParaSelect()
      setVehiculoSeleccionado(null)
      setModoTransferencia(false)
    }
  }, [vista])

  const abrirDetalle = async (vehiculo: any) => {
    setVehiculoSeleccionado(vehiculo)
    setVista("detalle")
    setModoTransferencia(false)
    setBusquedaNuevoDueno("")
    setNuevoDuenoId("")
    setEditandoKm(false)
    
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('vehiculo_patente', vehiculo.patente)
        .order('fecha_emision', { ascending: false })

      if (error) throw error;
      setHistorialPresupuestos(data || [])
    } catch (error) {
      console.error("Error al cargar historial:", error)
    }
  }

  // --- NUEVA LÓGICA DE TRANSFERENCIA ---
  const handleTransferirDueno = async (accion: "transferir" | "desvincular") => {
    if (accion === "transferir" && !nuevoDuenoId) return alert("Seleccione un nuevo dueño de la lista.");
    
    const esDesvinculacion = accion === "desvincular";
    const accionTexto = esDesvinculacion ? "desvincular este vehículo" : "transferir este vehículo al nuevo dueño";
    
    if (!confirm(`¿Estás seguro de que querés ${accionTexto}?`)) return;

    setIsTransferring(true)
    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ cliente_id: esDesvinculacion ? null : nuevoDuenoId })
        .eq('patente', vehiculoSeleccionado.patente);

      if (error) throw error;

      alert("¡Operación realizada con éxito!");
      
      const clienteNuevo = esDesvinculacion ? null : clientes.find(c => c.id === nuevoDuenoId);
      
      setVehiculoSeleccionado({
        ...vehiculoSeleccionado,
        cliente_id: esDesvinculacion ? null : nuevoDuenoId,
        clientes: clienteNuevo
      });

      setVehiculos(vehiculos.map(v => 
        v.patente === vehiculoSeleccionado.patente 
          ? { ...v, cliente_id: esDesvinculacion ? null : nuevoDuenoId, clientes: clienteNuevo } 
          : v
      ));

      setModoTransferencia(false);
      setNuevoDuenoId("");
      setBusquedaNuevoDueno("");

    } catch (error: any) {
      alert("Error al cambiar titularidad: " + error.message)
    } finally {
      setIsTransferring(false)
    }
  }

  // --- NUEVA LÓGICA PARA ACTUALIZAR KM ---
  const handleActualizarKm = async () => {
    const kmParseado = parseInt(nuevoKm);
    if (isNaN(kmParseado) || kmParseado < 0) return alert("Ingrese un kilometraje válido.");

    setIsUpdatingKm(true);
    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ kilometraje: kmParseado })
        .eq('patente', vehiculoSeleccionado.patente);

      if (error) throw error;

      // Actualizar vista local
      setVehiculoSeleccionado({ ...vehiculoSeleccionado, kilometraje: kmParseado });
      setVehiculos(vehiculos.map(v => v.patente === vehiculoSeleccionado.patente ? { ...v, kilometraje: kmParseado } : v));
      setEditandoKm(false);
    } catch (error: any) {
      alert("Error al actualizar kilometraje: " + error.message);
    } finally {
      setIsUpdatingKm(false);
    }
  }

  // LÓGICA DE CREACIÓN (Intacta)
  const abrirModal = () => {
    setFormData({ patente: "", tipo_vehiculo: "Auto", marca: "", modelo: "", anio: "", color: "", kilometraje: "", cliente_id: "" })
    setBusquedaCliente("")
    setClienteSeleccionadoInfo(null)
    setIsModalOpen(true)
  }

  const handlePatenteChange = (e: any) => {
    let limpia = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (limpia.length > 7) limpia = limpia.slice(0, 7)
    let formateada = limpia
    if (limpia.length >= 3) {
      if (/[A-Z]/.test(limpia[2])) {
        formateada = limpia.slice(0, 3) + (limpia.length > 3 ? " " + limpia.slice(3, 6) : "")
      } else {
        formateada = limpia.slice(0, 2) + " " + limpia.slice(2, 5) + (limpia.length > 5 ? " " + limpia.slice(5, 7) : "")
      }
    }
    setFormData({ ...formData, patente: formateada })
  }

  const handleGuardarVehiculo = async () => {
    const patenteLimpiaDB = formData.patente.replace(/\s/g, "")

    if (!patenteLimpiaDB || !formData.marca || !formData.modelo || !formData.cliente_id || !formData.tipo_vehiculo) {
      alert("Patente, Tipo, Marca, Modelo y Dueño son obligatorios.")
      return
    }

    if (patenteLimpiaDB.length < 6) {
      alert("La patente debe tener al menos 6 caracteres.")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('vehiculos').insert([{
        patente: patenteLimpiaDB,
        tipo_vehiculo: formData.tipo_vehiculo,
        marca: formData.marca,
        modelo: formData.modelo,
        anio: formData.anio ? parseInt(formData.anio) : null,
        color: formData.color,
        kilometraje: formData.kilometraje ? parseInt(formData.kilometraje) : null,
        cliente_id: formData.cliente_id
      }])

      if (error) {
        if (error.code === '23505') alert("Ya existe un vehículo registrado con esta patente en el taller.")
        else throw error
        return
      }

      setIsModalOpen(false)
      fetchVehiculos()
    } catch (error) {
      alert("No se pudo guardar el vehículo.")
    } finally {
      setIsSaving(false)
    }
  }

  const vehiculosFiltrados = vehiculos.filter(v => 
    v.patente.includes(busquedaPrincipal.replace(/\s/g, "").toUpperCase()) || 
    v.marca.toLowerCase().includes(busquedaPrincipal.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busquedaPrincipal.toLowerCase()) ||
    (v.clientes?.nombre || "").toLowerCase().includes(busquedaPrincipal.toLowerCase()) ||
    (v.clientes?.apellido || "").toLowerCase().includes(busquedaPrincipal.toLowerCase())
  )

  const clientesParaMostrar = busquedaCliente.trim() === "" ? [] : clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.apellido && c.apellido.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.razon_social && c.razon_social.toLowerCase().includes(busquedaCliente.toLowerCase())) ||
    (c.documento && c.documento.includes(busquedaCliente))
  ).slice(0, 5)

  // Buscador para transferencia de Dueño
  const clientesParaTransferir = busquedaNuevoDueno.trim() === "" ? [] : clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busquedaNuevoDueno.toLowerCase())) ||
    (c.apellido && c.apellido.toLowerCase().includes(busquedaNuevoDueno.toLowerCase())) ||
    (c.razon_social && c.razon_social.toLowerCase().includes(busquedaNuevoDueno.toLowerCase())) ||
    (c.documento && c.documento.includes(busquedaNuevoDueno))
  ).slice(0, 8)

  const seleccionarCliente = (cliente: any) => {
    setFormData({ ...formData, cliente_id: cliente.id })
    setClienteSeleccionadoInfo(cliente)
    setBusquedaCliente("")
  }

  const deseleccionarCliente = () => {
    setFormData({ ...formData, cliente_id: "" })
    setClienteSeleccionadoInfo(null)
  }

  const formatearPatenteVisual = (patenteDB: string) => {
    if (!patenteDB) return ""
    if (patenteDB.length === 6) return `${patenteDB.slice(0,3)} ${patenteDB.slice(3,6)}` 
    if (patenteDB.length === 7) return `${patenteDB.slice(0,2)} ${patenteDB.slice(2,5)} ${patenteDB.slice(5,7)}` 
    return patenteDB
  }

  // ==========================================
  // RENDER: VISTA DE DETALLE
  // ==========================================
  if (vista === "detalle" && vehiculoSeleccionado) {
    const c = vehiculoSeleccionado.clientes;
    const nombreCliente = c ? (c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`) : 'Sin Propietario Vinculado';

    return (
      <div className="space-y-6 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setVista("lista")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2"/> Volver a la Flota
            </Button>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-[#008A4B] text-white px-3 py-1 rounded-md font-mono tracking-widest text-lg">
                  {formatearPatenteVisual(vehiculoSeleccionado.patente)}
                </span>
                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              </h2>
            </div>
          </div>
          {/* Este botón podría abrir un modal para editar marca, modelo, etc., pero por ahora se centra en km y dueño */}
          <Button variant="outline" className="bg-background">
            <Edit className="w-4 h-4 mr-2"/> Editar Datos Principales
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FICHA TÉCNICA */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-secondary/10 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                <Car className="w-5 h-5" /> Ficha Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-6 text-sm">
                <div><span className="text-muted-foreground block mb-1">Marca</span><p className="font-medium text-base">{vehiculoSeleccionado.marca}</p></div>
                <div><span className="text-muted-foreground block mb-1">Modelo</span><p className="font-medium text-base">{vehiculoSeleccionado.modelo}</p></div>
                <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Año</span><p className="font-medium">{vehiculoSeleccionado.anio || '-'}</p></div>
                <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Palette className="w-3 h-3"/> Color</span><p className="font-medium">{vehiculoSeleccionado.color || '-'}</p></div>
                
                {/* EDICIÓN DE KILOMETRAJE */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground block mb-1 flex items-center gap-1"><Gauge className="w-3 h-3"/> Kilometraje</span>
                  {editandoKm ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        type="number" 
                        className="h-8 w-32 bg-slate-50 dark:bg-slate-900" 
                        value={nuevoKm} 
                        onChange={e => setNuevoKm(e.target.value)} 
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleActualizarKm} disabled={isUpdatingKm}>
                        {isUpdatingKm ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setEditandoKm(false)} disabled={isUpdatingKm}>
                        <X className="w-5 h-5"/>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-base">{vehiculoSeleccionado.kilometraje ? `${vehiculoSeleccionado.kilometraje.toLocaleString()} km` : 'Sin registrar'}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600" onClick={() => {setNuevoKm(vehiculoSeleccionado.kilometraje?.toString() || ""); setEditandoKm(true);}}>
                        <Pencil className="w-3.5 h-3.5"/>
                      </Button>
                    </div>
                  )}
                </div>
                
                <div><span className="text-muted-foreground block mb-1">Tipo</span><p className="font-medium capitalize">{vehiculoSeleccionado.tipo_vehiculo || '-'}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* DATOS DEL PROPIETARIO & TRANSFERENCIA */}
          <Card className="border-border shadow-sm flex flex-col">
            <CardHeader className="bg-secondary/10 border-b border-border py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                <User className="w-5 h-5" /> Propietario Actual
              </CardTitle>
              <div className="flex gap-2">
                {/* BOTÓN PARA EDITAR CLIENTE (TE LLEVARÍA A LA PESTAÑA) */}
                {c && !modoTransferencia && (
                  <Button variant="ghost" size="sm" onClick={() => alert("Acá podés usar window.location.href='/clientes?id=' + c.id o el router de Next.js para saltar a editar al cliente " + c.nombre)} className="text-muted-foreground hover:text-primary">
                    <Edit className="w-4 h-4 mr-2"/> Editar Cliente
                  </Button>
                )}
                {!modoTransferencia && (
                  <Button variant="outline" size="sm" onClick={() => setModoTransferencia(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400">
                    Cambiar Propietario
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              {modoTransferencia ? (
                <div className="space-y-4 animate-in fade-in duration-200 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-lg border border-border h-full flex flex-col">
                  
                  {/* BOTÓN SEPARADO PARA DESVINCULAR */}
                  <div className="mb-4 pb-4 border-b border-border">
                    <Label className="text-muted-foreground font-semibold mb-2 block">¿El cliente vendió el auto?</Label>
                    <Button variant="outline" onClick={() => handleTransferirDueno("desvincular")} disabled={isTransferring} className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900">
                      <UserMinus className="w-4 h-4 mr-2"/> Desvincular Vehículo (Dejar sin dueño)
                    </Button>
                  </div>

                  {/* BUSCADOR DE NUEVO DUEÑO */}
                  <Label className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                    <UserCheck className="w-4 h-4"/> Transferir a otro cliente
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nombre, apellido o DNI..." 
                      className="pl-9 bg-white dark:bg-slate-950" 
                      value={busquedaNuevoDueno}
                      onChange={(e) => setBusquedaNuevoDueno(e.target.value)}
                    />
                  </div>

                  {/* Lista de resultados de transferencia */}
                  <div className="flex-1 min-h-[120px] max-h-[160px] overflow-y-auto border border-border rounded-md bg-white dark:bg-slate-950 mt-2">
                    {busquedaNuevoDueno.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground italic mt-4">Escriba para buscar un cliente...</div>
                    ) : clientesParaTransferir.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground mt-4">No se encontró al cliente.</div>
                    ) : (
                      clientesParaTransferir.map(cl => (
                        <div 
                          key={cl.id} 
                          onClick={() => setNuevoDuenoId(cl.id)}
                          className={`p-3 border-b border-border/50 cursor-pointer flex justify-between items-center transition-colors ${nuevoDuenoId === cl.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                        >
                          <div>
                            <div className="font-medium text-sm">{cl.tipo_cliente === 'empresa' ? cl.razon_social : `${cl.nombre} ${cl.apellido || ''}`}</div>
                            <div className="text-xs text-muted-foreground">{cl.documento || 'S/DNI'}</div>
                          </div>
                          {nuevoDuenoId === cl.id && <CheckCircle2 className="w-4 h-4 text-blue-600"/>}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 mt-auto">
                    <Button variant="ghost" onClick={() => {setModoTransferencia(false); setNuevoDuenoId(""); setBusquedaNuevoDueno("");}} disabled={isTransferring}>Cancelar</Button>
                    <Button onClick={() => handleTransferirDueno("transferir")} disabled={!nuevoDuenoId || isTransferring} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isTransferring ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmar Transferencia"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {c ? (
                    <div className="grid grid-cols-2 gap-y-6 gap-x-6 text-sm">
                      <div className="col-span-2"><span className="text-muted-foreground block mb-1">Nombre / Razón Social</span><p className="font-bold text-lg">{nombreCliente}</p></div>
                      <div><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</span><p className="font-medium font-mono">{c.telefono || '-'}</p></div>
                      <div><span className="text-muted-foreground block mb-1">DNI / CUIT</span><p className="font-medium">{c.documento || '-'}</p></div>
                      <div className="col-span-2"><span className="text-muted-foreground block mb-1">Email</span><p className="font-medium">{c.email || '-'}</p></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                      <UserMinus className="w-12 h-12 mb-3 opacity-20" />
                      <p>Este vehículo no está vinculado a ningún cliente.</p>
                      <Button variant="link" onClick={() => setModoTransferencia(true)} className="text-blue-600 mt-2">Asignar a un cliente</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* HISTORIAL DE PRESUPUESTOS Y ORDENES */}
        <div className="pt-4">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-emerald-600"/> Historial de Presupuestos y Órdenes
          </h3>
          <Card className="border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Nro</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Total Estimado</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialPresupuestos.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No hay presupuestos registrados para este vehículo.</TableCell></TableRow>
                ) : (
                  historialPresupuestos.map(hp => (
                    <TableRow key={hp.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono font-bold">PRE-{hp.numero_correlativo}</TableCell>
                      <TableCell>{new Date(hp.fecha_emision).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="font-bold font-mono text-emerald-700 dark:text-emerald-500">${hp.total_final?.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{hp.estado}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: VISTA LISTA PRINCIPAL (FLOTA)
  // ==========================================
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Flota de Vehículos</h2>
          <p className="text-sm text-muted-foreground">Administrá los autos de tus clientes y su historial.</p>
        </div>
        <Button onClick={abrirModal} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por patente, marca, modelo o dueño..." 
              className="pl-9 bg-background" 
              value={busquedaPrincipal}
              onChange={(e) => setBusquedaPrincipal(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead>Patente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : vehiculosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No se encontraron vehículos.</TableCell></TableRow>
              ) : (
                vehiculosFiltrados.map((v) => {
                  const nombreDueno = v.clientes ? (v.clientes.tipo_cliente === 'empresa' ? v.clientes.razon_social : `${v.clientes.nombre} ${v.clientes.apellido || ''}`) : 'Sin dueño';
                  
                  return (
                    <TableRow key={v.patente} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => abrirDetalle(v)}>
                      <TableCell>
                        <span className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded text-sm font-mono font-bold tracking-widest uppercase">
                          {formatearPatenteVisual(v.patente)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{v.marca} {v.modelo}</div>
                        <div className="text-xs text-muted-foreground capitalize">{v.tipo_vehiculo || 'Vehículo'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className={!v.clientes ? 'italic opacity-60' : ''}>{nombreDueno}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {v.anio && <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Año {v.anio}</div>}
                          {v.kilometraje && <div className="flex items-center gap-1"><Gauge className="w-3 h-3"/> {v.kilometraje.toLocaleString()} km</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); alert("Para editar todos los campos (Marca, modelo, etc) podés reutilizar el modal de creación.") }} className="text-muted-foreground hover:text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL NUEVO VEHÍCULO (Intacto) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-foreground font-bold">Registrar Vehículo</DialogTitle>
            <p className="text-sm text-muted-foreground">Vincule un nuevo vehículo a un cliente del taller.</p>
          </DialogHeader>

          <div className="space-y-8">
            
            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Dueño del Vehículo <span className="text-destructive">*</span></h3>
              </div>
              
              {!clienteSeleccionadoInfo ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cliente por nombre, empresa o CUIT/DNI..." 
                    className="pl-9 bg-slate-50 dark:bg-slate-900" 
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                  {clientesParaMostrar.length > 0 && (
                    <div className="absolute top-11 left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                      {clientesParaMostrar.map(c => (
                        <div 
                          key={c.id} 
                          className="p-3 hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 flex justify-between items-center"
                          onClick={() => seleccionarCliente(c)}
                        >
                          <div>
                            <div className="font-medium">{c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido || ''}`}</div>
                            <div className="text-xs text-muted-foreground">Documento: {c.documento || "N/A"}</div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">Seleccionar</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {busquedaCliente && clientesParaMostrar.length === 0 && (
                     <div className="absolute top-11 left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                       No se encontró ningún cliente. ¿Ya lo registraste en la pestaña Clientes?
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-100">
                        {clienteSeleccionadoInfo.tipo_cliente === 'empresa' ? clienteSeleccionadoInfo.razon_social : `${clienteSeleccionadoInfo.nombre} ${clienteSeleccionadoInfo.apellido || ''}`}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Cliente confirmado</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={deseleccionarCliente} className="h-8 bg-white dark:bg-slate-950 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    Cambiar
                  </Button>
                </div>
              )}
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Datos del Vehículo</h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label>Patente <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="AA 123 AA" 
                    className="bg-slate-50 dark:bg-slate-900 font-mono text-center uppercase tracking-widest" 
                    value={formData.patente} 
                    onChange={handlePatenteChange}
                    maxLength={9}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Tipo <span className="text-destructive">*</span></Label>
                  <Select value={formData.tipo_vehiculo} onValueChange={(val: string) => setFormData({...formData, tipo_vehiculo: val})}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="Camioneta">Camioneta</SelectItem>
                      <SelectItem value="Furgón">Furgón</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Marca <span className="text-destructive">*</span></Label>
                  <Select value={formData.marca} onValueChange={(val: string) => setFormData({...formData, marca: val})}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900"><SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {MARCAS_COMUNES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Modelo <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Amarok" className="bg-slate-50 dark:bg-slate-900" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} />
                </div>
              </div>
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Detalles (Opcional)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input type="number" placeholder="2024" className="bg-slate-50 dark:bg-slate-900" value={formData.anio} onChange={(e) => setFormData({...formData, anio: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input placeholder="Ej: Blanco" className="bg-slate-50 dark:bg-slate-900" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Kilometraje</Label>
                  <Input type="number" placeholder="Ej: 50000" className="bg-slate-50 dark:bg-slate-900" value={formData.kilometraje} onChange={(e) => setFormData({...formData, kilometraje: e.target.value})} />
                </div>
              </div>
            </section>
          </div>
          
          <DialogFooter className="mt-8 border-t border-border pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarVehiculo} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Vehículo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}