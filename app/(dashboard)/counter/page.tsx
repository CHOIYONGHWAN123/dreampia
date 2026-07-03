import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CounterDashboard } from '@/components/features/counter/CounterDashboard'

export default async function CounterPage() {
  const supabase = await createServerSupabaseClient()
  const now = new Date().toISOString()

  const [
    { count: mentorCount },
    { count: endedEventCount },
    { count: institutionCount },
    { data: institutions },
    { data: events },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('mentors').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).lt('event_end_at', now),
    supabase.from('institutions').select('*', { count: 'exact', head: true }),
    supabase.from('institutions').select('id, name, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('events').select('event_start_at, campaign_id').not('event_start_at', 'is', null),
    supabase.from('campaign').select('id, name'),
  ])

  return (
    <CounterDashboard
      mentorCount={mentorCount ?? 0}
      endedEventCount={endedEventCount ?? 0}
      institutionCount={institutionCount ?? 0}
      institutions={institutions ?? []}
      events={(events ?? []) as { event_start_at: string; campaign_id: string | null }[]}
      campaigns={campaigns ?? []}
    />
  )
}
