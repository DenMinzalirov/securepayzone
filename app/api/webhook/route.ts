import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/securezone-client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Проверяем подпись webhook
    const signature = body.signature
    const receivedParams = { ...body }
    delete receivedParams.signature
    
    if (!verifyWebhookSignature(receivedParams, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Обрабатываем webhook от Securezone
    const {
      order_id,
      status,
      transaction_id,
      amount,
      currency,
      timestamp,
    } = body

    console.log('Webhook received from Securezone:', {
      orderId: order_id,
      status,
      transactionId: transaction_id,
      amount,
      currency,
      timestamp,
    })

    // Здесь можно добавить логику:
    // 1. Обновить статус заказа в БД
    // 2. Отправить уведомление пользователю
    // 3. Записать в лог транзакций
    // 4. Интегрировать с CRM/системой учета

    // Возвращаем успешный ответ Securezone
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
  }
}

// Обработка GET запросов (для проверки webhook endpoint)
export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is active',
  })
}

