'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'

// Form schema (CARD minimal fields)
const paymentSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  cardNumber: z.string().min(12, 'Card number is required'),
  expMonth: z.string().min(1, 'Exp month is required'),
  expYear: z.string().min(2, 'Exp year is required'),
  cvv: z.string().min(3, 'CVV is required'),
  cardHolderName: z.string().min(2, 'Card holder name is required'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(5, 'Mobile is required'),
  city: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

export default function InternalPaymentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  // Pretty input helpers (formatting + auto-advance)
  const cardNumberRef = useRef<HTMLInputElement | null>(null)
  const expMonthRef = useRef<HTMLInputElement | null>(null)
  const expYearRef = useRef<HTMLInputElement | null>(null)
  const cvvRef = useRef<HTMLInputElement | null>(null)

  const formatCardNumber = (value: string) => value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
  const normalizeCardNumber = (value: string) => value.replace(/\s+/g, '')
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  })

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        amount: Number(data.amount),
        cardNumber: data.cardNumber,
        expMonth: data.expMonth,
        expYear: data.expYear,
        cvv: data.cvv,
        cardHolderName: data.cardHolderName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        city: data.city,
        address: data.address,
        postal_code: data.postal_code,
      }
      console.log('payload', payload);

      const response = await fetch('/api/payment/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      console.log('CARD API Response:', result)

      if (!response.ok) {
        router.push('/payment-failure')
        return
      }

      // Проверка payment_status
      const paymentStatus = result?.response_payload?.payment_result?.payment_status ?? result?.response_payload?.payment_status ?? result?.payment_status
      if (paymentStatus === 'FAILED') {
        router.push('/payment-failure')
        return
      }

      const errorResult = result?.response_payload?.error_result ?? result?.error_result
      const isOkWithoutErrors = !errorResult || (Array.isArray(errorResult) && errorResult.length === 0)

      if (isOkWithoutErrors) {
        router.push('/payment-success')
        return
      }

      router.push('/payment-failure')
    } catch (err: any) {
      setError(err.message || 'Unexpected error')
      try { router.push('/payment-failure') } catch {}
    } finally {
      setLoading(false)
    }
  }
  //     const card = {
  //       holderName: 'Test User',
  //       type: 'CUP',
  //       number: '4111111111111111',
  //       expMonth: '12',
  //       expYear: '2030',
  //       cvv: '111',
  //     }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ marginBottom: '24px', color: '#333' }}>
          Card Payment (Internal Test)
        </h1>

        <p style={{ marginBottom: '20px', color: '#666' }}>
          Enter required fields to initialize a CARD payment via SecurePayZone.
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="amount">Amount *</label>
            <input type="number" step="0.01" id="amount" {...register('amount')} placeholder="100.00" />
            {errors.amount && <div className="error">{errors.amount.message}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="cardNumber">Card number *</label>
            {(() => {
              const { ref: regRef, onChange: regOnChange, onBlur: regOnBlur, ...regRest } = register('cardNumber')
              return (
                <input
                  ref={(el) => { cardNumberRef.current = el; regRef(el) }}
                  type="text"
                  id="cardNumber"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4111 1111 1111 1111"
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value)
                    e.currentTarget.value = formatted
                    e.target.value = normalizeCardNumber(e.target.value)
                    regOnChange(e)
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeCardNumber(e.currentTarget.value)
                    // @ts-ignore mask for UI
                    e.currentTarget.value = formatCardNumber(normalized)
                    regOnBlur(e)
                  }}
                  {...regRest}
                />
              )
            })()}
            {errors.cardNumber && <div className="error">{errors.cardNumber.message}</div>}
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="expMonth">Exp month *</label>
              {(() => {
                const { ref: regRef, onChange: regOnChange, ...regRest } = register('expMonth')
                return (
                  <input
                    ref={(el) => { expMonthRef.current = el; regRef(el) }}
                    type="text"
                    id="expMonth"
                    inputMode="numeric"
                    placeholder="MM"
                    maxLength={2}
                    autoComplete="cc-exp-month"
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
                      if (digits.length === 0) {
                        e.target.value = ''
                        regOnChange(e)
                        return
                      }
                      if (digits.length === 1) {
                        const d = digits[0]
                        if (d >= '2' && d <= '9') {
                          e.target.value = `0${d}`
                          expYearRef.current?.focus()
                        } else {
                          e.target.value = d
                        }
                        regOnChange(e)
                        return
                      }
                      let mm = Number(digits)
                      mm = clamp(mm, 1, 12)
                      e.target.value = String(mm).padStart(2, '0')
                      regOnChange(e)
                      expYearRef.current?.focus()
                    }}
                    {...regRest}
                  />
                )
              })()}
              {errors.expMonth && <div className="error">{errors.expMonth.message}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="expYear">Exp year *</label>
              {(() => {
                const { ref: regRef, onChange: regOnChange, ...regRest } = register('expYear')
                return (
                  <input
                    ref={(el) => { expYearRef.current = el; regRef(el) }}
                    type="text"
                    id="expYear"
                    inputMode="numeric"
                    placeholder="YYYY"
                    maxLength={4}
                    autoComplete="cc-exp-year"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '')
                      e.target.value = v.slice(0, 4)
                      regOnChange(e)
                      if (e.target.value.length === 4) cvvRef.current?.focus()
                    }}
                    {...regRest}
                  />
                )
              })()}
              {errors.expYear && <div className="error">{errors.expYear.message}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="cvv">CVV *</label>
              {(() => {
                const { ref: regRef, onChange: regOnChange, ...regRest } = register('cvv')
                return (
                  <input
                    ref={(el) => { cvvRef.current = el; regRef(el) }}
                    type="password"
                    id="cvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="XXX"
                    maxLength={4}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '')
                      e.target.value = v.slice(0, 4)
                      regOnChange(e)
                    }}
                    {...regRest}
                  />
                )
              })()}
              {errors.cvv && <div className="error">{errors.cvv.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cardHolderName">Card holder name *</label>
            <input type="text" id="cardHolderName" {...register('cardHolderName')} placeholder="Test User" />
            {errors.cardHolderName && <div className="error">{errors.cardHolderName.message}</div>}
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName">First name *</label>
              <input type="text" id="firstName" {...register('firstName')} placeholder="David" />
              {errors.firstName && <div className="error">{errors.firstName.message}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName">Last name *</label>
              <input type="text" id="lastName" {...register('lastName')} placeholder="Same" />
              {errors.lastName && <div className="error">{errors.lastName.message}</div>}
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" {...register('email')} placeholder="david@gmail.com" autoComplete="email" />
              {errors.email && <div className="error">{errors.email.message}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="mobile">Mobile *</label>
              <input type="text" id="mobile" inputMode="tel" {...register('mobile')} placeholder="9846590797" />
              {errors.mobile && <div className="error">{errors.mobile.message}</div>}
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="city">City</label>
              <input type="text" id="city" {...register('city')} placeholder="Beijing" />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="address">Address</label>
              <input type="text" id="address" {...register('address')} placeholder="123 Main St" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="postal_code">Postal code</label>
              <input type="text" id="postal_code" {...register('postal_code')} placeholder="100000" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Pay now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

