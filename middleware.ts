import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Защищаем страницу внутренних платежей
  if (pathname.startsWith('/internal-payment')) {
    const token = request.nextUrl.searchParams.get('token')
    const secretToken = process.env.NEXT_PUBLIC_PAYMENT_TOKEN

    // Проверяем наличие токена
    if (!token || token !== secretToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Защищаем API роуты
  if (pathname.startsWith('/api/payment')) {
    const authHeader = request.headers.get('authorization')
    
    // Можно добавить дополнительную проверку через header
    // if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/internal-payment/:path*',
    '/api/payment/:path*',
  ],
}

