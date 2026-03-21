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

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("Vehículos")

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
        return <ClientsView onNavigateToVehicles={() => setActiveSection("Vehículos")} />
      case "Vehículos":
        return <VehiclesView />
      case "Taller":
        return <WorkOrdersTable />
      case "Caja":               
        return <CajaView />
      case "Presupuestos":
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">Sección de Presupuestos - Próximamente</p>
          </div>
        )
      case "Stock/Repuestos":
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">Sección de Stock/Repuestos - Próximamente</p>
          </div>
        )
      case "Turnos":
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">Sección de Turnos - Próximamente</p>
          </div>
        )
      default:
        return <ClientsView onNavigateToVehicles={() => setActiveSection("Vehículos")} />
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
        {/* Sidebar */}
        <DashboardSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <DashboardHeader activeSection={activeSection} />

          {/* Page content */}
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
