export default function PaymentSuccessPage() {
  return (
    <div className="container">
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
          <h1 style={{ marginBottom: '16px', color: '#4CAF50' }}>
            Payment successful
          </h1>
          <p style={{ color: '#666', marginBottom: '32px' }}>
            Thank you for your payment. The transaction was processed successfully.
          </p>
          <a
            href={`/internal-payment?token=${encodeURIComponent(process.env.NEXT_PUBLIC_PAYMENT_TOKEN || '')}`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#4CAF50',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Create a new payment
          </a>
        </div>
      </div>
    </div>
  )
}

