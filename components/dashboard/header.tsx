"use client"

import { supabase } from "@/lib/supabase" // <-- AGREGAMOS SUPABASE
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

// <-- AGREGAMOS LAS PROPIEDADES PARA EL TÍTULO Y EL CAMBIO DE SECCIÓN
export function DashboardHeader({ 
  activeSection, 
  onSectionChange 
}: { 
  activeSection?: string, 
  onSectionChange?: (section: string) => void 
}) {
  
  // <-- LÓGICA DE CIERRE DE SESIÓN
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // <-- LÓGICA PARA IR A CONFIGURACIÓN
  const handleIrAPerfil = () => {
    if (onSectionChange) {
      onSectionChange("Configuración")
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left section - Page title */}
      <div>
        {/* Usamos activeSection para que el título cambie, pero mantenemos tu diseño */}
        <h1 className="text-xl font-semibold text-foreground">{activeSection || "Panel de Control"}</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de vuelta, administrador
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
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">Notificaciones</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-secondary"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
            <DropdownMenuLabel className="text-foreground">Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            
            {/* <-- LE CONECTAMOS EL onClick A TUS BOTONES --> */}
            <DropdownMenuItem className="cursor-pointer" onClick={handleIrAPerfil}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleIrAPerfil}>
              Configuración
            </DropdownMenuItem>
            
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