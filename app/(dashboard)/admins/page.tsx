import { getCurrentAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AdminsClient } from '@/components/features/admins/AdminsClient'
import { getAdmins } from './actions'

export default async function AdminsPage() {
  const { id, isSuper } = await getCurrentAdmin()
  if (!isSuper) redirect('/dashboard')

  const admins = await getAdmins()

  return <AdminsClient admins={admins} currentAdminId={id} />
}
