import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { WorkOrdersTable } from "@/components/dashboard/work-orders-table"
import { ThemeProvider } from "@/components/theme-provider"

export default function DashboardPage() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <DashboardHeader />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Metrics Cards */}
              <section>
                <MetricsCards />
              </section>

              {/* Work Orders Table */}
              <section>
                <WorkOrdersTable />
              </section>
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
