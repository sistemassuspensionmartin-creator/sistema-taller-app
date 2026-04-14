"use client"

import { supabase } from "@/lib/supabase"
import { Bell, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function DashboardHeader({ activeSection, onSectionChange }: { activeSection: string, onSectionChange?: (section: string) => void }) {
  
  // FUNCIÓN PARA CERRAR SESIÓN
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    // Recargamos la página para que el "patovica" de page.tsx nos mande al Login
    window.location.reload()
  }

  // FUNCIÓN PARA IR AL PERFIL
  const handleIrAPerfil = () => {
    if (onSectionChange) {
      onSectionChange("Configuración")
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{activeSection}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Panel de Control - Suspensión MARTIN
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-full bg-secondary/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-emerald-100 dark:border-emerald-900">
                <AvatarFallback className="bg-emerald-600 text-white font-bold">SM</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Mi Cuenta</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Sistema de Gestión
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleIrAPerfil}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil y Ajustes</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer font-medium" onClick={handleCerrarSesion}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}