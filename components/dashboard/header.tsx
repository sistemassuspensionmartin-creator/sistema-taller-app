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
  onNavigateToPresupuesto 
}: { 
  activeSection?: string, 
  onSectionChange?: (section: string) => void,
  userRole?: string | null,
  onNavigateToPresupuesto?: (id: string) => void 
}) {
  
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [campanaSuena, setCampanaSuena] = useState(false)

  // --- ESCUCHA EN VIVO DE SUPABASE (REALTIME) ---
  useEffect(() => {
    // Al mecánico no le avisamos nada, su trabajo es generar los cambios.
    if (userRole === 'mecanico' || !userRole) return;

    const reproducirSonido = () => {
      try {
        const audio = new Audio('/ding.mp3'); 
        audio.play().catch(e => console.log("Navegador bloqueó el sonido", e));
      } catch (error) {}
      setCampanaSuena(true);
      setTimeout(() => setCampanaSuena(false), 3000);
    };

    const agregarNotif = (nuevaNotif: any) => {
      setNotificaciones(prev => {
        const existe = prev.find(n => n.referencia_id === nuevaNotif.referencia_id && n.tipo === nuevaNotif.tipo);
        if (existe) return prev;
        return [nuevaNotif, ...prev];
      });
    };

    // CANAL 1: TALLER (Vehículos Terminados)
    const canalTaller = supabase.channel('notif-taller')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ordenes_trabajo' }, (payload) => {
        if (payload.new.estado === 'Terminado' && payload.old.estado !== 'Terminado') {
          reproducirSonido();
          agregarNotif({
            id: Date.now().toString(),
            referencia_id: payload.new.presupuesto_id || payload.new.id, 
            tipo: 'taller',
            titulo: 'Vehículo Terminado',
            mensaje: `El vehículo ${payload.new.vehiculo_patente} (${payload.new.cliente_nombre}) ya fue marcado como listo en el taller.`,
            hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
            icono: 'Car',
            color: 'text-emerald-600 dark:text-emerald-400'
          });
        }
      }).subscribe();

    // CANAL 2: PRESUPUESTOS Y DIAGNÓSTICOS
    const canalPresupuestos = supabase.channel('notif-presupuestos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'presupuestos' }, (payload) => {
        // MAGIA: Solo suena la campana si el que apretó Guardar era un Mecánico
        if (payload.new.modificado_por_rol !== 'mecanico') return;

        reproducirSonido();
        agregarNotif({
          id: Date.now().toString(),
          referencia_id: payload.new.id,
          tipo: 'presupuesto',
          titulo: 'Nuevo Diagnóstico Creado',
          mensaje: `Un mecánico ha creado un nuevo diagnóstico para la patente ${payload.new.vehiculo_patente}.`,
          hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
          icono: 'FileText',
          color: 'text-blue-600 dark:text-blue-400'
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload) => {
        // MAGIA: Solo suena la campana si el que apretó Guardar era un Mecánico
        if (payload.new.modificado_por_rol !== 'mecanico') return;

        if (payload.new.total_final !== payload.old.total_final || payload.new.updated_at !== payload.old.updated_at) {
          reproducirSonido();
          agregarNotif({
            id: Date.now().toString() + Math.random(),
            referencia_id: payload.new.id,
            tipo: 'presupuesto',
            titulo: 'Diagnóstico Modificado',
            mensaje: `Un mecánico ha modificado el diagnóstico PRE-${payload.new.numero_correlativo || 'S/N'} (${payload.new.vehiculo_patente}).`,
            hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }),
            icono: 'Pencil',
            color: 'text-orange-600 dark:text-orange-400'
          });
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(canalTaller);
      supabase.removeChannel(canalPresupuestos);
    }
  }, [userRole]);

  // Funciones de acción
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const descartarNotificacion = (id: string, e: any) => {
    e.stopPropagation(); 
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }

  const ejecutarAccionNotificacion = (notif: any) => {
    setNotificaciones(prev => prev.filter(n => n.id !== notif.id));
    
    if (notif.tipo === 'taller') {
      if (onSectionChange) onSectionChange("Taller");
    } else if (notif.tipo === 'presupuesto') {
      if (onNavigateToPresupuesto) onNavigateToPresupuesto(notif.referencia_id);
    }
  }

  const renderIcono = (iconoStr: string) => {
    if (iconoStr === 'Car') return <Car className="h-4 w-4" />;
    if (iconoStr === 'FileText') return <FileText className="h-4 w-4" />;
    if (iconoStr === 'Pencil') return <Pencil className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  }

  const nombreMostrado = userRole === 'admin' ? 'Administrador' : 
                         userRole === 'mecanico' ? 'Mecánico' : 
                         userRole === 'cajero' ? 'Ventas / Caja' : 'Usuario';
                         
  const iniciales = userRole === 'admin' ? 'AD' : 
                    userRole === 'mecanico' ? 'ME' : 
                    userRole === 'cajero' ? 'CA' : 'US';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{activeSection || "Panel de Control"}</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de vuelta, {nombreMostrado.toLowerCase()}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 bg-secondary border-border pl-9"
          />
        </div>

        {/* --- CAMPANITA DE NOTIFICACIONES --- */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`relative text-muted-foreground hover:bg-secondary hover:text-foreground transition-all ${campanaSuena ? 'animate-bounce text-emerald-600' : ''}`}
            >
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
              <span className="font-bold text-sm text-foreground">Notificaciones del Sistema</span>
              {notificaciones.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{notificaciones.length} nuevas</span>
              )}
            </div>
            
            <div className="max-h-[350px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                  <p>Todo al día. No hay novedades.</p>
                </div>
              ) : (
                notificaciones.map((notif) => (
                  <div key={notif.id} className="p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div className={`flex items-center gap-2 font-bold text-sm ${notif.color}`}>
                        {renderIcono(notif.icono)} {notif.titulo}
                      </div>
                      <span className="text-xs text-muted-foreground">{notif.hora}</span>
                    </div>
                    
                    <p className="text-sm text-foreground leading-snug">
                      {notif.mensaje}
                    </p>
                    
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" onClick={() => ejecutarAccionNotificacion(notif)} className={`flex-1 h-8 text-white text-xs shadow-sm ${notif.tipo === 'taller' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Abrir Documento <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => descartarNotificacion(notif.id, e)} className="h-8 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        Ocultar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {iniciales}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">{nombreMostrado}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
            <DropdownMenuLabel className="text-foreground">Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            
            <DropdownMenuItem className="cursor-pointer" onClick={() => onSectionChange && onSectionChange("Perfil")}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            
            {userRole === 'admin' && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => onSectionChange && onSectionChange("Configuración")}>
                Configuración
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleCerrarSesion}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}