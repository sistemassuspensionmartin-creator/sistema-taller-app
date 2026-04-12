"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMensaje(null)

    try {
      // Intentamos iniciar sesión con Supabase
      // @ts-ignore
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Traducimos los errores comunes
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("El email o la contraseña son incorrectos.")
        }
        throw error
      }

      if (data.user) {
        // ¡Éxito! Le avisamos a la página principal que deje pasar al usuario
        onLoginSuccess()
      }
    } catch (error: any) {
      setErrorMensaje(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo con diseño sutil */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Cabecera del Login */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm">
              {/* Cambiá esta ruta si tu logo está en otro lado */}
              <img src="/icon.png" alt="Logo" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Suspensión MARTIN</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Ingresá tus credenciales para acceder</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="px-8 pb-10 space-y-6">
            
            {errorMensaje && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-sm font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{errorMensaje}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email de Usuario</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-300" />
                  <Input 
                    type="email" 
                    placeholder="ejemplo@taller.com" 
                    className="pl-10 h-12 bg-slate-50/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-300" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-slate-50/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Iniciar Sesión <ShieldCheck className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </form>

        </div>

        {/* Pie de página */}
        <p className="text-center text-xs font-medium text-slate-400 mt-8">
          Sistema de Gestión Integral &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}