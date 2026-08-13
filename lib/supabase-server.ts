import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

// my-tasks 등에서 로그인한 관리자 본인 정보(id, 슈퍼관리자 여부)를 가져올 때 사용.
// 미로그인 시 로그인 페이지로 리다이렉트한다.
export async function getCurrentAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase.from('admins').select('is_super').eq('id', user.id).single()

  return { id: user.id, isSuper: admin?.is_super ?? false }
}
