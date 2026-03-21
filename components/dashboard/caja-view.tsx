"use client"

import { useState } from "react"
import { Printer, ArrowDownRight, ArrowUpRight, FileText, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Datos de prueba para ver cómo queda
const movimientosHoy = [
  { id: 1, hora: "09:15", concepto: "Pago OT-001 (Corolla) - Juan Carlos", tipo: "ingreso", monto: 45000, metodo: "Efectivo" },
  { id: 2, hora: "11:30", concepto: "Compra Repuestos (Filtros)", tipo: "egreso", monto: 12500, metodo: "Efectivo" },
  { id: 3, hora: "14:45", concepto: "Seña OT-004 (208) - Ana Rodríguez", tipo: "ingreso", monto: 20000, metodo: "Transferencia" },
]

export function CajaView() {
  const [activeTab, setActiveTab] = useState("diario")

  const totalIngresos = movimientosHoy.filter(m => m.tipo === "ingreso").reduce((acc, curr) => acc + curr.monto, 0)
  const totalEgresos = movimientosHoy.filter(m => m.tipo === "egreso").reduce((acc, curr) => acc + curr.monto, 0)
  const saldoFinal = totalIngresos - totalEgresos

  // Función nativa para imprimir la pantalla
  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Caja y Finanzas</h2>
          <p className="text-sm text-muted-foreground">Control de movimientos y cierres diarios</p>
        </div>
      </div>

      <Tabs defaultValue="diario" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="diario">Cierre Diario</TabsTrigger>
          <TabsTrigger value="reportes">Reportes Históricos</TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: CIERRE DIARIO */}
        <TabsContent value="diario" className="space-y-4">
          {/* Tarjetas de Resumen */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">${totalIngresos.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Egresos Hoy</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">${totalEgresos.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo en Caja</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${saldoFinal.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Movimientos */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">Movimientos del Día</CardTitle>
              <Button onClick={handleImprimir} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Cierre
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Hora</TableHead>
                    <TableHead className="text-muted-foreground">Concepto</TableHead>
                    <TableHead className="text-muted-foreground">Método</TableHead>
                    <TableHead className="text-right text-muted-foreground">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosHoy.map((mov) => (
                    <TableRow key={mov.id} className="border-border">
                      <TableCell className="text-muted-foreground">{mov.hora}</TableCell>
                      <TableCell className="font-medium text-card-foreground">{mov.concepto}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-muted-foreground">{mov.metodo}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${mov.tipo === 'ingreso' ? 'text-success' : 'text-destructive'}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: REPORTES HISTÓRICOS */}
        <TabsContent value="reportes" className="space-y-4">
          <Card className="border-border bg-card border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-card-foreground">Reportes Mensuales</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Próximamente: Aquí podrás filtrar movimientos por mes, descargar Excel y ver gráficos de rentabilidad del taller.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}