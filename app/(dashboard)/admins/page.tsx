import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AdminsClient } from '@/components/features/admins/AdminsClient'
import { getAdmins } from './actions'

export default async function AdminsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('admins').select('is_super').eq('id', user.id).single()
  if (!me?.is_super) redirect('/dashboard')

  const admins = await getAdmins()

  return <AdminsClient admins={admins} currentAdminId={user.id} />
}
