"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Wrench, CheckCircle2, Flag, ArrowRight, User, FileText, Loader2, MessageCircle, Star, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const COLUMNAS = [
  { id: "A Ingresar", titulo: "Esperando Ingreso", icono: Clock, color: "text-slate-500", border: "border-slate-200 dark:border-slate-800", bg: "bg-slate-50 dark:bg-slate-900/50" },
  { id: "En Proceso", titulo: "En Proceso (Elevador)", icono: Wrench, color: "text-blue-500", border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/50 dark:bg-blue-900/10" },
  { id: "Terminado", titulo: "Terminado (A Lavar/Entregar)", icono: CheckCircle2, color: "text-emerald-500", border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/50 dark:bg-emerald-900/10" },
  { id: "Entregado", titulo: "Entregado al Cliente", icono: Flag, color: "text-purple-500", border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/50 dark:bg-purple-900/10" },
]

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function WorkOrdersTable({ 
  onNavigateToPresupuesto, 
  readOnly = false,
  userRole // <-- RECIBIMOS EL ROL
}: { 
  onNavigateToPresupuesto?: (id: string) => void, 
  readOnly?: boolean,
  userRole?: string | null // <-- LO DEFINIMOS
}) {
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [configuracion, setConfiguracion] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  // Estados para el Modal Post-Venta
  const [isPostVentaModalOpen, setIsPostVentaModalOpen] = useState(false)
  const [ordenPostVenta, setOrdenPostVenta] = useState<any>(null)

  const hoyLocal = getLocalDateString(new Date());

  const cargarDatos = async () => {
    setIsLoading(true)
    try {
      const [resOrdenes, resConfig] = await Promise.all([
        supabase.from('ordenes_trabajo').select('*, presupuestos(numero_correlativo, total_final)').order('created_at', { ascending: false }),
        supabase.from('configuracion').select('*').eq('id', 1).single()
      ])
      
      if (resOrdenes.error) throw resOrdenes.error
      setOrdenes(resOrdenes.data || [])
      if (resConfig.data) setConfiguracion(resConfig.data)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- MAGIA EN TIEMPO REAL TOTAL (INGRESOS + AVANCES) ---
  useEffect(() => {
    // 1. Carga inicial
    cargarDatos();

    // 2. Escucha activa de TODO lo que pase en la tabla de órdenes
    const canalTaller = supabase.channel('sincronizacion-taller')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes_trabajo' },
        async (payload) => {
          
          // CASO A: Alguien movió un auto (UPDATE)
          if (payload.eventType === 'UPDATE') {
            setOrdenes(actuales => 
              actuales.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
            );
          } 
          
          // CASO B: Mostrador ingresó un auto nuevo (INSERT)
          else if (payload.eventType === 'INSERT') {
            const { data: nuevaOrdenConDatos } = await supabase
              .from('ordenes_trabajo')
              .select('*, presupuestos(numero_correlativo, total_final)')
              .eq('id', payload.new.id)
              .single();

            if (nuevaOrdenConDatos) {
              setOrdenes(actuales => {
                // FILTRO ANTI-CLONES: Revisamos si ya tenemos esta tarjeta en la pantalla
                const yaExiste = actuales.some(o => o.id === nuevaOrdenConDatos.id);
                if (yaExiste) {
                  return actuales; // Si ya existe, no hacemos nada
                }
                // Si no existe, la agregamos al principio de la lista
                return [nuevaOrdenConDatos, ...actuales];
              });
            }
          }
          
          // CASO C: Alguien borró una orden (DELETE)
          else if (payload.eventType === 'DELETE') {
            setOrdenes(actuales => actuales.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalTaller);
    }
  }, []);

  const avanzarEstado = async (id: string, estadoActual: string) => {
    const currentIndex = COLUMNAS.findIndex(c => c.id === estadoActual)
    if (currentIndex >= COLUMNAS.length - 1) return

    const nuevoEstado = COLUMNAS[currentIndex + 1].id

    if (nuevoEstado === "Entregado") {
      const orden = ordenes.find(o => o.id === id);
      
      if (orden && orden.presupuesto_id) {
        // Consultamos la base de datos EN VIVO para no depender de la memoria vieja
        const { data: presEnVivo } = await supabase
          .from('presupuestos')
          .select('estado_pago')
          .eq('id', orden.presupuesto_id)
          .single();

        if (presEnVivo && presEnVivo.estado_pago !== 'Cobrado') {
          alert("⛔ ALERTA DE CAJA: No se puede entregar el vehículo.\n\nEl presupuesto asociado aún tiene saldo pendiente. Diríjase a Tesorería para registrar el cobro antes de liberar la unidad.");
          return; // Corta la ejecución y rebota la acción
        }
      }
    }

    const fechaEntrega = nuevoEstado === "Entregado" ? hoyLocal : null;

    setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado: nuevoEstado, fecha_entrega: fechaEntrega } : o))

    try {
      let updatePayload: any = { estado: nuevoEstado };
      if (fechaEntrega) updatePayload.fecha_entrega = fechaEntrega;
      await supabase.from('ordenes_trabajo').update(updatePayload).eq('id', id)
    } catch (error) {
      alert("Error al mover el vehículo.")
      cargarDatos()
    }
  }

  const handleNotificarCliente = async (orden: any) => {
    try {
      const { data, error } = await supabase.from('vehiculos').select('marca, modelo, clientes(telefono)').eq('patente', orden.vehiculo_patente).single();
      // @ts-ignore
      const telefono = data?.clientes?.telefono;
      const marcaModelo = data ? `${data.marca} ${data.modelo}` : "vehículo";

      if (error || !telefono) {
        alert("⚠️ El dueño de este vehículo no tiene un número de teléfono registrado en el sistema.");
        return;
      }

      const telefonoLimpio = telefono.replace(/\D/g, '');
      let mensaje = configuracion.msj_listo || "Hola {{cliente}}, te avisamos que tu {{vehiculo}} ({{patente}}) ya está listo para retirar en {{taller}} dentro del horario: {{horario}}.";
      
      mensaje = mensaje
        .replace(/{{cliente}}/g, orden.cliente_nombre)
        .replace(/{{vehiculo}}/g, marcaModelo)
        .replace(/{{patente}}/g, orden.vehiculo_patente)
        .replace(/{{horario}}/g, configuracion.horario || "nuestro horario de atención")
        .replace(/{{taller}}/g, configuracion.nombre_taller || "nuestro taller");
      
      window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
    } catch (err) { alert("Hubo un error al intentar abrir WhatsApp."); }
  }

  // --- LÓGICA DE POST VENTA ---
  const abrirModalPostVenta = (orden: any, e: any) => {
    e.stopPropagation();
    setOrdenPostVenta(orden);
    setIsPostVentaModalOpen(true);
  }

  const ejecutarPostVenta = async (medio: 'wpp' | 'email') => {
    try {
      const { data, error } = await supabase.from('vehiculos').select('marca, modelo, clientes(telefono, email)').eq('patente', ordenPostVenta.vehiculo_patente).single();
      
      // @ts-ignore
      const telefono = data?.clientes?.telefono;
      // @ts-ignore
      const email = data?.clientes?.email;
      const marcaModelo = data ? `${data.marca} ${data.modelo}` : "vehículo";

      const reemplazos = (texto: string) => {
        return (texto || "")
          .replace(/{{cliente}}/g, ordenPostVenta.cliente_nombre)
          .replace(/{{vehiculo}}/g, marcaModelo)
          .replace(/{{patente}}/g, ordenPostVenta.vehiculo_patente)
          .replace(/{{taller}}/g, configuracion.nombre_taller || "nuestro taller");
      }

      if (medio === 'wpp') {
        if (!telefono) return alert("⚠️ El dueño no tiene número de teléfono registrado.");
        const telefonoLimpio = telefono.replace(/\D/g, '');
        const msj = reemplazos(configuracion.msj_postventa_wpp);
        window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(msj)}`, '_blank');
      } 
      else if (medio === 'email') {
        if (!email) return alert("⚠️ El dueño no tiene un correo electrónico (email) registrado en el sistema.");
        const asunto = reemplazos(configuracion.msj_postventa_email_asunto);
        const cuerpo = reemplazos(configuracion.msj_postventa_email_cuerpo);
        
        // LA MAGIA DE GMAIL WEB
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        window.open(gmailUrl, '_blank');
      }

      setIsPostVentaModalOpen(false);
    } catch (err) {
      alert("Hubo un error al preparar el mensaje.");
    }
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Control de Taller</h2>
        <p className="text-sm text-muted-foreground">Flujo de trabajo de los vehículos ingresados.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {COLUMNAS.map(columna => {
          const Icono = columna.icono
          
          let ordenesEnColumna = ordenes.filter(o => o.estado === columna.id)
          if (columna.id === "Entregado") {
            ordenesEnColumna = ordenesEnColumna.filter(o => o.fecha_entrega === hoyLocal)
          }

          return (
            <div key={columna.id} className={`flex flex-col rounded-xl border ${columna.border} ${columna.bg} overflow-hidden h-full max-h-full`}>
              <div className={`p-3 border-b ${columna.border} bg-background/50 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Icono className={`w-4 h-4 ${columna.color}`} />
                  {columna.titulo}
                </div>
                <Badge variant="secondary" className="font-mono">{ordenesEnColumna.length}</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {ordenesEnColumna.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8 italic border-2 border-dashed border-border/50 rounded-lg">
                    {columna.id === "Entregado" ? "Aún no se entregaron autos hoy." : "Vacío"}
                  </div>
                ) : (
                  ordenesEnColumna.map(orden => (
                    <Card 
                      key={orden.id} 
                      className={`border-border shadow-sm transition-all group ${orden.presupuesto_id ? 'hover:shadow-md cursor-pointer hover:border-primary/50' : ''}`}
                      onClick={() => {
                        if (orden.presupuesto_id && onNavigateToPresupuesto) {
                          onNavigateToPresupuesto(orden.presupuesto_id);
                        }
                      }}
                    >
                      <CardContent className="p-3 relative">
                        <div className="font-bold text-foreground mb-1">{orden.vehiculo_patente}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <User className="w-3 h-3"/> {orden.cliente_nombre}
                        </div>
                        
                        {orden.presupuestos && (
                          <div className="bg-primary/5 text-primary text-xs font-mono p-1.5 rounded flex justify-between items-center border border-primary/10">
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> PRE-{orden.presupuestos.numero_correlativo}</span>
                            
                            {/* OCULTAMOS EL PRECIO AL MECANICO */}
                            {userRole !== 'mecanico' && (
                              <span className="font-bold">${orden.presupuestos.total_final?.toLocaleString()}</span>
                            )}
                          </div>
                        )}

                        {!readOnly && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            
                            {/* OCULTAMOS AVISO DE WHATSAPP AL MECANICO */}
                            {columna.id === "Terminado" && userRole !== 'mecanico' && (
                              <Button size="sm" className="w-full h-7 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white border-none transition-colors" onClick={(e) => { e.stopPropagation(); handleNotificarCliente(orden); }}>
                                <MessageCircle className="w-3 h-3 mr-1" /> Avisar al Cliente
                              </Button>
                            )}

                            {/* OCULTAMOS POST VENTA AL MECANICO */}
                            {columna.id === "Entregado" && userRole !== 'mecanico' && (
                              <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none transition-colors" onClick={(e) => abrirModalPostVenta(orden, e)}>
                                <Star className="w-3 h-3 mr-1" /> Post-Venta
                              </Button>
                            )}

                            {/* EL MECÁNICO NO PUEDE AVANZAR DESDE "TERMINADO" A "ENTREGADO" */}
                            {columna.id !== "Entregado" && !(columna.id === "Terminado" && userRole === 'mecanico') && (
                              <Button size="sm" variant="secondary" className="w-full h-7 text-xs bg-background hover:bg-emerald-50 hover:text-emerald-700 border border-border group-hover:border-emerald-200 transition-colors" onClick={(e) => { e.stopPropagation(); avanzarEstado(orden.id, orden.estado); }}>
                                Avanzar <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL DE POST VENTA */}
      <Dialog open={isPostVentaModalOpen} onOpenChange={setIsPostVentaModalOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Star className="w-6 h-6 text-blue-600" /> Seguimiento Post-Venta
            </DialogTitle>
            <DialogDescription>
              ¿Por qué medio querés enviarle la encuesta de satisfacción a <b>{ordenPostVenta?.cliente_nombre}</b>?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300"
              onClick={() => ejecutarPostVenta('wpp')}
            >
              <MessageCircle className="w-6 h-6 mb-1" />
              <span className="font-bold">WhatsApp</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300"
              onClick={() => ejecutarPostVenta('email')}
            >
              <Mail className="w-6 h-6 mb-1" />
              <span className="font-bold">Correo Electrónico</span>
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPostVentaModalOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}