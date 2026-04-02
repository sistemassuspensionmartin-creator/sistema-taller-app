import React from "react"
import { Car, User, Palette, Gauge, Calendar, Tag } from "lucide-react"

// --- PLANTILLA 1: EL PRESUPUESTO (Estructura compacta original + Colores Premium) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-800 p-6 font-sans max-w-[210mm] mx-auto border-t-[8px] border-emerald-600">
      {/* HEADER COMPACTO CON COLOR */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-emerald-900">{datos.config?.nombre_taller || "AUTO TALLER"}</h1>
            <p className="text-xs text-slate-600 font-medium">{datos.config?.direccion || "Dirección no configurada"}</p>
            <p className="text-xs text-slate-600 font-medium">Tel: {datos.config?.telefono || "No configurado"}</p>
            <p className="text-[10px] font-bold text-emerald-700 mt-0.5 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">
              Horarios: {datos.config?.horarios || "Lun a Vie 08:00 a 18:00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">PRESUPUESTO</h2>
          <p className="text-emerald-700 font-mono text-sm font-bold mt-0.5">#PRE-{datos.numero_correlativo}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Fecha: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* DATOS DEL CLIENTE Y VEHÍCULO ORIGINALES */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
          <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Datos del Cliente</p>
          <p className="font-bold text-slate-900 text-base leading-tight">{datos.cliente_nombre}</p>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">{datos.cliente_telefono || "Sin teléfono"}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
          <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Vehículo Asignado</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="border border-slate-300 rounded text-center px-2 py-0.5 bg-white shadow-sm">
              <span className="font-mono font-bold text-slate-900 text-sm tracking-widest">{datos.vehiculo_patente}</span>
            </div>
            <div className="text-xs text-slate-600 font-semibold">
              {datos.vehiculo_modelo || "Modelo no especificado"}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA UNIFICADA COMPACTA */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">Detalle de Trabajos y Repuestos</h3>
        <div className="space-y-1.5">
          {datos.items?.map((item: any, idx: number) => {
            const esRepuesto = item.tipo === 'Repuesto' || item.tipo === 'Neumático';
            const cantidad = parseFloat(item.cantidad || item.cant || 1);
            const precioUnitario = parseFloat(item.precio_unitario || item.precio || 0);
            const subtotalItem = cantidad * precioUnitario;

            return (
              <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-50 pb-1">
                <div className="flex items-start">
                  {esRepuesto && <span className="font-mono font-bold text-emerald-600 w-6 shrink-0 text-xs mt-0.5">{cantidad}x</span>}
                  <p className="font-medium text-slate-800">{item.detalle}</p>
                </div>
                <p className="font-mono font-medium text-slate-900 shrink-0">${subtotalItem.toLocaleString()}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* FOOTER COMPACTO */}
      <div className="mt-6 pt-4 border-t border-slate-300 flex flex-col items-end">
        <div className="w-[200px]">
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="font-bold text-slate-900 text-sm">TOTAL FINAL</p>
            <p className="font-mono font-black text-emerald-700 text-lg">${Number(datos.total_final).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-right mt-2 italic font-medium">
          * Válido por {datos.validez_dias || 15} días. Los precios de repuestos pueden sufrir variaciones.
        </p>
      </div>
    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Diseño Media Hoja, Fino y Ficha Técnica) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-900 p-6 font-sans max-w-[210mm] mx-auto relative">
      
      {/* HEADER ULTRA COMPACTO (Solo Logo y Nro) */}
      <div className="flex justify-between items-center pb-4 mb-4">
        <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
          <span className="text-[10px] text-slate-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Orden de Trabajo</h2>
          <p className="text-slate-600 font-mono text-base font-bold">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Ingreso: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      {/* FICHA TÉCNICA (Estilo Imagen 2 + Patente) */}
      <div className="border border-slate-200 rounded-xl mb-5 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Car className="w-4 h-4" />
            <span>Ficha Técnica y Cliente</span>
          </div>
          <div className="border border-slate-400 rounded px-2 py-0.5 bg-white shadow-sm">
            <span className="font-mono font-black text-slate-900 text-sm tracking-widest">{datos.vehiculo_patente}</span>
          </div>
        </div>
        
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-sm">
          {/* Marca */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Marca</span>
            <span className="font-semibold text-slate-900">{datos.vehiculo_marca || "-"}</span>
          </div>
          {/* Modelo */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Modelo</span>
            <span className="font-semibold text-slate-900">{datos.vehiculo_modelo_solo || "-"}</span>
          </div>
          {/* Tipo (Opcional) */}
          {datos.vehiculo_tipo && (
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Tag className="w-3 h-3"/> Tipo</span>
              <span className="font-semibold text-slate-900">{datos.vehiculo_tipo}</span>
            </div>
          )}
          {/* Año (Opcional) */}
          {datos.vehiculo_anio && (
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> Año</span>
              <span className="font-semibold text-slate-900">{datos.vehiculo_anio}</span>
            </div>
          )}
          {/* Color (Opcional) */}
          {datos.vehiculo_color && (
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Palette className="w-3 h-3"/> Color</span>
              <span className="font-semibold text-slate-900">{datos.vehiculo_color}</span>
            </div>
          )}
          {/* KM (Opcional) */}
          {datos.vehiculo_kilometros && (
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Gauge className="w-3 h-3"/> Kilometraje</span>
              <span className="font-semibold text-slate-900">{datos.vehiculo_kilometros} km</span>
            </div>
          )}
          {/* Cliente (Siempre presente) */}
          <div className="col-span-2 md:col-span-3 mt-1 border-t border-slate-100 pt-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><User className="w-3 h-3"/> Cliente</span>
            <span className="font-semibold text-slate-900">{datos.cliente_nombre}</span>
          </div>
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      {datos.notas_internas && (
        <div className="mb-5 border-l-4 border-amber-400 pl-3 py-1.5 bg-amber-50 rounded-r-lg">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Notas Internas</p>
          <p className="text-slate-900 font-medium text-sm italic">"{datos.notas_internas}"</p>
        </div>
      )}

      {/* TAREAS A REALIZAR */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">Tareas a Realizar</h3>
        <div className="space-y-2 px-1">
          {datos.items?.filter((i:any) => i.tipo !== 'Repuesto' && i.tipo !== 'Neumático').map((srv: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-1.5">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 border border-slate-400 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{srv.detalle}</p>
              </div>
              <div className="font-bold text-slate-400 text-sm shrink-0">{srv.cantidad || srv.cant || 1}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* REPUESTOS */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">Repuestos Requeridos</h3>
        <div className="space-y-2 px-1">
          {datos.items?.filter((i:any) => i.tipo === 'Repuesto' || i.tipo === 'Neumático').map((rep: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-1.5">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 border border-slate-400 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-semibold text-slate-700 text-sm leading-tight">{rep.detalle}</p>
              </div>
              <div className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs shrink-0">
                {rep.cantidad || rep.cant || 1}x
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}