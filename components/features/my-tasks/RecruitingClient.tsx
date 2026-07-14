'use client'

import Link from 'next/link'

export type RecruitingRow = {
  no: number
  id: string
  institutionName: string | null
  eventStartAt: string | null
  eventEndAt: string | null
  salesAdminName: string | null
  commAdminName: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtEventDateRange(startAt: string | null, endAt: string | null) {
  if (!startAt) return '-'
  const s = fmtDate(startAt)
  const e = endAt ? fmtDate(endAt) : null
  if (!e || s === e) return s ?? '-'
  return `${s} ~ ${e}`
}

export function RecruitingClient({ rows }: { rows: RecruitingRow[] }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 섭외</h1>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">No.</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">일자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">기관명</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">영업담당자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">소통담당자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-24">섭외</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-600">{row.no}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800 whitespace-nowrap">
                    {fmtEventDateRange(row.eventStartAt, row.eventEndAt)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Link
                      href={`/events/${row.id}`}
                      className="text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
                    >
                      {row.institutionName ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.salesAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.commAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1 text-xs border border-gray-200 rounded text-gray-400 bg-gray-50 cursor-not-allowed"
                    >
                      시작
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  등록된 행사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
