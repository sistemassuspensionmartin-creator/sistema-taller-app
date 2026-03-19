import { Card } from "@/components/ui/card"
import { Car, FileText, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  accentColor?: string
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, accentColor }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}% vs ayer
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            accentColor || "bg-primary/10"
          )}
        >
          <Icon className={cn("h-6 w-6", accentColor ? "text-foreground" : "text-primary")} />
        </div>
      </div>
      
      {/* Decorative gradient */}
      <div 
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
      />
    </Card>
  )
}

export function MetricsCards() {
  const metrics = [
    {
      title: "Vehículos en Taller",
      value: 12,
      subtitle: "4 urgentes",
      icon: Car,
      trend: { value: 8, isPositive: true },
    },
    {
      title: "Presupuestos Pendientes",
      value: 7,
      subtitle: "2 por vencer hoy",
      icon: FileText,
      trend: { value: 12, isPositive: false },
      accentColor: "bg-warning/10",
    },
    {
      title: "Recaudación del Día",
      value: "$845.500",
      subtitle: "15 transacciones",
      icon: DollarSign,
      trend: { value: 23, isPositive: true },
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}
