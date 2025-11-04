import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/securezone-client'

// Функция для получения IP адреса клиента
function getClientIp(request: Request): string {
  const headers = request.headers
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  
  const headerCandidates = [
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ]
  for (const name of headerCandidates) {
    const v = headers.get(name)
    if (v) return v
  }
  
  return 'unknown'
}

// Функция для форматирования лога в читаемый текстовый формат
function formatWebhookLog(data: any, ip: string): string {
  const timestamp = new Date().toISOString()
  const separator = '='.repeat(80)
  
  // Текстовая сериализация JSON через JSON.stringify
  const textSerialization = JSON.stringify(data, null, 2)
  
  return `
${separator}
WEBHOOK LOG - ${timestamp}
${separator}
IP Address: ${ip}
${separator}
ТЕКСТОВАЯ СЕРИАЛИЗАЦИЯ JSON:
${textSerialization}
${separator}
EXTRACTED DATA:
- Order ID: ${data.order_id || 'N/A'}
- Transaction ID: ${data.transaction_id || 'N/A'}
- Status: ${data.status || 'N/A'}
- Amount: ${data.amount || 'N/A'} ${data.currency || 'N/A'}
- Timestamp: ${data.timestamp || 'N/A'}
- Signature: ${data.signature ? 'present' : 'missing'}
${separator}
`
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const timestamp = new Date().toISOString()
  
  try {
    const body = await request.json()
    
    // Логируем полный запрос в читаемом формате
    // const logText = formatWebhookLog(body, clientIp)
    // console.log(logText)
    
    // Отдельный лог с текстовой сериализацией JSON через JSON.stringify
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log('📋 ТЕКСТОВАЯ СЕРИАЛИЗАЦИЯ WEBHOOK JSON:')
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log(JSON.stringify(body, null, 2))
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Также логируем как JSON для удобства парсинга
    console.log('WEBHOOK_JSON:', JSON.stringify({
      timestamp,
      ip: clientIp,
      body,
      headers: Object.fromEntries(request.headers.entries()),
    }, null, 2))
    
    // ⚠️ ВНИМАНИЕ: Проверка подписи ОТКЛЮЧЕНА для тестирования!
    // TODO: Включить обратно перед production деплоем!
    // console.warn('⚠️⚠️⚠️ SIGNATURE VERIFICATION DISABLED FOR TESTING ⚠️⚠️⚠️')
    
    // Проверяем подпись webhook (ОТКЛЮЧЕНО для тестирования)
    // const signature = body.signature
    // const receivedParams = { ...body }
    // delete receivedParams.signature
    // 
    // if (!verifyWebhookSignature(receivedParams, signature)) {
    //   console.error(`❌ INVALID SIGNATURE - IP: ${clientIp}, Time: ${timestamp}`)
    //   return NextResponse.json(
    //     { error: 'Invalid signature' },
    //     { status: 401 }
    //   )
    // }

    // Обрабатываем webhook от Securezone
    // const {
    //   order_id,
    //   status,
    //   transaction_id,
    //   amount,
    //   currency,
    //   timestamp: webhookTimestamp,
    // } = body

    // console.log('✅ Webhook received from Securezone:', {
    //   timestamp,
    //   ip: clientIp,
    //   orderId: order_id,
    //   status,
    //   transactionId: transaction_id,
    //   amount,
    //   currency,
    //   webhookTimestamp,
    // })

    // Здесь можно добавить логику:
    // 1. Обновить статус заказа в БД
    // 2. Отправить уведомление пользователю
    // 3. Записать в лог транзакций
    // 4. Интегрировать с CRM/системой учета
    
    // ВАРИАНТ: Сохранение в базу данных (раскомментируйте при необходимости)
    // await saveWebhookToDatabase(body, clientIp, timestamp)

    // Возвращаем успешный ответ Securezone
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      receivedAt: timestamp,
    })
  } catch (error: any) {
    const errorLog = `
❌ WEBHOOK ERROR - ${timestamp}
IP: ${clientIp}
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
`
    console.error(errorLog)
    console.error('Full error object:', error)
    
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
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhook',
  })
}

