//@ts-nocheck
"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle2, Info, Loader2, User, Car, Settings} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

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

  // Estado para la Alerta Personalizada Global
  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: "", type: "info" });
  
  // ESTADOS PARA LA MEMORIA DEL PUENTE
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)
  const [presupuestoParaAbrir, setPresupuestoParaAbrir] = useState<string | null>(null) 
  
  const [volverA, setVolverA] = useState<string | null>(null)
  const [turnoAgendarInfo, setTurnoAgendarInfo] = useState<any>(null)

  // --- SECUESTRO GLOBAL DEL ALERT() ---
  useEffect(() => {
    window.alert = (msg) => {
      // Detectamos si es un error, advertencia o éxito leyendo el texto
      let type = "info";
      if (msg.includes("Error") || msg.includes("❌") || msg.includes("⛔")) type = "error";
      else if (msg.includes("⚠️")) type = "warning";
      else if (msg.includes("éxito") || msg.includes("¡")) type = "success";

      setCustomAlert({ isOpen: true, message: msg, type });
    };
  }, []);

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
        alert("⛔ Por seguridad, tu sesión se ha cerrado tras 30 minutos de inactividad.");
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
              userRole={userRole} 
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
            userRole={userRole} 
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
            userRole={userRole} 
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
            userRole={userRole} 
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
        return <MetricsCards userRole={userRole}/> // Aseguramos que Inicio también reciba el rol si es default
    }
  }

  // --- LAS BARRERAS DE SEGURIDAD ---

  // 1. Si todavía está pensando (cargando la página o validando el login), mostramos la animación del Taller
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-background gap-6">
        <div className="relative flex items-center justify-center">
          {/* Ícono de auto rebotando (efecto andando) */}
          <Car className="w-16 h-16 text-emerald-600 animate-bounce relative z-10" />
          {/* Rueditas girando (usamos el ícono de configuración como llanta) */}
          <div className="absolute bottom-1 left-1.5 z-20 bg-background rounded-full">
             <Settings className="w-4 h-4 text-slate-800 dark:text-slate-300 animate-spin" />
          </div>
          <div className="absolute bottom-1 right-1.5 z-20 bg-background rounded-full">
             <Settings className="w-4 h-4 text-slate-800 dark:text-slate-300 animate-spin" />
          </div>
          {/* Sombrita dinámica en el piso */}
          <div className="absolute -bottom-2 w-16 h-2 bg-black/10 dark:bg-white/10 rounded-[100%] animate-pulse"></div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase">
            Suspensión Martín
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Abriendo el taller...</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. Si NO está logueado, lo frenamos en el Login
  if (isAuthenticated === false) {
    return (
      <LoginView onLoginSuccess={async () => {
        // EN VEZ DE UN F5 BRUSCO:
        // 1. Volvemos a mostrar la pantalla de carga del autito
        setIsAuthenticated(null); 
        
        // 2. Buscamos la sesión fresca y su rol en silencio
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).single();
          setUserRole(perfil?.rol || null);
          // 3. Abrimos la puerta al sistema ya con los candados correctos
          setIsAuthenticated(true);
        }
      }} />
    )
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
          <main className="flex-1 overflow-y-auto p-6 relative">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
            
            {/* --- ALERTA PERSONALIZADA GLOBAL --- */}
            <Dialog open={customAlert.isOpen} onOpenChange={(open) => setCustomAlert(prev => ({ ...prev, isOpen: open }))}>
              <DialogContent className="max-w-sm p-6 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-2xl sm:rounded-2xl top-[35%] translate-y-[-50%] outline-none">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    customAlert.type === "error" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                    customAlert.type === "warning" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                    customAlert.type === "success" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  }`}>
                    {customAlert.type === "error" ? <AlertCircle className="w-7 h-7" /> :
                     customAlert.type === "warning" ? <AlertCircle className="w-7 h-7" /> :
                     customAlert.type === "success" ? <CheckCircle2 className="w-7 h-7" /> :
                     <Info className="w-7 h-7" />}
                  </div>
                  
                  <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">
                    {customAlert.type === "error" ? "Ha ocurrido un error" :
                     customAlert.type === "warning" ? "Atención" :
                     customAlert.type === "success" ? "¡Excelente!" :
                     "Aviso del Sistema"}
                  </DialogTitle>
                  
                  <DialogDescription className="text-base text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {customAlert.message.replace(/⚠️|❌|⛔|¡/g, "").trim()}
                  </DialogDescription>
                  
                  <Button 
                    onClick={() => setCustomAlert({ isOpen: false, message: "", type: "info" })} 
                    className={`w-full mt-4 rounded-xl h-12 text-base font-bold shadow-md transition-all ${
                      customAlert.type === "error" ? "bg-red-600 hover:bg-red-700 text-white" :
                      customAlert.type === "success" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                      "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                    }`}
                  >
                    Entendido
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}