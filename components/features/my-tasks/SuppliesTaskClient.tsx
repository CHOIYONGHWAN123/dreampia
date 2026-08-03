'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

const SUPPLIES_STATUS_OPTIONS = [
  '준비 완료',
  '체크 전',
  '재고 이상무',
  '재고 파악',
  '주문 필요',
  '택배 예정',
  '택배 발송',
  '회수 필요',
]

const SELECT_CLS =
  'border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400'

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

const inputCls = 'border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-gray-500'

export function SuppliesTaskClient({ rows }: { rows: SuppliesTaskRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return toDateInputValue(d)
  })

  // 일자(시작~종료)가 선택된 기간과 겹치는 행사만 표시. 일자 정보가 없는 행사는
  // 기간 필터로 실수로 놓치지 않도록 항상 포함한다.
  const filteredRows = useMemo(() => {
    const filterStart = startDate ? new Date(startDate) : null
    const filterEnd = endDate ? new Date(endDate) : null
    return rows.filter((row) => {
      const eventStart = toDateOnly(row.eventStartAt)
      if (!eventStart) return true
      const eventEnd = toDateOnly(row.eventEndAt) ?? eventStart
      if (filterStart && eventEnd < filterStart) return false
      if (filterEnd && eventStart > filterEnd) return false
      return true
    })
  }, [rows, startDate, endDate])

  // "준비 완료"로 바꾸면 work_logs에 로그를 남긴다.
  const handleSuppliesStatusChange = async (eventId: string, value: string) => {
    const { error } = await supabase.from('events').update({ supplies_status: value }).eq('id', eventId)
    if (error) {
      alert(error.message)
      return
    }
    if (value === '준비 완료') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('work_logs')
          .insert({ admin_id: user.id, event_id: eventId, task_type: '준비물 준비' })
      }
    }
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">준비물 준비</h1>
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

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">No.</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">일자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">기관명</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">영업담당자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">소통담당자</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-32">준비물 준비</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
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
                  <td className="px-4 py-2.5 text-center">
                    <select
                      value={row.suppliesStatus ?? '체크 전'}
                      onChange={(e) => handleSuppliesStatusChange(row.id, e.target.value)}
                      className={SELECT_CLS}
                    >
                      {SUPPLIES_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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
