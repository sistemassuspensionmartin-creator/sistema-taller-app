"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Loader2, Save, Package, Wrench, DollarSign, Percent, Tag, CircleDashed } from "lucide-react"
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
  "Kumho", "Hankook", "Otra"
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
    // Nuevos campos específicos
    marca: "",
    modelo: "",
    medida: ""
  })

  const fetchCatalogo = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('catalogo').select('*').order('detalle')
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error al cargar el catálogo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCatalogo() }, [])

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
    setFormData({ tipo: "Repuesto", detalle: "", costo_base: "", precio_base: "", stock_actual: "0", marca: "", modelo: "", medida: "" })
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
      marca: item.marca || "",
      modelo: item.modelo || "",
      medida: item.medida || ""
    })
    setIsModalOpen(true)
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
      const payload = {
        tipo: formData.tipo,
        detalle: nombreFinal, // Guardamos el nombre armado
        costo_base: parseFloat(formData.costo_base) || 0,
        precio_base: parseFloat(formData.precio_base) || 0,
        // Solo guardamos stock si es Repuesto o Neumático
        stock_actual: (formData.tipo === "Repuesto" || formData.tipo === "Neumático") ? parseInt(formData.stock_actual) || 0 : 0,
        marca: formData.tipo === "Neumático" ? formData.marca : null,
        modelo: formData.tipo === "Neumático" ? formData.modelo : null,
        medida: formData.tipo === "Neumático" ? formData.medida : null,
      }

      if (editingId) {
        const { error } = await supabase.from('catalogo').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
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

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Catálogo y Stock</h2>
          <p className="text-sm text-muted-foreground">Administrá tus repuestos, neumáticos, servicios y mano de obra.</p>
        </div>
        <Button onClick={abrirCrear} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
        </Button>
      </div>

      <Tabs defaultValue="todos" onValueChange={setFiltroTab} className="w-full">
        <TabsList className="mb-4 bg-secondary">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos & Neumáticos</TabsTrigger>
          <TabsTrigger value="servicios">Servicios y Mano de Obra</TabsTrigger>
        </TabsList>

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border bg-secondary/10 pb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por detalle o nombre..." className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                  <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
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
                            <Badge variant={item.stock_actual <= 2 ? "destructive" : "secondary"} className="font-mono">
                              {item.stock_actual}
                            </Badge>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => abrirEditar(item)}>
                            <Edit className="h-4 w-4" />
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
      </Tabs>

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
              <RadioGroup defaultValue="Repuesto" className="flex flex-wrap justify-center gap-6" value={formData.tipo} onValueChange={(val: string) => setFormData({...formData, tipo: val})}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Repuesto" id="repuesto" /><Label htmlFor="repuesto" className="font-semibold cursor-pointer flex items-center"><Package className="w-4 h-4 mr-1 text-blue-600"/> Repuesto</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Neumático" id="neumatico" /><Label htmlFor="neumatico" className="font-semibold cursor-pointer flex items-center"><CircleDashed className="w-4 h-4 mr-1 text-zinc-600"/> Neumáticos</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Servicio" id="servicio" /><Label htmlFor="servicio" className="font-semibold cursor-pointer flex items-center"><Wrench className="w-4 h-4 mr-1 text-orange-600"/> Servicio</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Mano de Obra" id="mano" /><Label htmlFor="mano" className="font-semibold cursor-pointer flex items-center"><Wrench className="w-4 h-4 mr-1 text-purple-600"/> Mano de Obra</Label></div>
              </RadioGroup>
            </div>

            <section>
              <div className="border-l-4 border-emerald-600 pl-3 mb-4"><h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Información Principal</h3></div>
              
              {/* FORMULARIO CONDICIONAL: SI ES NEUMÁTICO MUESTRA ESTO */}
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
                /* FORMULARIO ESTÁNDAR PARA REPUESTOS Y SERVICIOS */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Detalle / Nombre <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ej: Pastillas de Freno Bosch / Alineado de Auto" className="h-12 bg-slate-50 dark:bg-slate-900 border-border" value={formData.detalle} onChange={(e) => setFormData({...formData, detalle: e.target.value})} />
                  </div>
                  
                  {formData.tipo === "Repuesto" && (
                    <div className="space-y-2 w-1/3">
                      <Label>Cantidad en Stock</Label>
                      <Input type="number" placeholder="0" className="bg-slate-50 dark:bg-slate-900 border-border font-mono" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} />
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
    </div>
  )
}