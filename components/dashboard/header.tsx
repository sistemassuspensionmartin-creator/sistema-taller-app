"use client"

import { supabase } from "@/lib/supabase"
import { Bell, Search, User } from "lucide-react"
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

export function DashboardHeader({ 
  activeSection, 
  onSectionChange,
  userRole // <-- RECIBIMOS EL ROL
}: { 
  activeSection?: string, 
  onSectionChange?: (section: string) => void,
  userRole?: string | null // <-- LO DEFINIMOS ACÁ
}) {
  
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // --- LÓGICA PARA NOMBRES E INICIALES SEGÚN ROL ---
  const nombreMostrado = userRole === 'admin' ? 'Administrador' : 
                         userRole === 'mecanico' ? 'Mecánico' : 
                         userRole === 'cajero' ? 'Ventas / Caja' : 'Usuario';
                         
  const iniciales = userRole === 'admin' ? 'AD' : 
                    userRole === 'mecanico' ? 'ME' : 
                    userRole === 'cajero' ? 'CA' : 'US';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left section - Page title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">{activeSection || "Panel de Control"}</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de vuelta, {nombreMostrado.toLowerCase()}
        </p>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 bg-secondary border-border pl-9"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {iniciales} {/* <-- INICIALES DINÁMICAS */}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">{nombreMostrado}</p> {/* <-- NOMBRE DINÁMICO */}
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
            
            {/* Escondemos el botón de Configuración en el menú desplegable si no es admin */}
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