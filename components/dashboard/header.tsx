"use client"

import { supabase } from "@/lib/supabase"
import { Bell, Search, User, CheckCircle2, Car, ArrowRight, FileText, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect, useRef } from "react"
import { suscribirCanal } from "@/lib/realtime"
import { destinoDeRol, prepararSonidos, reproducirSonido } from "@/lib/notificaciones"

export function DashboardHeader({ 
  activeSection, 
  onSectionChange,
  userRole,
  userName,
  onNavigateToPresupuesto 
}: { 
  activeSection?: string, 
  onSectionChange?: (section: string) => void,
  userRole?: string | null,
  userName?: string | null,
  onNavigateToPresupuesto?: (id: string) => void 
}) {
  
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [campanaSuena, setCampanaSuena] = useState(false)
  const miIdRef = useRef<string | null>(null)

  const destino = destinoDeRol(userRole)

  useEffect(() => {
    if (!userRole) return;
    let activo = true;
    let desuscribir: (() => void) | null = null;

    prepararSonidos();

    // Las notificaciones viven en la base: al abrir el sistema (o al reconectar)
    // se traen las pendientes del sector, menos las que generó este usuario.
    const cargarPendientes = async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('destino', destino)
        .is('vista_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (activo && !error) setNotificaciones((data || []).filter(n => n.creado_por !== miIdRef.current));
    };

    const iniciar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      miIdRef.current = session?.user.id ?? null;
      if (!activo) return;
      await cargarPendientes();
      if (!activo) return;

      desuscribir = suscribirCanal('notificaciones-' + destino, canal => canal
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `destino=eq.${destino}` }, (payload: any) => {
          const nueva = payload.new;
          // Quien generó la acción no recibe su propio aviso ni escucha el sonido
          if (nueva.creado_por && nueva.creado_por === miIdRef.current) return;
          setNotificaciones(prev => prev.some(n => n.id === nueva.id) ? prev : [nueva, ...prev]);
          reproducirSonido(nueva.tipo === 'auto_terminado' || nueva.tipo === 'auto_ingresado' ? 'listo' : 'ding');
          setCampanaSuena(true);
          setTimeout(() => setCampanaSuena(false), 3000);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `destino=eq.${destino}` }, (payload: any) => {
          // Otro compañero del sector ya la vio: desaparece en todas las PCs
          if (payload.new.vista_at) setNotificaciones(prev => prev.filter(n => n.id !== payload.new.id));
        }),
        cargarPendientes,
        { intervaloMs: 120000 }
      );
    };

    iniciar();

    return () => {
      activo = false;
      if (desuscribir) desuscribir();
    }
  }, [userRole]);

  const handleCerrarSesion = async () => {
    await (supabase.auth as any).signOut()
    window.location.reload()
  }

  const marcarVistas = async (ids: string[]) => {
    if (ids.length === 0) return;
    setNotificaciones(prev => prev.filter(n => !ids.includes(n.id)));
    const { error } = await supabase
      .from('notificaciones')
      .update({ vista_at: new Date().toISOString(), vista_por: miIdRef.current })
      .in('id', ids);
    if (error) console.error("No se pudo marcar la notificación como vista:", error.message);
  }

  const descartarNotificacion = (id: string, e: any) => {
    e.stopPropagation(); 
    marcarVistas([id]);
  }

  const ejecutarAccionNotificacion = (notif: any) => {
    marcarVistas([notif.id]);
    
    if (notif.tipo === 'auto_terminado' || notif.tipo === 'auto_ingresado') {
      if (notif.patente) {
        localStorage.setItem("filtro_taller_patente", notif.patente);
        // Emisión en vivo para filtrado inmediato sin importar si ya estaba montado
        window.dispatchEvent(new CustomEvent("filtrar_patente", { detail: notif.patente }));
      }
      if (onSectionChange) onSectionChange("Taller");
    } else if (notif.referencia_id) {
      if (onSectionChange) onSectionChange("Presupuestos");
      setTimeout(() => {
        if (onNavigateToPresupuesto) onNavigateToPresupuesto(notif.referencia_id);
      }, 100);
    }
  }

  const ESTILO_NOTIF: Record<string, { icono: any, color: string }> = {
    auto_ingresado: { icono: Car, color: 'text-blue-600 dark:text-blue-400' },
    auto_terminado: { icono: Car, color: 'text-emerald-600 dark:text-emerald-400' },
    presupuesto_nuevo: { icono: FileText, color: 'text-blue-600 dark:text-blue-400' },
    presupuesto_modificacion: { icono: Pencil, color: 'text-orange-600 dark:text-orange-400' },
    presupuesto_modificado: { icono: Pencil, color: 'text-rose-600 dark:text-rose-400' },
  }
  const estiloNotif = (tipo: string) => ESTILO_NOTIF[tipo] || { icono: Bell, color: 'text-foreground' }
  const horaNotif = (fecha: string) => {
    const d = new Date(fecha);
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? hora : `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${hora}`;
  }

  const rolFormat = userRole === 'admin' ? 'Administrador' : 
                    userRole === 'mecanico' ? 'Mecánico' : 
                    userRole === 'cajero' ? 'Ventas / Caja' : 'Usuario';
                         
  const iniciales = userName ? userName.substring(0, 2).toUpperCase() : (userRole ? userRole.substring(0, 2).toUpperCase() : 'US');
  const nombreMostrar = userName || rolFormat;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{activeSection || "Panel de Control"}</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de vuelta, {nombreMostrar}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." className="w-64 bg-secondary border-border pl-9" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={`relative text-muted-foreground hover:bg-secondary hover:text-foreground transition-all ${campanaSuena ? 'animate-bounce text-emerald-600' : ''}`}>
              <Bell className="h-5 w-5" />
              {notificaciones.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-card">
                  {notificaciones.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-border bg-popover p-0">
            <div className="p-3 border-b border-border bg-secondary/30 flex justify-between items-center">
              <span className="font-bold text-sm text-foreground">Notificaciones</span>
              {notificaciones.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{notificaciones.length} nuevas</span>
                  <button onClick={(e) => { e.stopPropagation(); marcarVistas(notificaciones.map(n => n.id)); }} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
                    Marcar todas vistas
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center"><CheckCircle2 className="h-8 w-8 mb-2 opacity-20" /><p>Todo al día. No hay novedades.</p></div>
              ) : (
                notificaciones.map((notif) => {
                  const { icono: Icono, color } = estiloNotif(notif.tipo);
                  const esDelTaller = notif.tipo === 'auto_terminado' || notif.tipo === 'auto_ingresado';
                  return (
                  <div key={notif.id} className="p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div className={`flex items-center gap-2 font-bold text-sm ${color}`}><Icono className="h-4 w-4" /> {notif.titulo}</div>
                      <span className="text-xs text-muted-foreground">{horaNotif(notif.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-snug">{notif.mensaje}</p>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" onClick={() => ejecutarAccionNotificacion(notif)} className={`flex-1 h-8 text-white text-xs shadow-sm ${esDelTaller ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Ver en Pantalla <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => descartarNotificacion(notif.id, e)} className="h-8 text-xs text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Vista
                      </Button>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">{iniciales}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">{nombreMostrar}</p>
                <p className="text-xs text-muted-foreground capitalize">{rolFormat}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
            <DropdownMenuLabel className="text-foreground">Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer" onClick={() => onSectionChange && onSectionChange("Perfil")}><User className="mr-2 h-4 w-4" /> Perfil</DropdownMenuItem>
            {userRole === 'admin' && (<DropdownMenuItem className="cursor-pointer" onClick={() => onSectionChange && onSectionChange("Configuración")}>Configuración</DropdownMenuItem>)}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleCerrarSesion}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}