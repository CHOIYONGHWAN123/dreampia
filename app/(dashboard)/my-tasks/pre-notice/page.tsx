import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PreNoticeClient, type PreNoticeRow } from '@/components/features/my-tasks/PreNoticeClient'

export default async function PreNoticePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 로그인한 관리자가 영업담당자 또는 소통담당자로 지정된 행사 중,
  // 아직 행사 안내를 보내지 않은 것만 표시.
  const { data: events } = await supabase
    .from('events')
    .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at, pre_notice_sent')
    .or(`sales_admin_id.eq.${user.id},comm_admin_id.eq.${user.id}`)
    .eq('pre_notice_sent', false)
    .order('event_start_at', { ascending: false, nullsFirst: false })

  if (!events || events.length === 0) {
    return <PreNoticeClient rows={[]} />
  }

  const [institutionsRes, adminsRes] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, name')
      .eq('is_deleted', false)
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('admins').select('id, name'),
  ])

  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i.name]))
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]))

  // 소속 기관이 삭제된 행사는 더 이상 할 일이 아니므로 목록에서 제외
  const activeEvents = events.filter((e) => !e.institution_id || institutionMap.has(e.institution_id))

  const rows: PreNoticeRow[] = activeEvents.map((e, i) => ({
    no: i + 1,
    id: e.id,
    institutionId: e.institution_id,
    institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
    eventStartAt: e.event_start_at,
    eventEndAt: e.event_end_at,
    salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
    commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
  }))

  return <PreNoticeClient rows={rows} />
}
