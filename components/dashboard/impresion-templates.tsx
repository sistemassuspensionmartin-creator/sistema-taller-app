import React from "react"
import { Wrench } from "lucide-react"

// --- PLANTILLA 1: EL PRESUPUESTO (Para el cliente - Todo unificado y compacto) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-black p-6 font-sans max-w-[210mm] mx-auto">
      {/* HEADER COMPACTO */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-3">
          {/* AQUÍ VA TU LOGO. 
              Si tenés el logo, borrá el <div> de abajo y descomentá esta línea:
              <img src="/logo-taller.png" alt="Logo" className="w-16 h-16 object-contain" />
          */}
          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
            <span className="text-[10px] text-gray-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{datos.config?.nombre_taller || "AUTO TALLER"}</h1>
            <p className="text-xs text-gray-600">{datos.config?.direccion || "Dirección no configurada"}</p>
            <p className="text-xs text-gray-600">Tel: {datos.config?.telefono || "No configurado"}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">Horarios: {datos.config?.horarios || "Lun a Vie 08:00 a 18:00"}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">PRESUPUESTO</h2>
          <p className="text-gray-600 font-mono text-sm mt-0.5">#PRE-{datos.numero_correlativo}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Fecha: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* DATOS DEL CLIENTE Y VEHÍCULO (Más ajustados) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="border border-gray-200 p-3 rounded-lg bg-gray-50/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Datos del Cliente</p>
          <p className="font-bold text-gray-900 text-base leading-tight">{datos.cliente_nombre}</p>
          <p className="text-xs text-gray-600">{datos.cliente_telefono || "Sin teléfono"}</p>
        </div>
        <div className="border border-gray-200 p-3 rounded-lg bg-gray-50/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vehículo Asignado</p>
          <div className="flex items-center gap-2">
            <div className="border-2 border-gray-300 rounded text-center px-2 py-0.5 bg-white">
              <span className="font-mono font-bold text-gray-900 text-sm tracking-widest">{datos.vehiculo_patente}</span>
            </div>
            <div className="text-xs text-gray-600 font-medium">
              {datos.vehiculo_modelo || "Modelo no especificado"}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA UNIFICADA (Servicios y Repuestos juntos) */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Detalle de Trabajos y Repuestos</h3>
        <div className="space-y-1.5">
          {datos.items?.map((item: any, idx: number) => {
            const esRepuesto = item.tipo === 'Repuesto' || item.tipo === 'Neumático';
            const cantidad = parseFloat(item.cantidad || item.cant || 1);
            const precioUnitario = parseFloat(item.precio_unitario || item.precio || 0);
            const subtotalItem = cantidad * precioUnitario;

            return (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {esRepuesto && <span className="text-gray-400 font-normal mr-1">{cantidad}x</span>}
                    {item.detalle}
                  </p>
                </div>
                <p className="font-mono font-medium text-gray-900">${subtotalItem.toLocaleString()}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* FOOTER COMPACTO */}
      <div className="mt-6 pt-4 border-t-2 border-gray-900 flex flex-col items-end">
        <div className="w-[200px]">
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
            <p className="font-bold text-gray-900 text-sm">TOTAL FINAL</p>
            <p className="font-mono font-black text-gray-900 text-lg">${Number(datos.total_final).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-right mt-2 italic">
          * Válido por {datos.validez_dias || 15} días. Los precios de repuestos pueden sufrir variaciones.
        </p>
      </div>
    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Interna - Mismos márgenes compactos) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-black p-6 font-sans max-w-[210mm] mx-auto relative">
      <div className="flex justify-between items-end border-b-2 border-gray-900 pb-3 mb-5">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Orden de Trabajo</h2>
          <p className="text-gray-500 font-mono text-xs mt-0.5">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
        </div>
        <div className="text-right">
          <div className="border-2 border-gray-900 rounded-md text-center px-3 py-1 bg-gray-50">
             <span className="font-mono font-black text-gray-900 text-xl tracking-widest">{datos.vehiculo_patente}</span>
          </div>
        </div>
      </div>

      {datos.observaciones && (
        <div className="mb-5 border-l-4 border-gray-900 pl-3 py-0.5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Observaciones</p>
          <p className="text-gray-900 font-medium text-sm italic">"{datos.observaciones}"</p>
        </div>
      )}

      {/* LISTA SEPARADA SOLO PARA EL MECÁNICO */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100 py-1 px-2 rounded mb-3">Checklist de Tareas</h3>
        <div className="space-y-2 px-1">
          {datos.items?.filter((i:any) => i.tipo !== 'Repuesto' && i.tipo !== 'Neumático').map((srv: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-4 h-4 border-2 border-gray-400 rounded-sm mt-0.5 shrink-0"></div>
              <p className="font-medium text-gray-900 text-sm">{srv.detalle}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100 py-1 px-2 rounded mb-3">Repuestos Requeridos</h3>
        <div className="space-y-1.5 px-1">
          {datos.items?.filter((i:any) => i.tipo === 'Repuesto' || i.tipo === 'Neumático').map((rep: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2 border-b border-gray-100 pb-1 text-sm">
              <span className="font-bold text-gray-900 bg-gray-100 px-1.5 rounded">{rep.cantidad || rep.cant || 1}x</span>
              <p className="font-medium text-gray-700">{rep.detalle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}