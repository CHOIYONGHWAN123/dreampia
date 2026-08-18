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
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">강사 섭외 전달</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-50 border-b border-primary-100">
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-14">No.</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-28">일자</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700">기관명</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-28">영업담당자</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-28">소통담당자</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-28">상태</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-32">강사 섭외 전달</th>
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
                        className="text-primary-700 underline underline-offset-2 hover:text-primary-500 transition-colors"
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
                      className="px-3 py-1 text-xs bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
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
