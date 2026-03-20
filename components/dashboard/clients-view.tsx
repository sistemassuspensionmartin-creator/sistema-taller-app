"use client"

import { useState } from "react"
import { Search, Plus, Phone, Mail, MapPin, FileText, Car, MoreHorizontal, History, Calendar, Pencil, Trash2 } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

type Vehiculo = {
  id: number
  marca: string
  modelo: string
  anio: number
  patente: string
  color: string
}

type Client = {
  id: number
  nombre: string
  apellido: string
  telefono: string
  email: string
  direccion: string
  calle: string
  barrio: string
  ciudad: string
  cuit: string
  condicionIva: string
  razonSocial: string
  domicilioFiscal: string
  notas: string
  fechaAlta: string
  vehiculos: Vehiculo[]
}

// Mock data for clients
const initialClientsData: Client[] = [
  {
    id: 1,
    nombre: "Juan Carlos",
    apellido: "Martínez",
    telefono: "+54 11 4567-8901",
    email: "jcmartinez@email.com",
    direccion: "Av. Corrientes 1234, Almagro, CABA",
    calle: "Av. Corrientes 1234",
    barrio: "Almagro",
    ciudad: "CABA",
    cuit: "20-12345678-9",
    condicionIva: "Responsable Inscripto",
    razonSocial: "Juan Carlos Martínez",
    domicilioFiscal: "Av. Corrientes 1234, CABA",
    notas: "Cliente frecuente. Prefiere contacto por WhatsApp.",
    fechaAlta: "2023-03-15",
    vehiculos: [
      { id: 1, marca: "Toyota", modelo: "Corolla", anio: 2020, patente: "AB 123 CD", color: "Blanco" },
      { id: 2, marca: "Ford", modelo: "Ranger", anio: 2018, patente: "AC 456 EF", color: "Negro" },
    ],
  },
  {
    id: 2,
    nombre: "María Laura",
    apellido: "González",
    telefono: "+54 11 5678-9012",
    email: "mlgonzalez@email.com",
    direccion: "Calle Florida 567, Microcentro, CABA",
    calle: "Calle Florida 567",
    barrio: "Microcentro",
    ciudad: "CABA",
    cuit: "27-23456789-0",
    condicionIva: "Monotributista",
    razonSocial: "María Laura González",
    domicilioFiscal: "Calle Florida 567, CABA",
    notas: "",
    fechaAlta: "2023-06-20",
    vehiculos: [
      { id: 3, marca: "Volkswagen", modelo: "Golf", anio: 2021, patente: "AD 789 GH", color: "Gris" },
    ],
  },
  {
    id: 3,
    nombre: "Roberto",
    apellido: "Fernández",
    telefono: "+54 11 6789-0123",
    email: "rfernandez@empresa.com",
    direccion: "Av. Santa Fe 890, Palermo, CABA",
    calle: "Av. Santa Fe 890",
    barrio: "Palermo",
    ciudad: "CABA",
    cuit: "30-34567890-1",
    condicionIva: "Responsable Inscripto",
    razonSocial: "Fernández Transportes SRL",
    domicilioFiscal: "Av. Santa Fe 890, CABA",
    notas: "Empresa de transporte. Tiene convenio corporativo.",
    fechaAlta: "2022-11-05",
    vehiculos: [
      { id: 4, marca: "Fiat", modelo: "Cronos", anio: 2022, patente: "AE 012 IJ", color: "Rojo" },
      { id: 5, marca: "Chevrolet", modelo: "S10", anio: 2019, patente: "AF 345 KL", color: "Plata" },
      { id: 6, marca: "Renault", modelo: "Kangoo", anio: 2020, patente: "AG 678 MN", color: "Blanco" },
    ],
  },
  {
    id: 4,
    nombre: "Ana",
    apellido: "Rodríguez",
    telefono: "+54 11 7890-1234",
    email: "arodriguez@email.com",
    direccion: "Calle Libertad 123, Recoleta, CABA",
    calle: "Calle Libertad 123",
    barrio: "Recoleta",
    ciudad: "CABA",
    cuit: "",
    condicionIva: "Consumidor Final",
    razonSocial: "",
    domicilioFiscal: "",
    notas: "Primera visita en enero 2024.",
    fechaAlta: "2024-01-10",
    vehiculos: [
      { id: 7, marca: "Peugeot", modelo: "208", anio: 2023, patente: "AH 901 OP", color: "Azul" },
    ],
  },
  {
    id: 5,
    nombre: "Carlos Eduardo",
    apellido: "López",
    telefono: "+54 11 8901-2345",
    email: "celopez@email.com",
    direccion: "Av. Rivadavia 4567, Caballito, CABA",
    calle: "Av. Rivadavia 4567",
    barrio: "Caballito",
    ciudad: "CABA",
    cuit: "20-45678901-2",
    condicionIva: "Monotributista",
    razonSocial: "Carlos Eduardo López",
    domicilioFiscal: "Av. Rivadavia 4567, CABA",
    notas: "",
    fechaAlta: "2024-02-28",
    vehiculos: [
      { id: 8, marca: "Honda", modelo: "Civic", anio: 2019, patente: "AI 234 QR", color: "Negro" },
    ],
  },
]

