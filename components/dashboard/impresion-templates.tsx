import React from "react"
import { Wrench } from "lucide-react"

// --- PLANTILLA 1: EL PRESUPUESTO (Para el cliente - Con precios) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="hidden print:block bg-white text-black p-8 font-sans max-w-[210mm] mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
        <div className="flex items-center gap-3">
          {/* Reemplazar con tu logo real (etiqueta <img />) */}
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
            <Wrench className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">AUTO TALLER MÁRQUEZ</h1>
            <p className="text-sm text-gray-500">Av. San Martín 1234, Ciudad</p>
            <p className="text-sm text-gray-500">Tel: +54 9 351 1234567 | info@taller.com</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">PRESUPUESTO</h2>
          <p className="text-gray-500 font-mono mt-1">#PRE-{datos.numero_correlativo}</p>
          <p className="text-sm text-gray-400 mt-1">
            Fecha: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* BENTO BOX: CLIENTE Y VEHÍCULO */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Datos del Cliente</p>
          <p className="font-bold text-gray-900 text-lg">{datos.cliente_nombre}</p>
          <p className="text-sm text-gray-600 mt-1">{datos.cliente_telefono || "Teléfono no registrado"}</p>
        </div>
        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehículo Asignado</p>
          <div className="flex items-center gap-3">
            <div className="border-2 border-gray-300 rounded text-center px-3 py-1 bg-white">
              <span className="font-mono font-bold text-gray-900 text-lg tracking-widest">{datos.vehiculo_patente}</span>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {datos.vehiculo_modelo || "Modelo no especificado"}
            </div>
          </div>
        </div>
      </div>

      {/* SERVICIOS */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Servicios a Realizar</h3>
        <div className="space-y-3">
          {datos.servicios?.map((srv: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{srv.descripcion}</p>
              </div>
              <p className="font-mono font-medium text-gray-900">${Number(srv.precio).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* REPUESTOS (Unificados) */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Repuestos y Materiales</h3>
        <div className="space-y-3">
          {datos.repuestos?.map((rep: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900"><span className="text-gray-400 mr-2">{rep.cantidad}x</span> {rep.descripcion}</p>
              </div>
              <p className="font-mono font-medium text-gray-900">${Number(rep.precio_total).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER Y TOTAL */}
      <div className="mt-12 pt-6 border-t-2 border-gray-900 flex justify-end">
        <div className="w-1/2">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-500 font-medium">Subtotal</p>
            <p className="font-mono text-gray-600">${Number(datos.total_final).toLocaleString()}</p>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <p className="font-bold text-gray-900 text-lg">TOTAL FINAL</p>
            <p className="font-mono font-black text-gray-900 text-xl">${Number(datos.total_final).toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-400 text-right mt-4 italic">
            * Presupuesto válido por 15 días. Los precios de los repuestos pueden sufrir variaciones.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Para el taller - Sin precios) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="hidden print:block bg-white text-black p-8 font-sans max-w-[210mm] mx-auto relative">
      
      {/* Marca de agua sutil para uso interno */}
      <div className="absolute top-10 right-10 border-2 border-gray-300 text-gray-300 font-bold uppercase tracking-widest px-4 py-1 rounded opacity-50 transform rotate-12">
        Uso Interno
      </div>

      {/* HEADER SIMPLIFICADO */}
      <div className="flex justify-between items-end border-b-4 border-gray-900 pb-4 mb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Orden de Trabajo</h2>
          <p className="text-gray-500 font-mono mt-1">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
        </div>
        <div className="text-right">
          <div className="border-2 border-gray-900 rounded-md text-center px-4 py-2 bg-gray-50">
             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Patente</p>
             <span className="font-mono font-black text-gray-900 text-2xl tracking-widest">{datos.vehiculo_patente}</span>
          </div>
        </div>
      </div>

      {/* OBSERVACIONES (Alerta de Diagnóstico) */}
      {datos.observaciones && (
        <div className="mb-8 border-l-4 border-gray-900 pl-4 py-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Observaciones / Problema Reportado</p>
          <p className="text-gray-900 font-medium text-lg italic">"{datos.observaciones}"</p>
        </div>
      )}

      {/* CHECKLIST DE TAREAS */}
      <div className="mb-10">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider bg-gray-100 py-2 px-3 rounded mb-4">
          Checklist de Tareas
        </h3>
        <div className="space-y-4 px-2">
          {datos.servicios?.map((srv: any, idx: number) => (
            <div key={idx} className="flex items-start gap-4">
              {/* Cuadradito para hacer el tilde con lapicera */}
              <div className="w-5 h-5 border-2 border-gray-400 rounded-sm mt-0.5 shrink-0"></div>
              <p className="font-medium text-gray-900 text-lg leading-tight">{srv.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LISTA PLANA DE REPUESTOS PARA EL MECÁNICO */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider bg-gray-100 py-2 px-3 rounded mb-4">
          Lista de Repuestos y Materiales Requeridos
        </h3>
        <div className="space-y-3 px-2">
          {datos.repuestos?.map((rep: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-900 bg-gray-100 px-2 rounded">{rep.cantidad}x</span>
              <p className="font-medium text-gray-700">{rep.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}