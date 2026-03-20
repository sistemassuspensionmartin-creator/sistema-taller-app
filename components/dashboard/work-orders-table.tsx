"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase" // Importamos tu conexión real!
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Eye, Edit, ChevronDown, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type OrderStatus = "Borrador Taller" | "Cotizado Recepción" | "Aprobado" | "Terminado" | "Entregado"

// Nueva estructura adaptada a tus tablas reales
interface WorkOrder {
  id: string
  client: string
  vehicle: string
  licensePlate: string
  status: OrderStatus
  service: string
}

const statusConfig: Record<string, { className: string; dotColor: string }> = {
  "Borrador Taller": {
    className: "bg-secondary text-secondary-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
  "Cotizado Recepción": {
    className: "bg-warning/10 text-warning border-warning/20",
    dotColor: "bg-warning",
  },
  "Aprobado": {
    className: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
  },
  "Terminado": {
    className: "bg-success/10 text-success border-success/20",
    dotColor: "bg-success",
  },
  "Entregado": {
    className: "bg-primary/10 text-primary border-primary/20 opacity-70",
    dotColor: "bg-primary opacity-70",
  },
}

function StatusBadge({ status }: { status: string }) {
  // Validación de seguridad por si viene un estado raro de la BD
  const config = statusConfig[status] || statusConfig["Borrador Taller"]
  
  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1.5 font-medium", config.className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {status}
    </Badge>
  )
}

export function WorkOrdersTable() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("Todos")
  
  // Variables de estado para los datos de Supabase
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Esta función va a buscar a Carlos Pérez a tu base de datos
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true)
        
        // Hacemos una consulta "join" para traer Presupuesto + Auto + Cliente
        const { data, error } = await supabase
          .from('presupuestos')
          .select(`
            id,
            estado,
            observaciones,
            vehiculos (
              dominio,
              marca,
              modelo,
              clientes (
                nombre_completo
              )
            )
          `)
          .order('fecha_creacion', { ascending: false })

        if (error) throw error

        // Transformamos los datos complejos de Supabase a un formato simple para la tabla
        if (data) {
          const formattedOrders = data.map((order: any) => ({
            id: order.id,
            client: order.vehiculos?.clientes?.nombre_completo || 'Cliente sin nombre',
            vehicle: `${order.vehiculos?.marca || ''} ${order.vehiculos?.modelo || ''}`,
            licensePlate: order.vehiculos?.dominio || 'Sin Patente',
            status: order.estado || 'Borrador Taller',
            service: order.observaciones || 'Sin observaciones'
          }))
          
          // Validación: Evitamos duplicados en pantalla usando un Map
          const uniqueOrders = Array.from(
            new Map(formattedOrders.map((item: WorkOrder) => [item.id, item])).values()
          ) as WorkOrder[]
          
          setWorkOrders(uniqueOrders)
        }
      } catch (err: any) {
        console.error("Error cargando órdenes:", err.message)
        setError("No se pudieron cargar las órdenes de trabajo. Intente recargar la página.")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const filteredOrders = workOrders.filter((order) => {
    const matchesSearch =
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "Todos" || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Si está cargando, mostramos un indicador visual
  if (loading) {
    return (
      <Card className="border-border bg-card p-12 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Conectando con el taller y cargando órdenes...</p>
      </Card>
    )
  }

  // Si hay error, mostramos un cartel rojo seguro
  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-500/10 p-6 text-red-500">
        <p className="font-semibold">Atención:</p>
        <p>{error}</p>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Órdenes de Trabajo
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las órdenes de trabajo del taller
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o patente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-64 bg-secondary border-border"
            />
          </div>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-secondary">
                {statusFilter === "Todos" ? "Todos los estados" : statusFilter}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-popover">
              <DropdownMenuItem onClick={() => setStatusFilter("Todos")}>Todos los estados</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Borrador Taller")}>Borrador Taller</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Cotizado Recepción")}>Cotizado Recepción</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Aprobado")}>Aprobado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Terminado")}>Terminado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Entregado")}>Entregado</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New order button */}
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Vehículo</TableHead>
              <TableHead className="text-muted-foreground">Patente</TableHead>
              <TableHead className="text-muted-foreground">Notas / Servicio</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron órdenes de trabajo.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="border-border transition-colors hover:bg-secondary/50"
                >
                  <TableCell className="font-medium text-card-foreground">{order.client}</TableCell>
                  <TableCell className="text-muted-foreground">{order.vehicle}</TableCell>
                  <TableCell>
                    <code className="rounded bg-secondary px-2 py-1 text-sm font-mono text-card-foreground">
                      {order.licensePlate}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {order.service}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-popover">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredOrders.length} de {workOrders.length} órdenes
        </p>
      </div>
    </Card>
  )
}