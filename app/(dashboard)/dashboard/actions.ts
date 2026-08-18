'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export type RecentEventRow = {
  id: string
  name: string
  institutionName: string | null
  eventStartAt: string | null
  recruitStatus: string | null
}

export type DashboardSummary = {
  ongoingEventCount: number
  recruitWaitingCount: number
  completedThisMonthCount: number
  contractAmountThisMonth: number | null
  recentEvents: RecentEventRow[]
}

// isSuper가 아니면 contractAmountThisMonth는 null로 내려서(계약금은 슈퍼관리자만
// 볼 수 있다는 월별 수익 관리 페이지와 동일한 접근 제어를 대시보드 요약에도 유지) 화면에서 숨긴다.
export async function getDashboardSummary(isSuper: boolean): Promise<DashboardSummary> {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const nowIso = now.toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const [ongoingRes, waitingRes, completedRes, contractRes, recentRes] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_end_at', nowIso),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('recruit_status', '섭외대기'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('event_end_at', monthStart)
      .lt('event_end_at', nextMonthStart)
      .lt('event_end_at', nowIso),
    isSuper
      ? supabase.from('events').select('budget').gte('event_start_at', monthStart).lt('event_start_at', nextMonthStart)
      : Promise.resolve({ data: null }),
    supabase
      .from('events')
      .select('id, name, institution_id, event_start_at, recruit_status')
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const recentEventsRaw = recentRes.data ?? []
  const institutionIds = [...new Set(recentEventsRaw.map((e) => e.institution_id).filter(Boolean))] as string[]
  const { data: institutions } =
    institutionIds.length > 0
      ? await supabase.from('institutions').select('id, name').in('id', institutionIds)
      : { data: [] as { id: string; name: string }[] }
  const institutionMap = new Map((institutions ?? []).map((i) => [i.id, i.name]))

  const contractAmountThisMonth = isSuper
    ? (contractRes.data ?? []).reduce((sum: number, e: { budget: number | null }) => sum + (e.budget ?? 0), 0)
    : null

  return {
    ongoingEventCount: ongoingRes.count ?? 0,
    recruitWaitingCount: waitingRes.count ?? 0,
    completedThisMonthCount: completedRes.count ?? 0,
    contractAmountThisMonth,
    recentEvents: recentEventsRaw.map((e) => ({
      id: e.id,
      name: e.name,
      institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
      eventStartAt: e.event_start_at,
      recruitStatus: e.recruit_status,
    })),
  }
}
