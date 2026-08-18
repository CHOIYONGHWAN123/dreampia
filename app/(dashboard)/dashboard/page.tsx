import Link from 'next/link'
import { createServerSupabaseClient, getCurrentAdmin } from '@/lib/supabase-server'
import { getDashboardSummary } from './actions'

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} (${'일월화수목금토'[d.getDay()]})`
}

function recruitStatusStyle(status: string | null) {
  if (status === '섭외완료') return 'bg-emerald-50 text-emerald-600'
  if (status === '섭외진행중') return 'bg-gold-100 text-gold-700'
  return 'bg-gray-100 text-gray-500'
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { id, isSuper } = await getCurrentAdmin(supabase)
  const [{ data: adminRow }, summary] = await Promise.all([
    supabase.from('admins').select('name').eq('id', id).single(),
    getDashboardSummary(isSuper),
  ])
  const name = adminRow?.name ?? ''

  const stats = [
    { label: '진행중인 행사', value: `${summary.ongoingEventCount}건`, tint: 'bg-primary-50', iconColor: 'text-primary-500' },
    ...(summary.contractAmountThisMonth !== null
      ? [
          {
            label: '이번 달 계약금 합계',
            value: `₩${summary.contractAmountThisMonth.toLocaleString()}`,
            tint: 'bg-gold-100',
            iconColor: 'text-gold-600',
          },
        ]
      : []),
    { label: '강사 섭외 대기', value: `${summary.recruitWaitingCount}건`, tint: 'bg-primary-50', iconColor: 'text-primary-500' },
    { label: '이번 달 완료 행사', value: `${summary.completedThisMonthCount}건`, tint: 'bg-gold-100', iconColor: 'text-gold-600' },
  ]

  return (
    <div className="p-9 flex flex-col gap-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">안녕하세요, {name}님</h1>
          <p className="text-sm text-gray-400 mt-1">오늘 기준 드림피아 운영 현황을 한눈에 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)] flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-2xl ${s.tint} flex items-center justify-center`}>
              <span className={`w-2.5 h-2.5 rounded-full ${s.iconColor} bg-current`} />
            </div>
            <span className="text-[26px] font-extrabold text-gray-900 leading-none">{s.value}</span>
            <span className="text-[13px] text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] p-8 relative overflow-hidden bg-linear-to-br from-primary-500 to-primary-700">
        <div className="absolute w-56 h-56 rounded-full bg-white/10 -top-24 right-16" />
        <div className="absolute w-32 h-32 rounded-full bg-white/10 -bottom-16 -right-4" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-white/70 tracking-wide">강사 섭외</span>
            <span className="text-xl font-extrabold text-white">
              섭외대기 행사 {summary.recruitWaitingCount}건이 담당자를 기다리고 있어요
            </span>
            <span className="text-[13px] text-white/80">나의 할일에서 바로 섭외를 시작할 수 있습니다.</span>
          </div>
          <Link
            href="/my-tasks/recruiting"
            className="shrink-0 bg-white text-primary-700 text-sm font-bold px-6 py-3 rounded-full shadow-lg whitespace-nowrap hover:bg-gray-50 transition-colors"
          >
            강사 섭외 바로가기
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-extrabold text-gray-900">최근 행사</span>
          <Link href="/event-operations" className="text-[13px] font-bold text-primary-500 hover:text-primary-600">
            전체보기
          </Link>
        </div>
        {summary.recentEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 shadow-[0_8px_22px_rgba(20,20,40,0.05)]">
            등록된 행사가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.recentEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="bg-white rounded-[20px] p-4 flex flex-col gap-3 shadow-[0_8px_22px_rgba(20,20,40,0.05)] hover:shadow-[0_10px_28px_rgba(20,20,40,0.09)] transition-shadow"
              >
                <div className="h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-600 text-xs font-bold">
                    {ev.institutionName?.[0] ?? '행'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs text-gray-400 truncate">{ev.institutionName ?? '-'}</span>
                  <span className="text-sm font-bold text-gray-900 truncate">{ev.name}</span>
                  <span className="text-xs text-gray-400">{fmtDate(ev.eventStartAt)}</span>
                </div>
                <span
                  className={`self-start text-[11px] font-bold px-3 py-1 rounded-full ${recruitStatusStyle(ev.recruitStatus)}`}
                >
                  {ev.recruitStatus ?? '-'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
