## SecurePayZone — PAYIN (Direct: UPI и QR с UPI Intent)

- Content-Type: `application/json`
- Метод: `POST`
- Production URL: `https://api.securepayzone.com/api/request/create`

### 1) Запрос (Direct)
- request_mode: `payin`
- request_payload:
  - request_authkey (string, обяз.)
  - request_flow (string, обяз.) — `direct`
  - request_payment_method (string, обяз.) — `UPI` | `BANKTRANSFER` | `QR` | `CARD`
  - payment_method_payload (object, условно обяз.)
  - request_signature (string, обяз.) — SHA256 по правилам ниже
  - customer_payload (object, обяз.)
  - payment_payload (object, обяз.) — содержит `payment_ref_id`, `request_amount`, `currency`, `notification_url`
  - risk_payload (object, обяз.) — `category_class` (`VIP`/`NonVIP`), `device_fingerprint`
  - custom_field1..custom_field10 (string, необяз.)

Правила подписи:
- Алгоритм: SHA256 (hex)
- `secretkey` — в нижнем регистре
- Сумма умножается на 100 перед конкатенацией

Сборка plaintext для подписи:
- UPI: `authkey||upi_id||payment_ref_id||currency||(amount*100)||secretkey`
- BANKTRANSFER: `authkey||bank_mapping_code||payment_ref_id||currency||(amount*100)||secretkey`
- CARD: `authkey||payment_ref_id||currency||secretkey`
- QR (UPI Intent): `authkey||payment_ref_id||currency||(amount*100)||secretkey`

### 2) Ответ (Direct)
- Верхний уровень: `request_mode`, `success`, `error_result`, `response_payload`
- response_payload:
  - request_authkey, request_flow (`direct`), request_payment_method
  - response_signature (SHA256)
  - payment_result: `payment_id`, `payment_status` (`AWAITING`|`CAPTURED`|`FAILED`), `payment_created_date`, `payment_amount`, `payment_ref_id`, `currency`, `payment_response_code`, `payment_response_message`
  - Для QR дополнительно: `payment_html` (QR в base64), `payment_link` (UPI intent в base64)

Подпись ответа:
- UPI: `authkey||payment_ref_id||payment_id||status||currency||(amount*100)||secretkey`
- QR (UPI Intent): `authkey||payment_ref_id||payment_id||status||currency||(amount*100)||payment_link||payment_html||secretkey`

### 3) Вебхук (PAYIN/PAYOUT)
- URL: `notification_url` из запроса
- Тело: `payment_id`, `payment_status`, `payment_create_date` (UTC), `payment_amount`, `payment_ref_id`, `currency`, `payment_response_message`, `request_signature`, `payment_utr_number` (только payouts)
- Подпись: `authkey||payment_id||status||(amount*100)||payment_ref_id||currency||secretkey`

---

## TypeScript — генерация SHA256 подписи и сборка plaintext

```typescript
import crypto from 'crypto';

export function sha256Hex(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export type PaymentMethod = 'UPI' | 'BANKTRANSFER' | 'QR' | 'CARD';

interface CommonParts {
  authkey: string;
  paymentRefId: string;
  currency: string; // e.g. INR, USD
  amount: number;   // decimal, e.g. 10
  secretkey: string; // must be lower-case
}

export function buildPlaintextUPI(parts: CommonParts & { upiId: string }): string {
  const amountX100 = Math.round(parts.amount * 100);
  return [
    parts.authkey,
    parts.upiId,
    parts.paymentRefId,
    parts.currency,
    String(amountX100),
    parts.secretkey.toLowerCase(),
  ].join('||');
}

export function buildPlaintextBank(parts: CommonParts & { bankMappingCode: string }): string {
  const amountX100 = Math.round(parts.amount * 100);
  return [
    parts.authkey,
    parts.bankMappingCode,
    parts.paymentRefId,
    parts.currency,
    String(amountX100),
    parts.secretkey.toLowerCase(),
  ].join('||');
}

export function buildPlaintextCard(parts: CommonParts): string {
  return [
    parts.authkey,
    parts.paymentRefId,
    parts.currency,
    parts.secretkey.toLowerCase(),
  ].join('||');
}

export function buildPlaintextQR(parts: CommonParts): string {
  const amountX100 = Math.round(parts.amount * 100);
  return [
    parts.authkey,
    parts.paymentRefId,
    parts.currency,
    String(amountX100),
    parts.secretkey.toLowerCase(),
  ].join('||');
}
```

