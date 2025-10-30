import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Securezone Payment Form',
  description: 'Internal payment form for Securezone',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

