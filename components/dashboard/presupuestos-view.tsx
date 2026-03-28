"use client"

import { useState } from "react"
import { Plus, Search, FileText, User, Car, Calendar, Printer, Download, ChevronLeft, Save, Trash2, ClipboardList, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

export function PresupuestosView() {
  const [vista, setVista] = useState<"lista" | "crear">("lista")

  // Maqueta de la lista de presupuestos
  const presupuestosMock = [
    { id: "PRE-0012", fecha: "27/03/2026", cliente: "Carlos Automotores", vehiculo: "Toyota Hilux (AA 123 CD)", total: 145000, estado: "Aprobado" },
    { id: "PRE-0013", fecha: "28/03/2026", cliente: "Juan Pérez", vehiculo: "Ford Focus (AB 456 EF)", total: 45000, estado: "Borrador" },
  ]

  if (vista === "crear") {
    return (
      <div className="space-y-6 pb-8 max-w-[1400px] mx-auto animate-in fade-in duration-300">
        {/* CABECERA DE CREACIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setVista("lista")} className="hover:bg-secondary">
              <ChevronLeft className="h-5 w-5"/>
            </Button>
            <div>
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                Nuevo Presupuesto <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">Borrador</Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Nro: <span className="font-mono text-primary font-bold">PRE-0014</span></p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-background">
              <Save className="w-4 h-4 mr-2"/> Guardar
            </Button>
            <Button variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/40">
              <ClipboardList className="w-4 h-4 mr-2"/> Orden de Trabajo
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Printer className="w-4 h-4 mr-2"/> Generar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PANEL IZQUIERDO: SELECCIÓN DE DATOS (1/3 de la pantalla) */}
          <div className="lg:col-span-4 space-y-6">
            
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-secondary/10 border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> 1. Cliente y Vehículo</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Cliente</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900 h-10"><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Carlos Automotores (CUIT: 30-12345678-9)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vehículo a reparar</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-900 h-10"><SelectValue placeholder="Seleccione vehículo..." /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Toyota Hilux (AA 123 CD)</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="bg-secondary/10 border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> 2. Agregar Ítems</CardTitle>
                <CardDescription>Buscá en tu catálogo de repuestos y servicios.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Ej: Pastillas, Aceite, Alineado..." className="pl-9 bg-slate-50 dark:bg-slate-900" />
                </div>
                
                {/* Botón de ejemplo para simular agregar algo rápido */}
                <Button className="w-full" variant="secondary">
                  <Plus className="w-4 h-4 mr-2"/> Añadir Ítem Manual
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* PANEL DERECHO: VISTA PREVIA DEL PRESUPUESTO (2/3 de la pantalla) */}
          <div className="lg:col-span-8">
            <Card className="border-border shadow-md h-full flex flex-col min-h-[500px]">
              <CardHeader className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-muted-foreground"/> Detalle de Cotización</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead>Descripción del Servicio / Repuesto</TableHead>
                      <TableHead className="w-[100px] text-center">Cant.</TableHead>
                      <TableHead className="w-[140px] text-right">Precio Unit.</TableHead>
                      <TableHead className="w-[140px] text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Fila de ejemplo 1 */}
                    <TableRow className="hover:bg-secondary/30">
                      <TableCell className="font-medium">Pastillas de Freno Bosch (Delanteras)</TableCell>
                      <TableCell><Input type="number" defaultValue="1" className="h-9 text-center font-mono bg-background" /></TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                          <Input type="number" defaultValue="45000" className="h-9 pl-6 text-right font-mono bg-background" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-base">$45.000</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></TableCell>
                    </TableRow>
                    {/* Fila de ejemplo 2 */}
                    <TableRow className="hover:bg-secondary/30">
                      <TableCell className="font-medium">Mano de obra (Cambio de pastillas y discos)</TableCell>
                      <TableCell><Input type="number" defaultValue="1" className="h-9 text-center font-mono bg-background" /></TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                          <Input type="number" defaultValue="25000" className="h-9 pl-6 text-right font-mono bg-background" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-base">$25.000</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                {/* TOTALES (Empujados hacia el fondo) */}
                <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
                    
                    {/* Notas adicionales del presupuesto */}
                    <div className="w-full sm:w-1/2 space-y-2">
                      <Label className="text-muted-foreground">Notas para el cliente (Opcional)</Label>
                      <Input placeholder="Ej: Se requiere seña del 50%..." className="bg-background" />
                    </div>

                    {/* Resumen numérico */}
                    <div className="w-full sm:w-1/3 space-y-3">
                      <div className="flex justify-between text-muted-foreground items-center">
                        <span>Subtotal:</span>
                        <span className="font-mono text-base">$70.000</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground items-center">
                        <span>Descuento / Recargo:</span>
                        <div className="relative w-28">
                          <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                          <Input type="number" defaultValue="0" className="h-8 pl-6 text-right font-mono bg-background" />
                        </div>
                      </div>
                      <div className="border-t border-border pt-3 flex justify-between items-center">
                        <span className="text-xl font-bold text-foreground">TOTAL:</span>
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">$70.000</span>
                      </div>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // VISTA LISTA (La pantalla principal por defecto)
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Presupuestos y Órdenes</h2>
          <p className="text-sm text-muted-foreground">Creá cotizaciones para clientes y órdenes de trabajo para el taller.</p>
        </div>
        <Button onClick={() => setVista("crear")} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, patente o Nro..." className="pl-9 bg-background" />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="todos">
              <SelectTrigger className="w-[150px] bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="aprobado">Aprobados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                <TableHead>Nro</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente y Vehículo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestosMock.map((p) => (
                <TableRow key={p.id} className="hover:bg-secondary/50 cursor-pointer">
                  <TableCell className="font-mono font-bold text-primary">{p.id}</TableCell>
                  <TableCell className="text-muted-foreground"><div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {p.fecha}</div></TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.cliente}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Car className="w-3 h-3"/> {p.vehiculo}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-foreground">${p.total.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={p.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'}>
                      {p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="Orden de Trabajo">
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="PDF Presupuesto">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}