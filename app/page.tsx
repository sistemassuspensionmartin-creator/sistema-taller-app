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
  const [activeSection, setActiveSection] = useState("Inicio")
  
  // ESTADOS PARA LA MEMORIA DEL PUENTE
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)
  const [presupuestoParaAbrir, setPresupuestoParaAbrir] = useState<string | null>(null) 
  
  // NUEVA MEMORIA: Saber a dónde volver
  const [volverA, setVolverA] = useState<string | null>(null)
  
  const [turnoAgendarInfo, setTurnoAgendarInfo] = useState<any>(null)

  const renderContent = () => {
    switch (activeSection) {
      case "Inicio":
        return (
          <div className="space-y-6">
            <MetricsCards />
            <WorkOrdersTable 
              readOnly={true}
              onNavigateToPresupuesto={(id) => {
                setPresupuestoParaAbrir(id);
                setVolverA("Inicio"); // Anotamos que venimos del inicio
                setActiveSection("Presupuestos");
              }}
            />
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
                 // MAGIA: Navegar al presupuesto desde el historial del vehículo
                 onNavigateToPresupuesto={(id) => {
                   setPresupuestoParaAbrir(id);
                   setVolverA("Vehículos"); // Anotamos que venimos de la ficha del vehículo
                   setActiveSection("Presupuestos");
                 }}
               />
      case "Taller":
        return <WorkOrdersTable 
                 onNavigateToPresupuesto={(id) => {
                   setPresupuestoParaAbrir(id);
                   setVolverA("Taller"); // Anotamos que venimos del Taller
                   setActiveSection("Presupuestos");
                 }}
               />
      case "Caja":              
        return <CajaView />
      case "Turnos":
        return <TurnosView 
                 turnoAgendarInfo={turnoAgendarInfo}
                 onClearTurnoAgendarInfo={() => setTurnoAgendarInfo(null)}
                 onNavigateToBudgetDetail={(budgetId) => {
                   setPresupuestoParaAbrir(budgetId);
                   setVolverA("Turnos"); // Anotamos que venimos de los Turnos
                   setActiveSection("Presupuestos");
                 }}
               />
      case "Presupuestos":
        return <PresupuestosView 
                 presupuestoAbreDetalle={presupuestoParaAbrir}
                 onClearPresupuestoDetalle={() => setPresupuestoParaAbrir(null)}
                 onNavigateToTaller={() => setActiveSection("Taller")}
                 onNavigateToTurnos={(vehiculoInfo) => {
                   setTurnoAgendarInfo(vehiculoInfo);
                   setActiveSection("Turnos");
                 }}
                 // MAGIA: Función que se ejecuta al tocar "Volver" en el presupuesto
                 onVolver={() => {
                   if (volverA) {
                     setActiveSection(volverA);
                     setVolverA(null);
                   }
                 }}
               />
      case "Stock/Repuestos":
        return <CatalogoView />
      case "Configuración":
        return <AjustesView />
      default:
        return <MetricsCards />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className="flex h-screen bg-background">
        <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
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