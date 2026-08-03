'use client'

import Link from 'next/link'

export type SuppliesTaskRow = {
  no: number
  id: string
  institutionId: string | null
  institutionName: string | null
  eventStartAt: string | null
  eventEndAt: string | null
  salesAdminName: string | null
  commAdminName: string | null
  suppliesStatus: string | null
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

export function SuppliesTaskClient({ rows }: { rows: SuppliesTaskRow[] }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">준비물 준비</h1>
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
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">상태</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-32">준비물 준비</th>
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
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.institutionName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.salesAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.commAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.suppliesStatus ?? '체크 전'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {row.institutionId ? (
                      <Link
                        href={`/institutions/${row.institutionId}?highlightEventId=${row.id}`}
                        className="inline-block px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        준비하기
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
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
