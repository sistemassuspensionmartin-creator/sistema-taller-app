"use client"

import { Button } from "@/components/ui/button"
import { Home, Users, Car, CalendarDays, Settings, Banknote, Wrench, FileText } from "lucide-react"

// AGREGAMOS userRole A LAS PROPIEDADES QUE RECIBE EL COMPONENTE
export function DashboardSidebar({ 
  activeSection, 
  setActiveSection, 
  userRole 
}: { 
  activeSection: string, 
  setActiveSection: (section: string) => void,
  userRole: string | null 
}) {
  
  // Lista de todos los botones con sus permisos
  const menuItems = [
    { name: "Inicio", icon: Home, roles: ["admin", "cajero", "mecanico"] }, // Todos lo ven
    { name: "Turnos", icon: CalendarDays, roles: ["admin", "cajero", "mecanico"] }, // Todos
    { name: "Vehículos", icon: Car, roles: ["admin", "cajero", "mecanico"] }, // Todos
    { name: "Clientes", icon: Users, roles: ["admin", "cajero"] }, // Mecánico no necesita ver la base de clientes entera
    { name: "Presupuestos", icon: FileText, roles: ["admin", "cajero"] }, // Solo ventas/caja
    { name: "Caja", icon: Banknote, roles: ["admin", "cajero"] }, // Solo ventas/caja
    { name: "Configuración", icon: Settings, roles: ["admin"] }, // SOLO EL JEFE
  ]

  // Magia: Filtramos la lista para que solo queden los botones donde el rol del usuario está incluido
  const itemsPermitidos = menuItems.filter(item => userRole ? item.roles.includes(userRole) : false)

  return (
    <aside className="w-64 border-r border-border bg-background hidden md:flex flex-col h-full">
      <div className="h-16 flex items-center justify-center border-b border-border">
        {/* Tu logo va acá */}
        <span className="font-bold text-emerald-600 text-xl tracking-tight uppercase border-2 border-emerald-600 px-3 py-1 rounded-sm">
          Suspensión<span className="text-amber-500 ml-1">MARTIN</span>
        </span>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Recorremos solo los items permitidos */}
        {itemsPermitidos.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.name
          
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start font-medium transition-colors ${
                isActive 
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setActiveSection(item.name)}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-emerald-600 dark:text-emerald-500" : ""}`} />
              {item.name}
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}