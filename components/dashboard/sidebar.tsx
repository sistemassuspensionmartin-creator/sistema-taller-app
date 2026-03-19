"use client"

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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  active?: boolean
}

const navItems: NavItem[] = [
  { label: "Inicio", icon: Home, href: "#", active: true },
  { label: "Clientes", icon: Users, href: "#" },
  { label: "Vehículos", icon: Car, href: "#" },
  { label: "Taller", icon: Wrench, href: "#" },
  { label: "Presupuestos", icon: FileText, href: "#" },
  { label: "Stock/Repuestos", icon: Package, href: "#" },
  { label: "Turnos", icon: Calendar, href: "#" },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeItem, setActiveItem] = useState("Inicio")
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

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
            <div className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/50">
              <span className="text-sm font-medium text-muted-foreground">Logo del Taller</span>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50">
              <span className="text-xs font-medium text-muted-foreground">Logo</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.label

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveItem(item.label)}
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
                onClick={() => setActiveItem(item.label)}
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

          {/* Settings */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <Settings className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-border bg-popover">
                Configuración
              </TooltipContent>
            </Tooltip>
          ) : (
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Settings className="h-5 w-5 shrink-0" />
              <span>Configuración</span>
            </button>
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
