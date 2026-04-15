"use client"

import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Car,
  Wrench,
  FileText,
  Package,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  DollarSign,
  BookOpen,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// 1. AGREGAMOS EL ARRAY DE ROLES A LA INTERFAZ
interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  active?: boolean
  roles: string[] 
}

// 2. DEFINIMOS QUÉ ROLES VEN QUÉ COSA
const navItems: NavItem[] = [
  { label: "Inicio", icon: Home, href: "#", active: true, roles: ["admin", "cajero", "mecanico"] },
  { label: "Turnos", icon: Calendar, href: "#", roles: ["admin", "cajero", "mecanico"] },
  { label: "Vehículos", icon: Car, href: "#", roles: ["admin", "cajero", "mecanico"] },
  { label: "Taller", icon: Wrench, href: "#", roles: ["admin", "mecanico"] },
  { label: "Stock/Repuestos", icon: Package, href: "#", roles: ["admin", "mecanico", "cajero"] },
  { label: "Clientes", icon: Users, href: "#", roles: ["admin", "cajero"] },
  { label: "Presupuestos", icon: FileText, href: "#", roles: ["admin", "cajero"] },
  { label: "Cuentas Corrientes", icon: BookOpen, href: "#", roles: ["admin", "cajero"] },
  { label: "Caja", icon: DollarSign, href: "#", roles: ["admin", "cajero"] },
  { label: "Estadísticas", icon: BarChart3, href: "#", roles: ["admin"] },
]

// 3. AGREGAMOS EL userRole A LAS PROPS DEL COMPONENTE
interface DashboardSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  userRole: string | null 
}

export function DashboardSidebar({ activeSection, onSectionChange, userRole }: DashboardSidebarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase.from('configuracion').select('logo_url').single()
      if (data?.logo_url) setLogoUrl(data.logo_url)
    }
    fetchLogo()
  }, [])
  
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // 4. MAGIA: FILTRAMOS LOS BOTONES SEGÚN EL ROL
  const allowedNavItems = navItems.filter(item => userRole ? item.roles.includes(userRole) : false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo Box */}
        <div className="flex h-20 items-center justify-center border-b border-border px-4">
          {!collapsed ? (
            /* --- MENÚ ABIERTO --- */
            logoUrl ? (
              <div className="flex h-14 w-full items-center justify-center rounded-lg bg-white dark:bg-slate-900 p-1 border border-border shadow-sm">
                <img src={logoUrl} alt="Logo Taller" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/50">
                <span className="text-sm font-medium text-muted-foreground">Logo del Taller</span>
              </div>
            )
          ) : (
            /* --- MENÚ COLAPSADO --- */
            logoUrl ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 p-1 border border-border shadow-sm">
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50">
                <span className="text-xs font-medium text-muted-foreground">Logo</span>
              </div>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {/* 5. USAMOS allowedNavItems EN LUGAR DE navItems */}
          {allowedNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.label

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSectionChange(item.label)}
                      className={cn(
                        "flex w-full items-center justify-center rounded-lg p-2.5 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-border bg-popover">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <button
                key={item.label}
                onClick={() => onSectionChange(item.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          {/* Theme Toggle */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {mounted && theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-border bg-popover">
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5 shrink-0" />
              ) : (
                <Moon className="h-5 w-5 shrink-0" />
              )}
              <span>{mounted && theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            </button>
          )}

          {/* Settings - SOLO VISIBLE PARA ADMIN */}
          {userRole === "admin" && (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => onSectionChange("Configuración")}
                    className="flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-border bg-popover">
                  Configuración
                </TooltipContent>
              </Tooltip>
            ) : (
              <button 
                onClick={() => onSectionChange("Configuración")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span>Configuración</span>
              </button>
            )
          )}

          {/* Collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "mt-2 w-full justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "px-0"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}