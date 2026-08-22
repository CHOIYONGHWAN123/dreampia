'use client'

import { useMemo, useState } from 'react'
import { CategoryDrilldownChart } from './CategoryDrilldownChart'

type Mentor = { id: string; created_at: string }
type Institution = { id: string; name: string; created_at: string }
type Event = { id: string; name: string; event_category_id: string | null; event_start_at: string | null }
type EventRow = { id: string; event_id: string | null; occupation_program_unit_id: string | null }
type Unit = { id: string; title: string; occupation_programs_id: string | null }
type Program = { id: string; name: string; occupation_id: string | null }
type Occupation = { id: string; name: string; field_id: string | null }
type Field = { id: string; name: string }
type EventCategory = { id: string; name: string }

interface Props {
  mentors: Mentor[]
  institutions: Institution[]
  events: Event[]
  eventRows: EventRow[]
  units: Unit[]
  programs: Program[]
  occupations: Occupation[]
  fields: Field[]
  eventCategories: EventCategory[]
}

function formatDateTimeKr(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 날짜만 비교(시각 무시). end는 그 날 자정까지 포함되도록 하루를 더해 비교한다.
function inRange(iso: string | null, start: string, end: string): boolean {
  if (!iso) return false
  const d = iso.slice(0, 10)
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

const dateInputCls =
  'border border-gray-300 rounded-full px-3 py-1.5 text-sm outline-none focus:border-primary-400'

export function CounterDashboard({
  mentors,
  institutions,
  events,
  eventRows,
  units,
  programs,
  occupations,
  fields,
  eventCategories,
}: Props) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const hasFilter = Boolean(startDate || endDate)

  const filteredMentors = useMemo(
    () => mentors.filter((m) => inRange(m.created_at, startDate, endDate)),
    [mentors, startDate, endDate]
  )
  const filteredInstitutions = useMemo(
    () => institutions.filter((i) => inRange(i.created_at, startDate, endDate)),
    [institutions, startDate, endDate]
  )
  const filteredEvents = useMemo(
    () => events.filter((e) => inRange(e.event_start_at, startDate, endDate)),
    [events, startDate, endDate]
  )

  const recentInstitutions = useMemo(
    () =>
      [...filteredInstitutions]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 50),
    [filteredInstitutions]
  )

  const stats = [
    {
      label: '강사 수',
      value: filteredMentors.length,
      sub: hasFilter ? '선택한 기간에 등록된 강사 수' : '전체 등록된 강사 수',
    },
    {
      label: '행사 횟수',
      value: filteredEvents.length,
      sub: hasFilter ? '선택한 기간에 시작된 행사 수' : '전체 행사 수',
    },
    {
      label: '기관 수',
      value: filteredInstitutions.length,
      sub: hasFilter ? '선택한 기간에 등록된 기관 수' : '전체 등록된 기관 수',
    },
  ]

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">카운터 관리</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={dateInputCls}
          />
          <span className="text-sm text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={dateInputCls}
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              전체 기간
            </button>
          )}
        </div>
      </div>

      {/* ── 상단 stat 카드 ── */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-6 text-center shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* 행사 횟수 카테고리별 드릴다운 */}
      <CategoryDrilldownChart
        events={filteredEvents}
        eventRows={eventRows}
        units={units}
        programs={programs}
        occupations={occupations}
        fields={fields}
        eventCategories={eventCategories}
      />

      {/* 기관 등록 내역 */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기관 등록 내역</h2>
        <div className="space-y-0 max-h-80 overflow-y-auto">
          {recentInstitutions.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">등록된 기관이 없습니다.</p>
          ) : (
            recentInstitutions.map((inst, i) => (
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
    </div>
  )
}
