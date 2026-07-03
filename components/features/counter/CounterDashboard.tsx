'use client'

import { useState, useMemo } from 'react'

type Institution = { id: string; name: string; created_at: string }
type Event = { event_start_at: string; campaign_id: string | null }
type Campaign = { id: string; name: string }

interface Props {
  mentorCount: number
  endedEventCount: number
  institutionCount: number
  institutions: Institution[]
  events: Event[]
  campaigns: Campaign[]
}

function formatDateTimeKr(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

export function CounterDashboard({
  mentorCount,
  endedEventCount,
  institutionCount,
  institutions,
  events,
  campaigns,
}: Props) {
  const today = new Date()
  const oneYearLater = new Date(today)
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

  const [startDate, setStartDate] = useState(toDateInputValue(today))
  const [endDate, setEndDate] = useState(toDateInputValue(oneYearLater))

  const campaignMap = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns]
  )

  const chartData = useMemo(() => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate + 'T23:59:59') : null

    const counts: Record<string, number> = {}

    for (const e of events) {
      const d = new Date(e.event_start_at)
      if (start && d < start) continue
      if (end && d > end) continue
      const label = e.campaign_id ? (campaignMap.get(e.campaign_id) ?? '기타') : '기타'
      counts[label] = (counts[label] ?? 0) + 1
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], i) => ({ label, count, color: BAR_COLORS[i % BAR_COLORS.length] }))
  }, [events, startDate, endDate, campaignMap])

  const maxCount = Math.max(...chartData.map((d) => d.count), 1)
  const totalInPeriod = chartData.reduce((s, d) => s + d.count, 0)

  const CHART_HEIGHT = 180

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">카운터 관리</h1>

      {/* ── 상단 stat 카드 ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '강사 수', value: mentorCount, sub: '등록된 강사 수' },
          { label: '행사 횟수', value: endedEventCount, sub: '종료된 행사 수' },
          { label: '기관 수', value: institutionCount, sub: '등록된 기관 수' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── 하단 2-컬럼 ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* 기관 등록 내역 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">기관 등록 내역</h2>
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {institutions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">등록된 기관이 없습니다.</p>
            ) : (
              institutions.map((inst, i) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{i + 1}</span>
                  <span className="text-xs text-gray-500 shrink-0 font-mono">
                    {formatDateTimeKr(inst.created_at)}
                  </span>
                  <span className="text-xs text-gray-800 font-medium">{inst.name}</span>
                  <span className="text-xs text-gray-400">등록</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 기간별 행사 카운트 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">기간별 행사 카운트</h2>
            <span className="text-xs text-gray-400">총 {totalInPeriod}건</span>
          </div>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-2 mb-5 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-gray-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-gray-500"
            />
          </div>

          {chartData.length === 0 ? (
            <p className="text-xs text-gray-400 py-12 text-center">해당 기간에 행사가 없습니다.</p>
          ) : (
            <>
              {/* 막대 차트 */}
              <div className="relative flex items-end gap-3 px-2" style={{ height: `${CHART_HEIGHT}px` }}>
                {/* Y축 기준선 */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <div
                    key={ratio}
                    className="absolute left-0 right-0 flex items-center"
                    style={{ bottom: `${ratio * (CHART_HEIGHT - 24)}px` }}
                  >
                    <span className="text-[10px] text-gray-300 w-6 text-right shrink-0 leading-none">
                      {Math.round(maxCount * ratio)}
                    </span>
                    <div className="flex-1 border-t border-gray-100 ml-1" />
                  </div>
                ))}

                {/* 바 */}
                <div className="flex items-end gap-3 ml-7 w-full">
                  {chartData.map((d) => {
                    const barH = Math.max(((d.count / maxCount) * (CHART_HEIGHT - 28)), 4)
                    return (
                      <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[11px] font-medium text-gray-700">{d.count}</span>
                        <div
                          className="w-full rounded-t transition-all duration-300"
                          style={{ height: `${barH}px`, backgroundColor: d.color }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 카테고리 라벨 */}
              <div className="flex gap-3 mt-2 ml-7">
                {chartData.map((d) => (
                  <div key={d.label} className="flex flex-col items-center flex-1">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-gray-600 text-center mt-0.5 leading-tight break-keep">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