### Подпись ответа (пример UPI)
```typescript
interface ResponseSignatureUPIParts {
  authkey: string;
  paymentRefId: string;
  paymentId: string | number;
  status: 'AWAITING' | 'CAPTURED' | 'FAILED';
  currency: string;
  amount: number;
  secretkey: string;
}

export function buildResponsePlaintextUPI(p: ResponseSignatureUPIParts): string {
  const amountX100 = Math.round(p.amount * 100);
  return [
    p.authkey,
    p.paymentRefId,
    String(p.paymentId),
    p.status,
    p.currency,
    String(amountX100),
    p.secretkey.toLowerCase(),
  ].join('||');
}
```

---

## TypeScript — минимальные примеры запросов (fetch)

```typescript
const API_URL = 'https://api.securepayzone.com/api/request/create';

type UpiRequest = {
  request_mode: 'payin';
  request_payload: {
    request_authkey: string;
    request_flow: 'direct';
    request_payment_method: 'UPI';
    payment_method_payload: { upi_id: string };
    request_signature: string;
    customer_payload: {
      first_name: string;
      last_name: string;
      email: string;
      mobile: string;
      country: string; // e.g. 'IN'
    };
    payment_payload: {
      payment_ref_id: string;
      request_amount: number;
      currency: string; // e.g. 'INR'
      notification_url: string;
    };
    risk_payload: {
      category_class: 'VIP' | 'NonVIP';
      device_fingerprint: string;
    };
  };
};

export async function createUpiPayin(params: {
  authkey: string;
  secretkey: string;
  upiId: string;
  paymentRefId: string;
  amount: number;
  currency: string;
  notificationUrl: string;
}) {
  const plaintext = buildPlaintextUPI({
    authkey: params.authkey,
    upiId: params.upiId,
    paymentRefId: params.paymentRefId,
    currency: params.currency,
    amount: params.amount,
    secretkey: params.secretkey,
  });
  const signature = sha256Hex(plaintext);

  const body: UpiRequest = {
    request_mode: 'payin',
    request_payload: {
      request_authkey: params.authkey,
      request_flow: 'direct',
      request_payment_method: 'UPI',
      payment_method_payload: { upi_id: params.upiId },
      request_signature: signature,
      customer_payload: {
        first_name: 'david',
        last_name: 'same',
        email: 'david@gmail.com',
        mobile: '9846590797',
        country: 'IN',
      },
      payment_payload: {
        payment_ref_id: params.paymentRefId,
        request_amount: params.amount,
        currency: params.currency,
        notification_url: params.notificationUrl,
      },
      risk_payload: { category_class: 'VIP', device_fingerprint: 'NA' },
    },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

```typescript
type QrRequest = {
  request_mode: 'payin';
  request_payload: {
    request_authkey: string;
    request_flow: 'direct';
    request_payment_method: 'QR';
    request_signature: string;
    customer_payload: {
      first_name: string;
      last_name: string;
      email: string;
      mobile: string;
      country: string;
      ip_address?: string;
    };
    payment_payload: {
      payment_ref_id: string;
      request_amount: number;
      currency: string;
      notification_url: string;
      return_url?: string;
    };
    risk_payload: {
      category_class: 'VIP' | 'NonVIP';
      device_fingerprint: string;
    };
  };
};

export async function createQrPayin(params: {
  authkey: string;
  secretkey: string;
  paymentRefId: string;
  amount: number;
  currency: string;
  notificationUrl: string;
  returnUrl?: string;
}) {
  const plaintext = buildPlaintextQR({
    authkey: params.authkey,
    paymentRefId: params.paymentRefId,
    currency: params.currency,
    amount: params.amount,
    secretkey: params.secretkey,
  });
  const signature = sha256Hex(plaintext);

  const body: QrRequest = {
    request_mode: 'payin',
    request_payload: {
      request_authkey: params.authkey,
      request_flow: 'direct',
      request_payment_method: 'QR',
      request_signature: signature,
      customer_payload: {
        first_name: 'david',
        last_name: 'same',
        email: 'david@gmail.com',
        mobile: '9846590797',
        country: 'IN',
      },
      payment_payload: {
        payment_ref_id: params.paymentRefId,
        request_amount: params.amount,
        currency: params.currency,
        notification_url: params.notificationUrl,
        return_url: params.returnUrl,
      },
      risk_payload: { category_class: 'VIP', device_fingerprint: 'NA' },
    },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

---

### Примечания
- Всегда приводите `secretkey` к нижнему регистру перед конкатенацией.
- Используйте `Math.round(amount * 100)` для целочисленного значения.
- `payment_ref_id` должен быть уникален для каждой транзакции.


