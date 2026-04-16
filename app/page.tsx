//@ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, User } from "lucide-react"

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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState("Inicio")
  
  // ESTADOS PARA LA MEMORIA DEL PUENTE
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)
  const [presupuestoParaAbrir, setPresupuestoParaAbrir] = useState<string | null>(null) 
  
  const [volverA, setVolverA] = useState<string | null>(null)
  const [turnoAgendarInfo, setTurnoAgendarInfo] = useState<any>(null)

  // --- EFECTO OPTIMIZADO: SESIÓN, ROL Y AUTO-CIERRE ---
  useEffect(() => {
    const inicializarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
        const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).single()
        if (perfil) setUserRole(perfil.rol)
      } else {
        setIsAuthenticated(false)
        setUserRole(null)
      }
    }
    
    inicializarSesion()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      if (!session) setUserRole(null)
    })

    // 3. DETECTOR DE INACTIVIDAD (VERSIÓN LIVIANA)
    let ultimaActividad = Date.now();
    const actualizarActividad = () => { ultimaActividad = Date.now(); };

    window.addEventListener('mousemove', actualizarActividad);
    window.addEventListener('keydown', actualizarActividad);
    window.addEventListener('click', actualizarActividad);
    window.addEventListener('scroll', actualizarActividad);
    
    // Revisamos silenciosamente cada 1 minuto si el usuario se olvidó la sesión abierta
    const intervaloRevision = setInterval(async () => {
      const tiempoInactivo = Date.now() - ultimaActividad;
      if (tiempoInactivo > 30 * 60 * 1000) { // 30 minutos
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUserRole(null);
        alert("Por seguridad, tu sesión se ha cerrado tras 30 minutos de inactividad.");
        window.location.reload();
      }
    }, 60000); 

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('mousemove', actualizarActividad);
      window.removeEventListener('keydown', actualizarActividad);
      window.removeEventListener('click', actualizarActividad);
      window.removeEventListener('scroll', actualizarActividad);
      clearInterval(intervaloRevision);
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
              userRole={userRole} // <--- ¡ESTA ES LA MAGIA!
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
        return (
          <VehiclesView 
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
            userRole={userRole} // <--- ¡ESTA ES LA MAGIA QUE FALTABA!
          />
        );
      case "Taller":
        return <WorkOrdersTable 
                 onNavigateToPresupuesto={(id) => {
                   setPresupuestoParaAbrir(id);
                   setVolverA("Taller");
                   setActiveSection("Presupuestos");
                 }}
                 userRole={userRole} 
               />
      case "Caja":
        return (
          <CajaView 
            onNavigateToPresupuesto={(id) => {
              setPresupuestoParaAbrir(id);
              setVolverA("Caja");
              setActiveSection("Presupuestos");
            }}
            userRole={userRole} // <--- ¡ESTE ES EL CANDADO!
          />
        );
      case "Turnos":
        return (
          <TurnosView 
            turnoAgendarInfo={turnoAgendarInfo}
            onClearTurnoAgendarInfo={() => setTurnoAgendarInfo(null)}
            onNavigateToBudgetDetail={(budgetId) => {
              setPresupuestoParaAbrir(budgetId);
              setVolverA("Turnos");
              setActiveSection("Presupuestos");
            }}
            userRole={userRole} 
          />
        );
      case "Presupuestos":
        return (
          <PresupuestosView 
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
            userRole={userRole} // <--- CLAVE PARA EL BLINDAJE
          />
        );
      case "Stock/Repuestos":
        return <CatalogoView />
      case "Configuración":
        return <AjustesView />
      case "Cuentas Corrientes":
        return <CuentasCorrientesView />;
      case "Estadísticas":
        return <AdminDashboardView />;
      case "Perfil":
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in">
            <div className="bg-emerald-100 p-6 rounded-full mb-4">
              <User className="w-12 h-12 text-emerald-700" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Mi Perfil</h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Sesión iniciada como <span className="font-bold uppercase text-emerald-600">{userRole}</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">Suspensión Martín - Panel de Gestión</p>
          </div>
        );
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
        <DashboardSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
          userRole={userRole} 
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
            userRole={userRole}
          />
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