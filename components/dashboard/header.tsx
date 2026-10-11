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
import { useState, useEffect } from "react"

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

  // FUNCIÓN ANTI-ECO: Comprueba si la acción fue ejecutada por esta misma computadora
  const esAccionPropia = (clave: string) => {
    try {
      const raw = localStorage.getItem("mi_accion_reciente");
      if (!raw) return false;
      const data = JSON.parse(raw);
      const pasoMenosDe4Seg = (Date.now() - data.t) < 4000;
      if (pasoMenosDe4Seg && (data.clave === clave || data.patente === clave)) {
        return true;
      }
    } catch (e) {}
    return false;
  };

  useEffect(() => {
    if (!userRole) return;

    const reproducirSonido = (archivoAudio: string) => {
      try {
        const audio = new Audio(archivoAudio); 
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => console.log("Audio bloqueado por directiva del navegador"));
        }
      } catch (error) {}
      setCampanaSuena(true);
      setTimeout(() => setCampanaSuena(false), 3000);
    };

    const agregarNotif = (nuevaNotif: any) => {
      setNotificaciones(prev => {
        const existe = prev.find(n => n.referencia_id === nuevaNotif.referencia_id && n.tipo === nuevaNotif.tipo && n.titulo === nuevaNotif.titulo);
        if (existe) return prev;
        return [nuevaNotif, ...prev];
      });
    };

    // --- CANAL 1: MONITOREO DEL TALLER (ordenes_trabajo) ---
    const canalTaller = supabase.channel('notif-taller-' + (userRole || 'user'))
      // EVENTO A: OFICINA ➔ TALLER (Nuevo auto ingresado al taller)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ordenes_trabajo' }, (payload: any) => {
        if (userRole === 'mecanico') {
          if (esAccionPropia(payload.new.vehiculo_patente)) return; // Cero eco

          reproducirSonido('/listo.mp3'); // Campana en taller
          agregarNotif({
            id: Date.now().toString(),
            referencia_id: payload.new.presupuesto_id || payload.new.id,
            tipo: 'taller',
            patente: payload.new.vehiculo_patente,
            titulo: 'Nuevo Auto en Taller',
            mensaje: `Administración ingresó el vehículo ${payload.new.vehiculo_patente} (${payload.new.cliente_nombre}).`,
            hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
            icono: 'Car',
            color: 'text-blue-600 dark:text-blue-400'
          });
        }
      })
      // EVENTO B: TALLER ➔ OFICINA (Mecánico pasa un auto a Terminado)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ordenes_trabajo' }, (payload: any) => {
        if (userRole !== 'mecanico') {
          if (payload.new.estado === 'Terminado' && payload.old.estado !== 'Terminado') {
            if (esAccionPropia(payload.new.vehiculo_patente)) return; // Cero eco

            reproducirSonido('/listo.mp3'); // Sonido listo en oficina
            agregarNotif({
              id: Date.now().toString(),
              referencia_id: payload.new.presupuesto_id || payload.new.id, 
              tipo: 'taller',
              patente: payload.new.vehiculo_patente,
              titulo: 'Vehículo Terminado',
              mensaje: `El vehículo ${payload.new.vehiculo_patente} ya fue marcado como listo en el taller.`,
              hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
              icono: 'Car',
              color: 'text-emerald-600 dark:text-emerald-400'
            });
          }
        }
      }).subscribe();

    // --- CANAL 2: MONITOREO DE PRESUPUESTOS (presupuestos) ---
    const canalPresupuestos = supabase.channel('notif-presupuestos-' + (userRole || 'user'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'presupuestos' }, (payload: any) => {
        // Alerta para oficina cuando el mecánico crea un diagnóstico nuevo
        if (userRole !== 'mecanico' && payload.new.modificado_por_rol === 'mecanico') {
          if (esAccionPropia(payload.new.id)) return; // Cero eco

          reproducirSonido('/ding.mp3');
          const autor = payload.new.modificado_por_nombre || 'Un mecánico';
          
          agregarNotif({
            id: Date.now().toString(),
            referencia_id: payload.new.id,
            tipo: 'presupuesto',
            titulo: 'Nuevo Diagnóstico',
            mensaje: `${autor} creó un diagnóstico para la patente ${payload.new.vehiculo_patente}.`,
            hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
            icono: 'FileText',
            color: 'text-blue-600 dark:text-blue-400'
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload: any) => {
        
        // COMPORTAMIENTO A: TALLER ➔ OFICINA (Mecánico solicita modificar presupuesto de auto en taller)
        if (userRole !== 'mecanico') {
          if (payload.new.modificado_por_rol === 'mecanico') {
            if (payload.new.visto_admin === true && payload.old.visto_admin === false) return;
            if (esAccionPropia(payload.new.id)) return; // Cero eco

            reproducirSonido('/ding.mp3');
            const autor = payload.new.modificado_por_nombre || 'El mecánico';

            agregarNotif({
              id: Date.now().toString() + Math.random(),
              referencia_id: payload.new.id,
              tipo: 'presupuesto',
              titulo: 'Solicitud de Modificación',
              mensaje: `${autor} solicitó modificar el presupuesto PRE-${payload.new.numero_correlativo || 'S/N'} (${payload.new.vehiculo_patente}).`,
              hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
              icono: 'Pencil',
              color: 'text-orange-600 dark:text-orange-400'
            });
          }
        }
        
        // COMPORTAMIENTO B: OFICINA ➔ TALLER (Oficina modifica presupuesto de auto que está en el taller)
        else if (userRole === 'mecanico') {
          if (payload.new.modificado_por_rol !== 'mecanico' && payload.new.ingresado_al_taller === true) {
            if (esAccionPropia(payload.new.id)) return; // Cero eco

            reproducirSonido('/ding.mp3');
            const autor = payload.new.modificado_por_nombre || 'Administración';

            agregarNotif({
              id: Date.now().toString() + Math.random(),
              referencia_id: payload.new.id,
              tipo: 'presupuesto',
              titulo: 'Presupuesto Modificado',
              mensaje: `${autor} actualizó el presupuesto del auto ${payload.new.vehiculo_patente} en taller.`,
              hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
              icono: 'Pencil',
              color: 'text-rose-600 dark:text-rose-400'
            });
          }
        }

      }).subscribe();

    return () => {
      supabase.removeChannel(canalTaller);
      supabase.removeChannel(canalPresupuestos);
    }
  }, [userRole]);

  const handleCerrarSesion = async () => {
    await (supabase.auth as any).signOut()
    window.location.reload()
  }

  const descartarNotificacion = (id: string, e: any) => {
    e.stopPropagation(); 
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }

  const ejecutarAccionNotificacion = (notif: any) => {
    setNotificaciones(prev => prev.filter(n => n.id !== notif.id));
    
    if (notif.tipo === 'taller') {
      if (notif.patente) {
        localStorage.setItem("filtro_taller_patente", notif.patente);
        // Emisión en vivo para filtrado inmediato sin importar si ya estaba montado
        window.dispatchEvent(new CustomEvent("filtrar_patente", { detail: notif.patente }));
      }
      if (onSectionChange) onSectionChange("Taller");
    } else if (notif.tipo === 'presupuesto') {
      if (onSectionChange) onSectionChange("Presupuestos");
      setTimeout(() => {
        if (onNavigateToPresupuesto) onNavigateToPresupuesto(notif.referencia_id);
      }, 100);
    }
  }

  const renderIcono = (iconoStr: string) => {
    if (iconoStr === 'Car') return <Car className="h-4 w-4" />;
    if (iconoStr === 'FileText') return <FileText className="h-4 w-4" />;
    if (iconoStr === 'Pencil') return <Pencil className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
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
              {notificaciones.length > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{notificaciones.length} nuevas</span>}
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center"><CheckCircle2 className="h-8 w-8 mb-2 opacity-20" /><p>Todo al día. No hay novedades.</p></div>
              ) : (
                notificaciones.map((notif) => (
                  <div key={notif.id} className="p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div className={`flex items-center gap-2 font-bold text-sm ${notif.color}`}>{renderIcono(notif.icono)} {notif.titulo}</div>
                      <span className="text-xs text-muted-foreground">{notif.hora}</span>
                    </div>
                    <p className="text-sm text-foreground leading-snug">{notif.mensaje}</p>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" onClick={() => ejecutarAccionNotificacion(notif)} className={`flex-1 h-8 text-white text-xs shadow-sm ${notif.tipo === 'taller' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Ver en Pantalla <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => descartarNotificacion(notif.id, e)} className="h-8 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50">Ocultar</Button>
                    </div>
                  </div>
                ))
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