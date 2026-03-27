"use client"

import { useState } from "react"
import { Search, Car, MoreHorizontal, User, Gauge, Palette, Calendar, FileText, Wrench, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

type Trabajo = {
  id: number
  tipo: "orden" | "presupuesto"
  numero: string
  descripcion: string
  fecha: string
  estado: "ingresado" | "en-reparacion" | "terminado" | "entregado" | "pendiente" | "aprobado" | "rechazado"
  monto: number
}

type Vehiculo = {
  id: number
  marca: string
  modelo: string
  anio: number
  patente: string
  color: string
  kilometraje: number
  propietarioId: number
  propietarioNombre: string
  propietarioApellido: string
  trabajos: Trabajo[]
}

// Mock data for all vehicles
const vehiculosData: Vehiculo[] = [
  {
    id: 1,
    marca: "Toyota",
    modelo: "Corolla",
    anio: 2020,
    patente: "AB 123 CD",
    color: "Blanco",
    kilometraje: 45000,
    propietarioId: 1,
    propietarioNombre: "Juan Carlos",
    propietarioApellido: "Martínez",
    trabajos: [
      { id: 1, tipo: "orden", numero: "OT-2024-001", descripcion: "Service completo 40.000 km", fecha: "2024-01-15", estado: "entregado", monto: 85000 },
      { id: 2, tipo: "presupuesto", numero: "PR-2024-012", descripcion: "Cambio de amortiguadores", fecha: "2024-02-20", estado: "aprobado", monto: 120000 },
      { id: 3, tipo: "orden", numero: "OT-2024-015", descripcion: "Cambio de amortiguadores", fecha: "2024-02-25", estado: "en-reparacion", monto: 120000 },
    ],
  },
  {
    id: 2,
    marca: "Ford",
    modelo: "Ranger",
    anio: 2018,
    patente: "AC 456 EF",
    color: "Negro",
    kilometraje: 78000,
    propietarioId: 1,
    propietarioNombre: "Juan Carlos",
    propietarioApellido: "Martínez",
    trabajos: [
      { id: 4, tipo: "orden", numero: "OT-2023-089", descripcion: "Reparación de caja de cambios", fecha: "2023-11-10", estado: "entregado", monto: 250000 },
      { id: 5, tipo: "presupuesto", numero: "PR-2024-008", descripcion: "Service 80.000 km", fecha: "2024-03-01", estado: "pendiente", monto: 95000 },
    ],
  },
  {
    id: 3,
    marca: "Volkswagen",
    modelo: "Golf",
    anio: 2021,
    patente: "AD 789 GH",
    color: "Gris",
    kilometraje: 32000,
    propietarioId: 2,
    propietarioNombre: "María Laura",
    propietarioApellido: "González",
    trabajos: [
      { id: 6, tipo: "orden", numero: "OT-2024-003", descripcion: "Cambio de pastillas de freno", fecha: "2024-01-20", estado: "entregado", monto: 45000 },
    ],
  },
  {
    id: 4,
    marca: "Fiat",
    modelo: "Cronos",
    anio: 2022,
    patente: "AE 012 IJ",
    color: "Rojo",
    kilometraje: 28000,
    propietarioId: 3,
    propietarioNombre: "Roberto",
    propietarioApellido: "Fernández",
    trabajos: [
      { id: 7, tipo: "orden", numero: "OT-2024-010", descripcion: "Alineación y balanceo", fecha: "2024-02-10", estado: "terminado", monto: 25000 },
      { id: 8, tipo: "presupuesto", numero: "PR-2024-015", descripcion: "Cambio de cubiertas", fecha: "2024-03-05", estado: "pendiente", monto: 280000 },
    ],
  },
  {
    id: 5,
    marca: "Chevrolet",
    modelo: "S10",
    anio: 2019,
    patente: "AF 345 KL",
    color: "Plata",
    kilometraje: 95000,
    propietarioId: 3,
    propietarioNombre: "Roberto",
    propietarioApellido: "Fernández",
    trabajos: [
      { id: 9, tipo: "orden", numero: "OT-2024-008", descripcion: "Service completo 90.000 km", fecha: "2024-02-01", estado: "entregado", monto: 110000 },
    ],
  },
  {
    id: 6,
    marca: "Renault",
    modelo: "Kangoo",
    anio: 2020,
    patente: "AG 678 MN",
    color: "Blanco",
    kilometraje: 62000,
    propietarioId: 3,
    propietarioNombre: "Roberto",
    propietarioApellido: "Fernández",
    trabajos: [
      { id: 10, tipo: "orden", numero: "OT-2024-012", descripcion: "Reparación de suspensión", fecha: "2024-02-15", estado: "ingresado", monto: 85000 },
    ],
  },
  {
    id: 7,
    marca: "Peugeot",
    modelo: "208",
    anio: 2023,
    patente: "AH 901 OP",
    color: "Azul",
    kilometraje: 12000,
    propietarioId: 4,
    propietarioNombre: "Ana",
    propietarioApellido: "Rodríguez",
    trabajos: [
      { id: 11, tipo: "presupuesto", numero: "PR-2024-020", descripcion: "Polarizado de vidrios", fecha: "2024-03-10", estado: "aprobado", monto: 45000 },
    ],
  },
  {
    id: 8,
    marca: "Honda",
    modelo: "Civic",
    anio: 2019,
    patente: "AI 234 QR",
    color: "Negro",
    kilometraje: 55000,
    propietarioId: 5,
    propietarioNombre: "Carlos Eduardo",
    propietarioApellido: "López",
    trabajos: [
      { id: 12, tipo: "orden", numero: "OT-2024-005", descripcion: "Cambio de aceite y filtros", fecha: "2024-01-25", estado: "entregado", monto: 35000 },
      { id: 13, tipo: "presupuesto", numero: "PR-2024-018", descripcion: "Revisión de frenos", fecha: "2024-03-08", estado: "rechazado", monto: 60000 },
    ],
  },
]

const getEstadoBadge = (estado: Trabajo["estado"]) => {
  const estilos: Record<Trabajo["estado"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className: string }> = {
    "ingresado": { variant: "secondary", label: "Ingresado", className: "bg-secondary text-secondary-foreground" },
    "en-reparacion": { variant: "default", label: "En Reparación", className: "bg-warning text-warning-foreground" },
    "terminado": { variant: "default", label: "Terminado", className: "bg-primary text-primary-foreground" },
    "entregado": { variant: "outline", label: "Entregado", className: "bg-primary/20 text-primary border-primary/30" },
    "pendiente": { variant: "secondary", label: "Pendiente", className: "bg-secondary text-secondary-foreground" },
    "aprobado": { variant: "default", label: "Aprobado", className: "bg-primary text-primary-foreground" },
    "rechazado": { variant: "destructive", label: "Rechazado", className: "bg-destructive/20 text-destructive border-destructive/30" },
  }
  const estilo = estilos[estado]
  return <Badge variant={estilo.variant} className={estilo.className}>{estilo.label}</Badge>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function VehiclesView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehiculo | null>(null)

  const filteredVehicles = vehiculosData.filter(
    (vehicle) =>
      vehicle.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.propietarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.propietarioApellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${vehicle.propietarioNombre} ${vehicle.propietarioApellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleVehicleClick = (vehicle: Vehiculo) => {
    setSelectedVehicle(vehicle)
  }

  const handleBack = () => {
    setSelectedVehicle(null)
  }

  // Detail view when a vehicle is selected
  if (selectedVehicle) {
    return (
      <div className="space-y-6">
        {/* Back button and header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {selectedVehicle.marca} {selectedVehicle.modelo}
            </h2>
            <p className="text-sm text-muted-foreground">
              Patente: {selectedVehicle.patente}
            </p>
          </div>
        </div>

        {/* Vehicle Info Card */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Marca</span>
                </div>
                <p className="font-medium text-card-foreground">{selectedVehicle.marca}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Modelo</span>
                </div>
                <p className="font-medium text-card-foreground">{selectedVehicle.modelo}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Año</span>
                </div>
                <p className="font-medium text-card-foreground">{selectedVehicle.anio}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Color</span>
                </div>
                <p className="font-medium text-card-foreground">{selectedVehicle.color}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Kilometraje</span>
                </div>
                <p className="font-medium text-card-foreground">{selectedVehicle.kilometraje.toLocaleString("es-AR")} km</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Propietario</span>
                </div>
                <p className="font-medium text-card-foreground">
                  {selectedVehicle.propietarioNombre} {selectedVehicle.propietarioApellido}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work History */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Wrench className="h-5 w-5 text-primary" />
              Historial de Trabajos y Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedVehicle.trabajos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Número</TableHead>
                    <TableHead className="text-muted-foreground">Descripción</TableHead>
                    <TableHead className="text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-muted-foreground">Monto</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVehicle.trabajos.map((trabajo) => (
                    <TableRow
                      key={trabajo.id}
                      className="border-border transition-colors hover:bg-secondary/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {trabajo.tipo === "orden" ? (
                            <Wrench className="h-4 w-4 text-primary" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-card-foreground capitalize">
                            {trabajo.tipo === "orden" ? "Orden de Trabajo" : "Presupuesto"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-card-foreground">
                        {trabajo.numero}
                      </TableCell>
                      <TableCell className="text-card-foreground">{trabajo.descripcion}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(trabajo.fecha)}</TableCell>
                      <TableCell className="font-medium text-card-foreground">
                        {formatCurrency(trabajo.monto)}
                      </TableCell>
                      <TableCell>{getEstadoBadge(trabajo.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay trabajos registrados para este vehículo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Vehículos</h2>
          <p className="text-sm text-muted-foreground">
            Todos los vehículos registrados en el sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por patente, nombre del propietario, marca o modelo..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-base bg-secondary border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-card-foreground">
            Lista de Vehículos ({filteredVehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Marca</TableHead>
                <TableHead className="text-muted-foreground">Modelo</TableHead>
                <TableHead className="text-muted-foreground">Año</TableHead>
                <TableHead className="text-muted-foreground">Patente</TableHead>
                <TableHead className="text-muted-foreground">Propietario</TableHead>
                <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  className="border-border cursor-pointer transition-colors hover:bg-secondary/50"
                  onClick={() => handleVehicleClick(vehicle)}
                >
                  <TableCell className="font-medium text-card-foreground">{vehicle.marca}</TableCell>
                  <TableCell className="text-card-foreground">{vehicle.modelo}</TableCell>
                  <TableCell className="text-muted-foreground">{vehicle.anio}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-secondary px-2 py-1 rounded text-card-foreground">
                      {vehicle.patente}
                    </span>
                  </TableCell>
                  <TableCell className="text-card-foreground">
                    {vehicle.propietarioNombre} {vehicle.propietarioApellido}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-secondary">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-popover">
                        <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleVehicleClick(vehicle); }}>
                          <Car className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleVehicleClick(vehicle); }}>
                          <Wrench className="mr-2 h-4 w-4" />
                          Ver historial
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
