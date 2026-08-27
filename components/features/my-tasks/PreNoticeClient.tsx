'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { HeaderFilter } from '@/components/ui/HeaderFilter'

export type PreNoticeRow = {
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

// 시간은 무시하고 날짜만 비교(자정 기준)
function toDateOnly(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const inputCls = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary-400'

export function PreNoticeClient({ rows }: { rows: PreNoticeRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return toDateInputValue(d)
  })

  // 일자(시작~종료)가 선택된 기간과 겹치는 행사만 표시. 일자 정보가 없는 행사는
  // 기간 필터로 실수로 놓치지 않도록 항상 포함한다.
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
    const filterStart = startDate ? new Date(startDate) : null
    const filterEnd = endDate ? new Date(endDate) : null
    return rows.filter((row) => {
      const eventStart = toDateOnly(row.eventStartAt)
      if (eventStart) {
        const eventEnd = toDateOnly(row.eventEndAt) ?? eventStart
        if (filterStart && eventEnd < filterStart) return false
        if (filterEnd && eventStart > filterEnd) return false
      }
      if (salesAdminFilter && row.salesAdminName !== salesAdminFilter) return false
      if (commAdminFilter && row.commAdminName !== commAdminFilter) return false
      return true
    })
  }, [rows, startDate, endDate, salesAdminFilter, commAdminFilter])

  const handleMarkSent = async (eventId: string) => {
    if (!confirm('행사 안내를 완료하셨습니까?')) return

    setUpdatingId(eventId)
    try {
      const { error } = await supabase
        .from('events')
        .update({ pre_notice_sent: true })
        .eq('id', eventId)
      if (error) throw new Error(error.message)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error: logErr } = await supabase
          .from('work_logs')
          .insert({ admin_id: user.id, event_id: eventId, task_type: '행사 안내' })
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
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">행사 안내</h1>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputCls}
        />
        <span className="text-sm text-gray-400">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputCls}
        />
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
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 text-center font-bold text-primary-700 w-32">행사 안내 완료</th>
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
                    <button
                      type="button"
                      disabled={updatingId === row.id}
                      onClick={() => handleMarkSent(row.id)}
                      className="px-3 py-1 text-xs bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updatingId === row.id ? '처리중...' : '안내 완료'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  선택한 기간에 해당하는 행사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
