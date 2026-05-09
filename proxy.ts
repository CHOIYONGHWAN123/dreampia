import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // 미들웨어용 Supabase 클라이언트 (쿠키 읽기/쓰기 직접 처리)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll() // 클라이언트가 보낸 HTTP요청의 쿠키를 전부 반환, supabase는 sb-<project>-auth-token 같은 이름의 쿠키를 찾아 세션을 복원
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()는 서버에서 토큰을 직접 검증 (getSession()보다 안전)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isPendingPage = pathname === '/pending'

  // 세션 없음 → 로그인 페이지로 (인증 페이지, pending은 제외)
  if (!user && !isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user) {
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('is_authenticated')
      .eq('id', user.id)
      .single()


    const isApproved = admin?.is_authenticated === true

    // 이미 승인된 관리자가 인증 페이지나 pending에 접근하면 대시보드로
    if (isApproved && (isAuthPage || isPendingPage)) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // 미승인 관리자가 보호된 페이지 접근하면 pending으로
    if (!isApproved && !isAuthPage && !isPendingPage) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/pending'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
