//@ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

// --- TUS COMPONENTES ---
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
import { CuentasCorrientesView } from "@/components/dashboard/cuentas-corrientes-view"
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view"

// --- EL NUEVO LOGIN ---
import { LoginView } from "@/components/dashboard/login-view"

export default function DashboardPage() {
  // --- ESTADO DE AUTENTICACIÓN (EL CANDADO) ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const [activeSection, setActiveSection] = useState("Inicio")
  
  // ESTADOS PARA LA MEMORIA DEL PUENTE
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)
  const [presupuestoParaAbrir, setPresupuestoParaAbrir] = useState<string | null>(null) 
  
  const [volverA, setVolverA] = useState<string | null>(null)
  const [turnoAgendarInfo, setTurnoAgendarInfo] = useState<any>(null)

  // --- EFECTO PARA VERIFICAR SESIÓN Y AUTO-CIERRE POR INACTIVIDAD ---
  useEffect(() => {
    // 1. Revisar sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    // 2. Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    // 3. DETECTOR DE INACTIVIDAD (30 Minutos)
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 30 minutos = 30 * 60 * 1000 milisegundos
      timeoutId = setTimeout(async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        alert("Por seguridad, tu sesión se ha cerrado tras 30 minutos de inactividad.");
        window.location.reload();
      }, 30 * 60 * 1000); 
    };

    // Escuchamos si el usuario mueve el mouse, hace clic o toca el teclado
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    
    // Arrancamos el reloj
    resetTimer();

    return () => {
      subscription.unsubscribe();
      // Limpiamos los detectores cuando nos vamos
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearTimeout(timeoutId);
    }
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case "Inicio":
        return (
          <div className="space-y-8">
            <MetricsCards 
              onNavigateToAdmin={() => setActiveSection("Estadísticas")}
              onNavigateToPresupuestos={() => {
                setPresupuestoParaAbrir(null); 
                setActiveSection("Presupuestos");
              }}
              onNavigateToTurnos={() => setActiveSection("Turnos")}
              onNavigateToCaja={() => setActiveSection("Caja")}
            />
          </div>
        );
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
                 onNavigateToPresupuesto={(id, vehiculoInfo) => {
                   setPresupuestoParaAbrir(id);
                   setVehiculoParaAbrir(vehiculoInfo); 
                   setVolverA("Vehículos");
                   setActiveSection("Presupuestos");
                 }}
               />
      case "Taller":
        return <WorkOrdersTable 
                 onNavigateToPresupuesto={(id) => {
                   setPresupuestoParaAbrir(id);
                   setVolverA("Taller");
                   setActiveSection("Presupuestos");
                 }}
               />
      case "Caja":
        return <CajaView 
          onNavigateToPresupuesto={(id) => {
            setPresupuestoParaAbrir(id);
            setVolverA("Caja");
            setActiveSection("Presupuestos");
          }}
        />;
      case "Turnos":
        return <TurnosView 
                 turnoAgendarInfo={turnoAgendarInfo}
                 onClearTurnoAgendarInfo={() => setTurnoAgendarInfo(null)}
                 onNavigateToBudgetDetail={(budgetId) => {
                   setPresupuestoParaAbrir(budgetId);
                   setVolverA("Turnos");
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
      case "Cuentas Corrientes":
        return <CuentasCorrientesView />;
      case "Estadísticas":
        return <AdminDashboardView />;
      default:
        return <MetricsCards />
    }
  }

  // --- LAS BARRERAS DE SEGURIDAD ---

  // 1. Si todavía está pensando (cargando la página), mostramos un loader
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    )
  }

  // 2. Si NO está logueado, lo frenamos en el Login
  if (isAuthenticated === false) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  // 3. Si PASÓ las barreras, le mostramos el sistema
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className="flex h-screen bg-background">
        <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader activeSection={activeSection} onSectionChange={setActiveSection} />
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