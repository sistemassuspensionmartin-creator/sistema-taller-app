"use client"

import { useState, useMemo } from "react"
import { Plus, Search, FileText, Printer, MessageCircle, Trash2, ArrowLeft, Save, Car, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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

// --- DATOS SIMULADOS ---
const AUTOS_REGISTRADOS = [
  { patente: "AB 123 CD", modelo: "Toyota Corolla", dueño: "Juan Martínez", telefono: "5491145678901" },
  { patente: "AC 456 EF", modelo: "Ford Ranger", dueño: "Esteban Q.", telefono: "5491111112222" },
]

const PRESUPUESTOS_HISTORICOS = [
  { id: "PR-001", fecha: "2024-04-10", patente: "AB 123 CD", cliente: "Juan Martínez", total: 85000, estado: "Aprobado" },
  { id: "PR-002", fecha: "2024-04-12", patente: "AC 456 EF", cliente: "Esteban Q.", total: 120000, estado: "Borrador" },
]

export function PresupuestosView() {
  // Manejo de pantallas: 'lista' muestra la tabla, 'crear' muestra el formulario
  const [vistaActual, setVistaActual] = useState<"lista" | "crear">("lista")

  // --- ESTADOS DEL FORMULARIO ---
  const [busquedaPatente, setBusquedaPatente] = useState("")
  const [datosCabecera, setDatosCabecera] = useState({
    numero: "PR-003", // Esto en el futuro se genera solo en la BD
    fecha: new Date().toISOString().split("T")[0],
    validez: "15",
    estado: "Borrador",
    patente: "",
    auto: "",
    cliente: "",
    telefono: "",
    observacionesPublicas: "Los repuestos pueden sufrir variaciones de precio sin previo aviso. Validez sujeta a stock.",
    notasInternas: ""
  })

  // Filas de repuestos / mano de obra
  const [items, setItems] = useState([
    { id: 1, tipo: "Repuesto", detalle: "", cantidad: 1, precioUnitario: 0 }
  ])

  const [descuento, setDescuento] = useState(0)

  // --- FUNCIONES MATEMÁTICAS ---
  const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0)
  const totalFinal = subtotal - descuento

  // --- FUNCIONES DE LA VISTA ---
  const buscarAuto = () => {
    const auto = AUTOS_REGISTRADOS.find(a => a.patente.toLowerCase() === busquedaPatente.toLowerCase())
    if (auto) {
      setDatosCabecera({
        ...datosCabecera,
        patente: auto.patente,
        auto: auto.modelo,
        cliente: auto.dueño,
        telefono: auto.telefono
      })
    } else {
      alert("Patente no encontrada. Podés cargar los datos a mano.")
    }
  }

  const agregarFila = () => {
    setItems([...items, { id: Math.random(), tipo: "Repuesto", detalle: "", cantidad: 1, precioUnitario: 0 }])
  }

  const eliminarFila = (id: number) => {
    if (items.length === 1) return // No dejamos que borre la última fila
    setItems(items.filter(item => item.id !== id))
  }

  const actualizarFila = (id: number, campo: string, valor: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [campo]: valor } : item))
  }

  // --- ACCIONES MÁGICAS ---
  const handleImprimir = () => {
    // Al tocar imprimir, el navegador nativo abre la ventana y permite "Guardar como PDF"
    window.print()
  }

  const handleWhatsApp = () => {
    if (!datosCabecera.telefono) {
      alert("Falta el teléfono del cliente para enviar el WhatsApp.")
      return
    }

    const textoBase = `Hola ${datosCabecera.cliente}! 👋\nTe escribo del taller. Te preparé el presupuesto detallado para tu ${datosCabecera.auto} (${datosCabecera.patente}).\n\nEl total estimado es de *$${totalFinal.toLocaleString()}*.\n\nTe adjunto el PDF con todo el detalle de repuestos y mano de obra. Avisame cualquier duda y coordinamos el turno! 🚗🔧`
    
    const url = `https://wa.me/${datosCabecera.telefono}?text=${encodeURIComponent(textoBase)}`
    
    alert("TIP: Se va a abrir WhatsApp Web. Acordate de usar el botón de 'Imprimir / PDF' para guardar el archivo y arrastrarlo al chat.")
    window.open(url, '_blank')
  }

  // --- RENDER DE VISTAS ---
  if (vistaActual === "crear") {
    return (
      <div className="space-y-6 pb-12">
        {/* Barra de herramientas superior */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-secondary/30 p-4 rounded-lg border border-border">
          <Button variant="ghost" onClick={() => setVistaActual("lista")} className="text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la lista
          </Button>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-background mr-2 text-sm">{datosCabecera.numero}</Badge>
            <Button variant="outline" onClick={handleImprimir} className="border-border hover:bg-secondary text-foreground">
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button onClick={handleWhatsApp} className="bg-green-600 text-white hover:bg-green-700">
              <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>

        {/* BLOQUE 1: CABECERA Y CLIENTE */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border bg-secondary/10 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Datos del Presupuesto
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-xs">Estado:</Label>
                <Select value={datosCabecera.estado} onValueChange={(val: string) => setDatosCabecera({...datosCabecera, estado: val})}>
                  <SelectTrigger className="w-[140px] h-8 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    <SelectItem value="Borrador">Borrador</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="space-y-2 flex-1">
                  <Label className="text-card-foreground">Buscar Patente</Label>
                  <Input 
                    placeholder="Ej: AB 123 CD" 
                    className="bg-secondary border-border uppercase" 
                    value={busquedaPatente}
                    onChange={(e: any) => setBusquedaPatente(e.target.value)}
                    onKeyDown={(e: any) => e.key === 'Enter' && buscarAuto()}
                  />
                </div>
                <Button onClick={buscarAuto} className="bg-secondary text-foreground hover:bg-secondary/80 border border-border">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground">Vehículo</Label>
                  <div className="relative">
                    <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-background border-border" value={datosCabecera.auto} onChange={(e: any) => setDatosCabecera({...datosCabecera, auto: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground">Cliente</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-background border-border" value={datosCabecera.cliente} onChange={(e: any) => setDatosCabecera({...datosCabecera, cliente: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground">Fecha de Emisión</Label>
                  <Input type="date" className="bg-background border-border" value={datosCabecera.fecha} onChange={(e: any) => setDatosCabecera({...datosCabecera, fecha: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground">Validez (Días)</Label>
                  <Input type="number" className="bg-background border-border" value={datosCabecera.validez} onChange={(e: any) => setDatosCabecera({...datosCabecera, validez: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-card-foreground">Teléfono de Contacto (Para WhatsApp)</Label>
                <Input placeholder="Ej: 5491145678901" className="bg-background border-border" value={datosCabecera.telefono} onChange={(e: any) => setDatosCabecera({...datosCabecera, telefono: e.target.value})} />
                <p className="text-[10px] text-muted-foreground">Formato internacional sin el "+" (Ej: 549...)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BLOQUE 2: LA GRILLA (Items) */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border bg-secondary/10 pb-4">
            <CardTitle className="text-lg text-card-foreground">Detalle de Repuestos y Mano de Obra</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-secondary/20 hover:bg-secondary/20">
                  <TableHead className="w-[150px]">Tipo</TableHead>
                  <TableHead>Detalle / Descripción</TableHead>
                  <TableHead className="w-[100px] text-center">Cant.</TableHead>
                  <TableHead className="w-[150px] text-right">Precio Unit.</TableHead>
                  <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-border hover:bg-transparent">
                    <TableCell>
                      <Select value={item.tipo} onValueChange={(val: string) => actualizarFila(item.id, "tipo", val)}>
                        <SelectTrigger className="bg-background border-border h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                          <SelectItem value="Repuesto">Repuesto/Insumo</SelectItem>
                          <SelectItem value="Mano de Obra">Mano de Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder={item.tipo === "Repuesto" ? "Ej: Filtro de Aceite" : "Ej: Servicio de Alineado"} 
                        className="bg-background border-border h-9"
                        value={item.detalle}
                        onChange={(e: any) => actualizarFila(item.id, "detalle", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" min="1" step="0.5"
                        className="bg-background border-border h-9 text-center"
                        value={item.cantidad || ""}
                        onChange={(e: any) => actualizarFila(item.id, "cantidad", parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                        <Input 
                          type="number" min="0" 
                          className="bg-background border-border h-9 pl-6 text-right"
                          value={item.precioUnitario || ""}
                          onChange={(e: any) => actualizarFila(item.id, "precioUnitario", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      ${(item.cantidad * item.precioUnitario).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => eliminarFila(item.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-border">
              <Button variant="outline" onClick={agregarFila} className="border-dashed border-border text-foreground w-full sm:w-auto hover:bg-secondary">
                <Plus className="mr-2 h-4 w-4" /> Agregar Fila
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BLOQUE 3: TOTALES Y OBSERVACIONES */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Textos */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <Label className="text-card-foreground">Observaciones para el Cliente (Sale en el PDF)</Label>
                <Textarea 
                  className="bg-background border-border min-h-[80px] text-sm" 
                  value={datosCabecera.observacionesPublicas}
                  onChange={(e: any) => setDatosCabecera({...datosCabecera, observacionesPublicas: e.target.value})}
                />
              </CardContent>
            </Card>
            <Card className="border-border bg-card border-dashed">
              <CardContent className="p-4 space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  Notas Internas <Badge variant="secondary" className="text-[10px]">Oculto</Badge>
                </Label>
                <Textarea 
                  placeholder="Ej: Repuesto consultado en casa de frenos a $45.000..."
                  className="bg-secondary/30 border-border min-h-[80px] text-sm" 
                  value={datosCabecera.notasInternas}
                  onChange={(e: any) => setDatosCabecera({...datosCabecera, notasInternas: e.target.value})}
                />
              </CardContent>
            </Card>
          </div>

          {/* Matemáticas finales */}
          <Card className="border-border bg-card h-fit">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Subtotal Neto:</span>
                <span className="font-medium text-foreground">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  Descuento / Atención:
                </span>
                <div className="relative w-[120px]">
                  <span className="absolute left-3 top-2 text-muted-foreground">-$</span>
                  <Input 
                    type="number" min="0" 
                    className="bg-background border-border h-9 pl-8 text-right text-destructive"
                    value={descuento || ""}
                    onChange={(e: any) => setDescuento(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-card-foreground">Total Final:</span>
                <span className="text-3xl font-bold text-primary">${totalFinal.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- VISTA LISTA PRINCIPAL ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Presupuestos</h2>
          <p className="text-sm text-muted-foreground">Gestioná cotizaciones para tus clientes</p>
        </div>
        <Button onClick={() => setVistaActual("crear")} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente / Patente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PRESUPUESTOS_HISTORICOS.map((p) => (
                <TableRow key={p.id} className="border-border hover:bg-secondary/50 cursor-pointer" onClick={() => setVistaActual("crear")}>
                  <TableCell className="font-medium text-card-foreground">{p.id}</TableCell>
                  <TableCell className="text-muted-foreground">{p.fecha}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.cliente}</div>
                    <div className="text-xs text-muted-foreground">{p.patente}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      ${p.estado === 'Aprobado' ? 'border-green-500/50 text-green-500' : ''}
                      ${p.estado === 'Borrador' ? 'border-slate-500/50 text-slate-500' : ''}
                    `}>
                      {p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    ${p.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {PRESUPUESTOS_HISTORICOS.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No hay presupuestos creados todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}