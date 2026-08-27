'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLedgerRemark, type PayerLedgerGroup } from '@/app/(dashboard)/mentor-fees/actions'
import { MentorSearchSelect } from '@/components/features/mentors/shared'
import { ExpandableMemoCell } from '@/components/ui/ExpandableMemoCell'

const won = (n: number) => `₩${n.toLocaleString()}`

export function MentorFeesClient({
  groups,
  availableMonths,
  currentYear,
  currentMonth,
  mentors,
}: {
  groups: PayerLedgerGroup[]
  availableMonths: { year: number; month: number }[]
  currentYear: number
  currentMonth: number
  mentors: { id: string; name: string }[]
}) {
  const router = useRouter()

  const [mentorId, setMentorId] = useState('')
  const [search, setSearch] = useState('')
  const [descending, setDescending] = useState(false)

  const handleMonthChange = (year: number, month: number) => {
    router.push(`/mentor-fees?year=${year}&month=${month}`)
  }

  const filteredGroups = useMemo(() => {
    let result = groups
    if (mentorId) {
      result = result.filter((g) => g.payerId === mentorId)
    }
    if (search) {
      result = result
        .map((g) => ({ ...g, lines: g.lines.filter((l) => l.institutionName.includes(search)) }))
        .filter((g) => g.lines.length > 0)
    }
    const sorted = [...result].sort((a, b) => {
      const aDate = a.lines[0]?.date ?? ''
      const bDate = b.lines[0]?.date ?? ''
      return descending ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
    })
    return sorted.map((g) => ({
      ...g,
      lines: [...g.lines].sort((a, b) => (descending ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))),
    }))
  }, [groups, mentorId, search, descending])

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams({ year: String(currentYear), month: String(currentMonth) })
    if (mentorId) params.set('mentorId', mentorId)
    if (search) params.set('search', search)
    if (descending) params.set('descending', '1')
    return `/mentor-fees/download?${params.toString()}`
  }, [currentYear, currentMonth, mentorId, search, descending])

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">강사료 대장</h1>
        <a
          href={downloadUrl}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          엑셀 다운로드
        </a>
      </div>

      {/* 월 선택 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {availableMonths.length === 0 ? (
          <span className="text-sm text-gray-400">데이터 없음</span>
        ) : (
          availableMonths.map(({ year, month }) => {
            const isActive = year === currentYear && month === currentMonth
            return (
              <button
                key={`${year}-${month}`}
                type="button"
                onClick={() => handleMonthChange(year, month)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-[0_6px_16px_rgba(37,99,235,0.3)]'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {year}년 {month}월
              </button>
            )
          })
        )}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-48">
          <MentorSearchSelect mentors={mentors} value={mentorId} onChange={setMentorId} placeholder="강사명 검색" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="학교명 검색"
          className="border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300 w-56"
        />
        <button
          type="button"
          onClick={() => setDescending((v) => !v)}
          className="px-3 py-1.5 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
        >
          날짜 {descending ? '내림차순' : '오름차순'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-12">NO</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-24">날짜</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-24 whitespace-nowrap">강사명</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 min-w-55 whitespace-nowrap">학교명</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">강의료</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 whitespace-nowrap">재료비</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">강연료</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">총 강연료</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">세후 금액</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-32">계좌번호</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">주민번호</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-37">비고</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-400">
                  해당 월에 정산할 강사료가 없습니다.
                </td>
              </tr>
            ) : (
              filteredGroups.flatMap((group, groupIndex) =>
                group.lines.map((line, lineIndex) => (
                  <tr key={line.eventRowId + '-' + lineIndex} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-600" rowSpan={group.lines.length}>
                        {groupIndex + 1}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center text-gray-800">{line.date}</td>
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-800 font-medium whitespace-nowrap" rowSpan={group.lines.length}>
                        {group.payerName}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center text-gray-800 whitespace-nowrap">{line.institutionName}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {line.lectureFee !== null ? won(line.lectureFee) : ''}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {line.materialFee !== null ? won(line.materialFee) : ''}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{won(line.lineTotal)}</td>
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-800 font-semibold" rowSpan={group.lines.length}>
                        {won(group.totalFee)}
                      </td>
                    )}
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-800 font-semibold" rowSpan={group.lines.length}>
                        {won(group.afterTax)}
                      </td>
                    )}
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-600" rowSpan={group.lines.length}>
                        {group.bankAccount ?? '-'}
                      </td>
                    )}
                    {lineIndex === 0 && (
                      <td className="px-3 py-2.5 text-center text-gray-600" rowSpan={group.lines.length}>
                        {group.idNumber ?? '-'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center">
                      <ExpandableMemoCell
                        value={line.remarks}
                        onSave={(v) => updateLedgerRemark(line.eventRowId, v ?? '')}
                        label="비고"
                        placeholder="비고 입력"
                        defaultSize={{ width: 320, height: 180 }}
                      />
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
