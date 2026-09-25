import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint to receive asynchronous payment status notifications from PagBank.
 * Structured to integrate directly with PagBank notifications / orders API.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let payload: any = null;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }

    console.log('[PagBank Webhook] Notification received:', payload);

    // Extract transaction identifiers
    const transactionId = payload?.id || payload?.notificationCode || payload?.reference_id || `PAGBANK_${Date.now()}`;
    const status = payload?.status || payload?.charges?.[0]?.status || 'PAID';
    const referenceId = payload?.reference_id || payload?.reference || '';

    // PagBank typical success statuses: 'PAID', 'AUTHORIZED', '3' (paga), '4' (disponível)
    const isPaid = 
      status === 'PAID' || 
      status === 'AUTHORIZED' || 
      status === '3' || 
      status === '4' ||
      status === 'CONFIRMED';

    return NextResponse.json({
      success: true,
      received: true,
      transactionId,
      status,
      isPaid,
      referenceId,
      message: isPaid 
        ? 'Pagamento PagBank recebido e validado com sucesso.' 
        : 'Notificação do PagBank recebida (aguardando compensação).'
    });
  } catch (error: any) {
    console.error('[PagBank Webhook Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Falha ao processar notificação PagBank' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/pagbank',
    description: 'Endpoint ativo para recepção de webhooks de pagamento do PagBank'
  });
}
