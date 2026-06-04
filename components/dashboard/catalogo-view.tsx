"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Loader2, Save, Package, Wrench, DollarSign, Percent, Tag, CircleDashed, Trash2, MessageCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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

import { supabase } from "@/lib/supabase"

const MARCAS_NEUMATICOS = [
  "GoodYear", "Gt Radial", "Champiro", "Pirelli", 
  "Fate", "Michelin", "Bridgestone", "Firestone", 
  "Kumho", "Hankook", "Wanli", "Sunny", "Otra"
]

export function CatalogoView() {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTab, setFiltroTab] = useState("todos")

  const [isModalOpen, setIsModalOpen] = useState(false) 
  const [editingId, setEditingId] = useState<string | null>(null) 

  const [formData, setFormData] = useState({
    tipo: "Repuesto", // Repuesto, Servicio, Mano de Obra, Neumático
    detalle: "",
    costo_base: "",
    precio_base: "",
    stock_actual: "",
    controlar_stock: true,
    marca: "",
    modelo: "",
    medida: ""
  })

  const fetchCatalogo = async () => {
    setIsLoading(true)
    try {
      // Le sacamos el order() de la base de datos porque lo vamos a ordenar nosotros a mano
      const { data, error } = await supabase.from('catalogo').select('*')
      if (error) throw error

      // MAGIA: Ordenamiento por Tipo y luego Inteligente
      const pesoTipo: Record<string, number> = {
        "Neumático": 1,
        "Repuesto": 2,
        "Servicio": 3,
        "Mano de Obra": 4
      };

      const datosOrdenados = (data || []).sort((a: any, b: any) => {
        // 1. Primero ordenamos por la categoría principal (pesoTipo)
        const pesoA = pesoTipo[a.tipo] || 99;
        const pesoB = pesoTipo[b.tipo] || 99;
        
        if (pesoA !== pesoB) return pesoA - pesoB;

        // 2. Si ambos son del MISMO tipo, aplicamos las reglas internas
        if (a.tipo === 'Neumático' && b.tipo === 'Neumático') {
          const numsA = a.medida ? a.medida.match(/\d+/g) : [];
          const numsB = b.medida ? b.medida.match(/\d+/g) : [];

          if (numsA && numsB && numsA.length >= 3 && numsB.length >= 3) {
            const anchoA = parseInt(numsA[0]), perfilA = parseInt(numsA[1]), rodadoA = parseInt(numsA[2]);
            const anchoB = parseInt(numsB[0]), perfilB = parseInt(numsB[1]), rodadoB = parseInt(numsB[2]);

            // De menor a mayor: Rodado -> Ancho -> Perfil
            if (rodadoA !== rodadoB) return rodadoA - rodadoB;
            if (anchoA !== anchoB) return anchoA - anchoB;
            if (perfilA !== perfilB) return perfilA - perfilB;
          }
        }
        
        // Para Repuestos, Servicios o si falla la lectura de medida, va alfabético
        return a.detalle.localeCompare(b.detalle);
      });

      setItems(datosOrdenados)
    } catch (error) {
      console.error("Error al cargar el catálogo:", error)
    } finally {
      setIsLoading(false)
    }
  }

