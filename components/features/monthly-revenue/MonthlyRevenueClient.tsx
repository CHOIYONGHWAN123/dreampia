'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EventRevenueRow, MonthlyRevenueTotals } from '@/app/(dashboard)/monthly-revenue/actions'
import { HeaderFilter } from '@/components/ui/HeaderFilter'

const won = (n: number) => `₩${n.toLocaleString()}`

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function MonthlyRevenueClient({
  rows,
  totals,
  availableMonths,
  currentYear,
  currentMonth,
}: {
  rows: EventRevenueRow[]
  totals: MonthlyRevenueTotals
  availableMonths: { year: number; month: number }[]
  currentYear: number
  currentMonth: number
}) {
  const router = useRouter()
  const [contractStatusFilter, setContractStatusFilter] = useState<string | null>(null)

  const contractStatusOptions = useMemo(
    () => [...new Set(rows.map((r) => r.contractStatus).filter((v): v is string => !!v))].sort(),
    [rows]
  )
  const filteredRows = useMemo(
    () => rows.filter((r) => !contractStatusFilter || r.contractStatus === contractStatusFilter),
    [rows, contractStatusFilter]
  )

  const handleMonthChange = (year: number, month: number) => {
    router.push(`/monthly-revenue?year=${year}&month=${month}`)
  }

  return (
    <div className="p-7 bg-gray-50 min-h-full">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">월별 수익 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          수익 = 계약금(예산) − 강의료(세전 합계) − 재료비 · 행사 시작일이 속한 달 기준으로 집계됩니다.
        </p>
      </div>

      {/* 월 선택 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
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

      {/* 월 합계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
          <div className="text-xs text-gray-400 mb-1.5">계약금 합계</div>
          <div className="text-xl font-extrabold text-gray-900">{won(totals.contractAmount)}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
          <div className="text-xs text-gray-400 mb-1.5">강의료 합계</div>
          <div className="text-xl font-extrabold text-gray-900">{won(totals.lectureFeeTotal)}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)]">
          <div className="text-xs text-gray-400 mb-1.5">재료비 합계</div>
          <div className="text-xl font-extrabold text-gray-900">{won(totals.materialCostTotal)}</div>
        </div>
        <div
          className={`rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.08)] ${
            totals.revenue < 0 ? 'bg-red-500' : 'bg-linear-to-br from-primary-500 to-primary-700'
          }`}
        >
          <div className="text-xs text-white/70 mb-1.5">수익 합계</div>
          <div className="text-xl font-extrabold text-white">{won(totals.revenue)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="text-sm" style={{ minWidth: '1100px' }}>
          <thead>
            <tr>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-16 whitespace-nowrap">일자</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-left font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-40 whitespace-nowrap">기관명</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-left font-bold text-primary-700 bg-primary-50 border-b border-primary-100 min-w-40">행사명</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-32 whitespace-nowrap">
                <HeaderFilter label="계약 현황" options={contractStatusOptions} value={contractStatusFilter} onChange={setContractStatusFilter} />
              </th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-right font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 whitespace-nowrap">계약금</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-right font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 whitespace-nowrap">강의료</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-right font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 whitespace-nowrap">재료비</th>
              <th className="sticky top-0 z-10 px-3 py-2.5 text-right font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 whitespace-nowrap">수익</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((r) => (
                <tr key={r.eventId} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{fmtDate(r.eventStartAt)}</td>
                  <td className="px-3 py-2.5 text-gray-800">{r.institutionName}</td>
                  <td className="px-3 py-2.5 text-gray-800">
                    <Link href={`/events/${r.eventId}`} className="text-primary-700 hover:underline">
                      {r.eventName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{r.contractStatus ?? '-'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">{won(r.contractAmount)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">{won(r.lectureFeeTotal)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">{won(r.materialCostTotal)}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                      r.revenue < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {won(r.revenue)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  해당 월에 시작한 행사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
