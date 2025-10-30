import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

type CardType = 'VISA' | 'MASTERCARD' | 'CUP'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const headerCandidates = [
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'x-forwarded',
    'forwarded',
  ]
  for (const name of headerCandidates) {
    const v = req.headers.get(name)
    if (v) return v
  }
  const reqAny = req as unknown as { ip?: string }
  if (reqAny?.ip) return reqAny.ip
  return '127.0.0.1'
}

export async function POST(req: NextRequest) {
    // console.log('CARD PAYIN request received', req.body)
  try {
    const AUTHKEY = process.env.SECUREZONE_AUTH_KEY
    const SECRETKEY = process.env.SECUREZONE_SECRET_KEY
    const NOTIFICATION_URL = process.env.NOTIFICATION_URL

    if (!AUTHKEY || !SECRETKEY || !NOTIFICATION_URL) {
      return NextResponse.json({ error: 'Server env not configured' }, { status: 500 })
    }

    const body = await req.json()
    console.log('body', body);
    
    const {
      amount,
      cardNumber,
      expMonth,
      expYear,
      cvv,
      cardHolderName,
      firstName,
      lastName,
      email,
      mobile,
    } = body ?? {}

    if (!amount || !cardNumber || !expMonth || !expYear || !cvv || !cardHolderName || !firstName || !lastName || !email || !mobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Constants adjustable in code (per user request)
    const COUNTRY = 'CN' // ISO-2
    const CURRENCY = 'CNY' // ISO-3
    const CATEGORY_CLASS: 'VIP' | 'NonVIP' = 'NonVIP'
    const DEVICE_FINGERPRINT = 'NA'
    const IP_ADDRESS = getClientIp(req)
    const CARD_TYPE: CardType = String(cardNumber).startsWith('62')
      ? 'CUP'
      : String(cardNumber).startsWith('5')
      ? 'MASTERCARD'
      : 'VISA'
    const paymentRefId = `card-${Date.now()}`

    // Signature for CARD: authkey||payment_ref_id||currency||secretkey
    const plaintext = [AUTHKEY, paymentRefId, CURRENCY, SECRETKEY.toLowerCase()].join('||')
    const requestSignature = sha256Hex(plaintext)

    const providerBody = {
      request_mode: 'payin',
      request_payload: {
        request_authkey: AUTHKEY,
        request_flow: 'direct',
        request_payment_method: 'CARD',
        payment_method_payload: {
          card_holder_name: cardHolderName,
          card_type: CARD_TYPE,
          card_number: String(cardNumber),
          expiry_month: String(expMonth),
          expiry_year: String(expYear),
          cvv: String(cvv),
        },
        request_signature: requestSignature,
        customer_payload: {
          first_name: firstName,
          last_name: lastName,
          email,
          mobile,
          country: COUNTRY,
          ip_address: IP_ADDRESS,
        },
        payment_payload: {
          payment_ref_id: paymentRefId,
          request_amount: Number(amount),
          currency: CURRENCY,
          notification_url: NOTIFICATION_URL,
        },
        risk_payload: {
          category_class: CATEGORY_CLASS,
          device_fingerprint: DEVICE_FINGERPRINT,
        },
      },
    }

    // return NextResponse.json({ ok: true, providerBody })

    const res = await fetch('https://api.securepayzone.com/api/request/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(providerBody),
    })

    const json = await res.json().catch(() => ({}))
    return NextResponse.json(json, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


