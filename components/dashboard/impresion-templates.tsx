import React from "react"
import { Car, User, Palette, Gauge } from "lucide-react"

// --- PLANTILLA 1: EL PRESUPUESTO (Para el cliente - Diseño "SaaS Premium" con color) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    // Borde superior color esmeralda (se imprime gris oscuro en B/N)
    <div className="bg-white text-slate-800 p-8 font-sans max-w-[210mm] mx-auto border-t-[12px] border-emerald-600 relative">
      
      {/* HEADER MODERNO */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6 mt-2">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-emerald-900">{datos.config?.nombre_taller || "AUTO TALLER"}</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">{datos.config?.direccion || "Dirección no configurada"}</p>
            <p className="text-sm text-slate-500 font-medium">Tel: {datos.config?.telefono || "No configurado"}</p>
            <p className="text-xs font-bold text-emerald-700 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded">
              Horarios: {datos.config?.horarios || "Lun a Vie 08:00 a 18:00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">PRESUPUESTO</h2>
          <p className="text-emerald-700 font-mono text-base font-bold mt-1">#PRE-{datos.numero_correlativo}</p>
          <p className="text-sm text-slate-400 font-medium mt-1">
            Fecha: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* BENTO BOX (Cliente y Vehículo) */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
          <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mb-1.5">Cliente</p>
          <p className="font-bold text-slate-900 text-lg leading-tight">{datos.cliente_nombre}</p>
          <p className="text-sm text-slate-500 font-medium mt-0.5">{datos.cliente_telefono || "Sin teléfono registrado"}</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
          <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mb-1.5">Vehículo</p>
          <div className="flex items-center gap-3">
            <div className="border-2 border-slate-300 rounded text-center px-2 py-0.5 bg-white shadow-sm">
              <span className="font-mono font-black text-slate-900 text-base tracking-widest">{datos.vehiculo_patente}</span>
            </div>
            <div className="text-sm text-slate-600 font-semibold">
              {datos.vehiculo_modelo || "Modelo no especificado"}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE TRABAJOS Y REPUESTOS */}
      <div className="mb-8">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-4">
          Detalle del Presupuesto
        </h3>
        <div className="space-y-3">
          {datos.items?.map((item: any, idx: number) => {
            const cantidad = parseFloat(item.cantidad || item.cant || 1);
            const precioUnitario = parseFloat(item.precio_unitario || item.precio || 0);
            const subtotalItem = cantidad * precioUnitario;

            return (
              <div key={idx} className="flex justify-between items-start text-base border-b border-slate-50 pb-2">
                <div className="flex items-start">
                  <span className="font-mono font-bold text-emerald-600 w-8 shrink-0">{cantidad}x</span>
                  <p className="font-semibold text-slate-800">{item.detalle}</p>
                </div>
                <p className="font-mono font-bold text-slate-900 shrink-0">${subtotalItem.toLocaleString()}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* TOTALES (Caja destacada) */}
      <div className="mt-8 flex flex-col items-end">
        <div className="w-[280px]">
          <div className="flex justify-between items-center bg-emerald-600 p-4 rounded-xl shadow-md text-white">
            <p className="font-bold text-sm tracking-wide">TOTAL FINAL</p>
            <p className="font-mono font-black text-2xl">${Number(datos.total_final).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium text-right mt-3">
          * Presupuesto válido por {datos.validez_dias || 15} días.<br/>Los precios de los repuestos pueden sufrir variaciones.
        </p>
      </div>
    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Interna - Fuerte, Grande y Minimalista) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-black p-8 font-sans max-w-[210mm] mx-auto relative">
      
      {/* HEADER (Solo Logo gigante y Nro de Orden) */}
      <div className="flex justify-between items-center border-b-4 border-gray-900 pb-6 mb-6">
        <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-gray-200">
          {/* Reemplazá este span por tu <img> cuando tengas el logo */}
          <span className="text-sm text-gray-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Orden de Trabajo</h2>
          <p className="text-gray-500 font-mono text-xl mt-1">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
          <p className="text-sm font-bold text-gray-400 mt-2">
            Ingreso: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* FICHA DEL VEHÍCULO (Con Íconos y sin líneas vacías) */}
      <div className="border-4 border-gray-900 p-5 rounded-2xl bg-gray-50 mb-8">
        <div className="flex justify-between items-center mb-6">
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Identificación del Vehículo</p>
            <div className="border-4 border-gray-900 rounded-lg text-center px-4 py-1 bg-white">
              <span className="font-mono font-black text-gray-900 text-3xl tracking-widest">{datos.vehiculo_patente}</span>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-x-10 gap-y-6 text-base">
            <div className="flex items-center gap-3">
              <Car className="w-6 h-6 text-gray-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-gray-400 font-black uppercase tracking-wider">Marca y Modelo</span>
                <span className="font-black text-gray-900 text-lg">{datos.vehiculo_modelo}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-gray-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-gray-400 font-black uppercase tracking-wider">Cliente</span>
                <span className="font-bold text-gray-900 text-lg">{datos.cliente_nombre}</span>
              </div>
            </div>

            {/* Solo se muestran si existen en la base de datos */}
            {datos.vehiculo_color && (
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-gray-400 font-black uppercase tracking-wider">Color</span>
                  <span className="font-bold text-gray-900 text-lg">{datos.vehiculo_color}</span>
                </div>
              </div>
            )}

            {datos.vehiculo_kilometros && (
              <div className="flex items-center gap-3">
                <Gauge className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-gray-400 font-black uppercase tracking-wider">Kilómetros</span>
                  <span className="font-bold text-gray-900 text-lg">{datos.vehiculo_kilometros} km</span>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      {datos.notas_internas && (
        <div className="mb-8 border-l-8 border-amber-400 pl-4 py-3 bg-amber-50 rounded-r-xl">
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Notas Internas / Advertencias</p>
          <p className="text-gray-900 font-bold text-lg italic">"{datos.notas_internas}"</p>
        </div>
      )}

      {/* TAREAS A REALIZAR (Letra grande, casillero, cantidad a la derecha) */}
      <div className="mb-8">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b-4 border-gray-200 pb-2 mb-5">Tareas a Realizar</h3>
        <div className="space-y-4 px-2">
          {datos.items?.filter((i:any) => i.tipo !== 'Repuesto' && i.tipo !== 'Neumático').map((srv: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b-2 border-gray-100 pb-3">
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 border-4 border-gray-300 rounded-md mt-0.5 shrink-0"></div>
                <p className="font-black text-gray-800 text-2xl leading-tight">{srv.detalle}</p>
              </div>
              <div className="font-black text-gray-300 text-2xl ml-4 shrink-0">{srv.cantidad || srv.cant || 1}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* REPUESTOS (Con casillero para hacer picking y cantidad a la derecha) */}
      <div className="mb-8">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b-4 border-gray-200 pb-2 mb-5">Repuestos Requeridos</h3>
        <div className="space-y-4 px-2">
          {datos.items?.filter((i:any) => i.tipo === 'Repuesto' || i.tipo === 'Neumático').map((rep: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b-2 border-gray-100 pb-3">
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 border-4 border-gray-300 rounded-md mt-0.5 shrink-0"></div>
                <p className="font-bold text-gray-700 text-2xl leading-tight">{rep.detalle}</p>
              </div>
              <div className="font-black text-gray-900 bg-gray-200 px-3 py-1 rounded-lg text-2xl ml-4 shrink-0">
                {rep.cantidad || rep.cant || 1}x
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}