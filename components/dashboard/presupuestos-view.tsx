"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FileText, Printer, MessageCircle, Trash2, ArrowLeft, Save, Car, User, EyeOff, Lock } from "lucide-react"
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

const AUTOS_REGISTRADOS = [
  { patente: "AB 123 CD", modelo: "Toyota Corolla", dueño: "Juan Martínez", telefono: "5491145678901" },
  { patente: "AC 456 EF", modelo: "Ford Ranger", dueño: "Esteban Q.", telefono: "5491111112222" },
]

const PRESUPUESTOS_HISTORICOS = [
  { id: "PR-001", fecha: "2024-04-10", patente: "AB 123 CD", cliente: "Juan Martínez", total: 85000, estado: "Aprobado" },
]

// CATÁLOGO SIMULADO (Próximamente vendrá de la base de datos)
const CATALOGO_DB = [
  { id: "C1", tipo: "Repuesto", detalle: "Pastillas de freno Bosch", costo: 15000, precio: 30000 },
  { id: "C2", tipo: "Servicio", detalle: "Alineado y Balanceado - Auto", costo: 0, precio: 15000 },
  { id: "C3", tipo: "Servicio", detalle: "Alineado y Balanceado - Camioneta", costo: 0, precio: 22000 },
  { id: "C4", tipo: "Mano de Obra", detalle: "Cambio de Distribución", costo: 0, precio: 80000 },
]

