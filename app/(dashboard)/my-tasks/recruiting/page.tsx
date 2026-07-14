import { createServerSupabaseClient } from '@/lib/supabase-server'
import { RecruitingClient, type RecruitingRow } from '@/components/features/my-tasks/RecruitingClient'

export default async function RecruitingPage() {
  const supabase = await createServerSupabaseClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at')
    .order('event_start_at', { ascending: false, nullsFirst: false })

  if (!events || events.length === 0) {
    return <RecruitingClient rows={[]} />
  }

  const [institutionsRes, adminsRes] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, name')
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('admins').select('id, name'),
  ])

  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i.name]))
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]))

  const rows: RecruitingRow[] = events.map((e, i) => ({
    no: i + 1,
    id: e.id,
    institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
    eventStartAt: e.event_start_at,
    eventEndAt: e.event_end_at,
    salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
    commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
  }))

  return <RecruitingClient rows={rows} />
}
