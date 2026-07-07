import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하는 관리자 클라이언트 (서버에서만 사용)
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
