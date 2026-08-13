'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EventRevenueRow, MonthlyRevenueTotals } from '@/app/(dashboard)/monthly-revenue/actions'

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

  const handleMonthChange = (year: number, month: number) => {
    router.push(`/monthly-revenue?year=${year}&month=${month}`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">월별 수익 관리</h1>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        수익 = 계약금(예산) − 강의료(세전 합계) − 재료비. 행사 시작일이 속한 달 기준으로 집계됩니다.
      </p>

      {/* 월 선택 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
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
                className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {year}년 {month}월
              </button>
            )
          })
        )}
      </div>

      {/* 월 합계 요약 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">계약금 합계</div>
          <div className="text-lg font-semibold text-gray-900">{won(totals.contractAmount)}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">강의료 합계</div>
          <div className="text-lg font-semibold text-gray-900">{won(totals.lectureFeeTotal)}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">재료비 합계</div>
          <div className="text-lg font-semibold text-gray-900">{won(totals.materialCostTotal)}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">수익 합계</div>
          <div className={`text-lg font-semibold ${totals.revenue < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {won(totals.revenue)}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-sm" style={{ minWidth: '1100px' }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-16 whitespace-nowrap">일자</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-700 w-40 whitespace-nowrap">기관명</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-700 min-w-40">행사명</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-32 whitespace-nowrap">계약 현황</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28 whitespace-nowrap">계약금</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28 whitespace-nowrap">강의료</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28 whitespace-nowrap">재료비</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28 whitespace-nowrap">수익</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.eventId} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{fmtDate(r.eventStartAt)}</td>
                  <td className="px-3 py-2.5 text-gray-800">{r.institutionName}</td>
                  <td className="px-3 py-2.5 text-gray-800">
                    <Link href={`/events/${r.eventId}`} className="hover:underline">
                      {r.eventName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{r.contractStatus ?? '-'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800 whitespace-nowrap">{won(r.contractAmount)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">{won(r.lectureFeeTotal)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">{won(r.materialCostTotal)}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-medium whitespace-nowrap ${
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
