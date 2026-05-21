import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MentorsClient } from '@/components/features/mentors/MentorsClient'

export default async function MentorsPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('mentors')
    .select('id, name, phone, email, address, available_areas, is_available, is_authenticated, score, created_at')
    .order('created_at', { ascending: true })

  return <MentorsClient mentors={data || []} />
}