// --- NUEVO: ESTADO Y CARGA DE PEDIDOS ---
  const [pedidos, setPedidos] = useState<any[]>([])

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase.from('pedidos_proveedor').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setPedidos(data || [])
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    }
  }

  useEffect(() => { 
    fetchCatalogo(); 
    fetchPedidos(); 
  }, [])

  // MAGIA: Formateador automático de medidas (Ej: 265 / 65 R 18)
  const handleMedidaChange = (e: any) => {
    let val = e.target.value.replace(/\D/g, "") // Solo números
    if (val.length > 7) val = val.slice(0, 7) // Máximo 7 números
    
    let formatted = val
    if (val.length > 3 && val.length <= 5) {
      formatted = `${val.slice(0, 3)} / ${val.slice(3)}`
    } else if (val.length > 5) {
      formatted = `${val.slice(0, 3)} / ${val.slice(3, 5)} R ${val.slice(5)}`
    }
    
    setFormData({ ...formData, medida: formatted })
  }

  const abrirCrear = () => {
    setEditingId(null)
    setFormData({ 
      tipo: "Repuesto", 
      detalle: "", 
      costo_base: "", 
      precio_base: "", 
      stock_actual: "0", 
      controlar_stock: true, // Por defecto tildado
      marca: "", 
      modelo: "", 
      medida: "" 
    })
    setIsModalOpen(true)
  }

  const abrirEditar = (item: any) => {
    setEditingId(item.id)
    setFormData({
      tipo: item.tipo,
      detalle: item.detalle,
      costo_base: item.costo_base?.toString() || "0",
      precio_base: item.precio_base?.toString() || "0",
      stock_actual: item.stock_actual?.toString() || "0",
      controlar_stock: item.controlar_stock ?? true, // <--- Cargar de la DB
      marca: item.marca || "",
      modelo: item.modelo || "",
      medida: item.medida || ""
    })
    setIsModalOpen(true)
  }

  // --- ESTADOS PARA ELIMINAR ---
  const [itemAEliminar, setItemAEliminar] = useState<any>(null);

  // --- FUNCIÓN QUE ABRE EL CARTEL ---
  const handleEliminarItem = (id: string, nombre: string) => {
    setItemAEliminar({ id, nombre });
  }

  // --- FUNCIÓN QUE EJECUTA LA ELIMINACIÓN ---
  const confirmarEliminarItem = async () => {
    if (!itemAEliminar) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('catalogo').delete().eq('id', itemAEliminar.id);
      if (error) throw error;
      fetchCatalogo();
      setItemAEliminar(null); // Cierra el cartel
    } catch (error) {
      alert("No se pudo eliminar el ítem. Es posible que ya esté siendo usado en algún presupuesto histórico.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGuardarItem = async () => {
    let nombreFinal = formData.detalle

    // Si es un neumático, le autogeneramos el nombre para que quede hermoso en la tabla
    if (formData.tipo === "Neumático") {
      if (!formData.marca || !formData.modelo || !formData.medida) {
        return alert("Por favor complete Marca, Modelo y Medida del neumático.")
      }
      nombreFinal = `Neumático ${formData.marca} ${formData.modelo} ${formData.medida}`
    } else if (!formData.detalle.trim()) {
      return alert("El detalle es obligatorio.")
    }

    if (!formData.precio_base) {
      return alert("El precio de venta es obligatorio.")
    }

    setIsSaving(true)
    try {
      let payload: any = {
        tipo: formData.tipo,
        detalle: nombreFinal,
        costo_base: parseFloat(formData.costo_base) || 0,
        precio_base: parseFloat(formData.precio_base) || 0,
        controlar_stock: formData.controlar_stock, // <--- Enviar a la DB
        stock_actual: (formData.controlar_stock && (formData.tipo === "Repuesto" || formData.tipo === "Neumático")) 
                       ? parseInt(formData.stock_actual) || 0 
                       : 0,
        marca: formData.tipo === "Neumático" ? formData.marca : null,
        modelo: formData.tipo === "Neumático" ? formData.modelo : null,
        medida: formData.tipo === "Neumático" ? formData.medida : null,
      }

      if (editingId) {
        // Actualizamos (no tocamos el código porque ya tiene uno)
        const { error } = await supabase.from('catalogo').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        // --- MAGIA: GENERADOR AUTOMÁTICO DE CÓDIGOS (SKU) ---
        if (formData.tipo === "Repuesto" || formData.tipo === "Neumático") {
          const prefijo = formData.tipo === "Repuesto" ? "R-" : "N-";
          
          // Buscamos el último código guardado con ese prefijo
          const { data: ultimosItems } = await supabase
            .from('catalogo')
            .select('codigo')
            .ilike('codigo', `${prefijo}%`)
            .order('codigo', { ascending: false })
            .limit(1);

          if (ultimosItems && ultimosItems.length > 0 && ultimosItems[0].codigo) {
            // Agarramos el R-1045, le sacamos la "R-" y lo convertimos en número (1045)
            const ultimoNumero = parseInt(ultimosItems[0].codigo.replace(prefijo, ""));
            if (!isNaN(ultimoNumero)) {
              payload.codigo = `${prefijo}${ultimoNumero + 1}`; // Queda R-1046
            } else {
              payload.codigo = `${prefijo}1001`; // Por si hay algún error raro, arranca en 1001
            }
          } else {
            // Si la tabla está vacía, es el primero absoluto
            payload.codigo = `${prefijo}1001`;
          }
        }
        // --------------------------------------------------

        const { error } = await supabase.from('catalogo').insert([payload])
        if (error) throw error
      }
      setIsModalOpen(false)
      fetchCatalogo() 
    } catch (error) {
      console.error("Error al guardar:", error)
      alert("No se pudo guardar el ítem.")
    } finally {
      setIsSaving(false)
    }
  }

 // --- ESTADOS: WHATSAPP, PROVEEDORES E INGRESOS ---
  const [pedidoParaMandar, setPedidoParaMandar] = useState<any>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [mostrandoFormProveedor, setMostrandoFormProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", telefono: "" });
  
  const [pedidoIngresando, setPedidoIngresando] = useState<any>(null);
  const [cantidadIngresada, setCantidadIngresada] = useState("");

  const fetchProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*').order('nombre');
    if (data) setProveedores(data);
  }

  // --- NUEVO: ESTADO PARA LA CONFIGURACIÓN ---
  const [configuracion, setConfiguracion] = useState<any>({});

  const fetchConfig = async () => {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).single();
    if (data) setConfiguracion(data);
  }

  // Agregamos que cargue TODO al abrir la pantalla
  useEffect(() => { 
    fetchCatalogo(); 
    fetchPedidos(); 
    fetchProveedores();
    fetchConfig(); // <--- Acá sumamos que descargue la config
  }, [])

  // --- FUNCIONES DE PROVEEDORES ---
  const handleAgregarProveedor = async () => {
    if (!nuevoProveedor.nombre || !nuevoProveedor.telefono) return alert("Completá nombre y teléfono.");
    const telefonoLimpio = nuevoProveedor.telefono.replace(/\D/g, "");
    try {
      await supabase.from('proveedores').insert([{ nombre: nuevoProveedor.nombre, telefono: telefonoLimpio }]);
      setNuevoProveedor({ nombre: "", telefono: "" });
      setMostrandoFormProveedor(false);
      fetchProveedores();
    } catch (error) {
      alert("Error al guardar proveedor.");
    }
  }

  const handleEliminarProveedor = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar a ${nombre} de tu agenda?`)) return;
    await supabase.from('proveedores').delete().eq('id', id);
    fetchProveedores();
  }

 // --- ESTADOS PARA CARTELES HERMOSOS ---
  const [itemParaPedir, setItemParaPedir] = useState<any>(null);
  const [cantidadManual, setCantidadManual] = useState("4");
  const [pedidoAEliminar, setPedidoAEliminar] = useState<any>(null);

  // --- FUNCIONES ACTUALIZADAS (Sin los carteles feos del navegador) ---
  const confirmarEliminarPedido = async () => {
    if (!pedidoAEliminar) return;
    await supabase.from('pedidos_proveedor').delete().eq('id', pedidoAEliminar.id);
    fetchPedidos();
    setPedidoAEliminar(null); // Cerramos el cartel
  }

  const confirmarPedirManual = async () => {
    const cantidadNumerica = parseInt(cantidadManual);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) return alert("Cantidad inválida.");
    try {
      await supabase.from('pedidos_proveedor').insert([{
        catalogo_id: itemParaPedir.id,
        detalle: itemParaPedir.detalle,
        cantidad: cantidadNumerica,
        estado: 'Pedir'
      }]);
      fetchPedidos();
      setFiltroTab("pedidos");
      setItemParaPedir(null); // Cerramos el cartel
    } catch (error) {
      alert("Error al generar el pedido.");
    }
  }

  // --- Esta es la función que faltaba para abrir el cartel ---
  const abrirOpcionesWhatsApp = (pedido: any) => {
    setPedidoParaMandar(pedido);
  }

  const enviarWhatsAppAProveedor = async (numero: string) => {
    if (!pedidoParaMandar) return;
    
    // --- MAGIA: LECTURA DEL MENSAJE DINÁMICO ---
    let texto = configuracion.msj_pedido_proveedor || "Hola, te escribo de {{taller}}. Necesito pedirte {{cantidad}} unidades de {{repuesto}}. ¿Tenés en stock?";
    
    texto = texto
      .replace(/{{cantidad}}/g, pedidoParaMandar.cantidad.toString())
      .replace(/{{repuesto}}/g, pedidoParaMandar.detalle)
      .replace(/{{taller}}/g, configuracion.nombre_taller || "nuestro taller");

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
    
    // Lo marcamos como solicitado
    await supabase.from('pedidos_proveedor').update({ estado: 'Solicitado' }).eq('id', pedidoParaMandar.id);
    setPedidoParaMandar(null);
    fetchPedidos();
  }


  // --- LA MAGIA: CONFIRMAR INGRESO Y SUBIR STOCK ---
  const handleConfirmarIngreso = async () => {
    if (!pedidoIngresando) return;
    const cantRecibida = parseInt(cantidadIngresada);
    
    if (isNaN(cantRecibida) || cantRecibida <= 0) return alert("Poné una cantidad válida.");
    if (cantRecibida > pedidoIngresando.cantidad) return alert("No podés ingresar más de lo que pediste acá.");

    try {
      // 1. Le sumamos el stock al ítem en el catálogo
      if (pedidoIngresando.catalogo_id) {
        const { data: itemCat } = await supabase.from('catalogo').select('stock_actual').eq('id', pedidoIngresando.catalogo_id).single();
        if (itemCat) {
          const nuevoStock = (itemCat.stock_actual || 0) + cantRecibida;
          await supabase.from('catalogo').update({ stock_actual: nuevoStock }).eq('id', pedidoIngresando.catalogo_id);
        }
      }

      // 2. Evaluamos si trajo todo o trajo por la mitad
      if (cantRecibida < pedidoIngresando.cantidad) {
        const restante = pedidoIngresando.cantidad - cantRecibida;
        
        // A. Actualizamos el pedido original para que queden los "restantes" en estado SOLICITADO
        await supabase.from('pedidos_proveedor').update({ 
          cantidad: restante, 
          estado: 'Solicitado' // <--- CAMBIO: Se queda en Solicitado, no en Pedir
        }).eq('id', pedidoIngresando.id);
        
        // B. Creamos un REGISTRO HISTÓRICO de las que SÍ llegaron hoy
        await supabase.from('pedidos_proveedor').insert([{
          catalogo_id: pedidoIngresando.catalogo_id,
          detalle: pedidoIngresando.detalle + " (Ingreso Parcial)",
          cantidad: cantRecibida,
          estado: 'Ingresaron'
        }]);

      } else {
        // Trajo todo junto, solo le cambiamos el estado para que quede en el historial
        await supabase.from('pedidos_proveedor').update({ estado: 'Ingresaron' }).eq('id', pedidoIngresando.id);
      }

      setPedidoIngresando(null);
      setCantidadIngresada("");
      fetchPedidos();
      fetchCatalogo(); 
    } catch (error) {
      alert("Error al ingresar el stock.");
    }
  }

  const itemsFiltrados = items.filter(item => {
    const coincideTab = filtroTab === "todos" || 
                       (filtroTab === "repuestos" && (item.tipo === "Repuesto" || item.tipo === "Neumático")) || 
                       (filtroTab === "servicios" && item.tipo !== "Repuesto" && item.tipo !== "Neumático")
    const coincideBusqueda = item.detalle.toLowerCase().includes(busqueda.toLowerCase())
    return coincideTab && coincideBusqueda
  })

  const getBadgeColor = (tipo: string) => {
    if (tipo === "Repuesto") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200"
    if (tipo === "Neumático") return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300"
    if (tipo === "Servicio") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200"
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200"
  }

  const getIcono = (tipo: string) => {
    if (tipo === "Neumático") return <CircleDashed className="w-3 h-3 mr-1" />
    if (tipo === "Repuesto") return <Package className="w-3 h-3 mr-1" />
    return <Wrench className="w-3 h-3 mr-1" />
  }


// --- MAGIA: CALCULAR GLOBITO ROJO ---
  const pendientesDePedir = pedidos.filter(p => p.estado === 'Pedir').length;


return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Catálogo y Stock</h2>
          <p className="text-sm text-muted-foreground">Administrá tus repuestos, neumáticos, servicios y mano de obra.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={abrirCrear} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
          </Button>
        </div>
      </div>

      <Tabs defaultValue="todos" onValueChange={setFiltroTab} className="w-full">
        <TabsList className="mb-4 bg-secondary flex-wrap h-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos & Neumáticos</TabsTrigger>
          <TabsTrigger value="servicios">Servicios y Mano de Obra</TabsTrigger>
          {/* PESTAÑA CON GLOBITO ROJO INTELIGENTE */}
          <TabsTrigger value="pedidos" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-900/30 font-bold relative">
            Pedidos a Proveedor
            {pendientesDePedir > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
                {pendientesDePedir}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <Card className="border-border bg-card">
          {/* EL BUSCADOR SE OCULTA SOLO SI ESTAMOS EN LA PESTAÑA PEDIDOS */}
          {filtroTab !== "pedidos" && (
            <CardHeader className="border-b border-border bg-secondary/10 pb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por detalle o nombre..." className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </CardHeader>
          )}
          
          <CardContent className="p-0">
            {filtroTab === "pedidos" ? (
              /* --- NUEVA TABLA: PEDIDOS A PROVEEDOR --- */
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead>Detalle del Repuesto/Neumático</TableHead>
                    <TableHead className="text-center w-[120px]">Cantidad</TableHead>
                    <TableHead className="w-[120px] text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-right w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay artículos pendientes de pedido.</TableCell></TableRow>
                  ) : (
                    [...pedidos].sort((a, b) => {
                      const peso: any = { "Pedir": 1, "Solicitado": 2, "Ingresaron": 3 };
                      return (peso[a.estado] || 99) - (peso[b.estado] || 99) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }).map(pedido => (
                      <TableRow key={pedido.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <Badge variant="outline" className={
                            pedido.estado === 'Pedir' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            pedido.estado === 'Solicitado' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }>
                            {pedido.estado === 'Pedir' ? <Clock className="w-3 h-3 mr-1"/> : 
                             pedido.estado === 'Solicitado' ? <MessageCircle className="w-3 h-3 mr-1"/> : 
                             <CheckCircle className="w-3 h-3 mr-1"/>}
                            {pedido.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{pedido.detalle}</TableCell>
                        <TableCell className="text-center font-bold text-lg">{pedido.cantidad}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(pedido.created_at).toLocaleDateString('es-AR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {pedido.estado !== 'Ingresaron' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Contactar Proveedor" onClick={() => abrirOpcionesWhatsApp(pedido)}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Ingresar Stock" onClick={() => { setPedidoIngresando(pedido); setCantidadIngresada(pedido.cantidad.toString()); }}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar de la lista" onClick={() => setPedidoAEliminar(pedido)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              /* --- TU TABLA ORIGINAL INTACTA: CATÁLOGO --- */
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead className="w-[150px]">Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-center w-[100px]">Stock</TableHead>
                    <TableHead className="text-right w-[120px] bg-slate-50 dark:bg-slate-900/50">Costo</TableHead>
                    <TableHead className="text-right w-[120px] text-primary">Precio Venta</TableHead>
                    <TableHead className="text-right w-[120px]">Ganancia</TableHead>
                    <TableHead className="text-right w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-6 w-20 bg-secondary/60 rounded-full animate-pulse"></div></TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="h-5 w-48 bg-secondary/60 rounded animate-pulse"></div>
                            <div className="h-4 w-32 bg-secondary/40 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><div className="h-5 w-12 bg-secondary/60 rounded animate-pulse mx-auto"></div></TableCell>
                        <TableCell className="text-right"><div className="h-5 w-24 bg-secondary/60 rounded animate-pulse ml-auto"></div></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <div className="h-8 w-8 bg-secondary/60 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-secondary/60 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : itemsFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No hay ítems en esta categoría.</TableCell></TableRow>
                  ) : (
                    itemsFiltrados.map((item) => {
                      const margen = item.precio_base - (item.costo_base || 0)
                      return (
                        <TableRow key={item.id} className="hover:bg-secondary/50">
                          <TableCell>
                            <Badge variant="outline" className={getBadgeColor(item.tipo)}>
                              {getIcono(item.tipo)}
                              {item.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{item.detalle}</TableCell>
                          <TableCell className="text-center">
                            {(item.tipo === "Repuesto" || item.tipo === "Neumático") ? (
                              item.controlar_stock !== false ? (
                                <Badge variant={item.stock_actual <= 2 ? "destructive" : "secondary"} className="font-mono">
                                  {item.stock_actual}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground uppercase font-bold bg-secondary/50 px-2 py-1 rounded">Genérico</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-slate-50 dark:bg-slate-900/20 text-muted-foreground font-mono">
                            ${(item.costo_base || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground font-mono">
                            ${item.precio_base.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                            ${margen.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* NUEVO: BOTÓN DE FORZAR PEDIDO (Solo para repuestos y neumáticos) */}
                              {(item.tipo === "Repuesto" || item.tipo === "Neumático") && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Pedir a Proveedor" onClick={() => { setItemParaPedir(item); setCantidadManual("4"); }}>
                                  <Clock className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => abrirEditar(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleEliminarItem(item.id, item.detalle)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* --- TU MODAL ORIGINAL PARA CREAR/EDITAR --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl min-h-[500px] border-border bg-card overflow-y-auto p-0 flex flex-col">
          <div className="bg-secondary/30 p-6 border-b border-border shrink-0">
            <DialogTitle className="text-2xl text-foreground font-bold">
              {editingId ? "Editar Ítem del Catálogo" : "Registrar Nuevo Ítem"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Cargue los detalles, costos y precios de venta.</p>
          </div>

          <div className="p-8 flex-1 space-y-8">
            <div className="bg-secondary/20 p-4 rounded-lg flex justify-center border border-border">
              <RadioGroup defaultValue="Repuesto" className="grid grid-cols-2 gap-x-12 gap-y-4" value={formData.tipo} onValueChange={(val: string) => setFormData({...formData, tipo: val})}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Repuesto" id="repuesto" /><Label htmlFor="repuesto" className="font-semibold cursor-pointer flex items-center"><Package className="w-4 h-4 mr-1 text-blue-600"/> Repuesto</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Neumático" id="neumatico" /><Label htmlFor="neumatico" className="font-semibold cursor-pointer flex items-center"><CircleDashed className="w-4 h-4 mr-1 text-zinc-600"/> Neumáticos</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Servicio" id="servicio" /><Label htmlFor="servicio" className="font-semibold cursor-pointer flex items-center"><Wrench className="w-4 h-4 mr-1 text-orange-600"/> Servicio</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Mano de Obra" id="mano" /><Label htmlFor="mano" className="font-semibold cursor-pointer flex items-center"><Wrench className="w-4 h-4 mr-1 text-purple-600"/> Mano de Obra</Label></div>
              </RadioGroup>
            </div>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Información Principal</h3></div>
              
              {formData.tipo === "Neumático" ? (
                <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/30 p-6 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label>Medida <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ej: 265 / 65 R 18" className="h-12 font-mono uppercase text-center tracking-widest bg-white dark:bg-slate-950" value={formData.medida} onChange={handleMedidaChange} maxLength={15} />
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Solo escriba los números</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Marca <span className="text-destructive">*</span></Label>
                    <Select value={formData.marca} onValueChange={(val: string) => setFormData({...formData, marca: val})}>
                      <SelectTrigger className="h-12 bg-white dark:bg-slate-950"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {MARCAS_NEUMATICOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ej: Wrangler ATR" className="h-12 bg-white dark:bg-slate-950" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad en Stock</Label>
                    <Input type="number" placeholder="Ej: 4" className="h-12 font-mono bg-white dark:bg-slate-950" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Detalle / Nombre <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ej: Pastillas de Freno Bosch / Alineado de Auto" className="h-12 bg-slate-50 dark:bg-slate-900 border-border" value={formData.detalle} onChange={(e) => setFormData({...formData, detalle: e.target.value})} />
                  </div>
                  
                  {formData.tipo === "Repuesto" && (
                    <div className="space-y-4 w-full mt-4">
                      <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                        <input 
                          type="checkbox" 
                          id="controlar_stock"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={formData.controlar_stock}
                          onChange={(e) => setFormData({...formData, controlar_stock: e.target.checked})}
                        />
                        <Label htmlFor="controlar_stock" className="text-sm font-bold cursor-pointer select-none">
                          Controlar Inventario (Descontar de Stock al aprobar)
                        </Label>
                      </div>
                      
                      {formData.controlar_stock && (
                        <div className="space-y-2 w-1/3 animate-in fade-in slide-in-from-top-2">
                          <Label>Cantidad en Stock</Label>
                          <Input type="number" placeholder="0" className="bg-white dark:bg-slate-900 border-border font-mono" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Precios y Rentabilidad</h3></div>
              <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/30 p-6 rounded-lg border border-border">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Costo Interno (Su costo)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input type="number" placeholder="0.00" className="pl-10 h-12 text-lg font-mono" value={formData.costo_base} onChange={(e) => setFormData({...formData, costo_base: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Precio Final al Público <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3 h-5 w-5 text-primary" />
                    <Input type="number" placeholder="0.00" className="pl-10 h-12 text-lg font-bold font-mono border-primary/30 focus-visible:ring-primary" value={formData.precio_base} onChange={(e) => setFormData({...formData, precio_base: e.target.value})} />
                  </div>
                </div>
              </div>
            </section>
          </div>
          
          <div className="p-6 border-t border-border bg-secondary/10 shrink-0 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarItem} disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : (editingId ? "Actualizar Ítem" : "Guardar en Catálogo")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- LOS 2 MODALES NUEVOS --- */}
      <Dialog open={!!pedidoParaMandar} onOpenChange={(open: boolean) => { if (!open) { setPedidoParaMandar(null); setMostrandoFormProveedor(false); } }}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-500" /> Contactar Proveedor</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">¿A quién querés enviarle el pedido de <b>{pedidoParaMandar?.detalle}</b>?</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {proveedores.length === 0 && !mostrandoFormProveedor ? (
                <p className="text-xs text-center text-muted-foreground py-2 border border-dashed border-border rounded-lg">No tenés proveedores guardados.</p>
              ) : (
                proveedores.map(prov => (
                  <div key={prov.id} className="flex items-center gap-2">
                    <Button className="flex-1 justify-start bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" onClick={() => enviarWhatsAppAProveedor(prov.telefono)}>
                      <MessageCircle className="w-4 h-4 mr-2" /> {prov.nombre}
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleEliminarProveedor(prov.id, prov.nombre)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            {mostrandoFormProveedor ? (
              <div className="bg-secondary/30 p-3 rounded-lg border border-border space-y-3 animate-in fade-in zoom-in-95">
                <div>
                  <Label className="text-xs">Nombre del Proveedor</Label>
                  <Input placeholder="Ej: Neumáticos Carlitos" className="h-8 mt-1" value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp (Código país + nro)</Label>
                  <Input placeholder="Ej: 5491123456789" className="h-8 mt-1 font-mono text-sm" value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setMostrandoFormProveedor(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-primary text-primary-foreground" onClick={handleAgregarProveedor}>Guardar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setMostrandoFormProveedor(true)}>
                <Plus className="w-4 h-4 mr-2" /> Añadir nuevo proveedor
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pedidoIngresando} onOpenChange={(open: boolean) => !open && setPedidoIngresando(null)}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-blue-500" /> Ingreso de Stock</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">Habías pedido <b>{pedidoIngresando?.cantidad}x {pedidoIngresando?.detalle}</b>.</p>
            </div>
            <div className="space-y-2">
              <Label>¿Cuántas unidades te trajeron finalmente?</Label>
              <Input type="number" className="text-center text-lg font-bold h-12" value={cantidadIngresada} onChange={(e) => setCantidadIngresada(e.target.value)} />
              <p className="text-xs text-muted-foreground text-center">Si te trajeron menos, el resto quedará como "Faltante".</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setPedidoIngresando(null)}>Cancelar</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmarIngreso}>Sumar al Stock</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- MODAL PARA FORZAR PEDIDO MANUAL --- */}
      <Dialog open={!!itemParaPedir} onOpenChange={(open: boolean) => !open && setItemParaPedir(null)}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Solicitar Ítem</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">¿Cuántas unidades de <b>{itemParaPedir?.detalle}</b> querés agregar a la lista de pedidos?</p>
            <Input type="number" className="text-center text-lg font-bold h-12" value={cantidadManual} onChange={(e) => setCantidadManual(e.target.value)} />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setItemParaPedir(null)}>Cancelar</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmarPedirManual}>Agregar a Pedidos</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL PARA CONFIRMAR ELIMINAR PEDIDO --- */}
      <Dialog open={!!pedidoAEliminar} onOpenChange={(open: boolean) => !open && setPedidoAEliminar(null)}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Eliminar Pedido</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">¿Estás seguro de que querés eliminar el pedido de <b>{pedidoAEliminar?.detalle}</b> de la lista de faltantes?</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPedidoAEliminar(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmarEliminarPedido}>Sí, eliminar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- MODAL PARA CONFIRMAR ELIMINAR ÍTEM DEL CATÁLOGO --- */}
      <Dialog open={!!itemAEliminar} onOpenChange={(open: boolean) => !open && setItemAEliminar(null)}>
        <DialogContent className="max-w-sm p-6 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-2xl outline-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">
              ¿Eliminar Ítem?
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              ¿Estás seguro de que querés eliminar <b>"{itemAEliminar?.nombre}"</b> del catálogo permanentemente?
            </DialogDescription>
            <div className="flex gap-3 w-full mt-4">
              <Button onClick={() => setItemAEliminar(null)} variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold">
                Cancelar
              </Button>
              <Button onClick={confirmarEliminarItem} disabled={isLoading} className="flex-1 h-12 rounded-xl text-base font-bold bg-red-600 hover:bg-red-700 text-white shadow-md">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}