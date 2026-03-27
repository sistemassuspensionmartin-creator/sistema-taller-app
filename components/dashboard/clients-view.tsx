"use client"

import { useState, useEffect } from "react"
// ATENCIÓN ACÁ: Esta ruta tiene que apuntar a donde guardaste tu archivo de conexión.
// Generalmente es en una carpeta "lib" o "utils" en la raíz de tu proyecto.
import { supabase } from "@/lib/supabase" 

export function ClientesView() {
  const [clientesReal, setClientesReal] = useState<any[]>([])
  const [estado, setEstado] = useState("⏳ Tocando la puerta de Supabase...")

  useEffect(() => {
    async function probarConexion() {
      try {
        // Acá es donde le pedimos a la base de datos que nos traiga la info
        const { data, error } = await supabase.from('clientes').select('*')

        if (error) {
          console.error("El policía de Supabase no nos dejó pasar:", error)
          setEstado("🔴 Error de conexión (Mirá la consola / Inspeccionar)")
        } else {
          console.log("¡Datos recibidos desde Supabase!", data)
          setClientesReal(data || [])
          setEstado("🟢 ¡Conexión 100% exitosa!")
        }
      } catch (err) {
        console.error("Error inesperado:", err)
        setEstado("🔴 Error en el código")
      }
    }

    probarConexion()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Test de Base de Datos 🔌</h2>
      
      <div className="p-4 rounded-lg bg-secondary border border-border">
        <p className="font-mono text-lg font-semibold">{estado}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Cantidad de clientes registrados en la Base de Datos: <span className="font-bold text-foreground">{clientesReal.length}</span>
        </p>
      </div>

      <p className="text-xs text-muted-foreground italic">
        (Si el semáforo está en verde y dice 0 clientes, es correcto porque tu tabla está recién creada y vacía).
      </p>
    </div>
  )
}