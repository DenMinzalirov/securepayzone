export default function PaymentFailurePage() {
  return (
    <div className="container">
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>❌</div>
          <h1 style={{ marginBottom: '16px', color: '#f44336' }}>
            Payment failed
          </h1>
          <p style={{ color: '#666', marginBottom: '32px' }}>
            Unfortunately, the payment was not completed. Please try again.
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
            Try again
          </a>
        </div>
      </div>
    </div>
  )
}

