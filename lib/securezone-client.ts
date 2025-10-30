import crypto from 'crypto'

/**
 * Создает подпись для запроса к Securezone API
 */
export function createSignature(params: Record<string, string>, secretKey: string): string {
  // Сортируем параметры по ключам
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  // Создаем подпись используя HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex')

  return signature.toUpperCase()
}

/**
 * Проверяет подпись webhook от Securezone
 */
export function verifyWebhookSignature(
  params: Record<string, string>,
  receivedSignature: string
): boolean {
  const secretKey = process.env.WEBHOOK_SECRET || process.env.SECUREZONE_SECRET_KEY
  
  if (!secretKey) {
    return false
  }

  // Удаляем signature из параметров перед проверкой
  const { signature, ...paramsWithoutSig } = params
  const calculatedSignature = createSignature(paramsWithoutSig, secretKey)

  return receivedSignature === calculatedSignature
}

