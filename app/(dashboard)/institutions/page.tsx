import { createServerSupabaseClient } from '@/lib/supabase-server'
import { InstitutionsClient } from '@/components/features/institutions/InstitutionsClient'

export default async function InstitutionsPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('institutions')
    .select('*')
    .order('created_at', { ascending: true })

  return <InstitutionsClient institutions={data || []} />
}
