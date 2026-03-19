"use client"

import { useState } from "react"
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
import { Search, MoreHorizontal, Eye, Edit, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type OrderStatus = "Ingresado" | "En Reparación" | "Terminado" | "Entregado"

interface WorkOrder {
  id: string
  orderNumber: string
  client: string
  vehicle: string
  licensePlate: string
  status: OrderStatus
  date: string
  service: string
}

const workOrders: WorkOrder[] = [
  {
    id: "1",
    orderNumber: "OT-2024-001",
    client: "Juan Pérez",
    vehicle: "Toyota Corolla 2020",
    licensePlate: "ABC 123",
    status: "En Reparación",
    date: "18/03/2024",
    service: "Service completo + Frenos",
  },
  {
    id: "2",
    orderNumber: "OT-2024-002",
    client: "María González",
    vehicle: "Ford Focus 2019",
    licensePlate: "DEF 456",
    status: "Ingresado",
    date: "18/03/2024",
    service: "Diagnóstico motor",
  },
  {
    id: "3",
    orderNumber: "OT-2024-003",
    client: "Carlos Rodríguez",
    vehicle: "Chevrolet Cruze 2021",
    licensePlate: "GHI 789",
    status: "Terminado",
    date: "17/03/2024",
    service: "Cambio de aceite",
  },
  {
    id: "4",
    orderNumber: "OT-2024-004",
    client: "Ana Martínez",
    vehicle: "Volkswagen Golf 2022",
    licensePlate: "JKL 012",
    status: "En Reparación",
    date: "17/03/2024",
    service: "Alineación y balanceo",
  },
  {
    id: "5",
    orderNumber: "OT-2024-005",
    client: "Roberto Silva",
    vehicle: "Honda Civic 2020",
    licensePlate: "MNO 345",
    status: "Entregado",
    date: "16/03/2024",
    service: "Reparación suspensión",
  },
  {
    id: "6",
    orderNumber: "OT-2024-006",
    client: "Laura Fernández",
    vehicle: "Nissan Sentra 2021",
    licensePlate: "PQR 678",
    status: "Ingresado",
    date: "18/03/2024",
    service: "Revisión general",
  },
]

const statusConfig: Record<OrderStatus, { className: string; dotColor: string }> = {
  Ingresado: {
    className: "bg-secondary text-secondary-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
  "En Reparación": {
    className: "bg-warning/10 text-warning border-warning/20",
    dotColor: "bg-warning",
  },
  Terminado: {
    className: "bg-success/10 text-success border-success/20",
    dotColor: "bg-success",
  },
  Entregado: {
    className: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
  },
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status]
  
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "Todos">("Todos")

  const filteredOrders = workOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "Todos" || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
              placeholder="Buscar orden, cliente..."
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
              <DropdownMenuItem onClick={() => setStatusFilter("Todos")}>
                Todos los estados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Ingresado")}>
                Ingresado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("En Reparación")}>
                En Reparación
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Terminado")}>
                Terminado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Entregado")}>
                Entregado
              </DropdownMenuItem>
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
              <TableHead className="text-muted-foreground">Servicio</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredOrders.length} de {workOrders.length} órdenes
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border bg-secondary" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="border-border bg-secondary">
            Siguiente
          </Button>
        </div>
      </div>
    </Card>
  )
}
