import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { InstitutionDetailClient } from '@/components/features/institutions/InstitutionDetailClient'

export default async function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: institution }, { data: events }] = await Promise.all([
    supabase.from('institutions').select('id, name, address').eq('id', id).single(),
    supabase
      .from('events')
      .select('id, name, memo, teacher_name, recruit_status, requested_dates, event_start_at')
      .eq('institution_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!institution) notFound()

  return <InstitutionDetailClient institution={institution} events={events || []} />
}
