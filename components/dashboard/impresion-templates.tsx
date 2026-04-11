import React from "react"
import { Car, User, Palette, Gauge, Calendar, Tag } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// --- PLANTILLA 1: EL PRESUPUESTO (INTACTO Y PERFECTO) ---
export function PresupuestoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-800 p-6 font-sans max-w-[210mm] mx-auto border-t-[8px] border-emerald-600">
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4 mt-2">
        <div className="flex items-center gap-3">
          {datos?.config?.logo_url ? (
            <img src={datos.config.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-52 h-auto bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
            </div>
          )}
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

      <div className="mb-6">
        <div className="flex justify-between items-end border-b-2 border-slate-200 pb-2 mb-2">
          <div className="w-10 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Cant.</div>
          <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Descripción del Trabajo / Repuesto</div>
          <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right pr-4">Precio Unit.</div>
          <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Subtotal</div>
        </div>

        <div className="space-y-1">
          {datos.items?.map((item: any, idx: number) => {
            const cantidad = parseFloat(item.cantidad || item.cant || 1);
            const precioUnitario = parseFloat(item.precio_unitario || item.precio || 0);
            const subtotalItem = cantidad * precioUnitario;

            return (
              <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 py-1.5 hover:bg-slate-50 transition-colors">
                <div className="w-10 text-center font-mono font-bold text-emerald-600">{cantidad}</div>
                <div className="flex-1 font-medium text-slate-800 pl-2 pr-2">{item.detalle}</div>
                <div className="w-24 text-right font-mono text-slate-500 pr-4">${precioUnitario.toLocaleString()}</div>
                <div className="w-24 text-right font-mono font-bold text-slate-900">${subtotalItem.toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 flex justify-end">
        <div className="w-[240px]">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="font-bold text-slate-900 text-sm uppercase tracking-wider">Total Final</p>
            <p className="font-mono font-black text-emerald-700 text-xl">${Number(datos.total_final).toLocaleString()}</p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 text-right mt-3 italic font-medium">
        * Válido por {datos.validez_dias || 15} días. Los precios de repuestos pueden sufrir variaciones.
      </p>
    </div>
  )
}

// --- PLANTILLA 2: LA ORDEN DE TRABAJO (Notas movidas al fondo y mapeo ajustado) ---
export function OrdenTrabajoImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-900 p-5 font-sans max-w-[210mm] mx-auto relative">
      
      {/* HEADER ULTRA COMPACTO */}
      <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
        {datos?.config?.logo_url ? (
          <img src={datos.config.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
        ) : (
          <div className="w-52 h-auto bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold text-center leading-tight">TU LOGO<br/>AQUÍ</span>
          </div>
        )}
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Orden de Trabajo</h2>
          <p className="text-slate-600 font-mono text-sm font-bold mt-0.5">#OT-{datos.numero_correlativo || 'PENDIENTE'}</p>
        </div>
      </div>

      {/* FICHA TÉCNICA */}
      <div className="border border-slate-200 rounded-xl mb-4 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase tracking-wider">
            <Car className="w-3.5 h-3.5" />
            <span>Ficha Técnica y Cliente</span>
          </div>
          <div className="border border-slate-400 rounded px-2 py-0.5 bg-white shadow-sm">
            <span className="font-mono font-black text-slate-900 text-sm tracking-widest">{datos.vehiculo_patente}</span>
          </div>
        </div>
        
        <div className="p-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Marca y Modelo</span>
              <span className="font-black text-slate-900 text-sm">{datos.vehiculo_modelo || "________"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><User className="w-3 h-3"/> Cliente</span>
              <span className="font-black text-slate-900 text-sm">{datos.cliente_nombre}</span>
            </div>
          </div>
          
          <div className="flex justify-between border-t border-slate-100 pt-2.5">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> Año</span>
              <span className="font-bold text-slate-800 text-sm">{datos.vehiculo_anio || "____"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Palette className="w-3 h-3"/> Color</span>
              <span className="font-bold text-slate-800 text-sm">{datos.vehiculo_color || "________"}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-end gap-1"><Gauge className="w-3 h-3"/> Kilometraje</span>
              <span className="font-bold text-slate-800 text-sm">{datos.vehiculo_kilometros ? `${datos.vehiculo_kilometros} km` : "________"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TAREAS A REALIZAR */}
      <div className="mb-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">Tareas a Realizar</h3>
        <div className="space-y-1.5 px-1">
          {datos.items?.filter((i:any) => i.tipo !== 'Repuesto' && i.tipo !== 'Neumático').map((srv: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-1">
              <div className="flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 border border-slate-400 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{srv.detalle}</p>
              </div>
              <div className="font-bold text-slate-400 text-sm shrink-0">{srv.cantidad || srv.cant || 1}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* REPUESTOS */}
      <div className="mb-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">Repuestos Requeridos</h3>
        <div className="space-y-1.5 px-1">
          {datos.items?.filter((i:any) => i.tipo === 'Repuesto' || i.tipo === 'Neumático').map((rep: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-1">
              <div className="flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 border border-slate-400 rounded-sm mt-0.5 shrink-0"></div>
                <p className="font-semibold text-slate-700 text-sm leading-tight">{rep.detalle}</p>
              </div>
              <div className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs shrink-0">
                {rep.cantidad || rep.cant || 1}x
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTAS INTERNAS (MOVIDAS AL FINAL COMO AVISO) */}
      {datos.notas_internas && (
        <div className="mt-8 border-l-4 border-amber-400 pl-3 py-2 bg-amber-50 rounded-r-lg">
          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Notas Internas / Advertencias</p>
          <p className="text-slate-900 font-medium text-sm italic">"{datos.notas_internas}"</p>
        </div>
      )}

    </div>
  )
}

// --- PLANTILLA 3: REPORTE DE CIERRE DE CAJA ---
export function CierreCajaImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  return (
    <div className="bg-white text-slate-900 p-6 font-sans max-w-[210mm] mx-auto border-t-[8px] border-slate-900">
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4 mt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">REPORTE DE CIERRE DE CAJA</h1>
          <p className="text-sm text-slate-600 font-medium mt-1">Generado el: {new Date().toLocaleString('es-AR')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Desde Último Cierre</p>
          <p className="text-sm text-slate-800 font-mono mt-0.5">
            {datos.ultimoCierre ? new Date(datos.ultimoCierre).toLocaleString('es-AR') : 'Inicio de los tiempos'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Auditoría Físico (Mostrador)</p>
          <div className="flex justify-between mb-1"><span className="text-sm text-slate-600">Efectivo Esperado:</span><span className="font-mono font-bold">${Number(datos.efectivo_esperado).toLocaleString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-sm text-slate-600">Efectivo Real (Caja):</span><span className="font-mono font-bold">${Number(datos.efectivo_real).toLocaleString()}</span></div>
          <div className={`flex justify-between mt-2 pt-2 border-t border-slate-200 font-bold ${datos.diferencia < 0 ? 'text-red-600' : datos.diferencia > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
            <span>Diferencia:</span><span className="font-mono">${Number(datos.diferencia).toLocaleString()}</span>
          </div>
        </div>

        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Ingresos Digitales (Globales)</p>
          <div className="flex justify-between mb-1"><span className="text-sm text-slate-600">Transferencias:</span><span className="font-mono font-bold text-slate-900">${Number(datos.transferencias).toLocaleString()}</span></div>
          <div className="flex justify-between mb-1"><span className="text-sm text-slate-600">Tarjetas:</span><span className="font-mono font-bold text-slate-900">${Number(datos.tarjetas).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">Cheques:</span><span className="font-mono font-bold text-slate-900">${Number(datos.cheques).toLocaleString()}</span></div>
        </div>
      </div>

      {datos.notas && (
        <div className="mb-6 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r text-sm">
          <span className="font-bold text-amber-800 uppercase tracking-wider block mb-1 text-[10px]">Observaciones del Encargado</span>
          <span className="italic text-slate-800">{datos.notas}</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b-2 border-slate-200 pb-2 mb-3">Detalle de Movimientos del Turno</h3>
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Hora</TableHead>
              <TableHead>Detalle y Método</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datos.movimientos?.map((mov: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-slate-500 text-xs">{new Date(mov.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</TableCell>
                <TableCell>
                  <span className="font-medium text-slate-800 block">{mov.detalle}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{mov.metodo_pago} {mov.notas ? `- ${mov.notas}` : ''}</span>
                </TableCell>
                <TableCell className={`text-right font-mono font-bold ${mov.tipo_movimiento === 'ingreso_cobro' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {mov.tipo_movimiento === 'ingreso_cobro' ? '+' : ''}${Number(mov.monto).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {(!datos.movimientos || datos.movimientos.length === 0) && (
              <TableRow><TableCell colSpan={3} className="text-center text-slate-500 italic py-4">No hubo movimientos registrados en este turno.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-12 pt-12 border-t border-slate-200 flex justify-between px-10">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-2"></div>
          <p className="text-xs font-bold text-slate-500 uppercase">Firma Encargado</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-2"></div>
          <p className="text-xs font-bold text-slate-500 uppercase">Firma Gerencia</p>
        </div>
      </div>
    </div>
  )
}

export function FacturaImprimible({ datos }: { datos: any }) {
  if (!datos) return null;

  // Formatear el número de factura: 00001-00000001
  const nroFormateado = `${String(datos.punto_venta || 1).padStart(5, '0')}-${String(datos.numero_factura).padStart(8, '0')}`;

  return (
    <div className="bg-white text-slate-900 p-10 font-sans max-w-[210mm] min-h-[297mm] mx-auto border border-slate-300 shadow-lg relative">
      
      {/* CABECERA PRINCIPAL */}
      <div className="border-2 border-slate-900 p-0 mb-6 relative">
        {/* LA LETRA (CENTRAL) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white border-2 border-t-0 border-slate-900 w-12 h-12 flex flex-col items-center justify-center z-10">
          <span className="text-3xl font-black leading-none">{datos.tipo_factura || 'C'}</span>
          <span className="text-[8px] font-bold uppercase">Cod. {datos.tipo_factura === 'A' ? '01' : '06'}</span>
        </div>

        <div className="grid grid-cols-2">
          {/* LADO IZQUIERDO: TUS DATOS */}
          <div className="p-4 border-r border-slate-900">
            <h1 className="text-xl font-black uppercase mb-2">{datos.config?.nombre_taller}</h1>
            <p className="text-sm font-bold">{datos.config?.direccion}</p>
            <p className="text-xs">Teléfono: {datos.config?.telefono}</p>
            <p className="text-xs">Email: {datos.config?.email}</p>
            <p className="text-xs mt-2 font-bold italic">IVA Responsable Inscripto</p>
          </div>

          {/* LADO DERECHO: DATOS FACTURA */}
          <div className="p-4 text-right">
            <h2 className="text-2xl font-black mb-1">FACTURA</h2>
            <p className="text-lg font-bold">N° {nroFormateado}</p>
            <p className="text-sm mt-1">Fecha de Emisión: <b>{new Date(datos.fecha_emision).toLocaleDateString('es-AR')}</b></p>
            <div className="text-xs mt-4">
              <p>CUIT: <b>{datos.config?.cuit}</b></p>
              <p>Ingresos Brutos: <b>{datos.config?.cuit}</b></p>
              <p>Inicio de Actividades: <b>01/01/2024</b></p>
            </div>
          </div>
        </div>
      </div>

      {/* DATOS DEL RECEPTOR */}
      <div className="border-2 border-slate-900 p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p>Apellido y Nombre / Razón Social: <b>{datos.cliente_nombre}</b></p>
          <p>Condición frente al IVA: <b>Consumidor Final</b></p>
        </div>
        <div className="text-right">
          <p>CUIT / DNI: <b>{datos.cliente_documento || '00-00000000-0'}</b></p>
          <p>Condición de Venta: <b>Contado</b></p>
        </div>
      </div>

      {/* TABLA DE ITEMS */}
      <div className="border-2 border-slate-900 min-h-[400px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-900">
              <th className="p-2 text-left border-r border-slate-900">Código</th>
              <th className="p-2 text-left border-r border-slate-900">Producto / Servicio</th>
              <th className="p-2 text-center border-r border-slate-900">Cant.</th>
              <th className="p-2 text-right border-r border-slate-900">Precio Unit.</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {datos.items?.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="p-2 border-r border-slate-900">{idx + 1}</td>
                <td className="p-2 border-r border-slate-900">{item.detalle}</td>
                <td className="p-2 text-center border-r border-slate-900">{item.cantidad || item.cant}</td>
                <td className="p-2 text-right border-r border-slate-900">${Number(item.precio_unitario || item.precio).toLocaleString()}</td>
                <td className="p-2 text-right">${(Number(item.cantidad || item.cant) * Number(item.precio_unitario || item.precio)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALES */}
      <div className="mt-4 flex justify-end">
        <div className="w-1/3 border-2 border-slate-900 p-4 space-y-2">
          <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${Number(datos.total_final).toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span>IVA 21%:</span><span>$0.00</span></div>
          <div className="flex justify-between text-xl font-black border-t border-slate-900 pt-2">
            <span>TOTAL:</span><span>${Number(datos.total_final).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PIE DE FACTURA AFIP (CAE Y QR) */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t-2 border-slate-900 pt-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border border-slate-300 bg-slate-50 flex items-center justify-center p-2">
             {/* Acá iría el componente de QR real. Por ahora simulamos el espacio */}
             <div className="text-[8px] text-center opacity-50">QR AFIP<br/>SIMULADO</div>
          </div>
          <div>
            <img src="https://www.afip.gob.ar/images/logo_afip.png" alt="AFIP" className="h-6 mb-2 opacity-50 grayscale" />
            <p className="text-[10px] italic">Comprobante Autorizado</p>
          </div>
        </div>

        <div className="text-right space-y-1">
          <p className="text-sm"><b>CAE N°:</b> {datos.cae || '12345678901234'}</p>
          <p className="text-sm"><b>Fecha de Vto. CAE:</b> {datos.cae_vencimiento || '10/04/2026'}</p>
        </div>
      </div>

      {/* MARCA DE AGUA PARA SIMULACIÓN */}
      {datos.es_simulacion && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <span className="text-8xl font-black text-slate-200/30 -rotate-45 uppercase border-8 border-slate-200/30 p-10 select-none">
            Simulación de Prueba
          </span>
        </div>
      )}
    </div>
  );
}