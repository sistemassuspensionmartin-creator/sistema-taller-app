"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null)

  // Estados para Recuperación de Contraseña
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMensaje(null)

    try {
      // @ts-ignore
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("El email o la contraseña son incorrectos.")
        }
        throw error
      }

      if (data.user) {
        onLoginSuccess()
      }
    } catch (error: any) {
      setErrorMensaje(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecuperarPassword = async () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      return alert("Por favor, ingresá un correo electrónico válido.")
    }

    setIsSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      })

      if (error) throw error
      setResetSuccess(true)
    } catch (err: any) {
      alert("Error al enviar correo de recuperación: " + err.message)
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[url('/login-bg.jpg')] bg-cover bg-center">
      
      {/* Capa oscura translúcida */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0"></div>

      <div className="w-full max-w-md z-10 relative animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* Cabecera del Login */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm">
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
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSuccess(false);
                      setIsResetOpen(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
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
        <div className="text-center mt-8 drop-shadow-md">
          <p className="text-xs font-medium text-white/70">
            Sistema de Gestión Integral &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs mt-1 text-white/60">
            Designed by <span className="text-white/90 font-bold tracking-wide">Juan Pablo Martin</span>
          </p>
        </div>
      </div>

      {/* --- MODAL DE RECUPERACIÓN DE CONTRASEÑA --- */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <KeyRound className="w-6 h-6 text-blue-600" /> Restablecer Contraseña
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Ingresá tu correo electrónico y te enviaremos un enlace para que crees una nueva contraseña.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">¡Correo enviado!</h3>
              <p className="text-sm text-slate-600">
                Revisá tu casilla de correo (incluida la carpeta de spam o correo no deseado) y seguí las instrucciones.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</Label>
                <Input 
                  type="email" 
                  placeholder="ejemplo@taller.com" 
                  value={resetEmail} 
                  onChange={(e) => setResetEmail(e.target.value)} 
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetOpen(false)}>
              {resetSuccess ? "Cerrar" : "Cancelar"}
            </Button>
            {!resetSuccess && (
              <Button onClick={handleRecuperarPassword} disabled={isSendingReset} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSendingReset ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enviar Enlace
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}