export function PresupuestosView() {
  const [vistaActual, setVistaActual] = useState<"lista" | "crear">("lista")
  const [busquedaPatente, setBusquedaPatente] = useState("")
  
  const [datosCabecera, setDatosCabecera] = useState({
    numero: "PR-002", 
    fecha: new Date().toISOString().split("T")[0],
    validez: "10", // Ahora el por defecto es 10
    estado: "Borrador",
    patente: "", auto: "", cliente: "", telefono: "",
    observacionesPublicas: "Los repuestos pueden sufrir variaciones de precio sin previo aviso. Validez sujeta a stock.",
    notasInternas: ""
  })

  // EFECTO DE MEMORIA: Al cargar, busca si el usuario guardó otra validez antes
  useEffect(() => {
    const validezGuardada = localStorage.getItem("validez_presupuesto")
    if (validezGuardada) {
      setDatosCabecera(prev => ({ ...prev, validez: validezGuardada }))
    }
  }, [])

  // FUNCIÓN PARA CAMBIAR Y RECORDAR LA VALIDEZ
  const handleValidezChange = (e: any) => {
    const nuevoValor = e.target.value
    setDatosCabecera({ ...datosCabecera, validez: nuevoValor })
    localStorage.setItem("validez_presupuesto", nuevoValor) // Se guarda en la memoria del navegador
  }

  const [items, setItems] = useState([
    { id: 1, tipo: "Repuesto", detalle: "", cantidad: 1, costoUnitario: 0, precioUnitario: 0 }
  ])
  const [descuento, setDescuento] = useState(0)

  // MATEMÁTICAS
  const subtotalCosto = items.reduce((acc, item) => acc + (item.cantidad * item.costoUnitario), 0)
  const subtotalVenta = items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0)
  const totalFinal = subtotalVenta - descuento
  const gananciaNeta = totalFinal - subtotalCosto

  // FUNCIONES DE INTERFAZ
  const buscarAuto = () => {
    const auto = AUTOS_REGISTRADOS.find(a => a.patente.replace(/\s/g, "").toUpperCase() === busquedaPatente.replace(/\s/g, "").toUpperCase())
    if (auto) {
      setDatosCabecera({ ...datosCabecera, patente: auto.patente, auto: auto.modelo, cliente: auto.dueño, telefono: auto.telefono })
    } else {
      alert("Patente no encontrada. Podés cargar los datos a mano.")
    }
  }

  const agregarFila = () => {
    setItems([...items, { id: Math.random(), tipo: "Repuesto", detalle: "", cantidad: 1, costoUnitario: 0, precioUnitario: 0 }])
  }

  const eliminarFila = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id))
  }

  const actualizarFila = (id: number, campo: string, valor: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [campo]: valor } : item))
  }

  const aplicarDesdeCatalogo = (idFila: number, idCatalogo: string) => {
    const producto = CATALOGO_DB.find(c => c.id === idCatalogo)
    if (producto) {
      setItems(items.map(item => item.id === idFila ? { 
        ...item, tipo: producto.tipo, detalle: producto.detalle, costoUnitario: producto.costo, precioUnitario: producto.precio 
      } : item))
    }
  }

  const handleWhatsApp = () => {
    if (!datosCabecera.telefono) return alert("Falta el teléfono del cliente.")
    const texto = `Hola ${datosCabecera.cliente}! 👋\nTe paso el presupuesto para tu ${datosCabecera.auto} (${datosCabecera.patente}).\n\nTotal estimado: *$${totalFinal.toLocaleString()}*.\n\nTe adjunto el PDF. ¡Avisame cualquier duda! 🚗🔧`
    window.open(`https://wa.me/${datosCabecera.telefono}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (vistaActual === "crear") {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-secondary/30 p-4 rounded-lg border border-border">
          <Button variant="ghost" onClick={() => setVistaActual("lista")} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-background mr-2 text-sm">{datosCabecera.numero}</Badge>
            <Button variant="outline" onClick={() => window.print()} className="border-border">
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button onClick={handleWhatsApp} className="bg-green-600 text-white hover:bg-green-700">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>

        {/* CABECERA */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border bg-secondary/10 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Datos del Presupuesto</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Estado:</Label>
                <Select value={datosCabecera.estado} onValueChange={(val: string) => setDatosCabecera({...datosCabecera, estado: val})}>
                  <SelectTrigger className="w-[140px] h-8 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
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
                  <Label>Buscar Patente</Label>
                  <Input placeholder="Ej: AB 123 CD" className="bg-secondary uppercase" value={busquedaPatente} onChange={(e: any) => setBusquedaPatente(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && buscarAuto()} />
                </div>
                <Button onClick={buscarAuto} variant="secondary"><Search className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Vehículo</Label><div className="relative"><Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={datosCabecera.auto} onChange={(e: any) => setDatosCabecera({...datosCabecera, auto: e.target.value})} /></div></div>
                <div className="space-y-2"><Label>Cliente</Label><div className="relative"><User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={datosCabecera.cliente} onChange={(e: any) => setDatosCabecera({...datosCabecera, cliente: e.target.value})} /></div></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha de Emisión</Label><Input type="date" value={datosCabecera.fecha} onChange={(e: any) => setDatosCabecera({...datosCabecera, fecha: e.target.value})} /></div>
                <div className="space-y-2">
                  <Label>Validez (Días)</Label>
                  {/* Acá conectamos la función que guarda la memoria */}
                  <Input type="number" min="1" value={datosCabecera.validez} onChange={handleValidezChange} />
                </div>
              </div>
              <div className="space-y-2"><Label>Teléfono</Label><Input placeholder="Ej: 54911..." value={datosCabecera.telefono} onChange={(e: any) => setDatosCabecera({...datosCabecera, telefono: e.target.value})} /></div>
            </div>
          </CardContent>
        </Card>

        {/* GRILLA */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border bg-secondary/10 pb-4">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Detalle Presupuesto</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"><EyeOff className="w-3 h-3 mr-1"/> Costos ocultos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/20">
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Buscar en Catálogo o Cargar Manual</TableHead>
                  <TableHead className="w-[80px] text-center">Cant.</TableHead>
                  <TableHead className="w-[120px] text-right bg-slate-100 dark:bg-slate-800/50">Costo Unit.</TableHead>
                  <TableHead className="w-[120px] text-right text-primary">Precio Venta</TableHead>
                  <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {/* Corregido el (val: string) y agregado Servicio */}
                      <Select value={item.tipo} onValueChange={(val: string) => actualizarFila(item.id, "tipo", val)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Repuesto">Repuesto</SelectItem>
                          <SelectItem value="Servicio">Servicio</SelectItem>
                          <SelectItem value="Mano de Obra">Mano de Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="flex gap-2 min-w-[300px]">
                      <Select onValueChange={(val: string) => aplicarDesdeCatalogo(item.id, val)}>
                        <SelectTrigger className="w-[150px] h-9 bg-primary/5 border-primary/20 text-primary">
                          <SelectValue placeholder="Catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CATALOGO_DB.filter(c => c.tipo === item.tipo).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.detalle}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Ej: Filtro..." className="h-9 flex-1" value={item.detalle} onChange={(e: any) => actualizarFila(item.id, "detalle", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      {/* step 1 para enteros */}
                      <Input type="number" min="1" step="1" className="h-9 text-center" value={item.cantidad || ""} onChange={(e: any) => actualizarFila(item.id, "cantidad", parseInt(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="bg-slate-50 dark:bg-slate-900/20">
                      <Input type="number" min="0" className="h-9 text-right" value={item.costoUnitario || ""} onChange={(e: any) => actualizarFila(item.id, "costoUnitario", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" className="h-9 text-right font-medium" value={item.precioUnitario || ""} onChange={(e: any) => actualizarFila(item.id, "precioUnitario", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">${(item.cantidad * item.precioUnitario).toLocaleString()}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => eliminarFila(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-border">
              <Button variant="outline" onClick={agregarFila} className="border-dashed w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Agregar Fila</Button>
            </div>
          </CardContent>
        </Card>

        {/* OBSERVACIONES Y TOTALES */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <Label>Observaciones para el Cliente (Sale en el PDF)</Label>
                <Textarea className="min-h-[80px]" value={datosCabecera.observacionesPublicas} onChange={(e: any) => setDatosCabecera({...datosCabecera, observacionesPublicas: e.target.value})} />
              </CardContent>
            </Card>
            
            {/* NOTAS INTERNAS REDISEÑADAS */}
            <Card className="border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10 shadow-none">
              <CardContent className="p-4 space-y-2">
                <Label className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Notas Internas Ocultas
                </Label>
                <Textarea 
                  placeholder="Ej: Repuesto cotizado en casa de frenos a $45.000, si sube avisar..."
                  className="bg-white/60 dark:bg-slate-950/50 border-amber-200 dark:border-amber-800 min-h-[80px] focus-visible:ring-amber-500" 
                  value={datosCabecera.notasInternas}
                  onChange={(e: any) => setDatosCabecera({...datosCabecera, notasInternas: e.target.value})}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Subtotal Neto:</span><span className="font-medium text-foreground">${subtotalVenta.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Descuento / Atención:</span>
                  <div className="relative w-[120px]">
                    <span className="absolute left-3 top-2 text-muted-foreground">-$</span>
                    <Input type="number" min="0" className="h-9 pl-8 text-right text-destructive" value={descuento || ""} onChange={(e: any) => setDescuento(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold">Total Final:</span><span className="text-3xl font-bold text-primary">${totalFinal.toLocaleString()}</span>
                </div>
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-md flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Ganancia Neta Estimada:</span><span className="text-lg font-bold text-green-700 dark:text-green-400">${gananciaNeta.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            <Button className="w-full bg-primary text-primary-foreground h-12 text-lg"><Save className="mr-2 h-5 w-5" /> Guardar Presupuesto</Button>
          </div>
        </div>
      </div>
    )
  }

  // --- VISTA LISTA ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Presupuestos</h2>
          <p className="text-sm text-muted-foreground">Gestioná cotizaciones para tus clientes</p>
        </div>
        <Button onClick={() => setVistaActual("crear")} className="bg-primary"><Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente / Patente</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {PRESUPUESTOS_HISTORICOS.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setVistaActual("crear")}>
                  <TableCell className="font-medium">{p.id}</TableCell><TableCell className="text-muted-foreground">{p.fecha}</TableCell>
                  <TableCell><div className="font-medium">{p.cliente}</div><div className="text-xs text-muted-foreground">{p.patente}</div></TableCell>
                  <TableCell><Badge variant="outline">{p.estado}</Badge></TableCell><TableCell className="text-right font-bold">${p.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}