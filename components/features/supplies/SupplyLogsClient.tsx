'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export type LogRow = {
  id: string
  supplyId: string
  stockType: 'total' | 'kit'
  delta: number
  reason: string | null
  eventRowId: string | null
  unitTitle: string
  region1: string | null
  region2: string | null
  institutionName: string | null
  campaignName: string | null
  mentorName: string | null
  startTime: string | null
  endTime: string | null
  headcount: number | null
  createdAt: string
}

type SupplyOption = { id: string; unitTitle: string }

interface Props {
  logs: LogRow[]
  supplyOptions: SupplyOption[]
  defaultSupplyId: string | null
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const STOCK_TYPE_LABEL: Record<string, string> = {
  total: '총(여유)',
  kit: '키트',
}

export function SupplyLogsClient({ logs, supplyOptions, defaultSupplyId }: Props) {
  const router = useRouter()

  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const [filterSupplyId, setFilterSupplyId] = useState(defaultSupplyId ?? '')
  const [filterStockType, setFilterStockType] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [startDate, setStartDate] = useState(toInputDate(oneMonthAgo))
  const [endDate, setEndDate] = useState(toInputDate(new Date()))

  const filtered = useMemo(() => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate + 'T23:59:59') : null
    return logs.filter((log) => {
      if (filterSupplyId && log.supplyId !== filterSupplyId) return false
      if (filterStockType && log.stockType !== filterStockType) return false
      if (filterDirection === 'add' && log.delta <= 0) return false
      if (filterDirection === 'sub' && log.delta >= 0) return false
      const d = new Date(log.createdAt)
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }, [logs, filterSupplyId, filterStockType, filterDirection, startDate, endDate])

  const totalAdded = filtered.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0)
  const totalSubtracted = filtered.filter((l) => l.delta < 0).reduce((s, l) => s + l.delta, 0)

  const thCls = 'px-2 py-2.5 text-xs font-medium text-gray-600 text-center bg-amber-50 border-b border-r border-gray-200 whitespace-nowrap'
  const td = 'px-2 py-2.5 text-xs text-gray-700 text-center border-b border-r border-gray-100 align-middle'
  const tdDash = <span className="text-gray-300">-</span>

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">재고 변동 이력</h1>
          {filterSupplyId && (
            <p className="text-sm text-gray-500 mt-0.5">
              {supplyOptions.find((s) => s.id === filterSupplyId)?.unitTitle ?? ''} 필터 적용 중
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push('/supplies')}
          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          준비물 관리로
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <p className="text-xs text-gray-500 mb-1">기간</p>
          <div className="flex items-center gap-1">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-gray-500" />
            <span className="text-gray-400 text-xs">~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-gray-500" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">프로그램 유닛</p>
          <select value={filterSupplyId} onChange={(e) => setFilterSupplyId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500 w-52">
            <option value="">전체 유닛</option>
            {supplyOptions.map((s) => <option key={s.id} value={s.id}>{s.unitTitle}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">재고 유형</p>
          <select value={filterStockType} onChange={(e) => setFilterStockType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500">
            <option value="">전체</option>
            <option value="total">총(여유) 재고</option>
            <option value="kit">키트 재고</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">변동 방향</p>
          <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500">
            <option value="">전체</option>
            <option value="add">입고 / 증가</option>
            <option value="sub">출고 / 감소</option>
          </select>
        </div>
        <button type="button"
          onClick={() => { setFilterSupplyId(''); setFilterStockType(''); setFilterDirection(''); setStartDate(toInputDate(oneMonthAgo)); setEndDate(toInputDate(new Date())) }}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors self-end">
          초기화
        </button>
      </div>

      {/* 요약 */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <span className="text-gray-500">총 <span className="font-semibold text-gray-800">{filtered.length}</span>건</span>
        <span className="text-blue-600">+ 합계 <span className="font-semibold">{totalAdded.toLocaleString()}</span></span>
        <span className="text-red-500">− 합계 <span className="font-semibold">{Math.abs(totalSubtracted).toLocaleString()}</span></span>
        <span className="text-gray-600">
          순변동 <span className={`font-semibold ${totalAdded + totalSubtracted >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {totalAdded + totalSubtracted >= 0 ? '+' : ''}{(totalAdded + totalSubtracted).toLocaleString()}
          </span>
        </span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: '1400px' }}>
          <thead>
            <tr>
              <th className={thCls} style={{ width: 36 }}>NO</th>
              <th className={thCls} style={{ width: 130 }}>일시</th>
              <th className={thCls} style={{ width: 140 }}>프로그램 유닛</th>
              <th className={thCls} style={{ width: 72 }}>재고 유형</th>
              <th className={thCls} style={{ width: 64 }}>변동량</th>
              <th className={thCls} style={{ width: 120 }}>사유</th>
              {/* 행사 연결 컬럼 */}
              <th className={thCls} style={{ width: 56 }}>지역1</th>
              <th className={thCls} style={{ width: 72 }}>지역2</th>
              <th className={thCls} style={{ width: 120 }}>기관명</th>
              <th className={thCls} style={{ width: 80 }}>행사구분</th>
              <th className={thCls} style={{ width: 80 }}>강사명</th>
              <th className={thCls} style={{ width: 120 }}>시작시간</th>
              <th className={thCls} style={{ width: 120 }}>종료시간</th>
              <th className={thCls} style={{ width: 56 }}>수량</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-16 text-center text-gray-400">
                  조건에 맞는 변동 이력이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => {
                const hasEvent = !!log.eventRowId
                return (
                  <tr key={log.id} className={`hover:bg-gray-50 ${hasEvent ? '' : 'bg-white'}`}>
                    <td className={td}>{i + 1}</td>
                    <td className={td}>{formatDateTime(log.createdAt)}</td>
                    <td className={`${td} font-medium text-gray-800 text-left`}>{log.unitTitle}</td>
                    <td className={td}>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        log.stockType === 'kit' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {STOCK_TYPE_LABEL[log.stockType]}
                      </span>
                    </td>
                    <td className={td}>
                      <span className={`font-semibold ${log.delta > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {log.delta > 0 ? '+' : ''}{log.delta.toLocaleString()}
                      </span>
                    </td>
                    <td className={`${td} text-left text-gray-500`}>{log.reason ?? tdDash}</td>
                    {/* 행사 상세 */}
                    <td className={td}>{log.region1 ?? tdDash}</td>
                    <td className={td}>{log.region2 ?? tdDash}</td>
                    <td className={`${td} text-left`}>{log.institutionName ?? tdDash}</td>
                    <td className={td}>
                      {log.campaignName
                        ? <span className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[11px]">{log.campaignName}</span>
                        : tdDash}
                    </td>
                    <td className={td}>{log.mentorName ?? tdDash}</td>
                    <td className={td}>{formatDateTime(log.startTime)}</td>
                    <td className={td}>{formatDateTime(log.endTime)}</td>
                    <td className={td}>
                      {log.headcount != null
                        ? <span className="font-medium">{log.headcount.toLocaleString()}</span>
                        : tdDash}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
