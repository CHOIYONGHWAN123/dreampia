'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export type RecruitDeliveryRow = {
  no: number
  id: string
  institutionId: string | null
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

export function RecruitDeliveryClient({ rows }: { rows: RecruitDeliveryRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleMarkDelivered = async (eventId: string) => {
    if (!confirm('강사 섭외 전달을 완료하셨습니까?')) return

    setUpdatingId(eventId)
    try {
      const { error } = await supabase
        .from('events')
        .update({ recruit_delivered: true })
        .eq('id', eventId)
      if (error) throw new Error(error.message)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error: logErr } = await supabase
          .from('work_logs')
          .insert({ admin_id: user.id, event_id: eventId, task_type: '강사 섭외 전달' })
        if (logErr) throw new Error(logErr.message)
      }

      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리에 실패했습니다.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 섭외 전달</h1>
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
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-32">강사 섭외 전달</th>
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
                    {row.institutionId ? (
                      <Link
                        href={`/institutions/${row.institutionId}`}
                        className="text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
                      >
                        {row.institutionName ?? '-'}
                      </Link>
                    ) : (
                      (row.institutionName ?? '-')
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.salesAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{row.commAdminName ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">전달 대기</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      disabled={updatingId === row.id}
                      onClick={() => handleMarkDelivered(row.id)}
                      className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updatingId === row.id ? '처리중...' : '전달 완료'}
                    </button>
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
