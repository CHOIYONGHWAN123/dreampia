import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { EstimateTaskClient, type EstimateTaskRow } from '@/components/features/my-tasks/EstimateTaskClient'

export default async function EstimateTaskPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 로그인한 관리자가 영업담당자 또는 소통담당자로 지정된 행사 중,
  // 아직 견적서를 올리지 않은 것만 표시.
  const { data: events } = await supabase
    .from('events')
    .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at, estimate_file_url')
    .or(`sales_admin_id.eq.${user.id},comm_admin_id.eq.${user.id}`)
    .is('estimate_file_url', null)
    .order('event_start_at', { ascending: false, nullsFirst: false })

  if (!events || events.length === 0) {
    return <EstimateTaskClient rows={[]} />
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

  const rows: EstimateTaskRow[] = events.map((e, i) => ({
    no: i + 1,
    id: e.id,
    institutionId: e.institution_id,
    institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
    eventStartAt: e.event_start_at,
    eventEndAt: e.event_end_at,
    salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
    commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
  }))

  return <EstimateTaskClient rows={rows} />
}
