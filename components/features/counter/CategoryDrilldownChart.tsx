'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type EventRow = { id: string; event_category_id: string | null; event_start_at: string | null }
type EventRowRow = { id: string; event_id: string | null; occupation_program_unit_id: string | null }
type UnitRow = { id: string; title: string; occupation_programs_id: string | null }
type ProgramRow = { id: string; name: string; occupation_id: string | null }
type OccupationRow = { id: string; name: string; field_id: string | null }
type FieldRow = { id: string; name: string; event_category_id: string | null }
type CategoryRow = { id: string; name: string }

type Crumb = { id: string; name: string }

// 8슬롯 카테고리 팔레트(고정 순서) — dataviz 가이드의 검증된 기본 팔레트.
// 매 레벨마다 새 항목 집합을 그리므로 슬롯은 "값이 큰 순서"로 항목에 배정한다.
const PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]
const OTHER_COLOR = '#9a988f'
const MAX_SLICES = 7 // 그 이상은 "기타"로 접는다

const LEVEL_LABELS = ['행사 구분', '분야', '직종', '프로그램', '프로그램 유닛']

type Slice = { id: string; name: string; value: number }

function toSlices(counts: Map<string, { name: string; value: number }>): Slice[] {
  const all = [...counts.entries()]
    .map(([id, v]) => ({ id, name: v.name, value: v.value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)

  if (all.length <= MAX_SLICES) return all

  const head = all.slice(0, MAX_SLICES)
  const rest = all.slice(MAX_SLICES)
  const otherTotal = rest.reduce((sum, s) => sum + s.value, 0)
  return [...head, { id: '__other__', name: `기타 ${rest.length}건`, value: otherTotal }]
}

export function CategoryDrilldownChart({
  events,
  eventRows,
  units,
  programs,
  occupations,
  fields,
  eventCategories,
}: {
  events: EventRow[]
  eventRows: EventRowRow[]
  units: UnitRow[]
  programs: ProgramRow[]
  occupations: OccupationRow[]
  fields: FieldRow[]
  eventCategories: CategoryRow[]
}) {
  const [path, setPath] = useState<Crumb[]>([])

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units])
  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const occupationMap = useMemo(() => new Map(occupations.map((o) => [o.id, o])), [occupations])
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields])
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])

  // event_row 하나하나를 유닛→프로그램→직종→분야→행사구분 체인까지 미리 풀어둔다.
  // 체인 중 하나라도 끊겨 있으면(삭제/미연결) 집계에서 제외한다.
  const resolvedRows = useMemo(() => {
    return eventRows.flatMap((row) => {
      if (!row.event_id || !row.occupation_program_unit_id) return []
      const event = eventMap.get(row.event_id)
      if (!event) return [] // 기간 필터로 제외된 행사에 속한 row

      const unit = unitMap.get(row.occupation_program_unit_id)
      const program = unit?.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : undefined
      const occupation = program?.occupation_id ? occupationMap.get(program.occupation_id) : undefined
      const field = occupation?.field_id ? fieldMap.get(occupation.field_id) : undefined
      if (!unit || !program || !occupation || !field) return []

      return [
        {
          categoryId: field.event_category_id,
          fieldId: field.id,
          fieldName: field.name,
          occupationId: occupation.id,
          occupationName: occupation.name,
          programId: program.id,
          programName: program.name,
          unitId: unit.id,
          unitName: unit.title,
        },
      ]
    })
  }, [eventRows, eventMap, unitMap, programMap, occupationMap, fieldMap])

  const { slices, levelLabel } = useMemo(() => {
    if (path.length === 0) {
      const counts = new Map<string, { name: string; value: number }>()
      for (const c of eventCategories) counts.set(c.id, { name: c.name, value: 0 })
      for (const e of events) {
        if (!e.event_category_id) continue
        const entry = counts.get(e.event_category_id)
        if (entry) entry.value += 1
      }
      return { slices: toSlices(counts), levelLabel: LEVEL_LABELS[0] }
    }

    const categoryId = path[0].id
    if (path.length === 1) {
      const counts = new Map<string, { name: string; value: number }>()
      for (const r of resolvedRows) {
        if (r.categoryId !== categoryId) continue
        const entry = counts.get(r.fieldId) ?? { name: r.fieldName, value: 0 }
        entry.value += 1
        counts.set(r.fieldId, entry)
      }
      return { slices: toSlices(counts), levelLabel: LEVEL_LABELS[1] }
    }

    const fieldId = path[1].id
    if (path.length === 2) {
      const counts = new Map<string, { name: string; value: number }>()
      for (const r of resolvedRows) {
        if (r.categoryId !== categoryId || r.fieldId !== fieldId) continue
        const entry = counts.get(r.occupationId) ?? { name: r.occupationName, value: 0 }
        entry.value += 1
        counts.set(r.occupationId, entry)
      }
      return { slices: toSlices(counts), levelLabel: LEVEL_LABELS[2] }
    }

    const occupationId = path[2].id
    if (path.length === 3) {
      const counts = new Map<string, { name: string; value: number }>()
      for (const r of resolvedRows) {
        if (r.categoryId !== categoryId || r.fieldId !== fieldId || r.occupationId !== occupationId) continue
        const entry = counts.get(r.programId) ?? { name: r.programName, value: 0 }
        entry.value += 1
        counts.set(r.programId, entry)
      }
      return { slices: toSlices(counts), levelLabel: LEVEL_LABELS[3] }
    }

    const programId = path[3].id
    const counts = new Map<string, { name: string; value: number }>()
    for (const r of resolvedRows) {
      if (
        r.categoryId !== categoryId ||
        r.fieldId !== fieldId ||
        r.occupationId !== occupationId ||
        r.programId !== programId
      )
        continue
      const entry = counts.get(r.unitId) ?? { name: r.unitName, value: 0 }
      entry.value += 1
      counts.set(r.unitId, entry)
    }
    return { slices: toSlices(counts), levelLabel: LEVEL_LABELS[4] }
  }, [path, events, eventCategories, resolvedRows])

  const isLeaf = path.length >= 4
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const colorOf = (index: number, id: string) => (id === '__other__' ? OTHER_COLOR : PALETTE[index % PALETTE.length])

  const handleSliceClick = (slice: Slice) => {
    if (isLeaf || slice.id === '__other__') return
    setPath((prev) => [...prev, { id: slice.id, name: slice.name }])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700">행사 횟수 — 카테고리별</h2>
        <span className="text-xs text-gray-400">
          {levelLabel} 기준 · 총 {total.toLocaleString()}건
        </span>
      </div>

      {/* 브레드크럼 */}
      <div className="flex items-center flex-wrap gap-1 mb-4 text-xs">
        <button
          type="button"
          onClick={() => setPath([])}
          className={`px-2.5 py-1 rounded-full font-medium ${path.length === 0 ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          전체
        </button>
        {path.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <span className="text-gray-300">›</span>
            <button
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              className={`px-2.5 py-1 rounded-full font-medium ${i === path.length - 1 ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

      {slices.length === 0 ? (
        <p className="text-xs text-gray-400 py-10 text-center">해당 조건에 진행된 행사가 없습니다.</p>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-64 h-64 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="90%"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((s, i) => (
                    <Cell
                      key={s.id}
                      fill={colorOf(i, s.id)}
                      cursor={!isLeaf && s.id !== '__other__' ? 'pointer' : 'default'}
                      onClick={() => handleSliceClick(s)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()}건`, undefined]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 범례 겸 목록 — 클릭 가능한 히트 영역을 크게 확보 */}
          <ul className="w-full flex-1 space-y-1">
            {slices.map((s, i) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
              const clickable = !isLeaf && s.id !== '__other__'
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => handleSliceClick(s)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm text-left transition-colors ${
                      clickable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colorOf(i, s.id) }}
                    />
                    <span className="flex-1 text-gray-700 truncate">{s.name}</span>
                    <span className="text-gray-400 text-xs shrink-0">{pct}%</span>
                    <span className="text-gray-900 font-medium tabular-nums shrink-0 w-12 text-right">
                      {s.value.toLocaleString()}건
                    </span>
                    {clickable && <span className="text-gray-300 shrink-0">›</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
