import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  
  // SIMULACIÓN DE PROCESAMIENTO AFIP
  // En el futuro, aquí usaremos 'afip.js' para conectar con el servidor real
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulamos espera de red

  const numeroFacturaSimulado = Math.floor(Math.random() * 90000000) + 1;
  const caeSimulado = Array.from({length: 14}, () => Math.floor(Math.random() * 10)).join('');
  const vencimiento = new Date();
  vencimiento.setDate(vencimiento.getDate() + 10);

  return NextResponse.json({
    success: true,
    cae: caeSimulado,
    cae_vencimiento: vencimiento.toISOString().split('T')[0],
    numero_factura: numeroFacturaSimulado,
    punto_venta: 1,
    mensaje: "Comprobante autorizado exitosamente por AFIP (MODO PRUEBA)"
  });
}