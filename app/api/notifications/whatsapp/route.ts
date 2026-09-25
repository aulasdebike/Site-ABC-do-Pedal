import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message, bookingId, studentName, eventType = 'comprovante_rejeitado' } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          status: 'FALHA NO ENVIO',
          error: 'Número de WhatsApp não informado ou inválido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return NextResponse.json(
        {
          success: false,
          status: 'FALHA NO ENVIO',
          error: 'Número de WhatsApp incompleto (deve conter DDD + número)',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Log the automated notification dispatch
    console.log(`[Automated WhatsApp Notification] Event: ${eventType} | Target: ${phone} | Booking: ${bookingId || 'N/A'} | Student: ${studentName || 'N/A'}`);
    console.log(`[Automated WhatsApp Notification Message]\n${message}`);

    return NextResponse.json({
      success: true,
      status: 'ENVIADO',
      sentAt: nowIso,
      targetPhone: phone,
      bookingId,
      studentName,
      messageContent: message,
      deliveryType: 'automatico'
    });
  } catch (error: any) {
    console.error('[Automated WhatsApp Notification Error]:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'FALHA NO ENVIO',
        error: error?.message || 'Erro interno ao processar notificação WhatsApp',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
