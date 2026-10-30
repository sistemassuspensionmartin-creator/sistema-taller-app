import React from "react"
import { Car, User, Palette, Gauge, Calendar, Tag, Clock } from "lucide-react"

// --- PLANTILLA 1: EL PRESUPUESTO (Colores Goodyear, Bordes Nítidos y Lógica Dinámica COMPACTA) ---
// --- PLANTILLA 1: EL PRESUPUESTO (Colores Goodyear, Bordes Nítidos y Lógica Dinámica COMPACTA) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-800 px-6 pb-6 pt-2 font-sans max-w-[210mm] mx-auto">
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-3">
          {datos?.config?.logo_url ? (
            <img src={datos.config.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-52 h-auto bg-slate-50 rounded-lg flex items-center justify-center border-2 border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#003087]">{datos.config?.nombre_taller || "AUTO TALLER"}</h1>
            <p className="text-xs text-slate-800 font-bold">{datos.config?.direccion || "Dirección no configurada"}</p>
            <p className="text-xs text-slate-800 font-bold">Tel: {datos.config?.telefono || "No configurado"}</p>
            <p className="text-[10px] font-bold text-[#003087] mt-1 border border-[#003087] bg-[#003087]/5 inline-block px-1.5 py-0.5 rounded">
              Horarios: {datos.config?.horario || "Lun a Vie 08:00 a 18:00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">PRESUPUESTO</h2>
          <p className="text-[#003087] font-mono text-sm font-bold mt-0.5">#PRE-{datos.numero_correlativo}</p>
          <p className="text-xs text-slate-600 mt-0.5 font-bold">
            Fecha: {new Date(datos.fecha_emision || new Date()).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-slate-800 p-3 rounded-lg bg-white">
          <p className="text-[10px] font-black text-[#003087] uppercase tracking-wider mb-1">Datos del Cliente</p>
          <p className="font-bold text-slate-900 text-base leading-tight">{datos.cliente_nombre}</p>
          <p className="text-xs text-slate-800 mt-0.5 font-bold">{datos.cliente_telefono || "Sin teléfono"}</p>
        </div>
        <div className="border border-slate-800 p-3 rounded-lg bg-white">
          <p className="text-[10px] font-black text-[#003087] uppercase tracking-wider mb-1">Vehículo Asignado</p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-2">
              <div className="border-2 border-slate-800 rounded text-center px-2 py-0.5 bg-white">
                <span className="font-mono font-black text-slate-900 text-sm tracking-widest">{datos.vehiculo_patente}</span>
              </div>
              <div className="text-xs text-slate-800 font-bold">
                {datos.vehiculo_modelo || "Modelo no especificado"}
              </div>
            </div>
            
            <div className="text-right pl-3 border-l-2 border-slate-200 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Kilómetros</p>
              <div className="text-xs font-bold text-slate-700 leading-tight space-y-0.5">
                <p>Egreso: <span className="font-black text-slate-900">{datos.km_egreso || "---"}</span></p>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-2">
          <div className="w-10 text-[10px] font-black text-slate-800 uppercase tracking-wider text-center">Cant.</div>
          <div className="flex-1 text-[10px] font-black text-slate-800 uppercase tracking-wider pl-2">Descripción del Trabajo / Repuesto</div>
          <div className="w-24 text-[10px] font-black text-slate-800 uppercase tracking-wider text-right pr-4">Precio Unit.</div>
          <div className="w-24 text-[10px] font-black text-slate-800 uppercase tracking-wider text-right">Subtotal</div>
        </div>

        <div className="space-y-1">
          {datos.items?.map((item: any, idx: number) => {
            const cantidad = parseFloat(item.cantidad || item.cant || 1);
            const precioUnitario = parseFloat(item.precio_unitario || item.precio || 0);
            const subtotalItem = cantidad * precioUnitario;

            return (
              <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-300 py-1.5">
                <div className="w-10 text-center font-mono font-black text-[#003087]">{cantidad}</div>
                <div className="flex-1 font-bold text-slate-800 pl-2 pr-2">{item.detalle}</div>
                <div className="w-24 text-right font-mono font-bold text-slate-600 pr-4">${precioUnitario.toLocaleString()}</div>
                <div className="w-24 text-right font-mono font-black text-slate-900">${subtotalItem.toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 pt-2 flex justify-between items-end">
        {/* LADO IZQUIERDO: DEMORA ESTIMADA Y OBSERVACIONES COMENTADAS */}
        <div className="w-1/2 flex flex-col gap-2">
           {datos.demora_estimada && (
             <div className="border-l-4 border-[#003087] pl-3 py-1.5 bg-[#003087]/5 rounded-r-lg">
                <p className="text-[9px] font-black text-[#003087] uppercase tracking-widest mb-0.5">Demora Estimada</p>
                <p className="text-slate-900 font-black text-sm uppercase">{datos.demora_estimada}</p>
             </div>
           )}
           {/* SE COMENTÓ LA SECCIÓN DE OBSERVACIONES PARA EVITAR QUE SALGA EN IMPRESIÓN, PERO SE MANTIENE EN EL CÓDIGO */}
           {/* {datos.observaciones_publicas && (
             <div className="border-l-4 border-amber-500 pl-3 py-1.5 bg-amber-50 rounded-r-lg pr-2">
                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Observaciones Adicionales</p>
                <p className="text-slate-800 font-bold text-xs whitespace-pre-wrap leading-tight">{datos.observaciones_publicas}</p>
             </div>
           )} */}
        </div>

        <div className="w-[280px]">
          {/* --- MAGIA COMERCIAL --- */}
          {Number(datos.descuento) > 0 && (
            <div className="space-y-1 mb-2 px-3">
              <div className="flex justify-between items-center text-sm">
                <p className="font-black text-slate-600 tracking-wider text-xs">Subtotal</p>
                <p className="font-mono font-black text-slate-800">${Number(datos.subtotal).toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <p className="font-black text-slate-600 tracking-wider text-xs">Descuento / Atención</p>
                <p className="font-mono font-black text-slate-800">-${Number(datos.descuento).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-white p-3 rounded-lg border-2 border-slate-800">
            <p className="font-black text-slate-900 text-sm uppercase tracking-wider">Total Final</p>
            <p className="font-mono font-black text-[#003087] text-xl">${Number(datos.total_final).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* TÉRMINOS LEGALES GLOBALES (Desde Configuración) - LETRA AGRANDADA A text-[11px] */}
      <div className="mt-3 border-t-2 border-slate-800 pt-1.5">
        <p className="text-[11px] text-slate-600 italic font-bold whitespace-pre-wrap leading-tight text-justify">
          {datos.config?.terminos_presupuesto || `* Válido por ${datos.validez_dias || 15} días. Los precios de repuestos pueden sufrir variaciones.`}
        </p>
      </div>

    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Con soporte para Garantías en Blanco y Negro) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  const esGarantia = datos.es_garantia === true;

  return (
    <div className="bg-white text-slate-900 p-4 font-sans max-w-[210mm] mx-auto relative">
      
      {/* HEADER ULTRA COMPACTO */}
      <div className="flex justify-between items-center mb-2">
        {datos?.config?.logo_url ? (
          <img src={datos.config.logo_url} alt="Logo" className="w-20 h-20 object-contain" />
        ) : (
          <div className="w-40 h-12 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold text-center leading-tight">LOGO</span>
          </div>
        )}
        <div className="text-right">
          {esGarantia ? (
            <div className="bg-black text-white px-3 py-1 rounded-lg mb-1 inline-block">
              <h2 className="text-xl font-black tracking-widest uppercase">REINGRESO GARANTÍA</h2>
            </div>
          ) : (
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Orden de Trabajo</h2>
          )}
          <p className="text-slate-800 font-mono text-sm font-bold mt-1 leading-none">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase mt-1 leading-none">{new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      {/* RECUADRO DE MOTIVO DE GARANTÍA */}
      {esGarantia && datos.motivo_garantia && (
        <div className="border-2 border-black p-2 mb-2 rounded-lg bg-slate-50">
          <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-0.5">Motivo del Reingreso:</h3>
          <p className="text-sm font-bold text-slate-900 italic">"{datos.motivo_garantia}"</p>
        </div>
      )}

      {/* FICHA TÉCNICA - ULTRA COMPACTA SIN BARRA DE TÍTULO */}
      <div className="border-2 border-slate-800 rounded-lg mb-3 overflow-hidden">
        <div className="p-2 flex flex-col gap-2">
          {/* CUATRO COLUMNAS: PATENTE - MARCA - COLOR - CLIENTE */}
          <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-1.5">
            <div>
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block mb-0.5">Patente</span>
              <span className="font-mono font-black text-slate-900 text-sm tracking-widest border border-slate-300 bg-slate-100 px-1 rounded">{datos.vehiculo_patente}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block mb-0.5">Marca y Modelo</span>
              <span className="font-black text-slate-900 text-sm leading-tight">{datos.vehiculo_modelo || "________"}</span>
            </div>
            <div className="text-center px-1 border-x border-slate-200">
              <span className="text-[8px] text-[#003087] font-black uppercase tracking-wider mb-0.5 block flex items-center justify-center gap-1"><Palette className="w-2.5 h-2.5"/>Color</span>
              <span className="font-black text-slate-900 text-sm uppercase">{datos.vehiculo_color || "________"}</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider mb-0.5 block flex items-center justify-end gap-1"><User className="w-2.5 h-2.5"/>Cliente</span>
              <span className="font-black text-slate-900 text-sm leading-tight truncate block">{datos.cliente_nombre}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
               <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5 flex items-center gap-1"><Gauge className="w-3 h-3"/> Kilómetros Entrada</p>
               <p className="font-bold text-slate-900 text-sm font-mono leading-none">{datos.vehiculo_kilometros || datos.km_ingreso || "---"} KM</p>
            </div>
            <div className="text-right">
               <p className="text-[8px] text-[#003087] font-black uppercase mb-0.5 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> Entrega Sugerida</p>
               <p className="font-black text-slate-900 text-sm uppercase leading-none">{datos.demora_estimada || "NO DEFINIDA"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TAREAS A REALIZAR */}
      <div className="mb-2">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-0.5 mb-1">
          {esGarantia ? "Trabajos a Revisar" : "Tareas a Realizar"}
        </h3>
        <div className="space-y-0.5 px-1">
          {datos.items?.filter((i:any) => i.tipo !== 'Repuesto' && i.tipo !== 'Neumático').map((srv: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-200 pb-0.5">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 border-2 border-slate-800 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-bold text-slate-900 text-sm leading-tight">{srv.detalle}</p>
              </div>
              <div className="font-black text-slate-600 text-sm shrink-0">{srv.cantidad || srv.cant || 1}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* REPUESTOS */}
      <div className="mb-2 mt-3">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-0.5 mb-1">
           {esGarantia ? "Repuestos Instalados Previamente" : "Repuestos Requeridos"}
        </h3>
        <div className="space-y-0.5 px-1">
          {datos.items?.filter((i:any) => i.tipo === 'Repuesto' || i.tipo === 'Neumático').map((rep: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-200 pb-0.5">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 border-2 border-slate-800 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{rep.detalle}</p>
              </div>
              <div className="font-black text-slate-900 border border-slate-400 px-1 rounded text-xs shrink-0">
                {rep.cantidad || rep.cant || 1}x
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      {datos.notas_internas && (
        <div className="mt-3 border-l-[4px] border-slate-800 pl-2 py-1 bg-slate-100 rounded-r">
          <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest mb-0.5">Notas del Mecánico / Advertencias</p>
          <p className="text-slate-900 font-bold text-sm italic leading-tight">"{datos.notas_internas}"</p>
        </div>
      )}
    </div>
  )
}


export function CierreCajaImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  const efectivoEsperado = Number(datos.efectivo_esperado || 0);
  const efectivoReal = Number(datos.efectivo_real || 0);
  const diferencia = Number(datos.diferencia || 0);

  return (
    <div className="bg-white text-slate-900 p-8 font-sans w-[210mm] min-h-[297mm] mx-auto">
      
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <img src="/icon.png" alt="Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Cierre de Caja</h1>
            <p className="text-xs font-black text-[#003087] uppercase tracking-[0.2em] mt-1">Suspensión MARTIN</p>
            
            {/* MAGIA: Fecha original de la auditoría */}
            {datos.ultimoCierre && (
              <div className="mt-2 bg-slate-100 border border-slate-300 px-2 py-0.5 inline-block rounded">
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                  Cierre Original: {new Date(datos.ultimoCierre).toLocaleDateString('es-AR')} a las {new Date(datos.ultimoCierre).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Copia Impresa El</p>
          <p className="text-sm font-bold leading-tight">{new Date().toLocaleString('es-AR')}</p>
          <p className="text-[10px] font-black text-[#003087] uppercase mt-1">
            Operador: {datos.usuario || 'Administrador'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-800">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Auditoría de Efectivo</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span>Esperado:</span><span className="font-mono font-bold">${efectivoEsperado.toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between text-sm"><span>Contado:</span><span className="font-mono font-bold">${efectivoReal.toLocaleString('es-AR')}</span></div>
            <div className={`flex justify-between pt-2 border-t-2 border-slate-800 mt-2 font-black ${diferencia < 0 ? 'text-slate-900' : 'text-slate-900'}`}>
              <span>Diferencia:</span><span>${diferencia.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-800">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Otros Valores</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span>Transferencias:</span><span className="font-mono font-bold">${Number(datos.transferencias).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between text-sm"><span>Tarjetas:</span><span className="font-mono font-bold">${Number(datos.tarjetas).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between text-sm"><span>Cheques:</span><span className="font-mono font-bold">${Number(datos.cheques).toLocaleString('es-AR')}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-black uppercase tracking-widest mb-4 border-b-2 border-slate-800 pb-2">Detalle de Movimientos</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 text-[10px] font-black text-slate-800 uppercase w-20">Hora</th>
              <th className="py-2 text-[10px] font-black text-slate-800 uppercase">Detalle y Medio</th>
              <th className="py-2 text-[10px] font-black text-slate-800 uppercase text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {datos.movimientos?.map((mov: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="py-1.5 font-mono text-[11px] text-slate-600 font-bold">
                  {new Date(mov.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="py-1.5">
                  <p className="font-bold text-slate-900 text-sm leading-tight">{mov.detalle}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase leading-tight mt-0.5">{mov.metodo_pago}</p>
                </td>
                <td className={`py-1.5 text-right font-mono font-black text-slate-900`}>
                  {mov.tipo_movimiento === 'egreso_gasto' ? '-' : ''}${Number(mov.monto).toLocaleString('es-AR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t-2 border-slate-800 pt-4">
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center">
          Este documento es un reporte interno de sistema. No posee validez legal.
        </p>
      </div>
    </div>
  );
}

// --- PLANTILLA: FACTURA / NOTA DE CRÉDITO ELECTRÓNICA (RG 1415, RG 4892 QR, Ley 27.743) ---
// datos = resultado de datosParaImprimir() en lib/facturacion.ts
const CODIGO_CBTE: Record<number, string> = { 1: "01", 3: "03", 6: "06", 8: "08", 11: "11", 13: "13" }
const plata = (n: number) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fechaAr = (f?: string | null) => f ? new Date(`${String(f).slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR') : "-"
const nroCbte = (pv?: number, nro?: number) => `${String(pv || 0).padStart(5, '0')}-${String(nro || 0).padStart(8, '0')}`
const DOC_NOMBRE: Record<number, string> = { 80: "CUIT", 86: "CUIL", 96: "DNI", 99: "" }

export function FacturaImprimible({ datos }: { datos: any }) {
  if (!datos?.comprobante) return null;

  const c = datos.comprobante
  const e = datos.emisor || {}
  const esNC = [3, 8, 13].includes(c.cbte_tipo)
  const letra = c.tipo_factura || 'B'
  const discriminaIva = letra === 'A'
  const esB = letra === 'B'
  const prueba = datos.ambiente !== 'produccion'
  const total = Number(c.total_final || 0)
  const neto = Number(c.total_neto || 0)
  const iva = Number(c.iva_total || 0)
  const items: any[] = datos.items || []
  const descuento = items.length ? Number(datos.presupuesto?.descuento || 0) : 0
  // En la factura A los precios se muestran sin IVA; en la B y la C, con IVA incluido
  const precio = (p: number) => discriminaIva ? Number(p || 0) / 1.21 : Number(p || 0)

  const lineas = items.length
    ? items.map((it: any) => ({ cantidad: Number(it.cantidad || 1), detalle: it.detalle, unitario: precio(it.precio_unitario) }))
    : [{
        cantidad: 1,
        detalle: esNC
          ? `Nota de crédito sobre ${datos.asociada ? `Factura ${datos.asociada.tipo_factura} N° ${nroCbte(datos.asociada.punto_venta, datos.asociada.numero_factura)}` : 'factura asociada'}`
          : `Servicios de reparación y repuestos - Presupuesto PRE-${datos.presupuesto?.numero ?? ''}${total < Number(datos.presupuesto?.total || 0) - 0.01 ? ' (pago parcial)' : ''}`,
        unitario: discriminaIva ? neto : total,
      }]

  return (
    <div className="bg-white text-slate-800 p-10 pt-8 font-sans w-[210mm] min-h-[285mm] mx-auto relative flex flex-col shadow-none">

      {prueba && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl font-black text-slate-200 -rotate-12 uppercase text-center leading-tight">Comprobante de prueba<br />sin validez fiscal</span>
        </div>
      )}

      {/* --- CABECERA --- */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start mb-4 border-b-2 border-slate-800 pb-4 gap-4">
        <div className="space-y-1">
          {e.logo_url ? (
            <img src={e.logo_url} alt="Logo" className="w-48 h-auto max-h-24 object-contain object-left" />
          ) : (
            <p className="text-xl font-black uppercase">{e.nombre_taller}</p>
          )}
          <p className="text-[12px] font-black uppercase">{e.razon_social}</p>
          <p className="text-[10px] font-bold">Domicilio comercial: {e.domicilio_fiscal || e.direccion}</p>
          <p className="text-[10px] font-bold">Condición frente al IVA: {e.condicion_iva === 'Monotributo' ? 'Responsable Monotributo' : 'IVA Responsable Inscripto'}</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-2 border-slate-800 rounded-xl flex flex-col items-center justify-center bg-white">
            <span className="text-4xl font-black leading-none">{letra}</span>
            <span className="text-[8px] font-bold">COD. {CODIGO_CBTE[c.cbte_tipo]}</span>
          </div>
        </div>

        <div className="text-right space-y-0.5">
          <h2 className="text-lg font-black tracking-[0.15em] uppercase">{esNC ? 'Nota de Crédito' : 'Factura'}</h2>
          <p className="font-mono text-sm font-black">Punto de Venta: {String(c.punto_venta).padStart(5, '0')}  Comp. Nro: {String(c.numero_factura).padStart(8, '0')}</p>
          <p className="text-[11px] font-bold">Fecha de Emisión: {fechaAr(c.fecha_cbte)}</p>
          <p className="text-[10px] font-bold">CUIT: {c.cuit_emisor}</p>
          <p className="text-[10px] font-bold">Ingresos Brutos: {e.iibb || '-'}</p>
          <p className="text-[10px] font-bold">Inicio de Actividades: {fechaAr(e.inicio_actividades)}</p>
        </div>
      </div>

      {/* --- PERÍODO (concepto productos y servicios) --- */}
      <div className="flex justify-between text-[10px] font-bold border-b border-slate-400 pb-2 mb-3">
        <span>Período Facturado Desde: {fechaAr(c.fecha_cbte)}  Hasta: {fechaAr(c.fecha_cbte)}</span>
        <span>Fecha de Vto. para el pago: {fechaAr(c.fecha_cbte)}</span>
      </div>

      {/* --- RECEPTOR --- */}
      <div className="border-2 border-slate-800 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2 text-[11px]">
        {c.doc_tipo === 99 ? (
          <p className="font-black uppercase col-span-2">A CONSUMIDOR FINAL</p>
        ) : (
          <>
            <p><span className="font-bold">{DOC_NOMBRE[c.doc_tipo] || 'Doc.'}:</span> {c.doc_nro}</p>
            <p><span className="font-bold">Apellido y Nombre / Razón Social:</span> {c.cliente_nombre}</p>
          </>
        )}
        <p><span className="font-bold">Condición frente al IVA:</span> {c.cliente_condicion_iva === 'Monotributo' ? 'Responsable Monotributo' : c.cliente_condicion_iva === 'Responsable Inscripto' ? 'IVA Responsable Inscripto' : c.cliente_condicion_iva === 'Exento' ? 'IVA Sujeto Exento' : 'Consumidor Final'}</p>
        {c.doc_tipo !== 99 && <p><span className="font-bold">Domicilio:</span> {c.cliente_domicilio || '-'}</p>}
        {esNC && datos.asociada && (
          <p className="col-span-2"><span className="font-bold">Comprobante asociado:</span> Factura {datos.asociada.tipo_factura} N° {nroCbte(datos.asociada.punto_venta, datos.asociada.numero_factura)} del {fechaAr(datos.asociada.fecha_cbte)}</p>
        )}
      </div>

      {/* --- DETALLE --- */}
      <div className="flex-1">
        <div className="grid grid-cols-12 gap-2 border-b-2 border-slate-800 pb-1 mb-2 text-[10px] font-black uppercase">
          <div className="col-span-1 text-center">Cant.</div>
          <div className="col-span-7">Descripción</div>
          <div className="col-span-2 text-right">{discriminaIva ? 'P. Unit. (neto)' : 'P. Unitario'}</div>
          <div className="col-span-2 text-right">Subtotal</div>
        </div>
        {lineas.map((l, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 border-b border-slate-200 py-1 text-[12px]">
            <div className="col-span-1 text-center font-bold">{l.cantidad}</div>
            <div className="col-span-7 uppercase">{l.detalle}</div>
            <div className="col-span-2 text-right font-mono">{plata(l.unitario)}</div>
            <div className="col-span-2 text-right font-mono font-bold">{plata(l.cantidad * l.unitario)}</div>
          </div>
        ))}
      </div>

      {/* --- TOTALES --- */}
      <div className="flex justify-end mt-4">
        <div className="w-[300px] border-2 border-slate-800 rounded-xl p-4 space-y-1 text-[11px]">
          {descuento > 0 && (
            <div className="flex justify-between"><span>Descuento</span><span className="font-mono">-{plata(discriminaIva ? descuento / 1.21 : descuento)}</span></div>
          )}
          {discriminaIva && (
            <>
              <div className="flex justify-between"><span>Importe Neto Gravado</span><span className="font-mono">{plata(neto)}</span></div>
              <div className="flex justify-between"><span>IVA 21%</span><span className="font-mono">{plata(iva)}</span></div>
            </>
          )}
          <div className="flex justify-between border-t-2 border-slate-800 pt-2 mt-1 font-black text-base">
            <span>Importe Total</span><span className="font-mono">{plata(total)}</span>
          </div>
        </div>
      </div>

      {esB && (
        <div className="mt-3 border border-slate-800 rounded-lg p-2 text-[10px] w-[300px] ml-auto">
          <p className="font-black uppercase">Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</p>
          <div className="flex justify-between"><span>IVA Contenido</span><span className="font-mono">{plata(iva)}</span></div>
          <div className="flex justify-between"><span>Otros Impuestos Nacionales Indirectos</span><span className="font-mono">{plata(0)}</span></div>
        </div>
      )}

      {/* --- PIE: QR + CAE --- */}
      <div className="flex justify-between items-end border-t-2 border-slate-800 pt-4 mt-6">
        <div className="flex items-center gap-4">
          {datos.qr_imagen && <img src={datos.qr_imagen} alt="QR ARCA" className="w-24 h-24" />}
          <div>
            <p className="text-[12px] font-black">ARCA</p>
            <p className="text-[10px] italic font-bold">Comprobante Autorizado</p>
            <p className="text-[8px] text-slate-500">Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación</p>
          </div>
        </div>
        <div className="text-right text-[11px] font-black space-y-0.5">
          <p>CAE N°: {c.cae}</p>
          <p>Fecha de Vto. de CAE: {fechaAr(c.cae_vencimiento)}</p>
        </div>
      </div>
    </div>
  );
}
