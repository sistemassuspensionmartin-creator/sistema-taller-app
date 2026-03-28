"use client"

import { useState, useEffect } from "react"
import { Search, Printer, Download, ArrowLeft, Save, Trash2, Plus, MessageCircle, EyeOff, Eye, FileText, Lock, ClipboardList, Loader2, Car, User, Phone } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

export function PresupuestosView() {
  const [vista, setVista] = useState<"lista" | "crear">("lista")
  const [mostrarCostos, setMostrarCostos] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Datos reales de la BD
  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [configuracion, setConfiguracion] = useState<any>({})

  // Estados del Buscador Inteligente
  const [busquedaEntidad, setBusquedaEntidad] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)

  // Estado del Presupuesto Actual
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>("")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [validez, setValidez] = useState("15")
  const [notasCliente, setNotasCliente] = useState("Los repuestos pueden sufrir variaciones de precio sin previo aviso. Validez sujeta a stock.")
  const [notasInternas, setNotasInternas] = useState("")
  const [descuento, setDescuento] = useState(0)

  const [filas, setFilas] = useState<any[]>([
    { id: '1', tipo: "Servicio", detalle: "", cant: 1, costo: 0, precio: 0 }
  ])

  const cargarDatos = async () => {
    setIsLoading(true)
    try {
      const [resClientes, resVehiculos, resCatalogo, resPresupuestos, resConfig] = await Promise.all([
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('vehiculos').select('*'),
        supabase.from('catalogo').select('*').order('detalle'),
        // ACÁ AGREGUÉ presupuesto_items(*) PARA QUE TRAIGA EL DETALLE DE LOS HISTÓRICOS
        supabase.from('presupuestos').select('*, clientes(nombre, apellido, razon_social, tipo_cliente, telefono), vehiculos(patente, marca, modelo), presupuesto_items(*)').order('created_at', { ascending: false }),
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
    if (vista === "lista") cargarDatos()
  }, [vista])

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
    setVehiculoSeleccionado(v.id)
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

  const vehiculosDelCliente = vehiculos.filter(v => v.cliente_id === clienteSeleccionado)

  const agregarFilaVacia = () => setFilas([...filas, { id: Date.now().toString(), tipo: "Repuesto", detalle: "", cant: 1, costo: 0, precio: 0 }])

  const actualizarFila = (id: string, campo: string, valor: any) => {
    setFilas(filas.map(f => {
      if (f.id !== id) return f
      if (campo === 'tipo') return { ...f, tipo: valor, detalle: "", costo: 0, precio: 0 }
      return { ...f, [campo]: valor }
    }))
  }

  const aplicarItemCatalogo = (idFila: string, idCatalogo: string) => {
    const item = catalogo.find(c => c.id === idCatalogo)
    if (item) setFilas(filas.map(f => f.id === idFila ? { ...f, detalle: item.detalle, costo: item.costo_base || 0, precio: item.precio_base || 0 } : f))
  }

  const eliminarFila = (id: string) => setFilas(filas.filter(f => f.id !== id))

  const vehiculoActual = vehiculos.find(v => v.id === vehiculoSeleccionado)
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado)

  const subtotalNeto = filas.reduce((acc, fila) => acc + ((parseFloat(fila.precio) || 0) * (parseInt(fila.cant) || 1)), 0)
  const costoTotal = filas.reduce((acc, fila) => acc + ((parseFloat(fila.costo) || 0) * (parseInt(fila.cant) || 1)), 0)
  const totalFinal = subtotalNeto - descuento
  const gananciaEstimada = totalFinal - costoTotal

  const handleGuardarPresupuesto = async () => {
    if (!clienteSeleccionado || !vehiculoSeleccionado) return alert("Por favor seleccione un cliente y un vehículo.")
    const filasValidas = filas.filter(f => f.detalle.trim() !== "")
    if (filasValidas.length === 0) return alert("El presupuesto debe tener al menos un ítem con detalle.")

    setIsSaving(true)
    try {
      const nroComprobante = "PRE-" + Math.floor(1000 + Math.random() * 9000)

      const { data: presData, error: presError } = await supabase.from('presupuestos').insert([{
        nro_comprobante: nroComprobante,
        fecha: fecha,
        validez_dias: parseInt(validez) || 15,
        cliente_id: clienteSeleccionado,
        vehiculo_id: vehiculoSeleccionado,
        subtotal: subtotalNeto,
        descuento: descuento,
        total: totalFinal,
        estado: 'Borrador',
        notas_cliente: notasCliente,
        notas_internas: notasInternas
      }]).select().single()

      if (presError) throw presError

      const itemsToInsert = filasValidas.map(f => ({
        presupuesto_id: presData.id,
        tipo: f.tipo,
        detalle: f.detalle,
        cantidad: parseInt(f.cant) || 1,
        costo_unitario: parseFloat(f.costo) || 0,
        precio_unitario: parseFloat(f.precio) || 0,
        subtotal: (parseFloat(f.precio) || 0) * (parseInt(f.cant) || 1)
      }))

      const { error: itemsError } = await supabase.from('presupuesto_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      alert("¡Presupuesto guardado con éxito!")
      setVista("lista")
      setClienteSeleccionado("")
      setVehiculoSeleccionado("")
      setFilas([{ id: '1', tipo: "Servicio", detalle: "", cant: 1, costo: 0, precio: 0 }])
      setDescuento(0)
      setNotasInternas("")
      
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("Hubo un error al guardar el presupuesto.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleWhatsApp = () => {
    if (!clienteActual || !vehiculoActual) return alert("Seleccione un cliente y vehículo para enviar el mensaje.")
    if (!clienteActual.telefono) return alert("El cliente no tiene un número de teléfono registrado.")
    
    const telefonoLimpio = clienteActual.telefono.replace(/\D/g, '')
    const mensaje = `Hola ${clienteActual.nombre}, te contactamos de ${configuracion.nombre_taller || 'Taller'}.\n\nTe preparamos el presupuesto para tu ${vehiculoActual.marca} ${vehiculoActual.modelo} (${vehiculoActual.patente}).\n\n*Total estimado: $${totalFinal.toLocaleString()}*\n\nTe adjunto el PDF con el detalle. ¡Cualquier consulta estamos a disposición!`
    
    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  // GENERADOR DE PDF PROFESIONAL BLINDADO
  const generarDocumento = (tipo: 'presupuesto' | 'orden', datosHistoricos?: any) => {
    const esHistorico = !!datosHistoricos;
    
    const v_cliente = esHistorico ? datosHistoricos.clientes : clienteActual;
    const v_vehiculo = esHistorico ? datosHistoricos.vehiculos : vehiculoActual;
    
    if (!v_cliente || !v_vehiculo) return alert("Faltan datos del cliente o vehículo para generar el documento.");

    const v_filas = esHistorico ? (datosHistoricos.presupuesto_items || []) : filas.filter(f => f.detalle.trim() !== "");
    const v_total = esHistorico ? datosHistoricos.total : totalFinal;
    const v_fecha = esHistorico ? new Date(datosHistoricos.fecha).toLocaleDateString('es-AR') : new Date(fecha).toLocaleDateString('es-AR');
    const v_nro = esHistorico ? datosHistoricos.nro_comprobante : "PRE-BORRADOR";
    const v_notas = esHistorico ? datosHistoricos.notas_cliente : notasCliente;
    const v_notas_int = esHistorico ? datosHistoricos.notas_internas : notasInternas;

    const nombreTaller = configuracion.nombre_taller || "Mi Taller Automotor";
    const telTaller = configuracion.telefono || "";
    const dirTaller = configuracion.direccion || "";

    // Diseño resistente a navegadores caprichosos
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tipo === 'orden' ? 'Orden de Trabajo' : 'Presupuesto'} - ${v_nro}</title>
        <style>
          /* Forzamos el tamaño y orientación de la hoja */
          @page { size: ${tipo === 'orden' ? 'A5 landscape' : 'A4 portrait'}; margin: 15mm; }
          
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            width: 100%; /* Obliga a ocupar todo el ancho */
            max-width: 100%;
          }
          
          .header { width: 100%; border-bottom: 2px solid #008A4B; padding-bottom: 10px; margin-bottom: 20px; }
          .header::after { content: ""; display: table; clear: both; }
          
          .taller-info { float: left; width: 60%; }
          .taller-info h1 { margin: 0; color: #008A4B; font-size: 24px; }
          .taller-info p { margin: 2px 0; font-size: 13px; color: #666; }
          
          .doc-info { float: right; width: 35%; text-align: right; }
          .doc-info h2 { margin: 0; font-size: 20px; color: #444; text-transform: uppercase; }
          
          .box { width: 100%; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 20px; background: #f9fafb; display: table; }
          .box-col { display: table-cell; width: 50%; vertical-align: top; font-size: 14px; line-height: 1.5; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
          th { background: #008A4B; color: white; padding: 10px; text-align: left; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .totales { width: 40%; float: right; border-top: 2px solid #008A4B; padding-top: 10px; margin-top: 10px; }
          .total-row { display: block; width: 100%; clear: both; font-size: 14px; margin-bottom: 5px; }
          .total-row span:first-child { float: left; }
          .total-row span:last-child { float: right; font-family: monospace; }
          .total-final { font-size: 18px; font-weight: bold; color: #008A4B; margin-top: 10px; }
          
          .notas { clear: both; padding-top: 40px; font-size: 12px; color: #555; }
          
          .orden-box { clear: both; border: 2px dashed #ccc; padding: 15px; margin-top: 20px; border-radius: 6px; }
          .firmas { width: 100%; display: table; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
          .firma-col { display: table-cell; width: 50%; text-align: left; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="taller-info">
            <h1>${nombreTaller}</h1>
            <p>📍 ${dirTaller}</p>
            <p>📞 ${telTaller}</p>
          </div>
          <div class="doc-info">
            <h2>${tipo === 'orden' ? 'Orden de Trabajo' : 'Presupuesto'}</h2>
            <p>Nro: <b>${v_nro}</b></p>
            <p>Fecha: ${v_fecha}</p>
          </div>
        </div>

        <div class="box">
          <div class="box-col">
            <strong>Cliente:</strong> ${v_cliente.tipo_cliente === 'empresa' ? v_cliente.razon_social : `${v_cliente.nombre} ${v_cliente.apellido || ''}`}<br>
            <strong>Teléfono:</strong> ${v_cliente.telefono || 'Sin registrar'}
          </div>
          <div class="box-col">
            <strong>Vehículo:</strong> ${v_vehiculo.marca} ${v_vehiculo.modelo}<br>
            <strong>Patente:</strong> <span style="font-family: monospace; font-size:14px; font-weight:bold;">${v_vehiculo.patente}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="15%">Tipo</th>
              <th width="${tipo === 'presupuesto' ? '45%' : '65%'}">Descripción del Trabajo / Repuesto</th>
              <th width="10%" class="text-center">Cant.</th>
              ${tipo === 'presupuesto' ? '<th width="15%" class="text-right">Precio Unit.</th><th width="15%" class="text-right">Subtotal</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${v_filas.length > 0 ? v_filas.map((f:any) => `
              <tr>
                <td>${f.tipo}</td>
                <td>${f.detalle}</td>
                <td class="text-center">${f.cantidad || f.cant || 1}</td>
                ${tipo === 'presupuesto' ? `
                  <td class="text-right">$${(f.precio_unitario || f.precio || 0).toLocaleString()}</td>
                  <td class="text-right font-bold">$${((f.precio_unitario || f.precio || 0) * (f.cantidad || f.cant || 1)).toLocaleString()}</td>
                ` : ''}
              </tr>
            `).join('') : '<tr><td colspan="5" class="text-center"><i>No hay ítems cargados.</i></td></tr>'}
          </tbody>
        </table>

        ${tipo === 'presupuesto' ? `
          <div class="totales">
            <div class="total-row total-final">
              <span>TOTAL FINAL:</span>
              <span>$${v_total.toLocaleString()}</span>
            </div>
          </div>
          <div class="notas">
            <strong>Observaciones:</strong><br>
            ${(v_notas || '').replace(/\n/g, '<br>')}
          </div>
        ` : `
          <div class="orden-box">
            <strong>Notas y Tareas Internas (Solo Taller):</strong><br><br>
            ${v_notas_int ? v_notas_int.replace(/\n/g, '<br>') : '<i>Sin instrucciones adicionales.</i>'}
          </div>
          <div class="firmas">
            <div class="firma-col">Firma Mecánico: _____________________</div>
            <div class="firma-col">Km Ingreso: _____________________</div>
          </div>
        `}
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      setTimeout(() => {
        ventana.print();
        ventana.onafterprint = () => ventana.close();
      }, 500);
    }
  }

  if (vista === "crear") {
    return (
      <div className="space-y-6 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4 print:hidden">
          <Button variant="ghost" onClick={() => setVista("lista")} className="text-muted-foreground hover:text-foreground w-fit">
            <ArrowLeft className="h-4 w-4 mr-2"/> Volver
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-secondary/50 px-3 py-2 rounded-md border border-border font-mono font-bold text-sm mr-2 text-primary">NUEVO</div>
            <Button variant="outline" onClick={() => generarDocumento('orden')} className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <ClipboardList className="w-4 h-4 mr-2"/> Orden de Trabajo
            </Button>
            <Button variant="outline" onClick={() => generarDocumento('presupuesto')} className="bg-background">
              <Printer className="w-4 h-4 mr-2"/> Imprimir / PDF
            </Button>
            <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm border-none">
              <MessageCircle className="w-4 h-4 mr-2"/> WhatsApp
            </Button>
            <Button onClick={handleGuardarPresupuesto} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Guardar
            </Button>
          </div>
        </div>

        {/* 1. DATOS DEL PRESUPUESTO */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
              <FileText className="w-5 h-5" /> Datos del Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 print:hidden">
              <div className="md:col-span-6 space-y-2 relative">
                <Label>Buscar Patente o Cliente <span className="text-destructive">*</span></Label>
                <div className="flex">
                  <Input 
                    placeholder="Ej: AB 123 CD o Juan Pérez..." 
                    className="bg-slate-50 dark:bg-slate-900 h-10 rounded-r-none border-r-0"
                    value={busquedaEntidad}
                    onChange={(e: any) => { setBusquedaEntidad(e.target.value); setMostrarResultados(true); }}
                    onFocus={() => setMostrarResultados(true)}
                    onBlur={() => setTimeout(() => setMostrarResultados(false), 300)}
                  />
                  <Button variant="outline" className="rounded-l-none bg-secondary/20 px-4 h-10 border-l-0"><Search className="h-4 w-4 text-muted-foreground"/></Button>
                </div>

                {mostrarResultados && busquedaEntidad.length > 0 && (vehiculosBusqueda.length > 0 || clientesBusqueda.length > 0) && (
                  <div className="absolute top-[72px] left-0 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                    {vehiculosBusqueda.map(v => {
                      const c = clientes.find(cl => cl.id === v.cliente_id)
                      return (
                        <div key={v.id} onClick={() => seleccionarVehiculoBuscador(v)} className="p-2.5 hover:bg-emerald-600 hover:text-white cursor-pointer flex items-center gap-3 border-b border-border/50 text-sm transition-colors group">
                          <span className="bg-[#008A4B] text-white px-2 py-1 rounded font-mono font-bold tracking-widest">{v.patente}</span>
                          <span className="font-medium">- {c?.tipo_cliente === 'empresa' ? c.razon_social : `${c?.nombre} ${c?.apellido}`} ({v.marca} {v.modelo})</span>
                        </div>
                      )
                    })}
                    {clientesBusqueda.map(c => (
                      <div key={c.id} onClick={() => seleccionarClienteBuscador(c)} className="p-3 hover:bg-secondary cursor-pointer flex items-center gap-2 border-b border-border/50 text-sm transition-colors">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{c.tipo_cliente === 'empresa' ? c.razon_social : `${c.nombre} ${c.apellido}`}</span>
                        <span className="text-muted-foreground text-xs">({c.documento || 'Sin DNI'})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Fecha de Emisión</Label>
                <Input type="date" value={fecha} onChange={(e: any) => setFecha(e.target.value)} className="bg-slate-50 dark:bg-slate-900 h-10" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Validez (Días)</Label>
                <Input type="number" value={validez} onChange={(e: any) => setValidez(e.target.value)} className="bg-slate-50 dark:bg-slate-900 h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3"/> Vehículo</Label>
                {!vehiculoSeleccionado && clienteSeleccionado ? (
                  <Select value={vehiculoSeleccionado} onValueChange={(val: string) => setVehiculoSeleccionado(val)}>
                    <SelectTrigger className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-900 dark:text-amber-100 h-10 ring-2 ring-amber-400 ring-offset-2 ring-offset-background transition-all">
                      <SelectValue placeholder="⚠️ Seleccione el vehículo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehiculosDelCliente.length === 0 ? (
                        <SelectItem value="none" disabled>No tiene vehículos cargados</SelectItem>
                      ) : (
                        vehiculosDelCliente.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={vehiculoActual ? `${vehiculoActual.marca} ${vehiculoActual.modelo} (${vehiculoActual.patente})` : ""} className="bg-secondary/30 border-dashed text-foreground font-medium h-10" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> Cliente</Label>
                <Input readOnly value={clienteActual ? (clienteActual.tipo_cliente === 'empresa' ? clienteActual.razon_social : `${clienteActual.nombre} ${clienteActual.apellido}`) : ""} className="bg-secondary/30 border-dashed text-foreground font-medium h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</Label>
                <Input readOnly value={clienteActual?.telefono || ""} className="bg-secondary/30 border-dashed text-foreground font-medium font-mono h-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. TABLA DE DETALLE */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/10 border-b border-border py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detalle Presupuesto</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setMostrarCostos(!mostrarCostos)} className={`print:hidden ${mostrarCostos ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" : "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900"}`}>
              {mostrarCostos ? <Eye className="w-4 h-4 mr-2"/> : <EyeOff className="w-4 h-4 mr-2"/>} {mostrarCostos ? "Ocultar Costos" : "Costos Ocultos"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/5 hover:bg-secondary/5">
                    <TableHead className="w-[160px] print:hidden">Tipo</TableHead>
                    <TableHead>Descripción del Trabajo / Repuesto</TableHead>
                    <TableHead className="w-[80px] text-center">Cant.</TableHead>
                    {mostrarCostos && <TableHead className="w-[120px] text-right text-amber-600 print:hidden">Costo Unit.</TableHead>}
                    <TableHead className="w-[140px] text-right text-emerald-600">Precio Venta</TableHead>
                    <TableHead className="w-[140px] text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px] print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((fila) => {
                    const catalogoFiltrado = catalogo.filter(c => c.tipo === fila.tipo)

                    return (
                      <TableRow key={fila.id} className="hover:bg-transparent">
                        <TableCell className="print:hidden">
                          <Select value={fila.tipo} onValueChange={(v: string) => actualizarFila(fila.id, 'tipo', v)}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Servicio">Servicio</SelectItem>
                              <SelectItem value="Mano de Obra">Mano de Obra</SelectItem>
                              <SelectItem value="Repuesto">Repuesto</SelectItem>
                              <SelectItem value="Neumático">Neumático</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
                            <Input value={fila.detalle} onChange={(e: any) => actualizarFila(fila.id, 'detalle', e.target.value)} placeholder="Escriba el detalle..." className="h-10 bg-white dark:bg-slate-950 flex-1" />
                          </div>
                        </TableCell>
                        <TableCell><Input type="number" min="1" value={fila.cant} onChange={(e: any) => actualizarFila(fila.id, 'cant', e.target.value)} className="h-10 text-center font-mono bg-white dark:bg-slate-950" /></TableCell>
                        {mostrarCostos && (
                          <TableCell className="print:hidden"><Input type="number" value={fila.costo || ""} onChange={(e: any) => actualizarFila(fila.id, 'costo', e.target.value)} className="h-10 text-right font-mono border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900 focus-visible:ring-amber-400" /></TableCell>
                        )}
                        <TableCell><Input type="number" value={fila.precio || ""} onChange={(e: any) => actualizarFila(fila.id, 'precio', e.target.value)} className="h-10 text-right font-mono bg-white dark:bg-slate-950" /></TableCell>
                        <TableCell className="text-right font-bold font-mono text-base pt-4">${((parseFloat(fila.precio) || 0) * (parseInt(fila.cant) || 1)).toLocaleString()}</TableCell>
                        <TableCell className="print:hidden"><Button variant="ghost" size="icon" onClick={() => eliminarFila(fila.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/30 print:hidden">
              <Button variant="outline" size="sm" onClick={agregarFilaVacia} className="bg-background"><Plus className="w-4 h-4 mr-2"/> Agregar Fila</Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. TOTALES Y NOTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="border-border shadow-sm"><CardContent className="p-4 space-y-2"><Label className="font-semibold text-foreground">Observaciones para el Cliente <span className="text-muted-foreground font-normal text-xs">(Sale en el PDF)</span></Label><Textarea value={notasCliente} onChange={(e: any) => setNotasCliente(e.target.value)} className="min-h-[80px] bg-slate-50 dark:bg-slate-900 border-border" /></CardContent></Card>
            <Card className="border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 shadow-sm print:hidden"><CardContent className="p-4 space-y-2"><Label className="font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2"><Lock className="w-4 h-4"/> Notas Internas Ocultas <span className="text-amber-600/70 font-normal text-xs">(Sale en Orden de Trabajo)</span></Label><Textarea value={notasInternas} onChange={(e: any) => setNotasInternas(e.target.value)} placeholder="Información solo visible para el taller..." className="min-h-[80px] bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-900 focus-visible:ring-amber-400" /></CardContent></Card>
          </div>
          <div>
            <Card className="border-border shadow-md h-full">
              <CardContent className="p-6 space-y-4 flex flex-col h-full justify-center">
                <div className="flex justify-between items-center text-muted-foreground"><span>Subtotal Neto:</span><span className="font-mono text-lg">${subtotalNeto.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-muted-foreground"><span>Descuento / Atención:</span><div className="relative w-32"><span className="absolute left-3 top-2.5 text-muted-foreground text-sm">-$</span><Input type="number" value={descuento || ""} onChange={(e: any) => setDescuento(parseFloat(e.target.value) || 0)} className="h-10 pl-7 text-right font-mono bg-slate-50 dark:bg-slate-900" /></div></div>
                <div className="border-t border-border pt-4 mt-2 flex justify-between items-center"><span className="text-xl font-bold text-foreground">Total Final:</span><span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalFinal.toLocaleString()}</span></div>
                {mostrarCostos && (<div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex justify-between items-center animate-in fade-in duration-300 print:hidden"><span className="font-semibold text-emerald-800 dark:text-emerald-400">Ganancia Neta Estimada:</span><span className="text-xl font-bold text-emerald-700 dark:text-emerald-500 font-mono">${gananciaEstimada.toLocaleString()}</span></div>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // VISTA LISTA PRINCIPAL
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-semibold text-foreground">Presupuestos y Órdenes</h2><p className="text-sm text-muted-foreground">Administrá las cotizaciones y órdenes de trabajo del taller.</p></div>
        <Button onClick={() => setVista("crear")} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto</Button>
      </div>
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por cliente o patente..." className="pl-9 bg-background" /></div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-secondary/20"><TableHead>Nro</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente y Vehículo</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : presupuestos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No hay presupuestos generados.</TableCell></TableRow>
              ) : (
                presupuestos.map((p) => (
                  <TableRow key={p.id} className="hover:bg-secondary/50">
                    <TableCell className="font-mono font-bold">{p.nro_comprobante}</TableCell>
                    <TableCell>{new Date(p.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{p.clientes?.tipo_cliente === 'empresa' ? p.clientes.razon_social : `${p.clientes?.nombre} ${p.clientes?.apellido}`}</div>
                      <div className="text-xs text-muted-foreground">{p.vehiculos?.marca} {p.vehiculos?.modelo} ({p.vehiculos?.patente})</div>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono">${p.total?.toLocaleString()}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{p.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => generarDocumento('orden', p)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Orden de Trabajo"><ClipboardList className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => generarDocumento('presupuesto', p)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="PDF Presupuesto"><Printer className="h-4 w-4" /></Button>
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
  )
}