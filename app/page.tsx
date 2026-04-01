//@ts-nocheck
"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { ClientsView } from "@/components/dashboard/clients-view"
import { VehiclesView } from "@/components/dashboard/vehicles-view"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { WorkOrdersTable } from "@/components/dashboard/work-orders-table"
import { ThemeProvider } from "@/components/theme-provider"
import { CajaView } from "@/components/dashboard/caja-view"
import { TurnosView } from "@/components/dashboard/turnos-view"
import { PresupuestosView } from "@/components/dashboard/presupuestos-view"
import { CatalogoView } from "@/components/dashboard/catalogo-view"
import { AjustesView } from "@/components/dashboard/ajustes-view"

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("Vehículos")
  
  // ESTADOS PARA LA MEMORIA DEL PUENTE
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)

  const renderContent = () => {
    switch (activeSection) {
      case "Inicio":
        return (
          <div className="space-y-6">
            <MetricsCards />
            <WorkOrdersTable />
          </div>
        )
      case "Clientes":
        return <ClientsView 
                 clienteAbreDetalle={clienteParaAbrir}
                 onClearClienteDetalle={() => setClienteParaAbrir(null)}
                 onNavigateToVehicles={(vehiculo) => { 
                   setVehiculoParaAbrir(vehiculo);
                   setActiveSection("Vehículos"); 
                 }} 
               />
      case "Vehículos":
        return <VehiclesView 
                 vehiculoAbreDetalle={vehiculoParaAbrir}
                 onClearVehiculoDetalle={() => setVehiculoParaAbrir(null)}
                 onNavigateToClients={(cliente) => {
                   setClienteParaAbrir(cliente);
                   setActiveSection("Clientes");
                 }}
               />
      case "Taller":
        return <WorkOrdersTable />
      case "Caja":              
        return <CajaView />
      case "Turnos":
        return <TurnosView />
      case "Presupuestos":
        return <PresupuestosView />
      case "Stock/Repuestos":
        return <CatalogoView />
      case "Configuración":
        return <AjustesView />
      default:
        return <ClientsView 
                 clienteAbreDetalle={clienteParaAbrir}
                 onClearClienteDetalle={() => setClienteParaAbrir(null)}
                 onNavigateToVehicles={(vehiculo) => { 
                   setVehiculoParaAbrir(vehiculo);
                   setActiveSection("Vehículos"); 
                 }} 
               />
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex h-screen bg-background">
        <DashboardSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader activeSection={activeSection} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}