const emptyFormData = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  calle: "",
  barrio: "",
  ciudad: "",
  cuit: "",
  razonSocial: "",
  condicionIva: "consumidor-final",
  domicilioFiscal: "",
  notas: "",
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

interface ClientsViewProps {
  onNavigateToVehicles?: () => void
}

export function ClientsView({ onNavigateToVehicles }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>(initialClientsData)
  const [searchTerm, setSearchTerm] = useState("")
  const [isClientModalOpen, setIsClientModalOpen] = useState(true) // Opens automatically
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0])
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(true)
  const [formData, setFormData] = useState(emptyFormData)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehiculo | null>(null)
  const [isDeleteVehicleOpen, setIsDeleteVehicleOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("datos")

  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.telefono.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setIsDetailSheetOpen(true)
  }

  const handleNewClient = () => {
    setIsEditMode(false)
    setEditingClient(null)
    setFormData(emptyFormData)
    setIsClientModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setIsEditMode(true)
    setEditingClient(client)
    setFormData({
      nombre: client.nombre,
      apellido: client.apellido,
      telefono: client.telefono,
      email: client.email,
      calle: client.calle,
      barrio: client.barrio,
      ciudad: client.ciudad,
      cuit: client.cuit,
      razonSocial: client.razonSocial,
      condicionIva: client.condicionIva === "Consumidor Final" ? "consumidor-final" : 
                    client.condicionIva === "Monotributista" ? "monotributista" : "responsable-inscripto",
      domicilioFiscal: client.domicilioFiscal,
      notas: client.notas,
    })
    setIsClientModalOpen(true)
  }

  const handleSaveClient = () => {
    const condicionIvaMap: Record<string, string> = {
      "consumidor-final": "Consumidor Final",
      "monotributista": "Monotributista", 
      "responsable-inscripto": "Responsable Inscripto",
    }

    if (isEditMode && editingClient) {
      const updatedClient: Client = {
        ...editingClient,
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        calle: formData.calle,
        barrio: formData.barrio,
        ciudad: formData.ciudad,
        direccion: `${formData.calle}, ${formData.barrio}, ${formData.ciudad}`,
        cuit: formData.cuit,
        razonSocial: formData.razonSocial,
        condicionIva: condicionIvaMap[formData.condicionIva],
        domicilioFiscal: formData.domicilioFiscal,
        notas: formData.notas,
      }
      setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c))
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient(updatedClient)
      }
    } else {
      const newClient: Client = {
        id: Math.max(...clients.map(c => c.id)) + 1,
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        calle: formData.calle,
        barrio: formData.barrio,
        ciudad: formData.ciudad,
        direccion: `${formData.calle}, ${formData.barrio}, ${formData.ciudad}`,
        cuit: formData.cuit,
        razonSocial: formData.razonSocial,
        condicionIva: condicionIvaMap[formData.condicionIva],
        domicilioFiscal: formData.domicilioFiscal,
        notas: formData.notas,
        fechaAlta: new Date().toISOString().split("T")[0],
        vehiculos: [],
      }
      setClients([...clients, newClient])
    }
    setIsClientModalOpen(false)
    setFormData(emptyFormData)
    setEditingClient(null)
    setIsEditMode(false)
  }

  const handleDeleteVehicle = () => {
    if (!vehicleToDelete || !selectedClient) return
    
    const updatedClient = {
      ...selectedClient,
      vehiculos: selectedClient.vehiculos.filter(v => v.id !== vehicleToDelete.id)
    }
    setClients(clients.map(c => c.id === selectedClient.id ? updatedClient : c))
    setSelectedClient(updatedClient)
    setIsDeleteVehicleOpen(false)
    setVehicleToDelete(null)
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona la información de tus clientes
          </p>
        </div>
        <Button 
          onClick={handleNewClient}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-card-foreground">
            Lista de Clientes ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nombre y Apellido</TableHead>
                <TableHead className="text-muted-foreground">Teléfono</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="border-border cursor-pointer transition-colors hover:bg-secondary/50"
                  onClick={() => handleClientClick(client)}
                >
                  <TableCell className="font-medium text-card-foreground">
                    {client.nombre} {client.apellido}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.telefono}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-secondary">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-popover">
                        <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleClientClick(client); }}>
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); handleEditClient(client); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
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

      {/* New/Edit Client Modal */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-card-foreground">
              {isEditMode ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditMode 
                ? "Modifique los datos del cliente. Los campos marcados con * son obligatorios."
                : "Complete los datos del nuevo cliente. Los campos marcados con * son obligatorios."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Datos Personales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Datos Personales</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-card-foreground">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="nombre" 
                    placeholder="Ej: Juan Carlos" 
                    className="bg-secondary border-border"
                    value={formData.nombre}
                    onChange={(e: any) => handleFormChange("nombre", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-card-foreground">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="apellido" 
                    placeholder="Ej: Martínez" 
                    className="bg-secondary border-border"
                    value={formData.apellido}
                    onChange={(e: any) => handleFormChange("apellido", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-card-foreground">
                    Número de Teléfono <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="telefono" 
                    placeholder="Ej: +54 11 4567-8901" 
                    className="bg-secondary border-border"
                    value={formData.telefono}
                    onChange={(e: any) => handleFormChange("telefono", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Ej: cliente@email.com" 
                    className="bg-secondary border-border"
                    value={formData.email}
                    onChange={(e: any) => handleFormChange("email", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Domicilio */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Domicilio</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="calle" className="text-card-foreground">Calle y Altura</Label>
                  <Input 
                    id="calle" 
                    placeholder="Ej: Av. Corrientes 1234" 
                    className="bg-secondary border-border"
                    value={formData.calle}
                    onChange={(e: any) => handleFormChange("calle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barrio" className="text-card-foreground">Barrio</Label>
                  <Input 
                    id="barrio" 
                    placeholder="Ej: Almagro" 
                    className="bg-secondary border-border"
                    value={formData.barrio}
                    onChange={(e: any) => handleFormChange("barrio", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad" className="text-card-foreground">Ciudad</Label>
                  <Input 
                    id="ciudad" 
                    placeholder="Ej: CABA" 
                    className="bg-secondary border-border"
                    value={formData.ciudad}
                    onChange={(e: any) => handleFormChange("ciudad", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Facturación */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Facturación (ARCA/AFIP)</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cuit" className="text-card-foreground">CUIT</Label>
                  <Input 
                    id="cuit" 
                    placeholder="Ej: 20-12345678-9" 
                    className="bg-secondary border-border"
                    value={formData.cuit}
                    onChange={(e: any) => handleFormChange("cuit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razonSocial" className="text-card-foreground">Razón Social</Label>
                  <Input 
                    id="razonSocial" 
                    placeholder="Ej: Empresa SRL" 
                    className="bg-secondary border-border"
                    value={formData.razonSocial}
                    onChange={(e: any) => handleFormChange("razonSocial", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condicionIva" className="text-card-foreground">Condición de IVA</Label>
                  <Select 
                    value={formData.condicionIva}
                    onValueChange={(value: string) => handleFormChange("condicionIva", value)}
                  >
                    <SelectTrigger className="w-full bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar condición" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                      <SelectItem value="consumidor-final">Consumidor Final</SelectItem>
                      <SelectItem value="monotributista">Monotributista</SelectItem>
                      <SelectItem value="responsable-inscripto">Responsable Inscripto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domicilioFiscal" className="text-card-foreground">Domicilio Fiscal</Label>
                  <Input 
                    id="domicilioFiscal" 
                    placeholder="Ej: Av. Corrientes 1234, CABA" 
                    className="bg-secondary border-border"
                    value={formData.domicilioFiscal}
                    onChange={(e: any) => handleFormChange("domicilioFiscal", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Notas Internas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Interno</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas" className="text-card-foreground">Notas del Taller</Label>
                <Textarea
                  id="notas"
                  placeholder="Notas internas sobre el cliente (preferencias, observaciones, etc.)"
                  className="min-h-[100px] bg-secondary border-border resize-none"
                  value={formData.notas}
                  onChange={(e: any) => handleFormChange("notas", e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsClientModalOpen(false)}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveClient}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditMode ? "Guardar Cambios" : "Guardar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg border-border bg-card p-0">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl text-card-foreground">
                  {selectedClient?.nombre} {selectedClient?.apellido}
                </SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Información detallada del cliente
                </SheetDescription>
              </div>
              {activeTab === "datos" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedClient && handleEditClient(selectedClient)}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="datos" className="flex flex-col h-[calc(100vh-140px)]" onValueChange={(value: string) => setActiveTab(value)}>
            <TabsList className="mx-6 bg-secondary">
              <TabsTrigger value="datos" className="flex-1">Datos</TabsTrigger>
              <TabsTrigger value="vehiculos" className="flex-1">Vehículos</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="datos" className="p-6 pt-4 space-y-6 mt-0">
                {/* Registration Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Cliente desde {selectedClient?.fechaAlta ? formatDate(selectedClient.fechaAlta) : "fecha no registrada"}</span>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Contacto</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{selectedClient?.telefono}</p>
                        <p className="text-xs text-muted-foreground">Teléfono</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{selectedClient?.email}</p>
                        <p className="text-xs text-muted-foreground">Email</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{selectedClient?.direccion}</p>
                        <p className="text-xs text-muted-foreground">Dirección</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Billing Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Datos de Facturación</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {selectedClient?.cuit || "No registrado"}
                        </p>
                        <p className="text-xs text-muted-foreground">CUIT</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1 border-primary text-primary">IVA</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{selectedClient?.condicionIva}</p>
                        <p className="text-xs text-muted-foreground">Condición de IVA</p>
                      </div>
                    </div>
                    {selectedClient?.razonSocial && (
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Razón Social</p>
                        <p className="text-sm font-medium text-card-foreground">{selectedClient.razonSocial}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedClient?.notas && (
                  <>
                    <Separator className="bg-border" />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">Notas</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedClient.notas}</p>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="vehiculos" className="p-6 pt-4 space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">
                    Vehículos ({selectedClient?.vehiculos.length || 0})
                  </h4>
<Button 
    size="sm" 
    variant="outline" 
    className="border-border text-foreground hover:bg-secondary"
    onClick={() => onNavigateToVehicles?.()}
  >
    <Plus className="mr-1 h-3 w-3" />
    Agregar Vehículo
  </Button>
                </div>

                <div className="space-y-3">
                  {selectedClient?.vehiculos.map((vehiculo) => (
                    <div
                      key={vehiculo.id}
                      className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">
                              {vehiculo.marca} {vehiculo.modelo}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehiculo.anio} · {vehiculo.color}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono bg-secondary text-foreground">
                          {vehiculo.patente}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
<Button
  size="sm"
  variant="outline"
  className="flex-1 border-border text-foreground hover:bg-secondary"
  onClick={() => onNavigateToVehicles?.()}
  >
  <History className="mr-2 h-4 w-4" />
  Ver Historial de Trabajos
  </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVehicleToDelete(vehiculo)
                            setIsDeleteVehicleOpen(true)
                          }}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {selectedClient?.vehiculos.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Este cliente no tiene vehículos registrados</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Vehicle Confirmation */}
      <AlertDialog open={isDeleteVehicleOpen} onOpenChange={setIsDeleteVehicleOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">Eliminar Vehículo</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              ¿Estás seguro de que deseas eliminar el vehículo{" "}
              <span className="font-medium text-foreground">
                {vehicleToDelete?.marca} {vehicleToDelete?.modelo} ({vehicleToDelete?.patente})
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
