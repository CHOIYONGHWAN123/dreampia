import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버 컴포넌트 / Server Action에서 사용하는 Supabase 클라이언트
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: { 
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서는 쿠키 설정 불가 - 무시해도 됨 (미들웨어가 처리)
          }
        },
      },
    }
  )
}
