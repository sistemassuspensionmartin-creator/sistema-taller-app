//@ts-nocheck
"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle2, Info, Loader2, User, Car, Settings, Lock} from "lucide-react"
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState("Inicio")

  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: "", type: "info" });
  
  const [vehiculoParaAbrir, setVehiculoParaAbrir] = useState<any>(null)
  const [clienteParaAbrir, setClienteParaAbrir] = useState<any>(null)
  const [presupuestoParaAbrir, setPresupuestoParaAbrir] = useState<string | null>(null) 

  const [vehiculoPreseleccionado, setVehiculoPreseleccionado] = useState<any>(null);
  
  const [volverA, setVolverA] = useState<string | null>(null)
  const [turnoAgendarInfo, setTurnoAgendarInfo] = useState<any>(null)
  // --- MAGIA: ESTADOS DE LA BÓVEDA DE SEGURIDAD ---
  const [isLocked, setIsLocked] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [masterPin, setMasterPin] = useState("1234")
  const [pinError, setPinError] = useState(false)

  // 1. Cargamos el PIN desde la configuración al iniciar
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracion').select('pin_seguridad').eq('id', 1).single();
      if (data?.pin_seguridad) {
        setMasterPin(data.pin_seguridad);
      }
    }
    if (isAuthenticated) fetchConfig();
  }, [isAuthenticated]);

  // 2. El Centinela de Inactividad y Auto-cierre
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_TIME = 5000; 

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setIsLocked(true); // ¡Pum! Bloquea la pantalla
      }, INACTIVITY_TIME);
    };

    // Escuchamos movimientos de mouse o teclas
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Arranca a contar apenas entrás

    // Reloj vigía de las 19:00hs
    const timeChecker = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 19 && now.getMinutes() === 0) {
        await supabase.auth.signOut(); // Cierra sesión de raíz
      }
    }, 60000); // Revisa la hora cada 1 minuto

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(inactivityTimer);
      clearInterval(timeChecker);
    };
  }, [isAuthenticated, isLocked]);

  // 3. Validación automática del PIN
  useEffect(() => {
    if (pinInput.length === 4) {
      if (pinInput === masterPin) {
        setIsLocked(false);
        setPinInput("");
        setPinError(false);
      } else {
        setPinError(true);
        setTimeout(() => setPinInput(""), 500); // Borra rápido si le erró
      }
    }
  }, [pinInput, masterPin]);

  useEffect(() => {
    window.alert = (msg) => {
      let type = "info";
      if (msg.includes("Error") || msg.includes("❌") || msg.includes("⛔")) type = "error";
      else if (msg.includes("⚠️")) type = "warning";
      else if (msg.includes("éxito") || msg.includes("¡")) type = "success";

      setCustomAlert({ isOpen: true, message: msg, type });
    };
  }, []);

  useEffect(() => {
    const inicializarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
        
        // --- CORRECCIÓN MAGICA: UNA SOLA COMILLA ---
        const { data: perfil } = await supabase.from('perfiles').select('rol, nombre').eq('id', session.user.id).single()
        
        if (perfil) {
          setUserRole(perfil.rol)
          setUserName(perfil.nombre) 
        }
      } else {
        setIsAuthenticated(false)
        setUserRole(null)
        setUserName(null)
      }
    }
    
    inicializarSesion()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      if (!session) {
        setUserRole(null)
        setUserName(null)
      }
    })

    return () => {
      subscription.unsubscribe();
    }
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case "Inicio":
        return (
          <div className="space-y-8">
            <MetricsCards 
              onNavigateToAdmin={() => setActiveSection("Estadísticas")}
              onNavigateToPresupuestos={(id = "nuevo") => {
                setPresupuestoParaAbrir(id); 
                setActiveSection("Presupuestos");
              }}
              onNavigateToTurnos={() => setActiveSection("Turnos")}
              onNavigateToCaja={() => setActiveSection("Caja")}
              userRole={userRole}
              userName={userName}
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
            vehiculoPreseleccionado={vehiculoParaAbrir} // <--- ACÁ LE PASAMOS EL AUTO!
            onClearPresupuestoDetalle={() => {
              setPresupuestoParaAbrir(null);
              setVehiculoParaAbrir(null); // <--- Y ACÁ LO LIMPIAMOS AL CERRAR
            }}
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
            userName={userName} 
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
              Sesión iniciada como <span className="font-bold uppercase text-emerald-600">{userName || userRole}</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">Suspensión Martín - Panel de Gestión</p>
          </div>
        );
      default:
        return <MetricsCards userRole={userRole} userName={userName}/> 
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-background gap-6">
        <div className="relative flex items-center justify-center">
          <Car className="w-16 h-16 text-emerald-600 animate-bounce relative z-10" />
          <div className="absolute bottom-1 left-1.5 z-20 bg-background rounded-full">
             <Settings className="w-4 h-4 text-slate-800 dark:text-slate-300 animate-spin" />
          </div>
          <div className="absolute bottom-1 right-1.5 z-20 bg-background rounded-full">
             <Settings className="w-4 h-4 text-slate-800 dark:text-slate-300 animate-spin" />
          </div>
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

  if (isAuthenticated === false) {
    return (
      <LoginView onLoginSuccess={async () => {
        setIsAuthenticated(null); 
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          
          // --- CORRECCIÓN MAGICA: UNA SOLA COMILLA ---
          const { data: perfil } = await supabase.from('perfiles').select('rol, nombre').eq('id', session.user.id).single();
          
          setUserRole(perfil?.rol || null);
          setUserName(perfil?.nombre || null);
          setIsAuthenticated(true);
        }
      }} />
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {/* --- PANTALLA NEGRA DE BLOQUEO --- */}
      {isLocked && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white animate-in fade-in">
          <Lock className="w-16 h-16 text-emerald-500 mb-6" />
          <h2 className="text-3xl font-bold mb-2 tracking-wide">Pantalla Bloqueada</h2>
          <p className="text-slate-400 mb-8">Por seguridad, el sistema se bloqueó tras 15 min de inactividad.</p>

          {/* Los 4 puntitos del PIN */}
          <div className="flex gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${pinInput.length > i ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-600'}`} />
            ))}
          </div>

          {pinError && <p className="text-red-500 font-bold mb-4 animate-bounce">PIN Incorrecto</p>}

          {/* Teclado numérico táctil */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => setPinInput(p => (p.length < 4 ? p + num : p))} className="h-16 text-2xl font-bold bg-slate-800 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-colors">
                {num}
              </button>
            ))}
            <button onClick={() => setPinInput("")} className="h-16 text-xl font-bold bg-slate-800/50 rounded-xl hover:bg-red-500/20 text-red-400 active:bg-red-500/30 transition-colors">
              C
            </button>
            <button onClick={() => setPinInput(p => (p.length < 4 ? p + "0" : p))} className="h-16 text-2xl font-bold bg-slate-800 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-colors">
              0
            </button>
            <button onClick={() => setPinInput(p => p.slice(0, -1))} className="h-16 text-xl font-bold bg-slate-800/50 rounded-xl hover:bg-amber-500/20 text-amber-400 active:bg-amber-500/30 transition-colors">
              ⌫
            </button>
          </div>
          
          <button onClick={async () => { await supabase.auth.signOut(); setIsLocked(false); }} className="mt-12 text-sm text-slate-500 hover:text-white transition-colors underline underline-offset-4">
            No soy {userName}, Cerrar Sesión
          </button>
        </div>
      )}
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
            userName={userName}
            onNavigateToPresupuesto={(id) => {
              setPresupuestoParaAbrir(id);
              setVolverA(activeSection);
              setActiveSection("Presupuestos");
            }}
          />
          <main className="flex-1 overflow-y-auto p-6 relative">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
            
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