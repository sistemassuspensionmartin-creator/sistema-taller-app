import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css' 

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'AutoTaller - Sistema de Gestión',
  description: 'Panel de control para la administración de taller mecánico automotriz',
  generator: 'v0.app',
  // ASÍ TIENE QUE QUEDAR:
  icons: {
    icon: '/icon.png',
    apple: '/icon.png', // Usamos el mismo para Apple
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
