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
  recruitStatus: string | null
}

const RECRUIT_STATUS_LABEL: Record<string, string> = {
  섭외대기: '섭외 대기',
  섭외진행중: '섭외 진행중',
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
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">강사 섭외</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-14">No.</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">일자</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700">기관명</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">영업담당자</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">소통담당자</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">상태</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-32">섭외</th>
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
                      className="text-primary-700 underline underline-offset-2 hover:text-primary-500 transition-colors"
                    >
                      {row.institutionName ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.salesAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.commAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">
                    {row.recruitStatus ? RECRUIT_STATUS_LABEL[row.recruitStatus] ?? row.recruitStatus : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Link
                      href={`/events/${row.id}/recruiting`}
                      className="inline-block px-3 py-1 text-xs border border-primary-300 rounded-full text-primary-600 bg-white hover:bg-primary-50 transition-colors whitespace-nowrap"
                    >
                      섭외 페이지로 이동
                    </Link>
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
