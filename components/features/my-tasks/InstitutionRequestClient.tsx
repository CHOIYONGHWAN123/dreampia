'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { HeaderFilter } from '@/components/ui/HeaderFilter'

export type InstitutionRequestRow = {
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

export function InstitutionRequestClient({ rows }: { rows: InstitutionRequestRow[] }) {
  const [salesAdminFilter, setSalesAdminFilter] = useState<string | null>(null)
  const [commAdminFilter, setCommAdminFilter] = useState<string | null>(null)
  const salesAdminOptions = useMemo(
    () => [...new Set(rows.map((r) => r.salesAdminName).filter((v): v is string => !!v))].sort(),
    [rows]
  )
  const commAdminOptions = useMemo(
    () => [...new Set(rows.map((r) => r.commAdminName).filter((v): v is string => !!v))].sort(),
    [rows]
  )
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (salesAdminFilter && row.salesAdminName !== salesAdminFilter) return false
      if (commAdminFilter && row.commAdminName !== commAdminFilter) return false
      return true
    })
  }, [rows, salesAdminFilter, commAdminFilter])

  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleMarkDelivered = async (eventId: string) => {
    if (!confirm('기관 요청사항 전달을 완료하셨습니까?')) return

    setUpdatingId(eventId)
    try {
      const { error } = await supabase
        .from('events')
        .update({ institution_request_delivered: true })
        .eq('id', eventId)
      if (error) throw new Error(error.message)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error: logErr } = await supabase
          .from('work_logs')
          .insert({ admin_id: user.id, event_id: eventId, task_type: '학교 요청 사항 전달' })
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
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">기관 요청사항 전달</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-14">No.</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">일자</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700">기관명</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">
                <HeaderFilter label="영업담당자" options={salesAdminOptions} value={salesAdminFilter} onChange={setSalesAdminFilter} />
              </th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-28">
                <HeaderFilter label="소통담당자" options={commAdminOptions} value={commAdminFilter} onChange={setCommAdminFilter} />
              </th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-44 whitespace-nowrap">기관 요청사항 다운</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-44 whitespace-nowrap">기관요청사항 전달</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
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
                  <td className="px-4 py-2.5 text-center">
                    <a
                      href={`/my-tasks/institution-request/${row.id}/download`}
                      className="px-3 py-1 text-xs bg-white border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap inline-block"
                    >
                      다운
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      disabled={updatingId === row.id}
                      onClick={() => handleMarkDelivered(row.id)}
                      className="px-3 py-1 text-xs bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updatingId === row.id ? '처리중...' : '전달'}
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
