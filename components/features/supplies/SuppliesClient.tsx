'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SupplyFormPopup } from './SupplyFormPopup'
import { StockAdjustPopup } from './StockAdjustPopup'

export type UnitWithSupply = {
  id: string
  title: string
  fieldId: string
  fieldName: string
  occupationId: string
  occupationName: string
  programId: string
  programName: string
  supply: {
    id: string
    qty_per_person: number
    kit_threshold: number | null
    max_daily_stock: number | null
    is_consumable: boolean
    memo: string | null
  } | null
  totalStock: number
  kitStock: number
}

type NavOption = { id: string; name: string }

interface Props {
  units: UnitWithSupply[]
  fields: NavOption[]
}

const STATUS_CLS = {
  safe: 'inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-600',
  danger: 'inline-block px-2 py-0.5 text-xs rounded bg-red-50 text-red-500',
}

function StockStatus({ current, threshold, dangerWhenBelow }: { current: number; threshold: number | null; dangerWhenBelow: boolean }) {
  if (threshold === null) return <span className="text-xs text-gray-400">-</span>
  const isDanger = dangerWhenBelow ? current < threshold : current > threshold
  return (
    <span className={isDanger ? STATUS_CLS.danger : STATUS_CLS.safe}>
      {isDanger ? '위험' : '안전'}
    </span>
  )
}

export function SuppliesClient({ units, fields }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterFieldId, setFilterFieldId] = useState('')
  const [filterOccupationId, setFilterOccupationId] = useState('')
  const [filterProgramId, setFilterProgramId] = useState('')
  const [popup, setPopup] = useState<{ unitId: string; unitTitle: string; supply: UnitWithSupply['supply'] } | null>(null)
  const [adjustPopup, setAdjustPopup] = useState<{
    supplyId: string
    unitTitle: string
    totalStock: number
    kitStock: number
  } | null>(null)

  const occupations = useMemo(() => {
    const seen = new Map<string, NavOption>()
    units.forEach((u) => {
      if (!filterFieldId || u.fieldId === filterFieldId) {
        if (!seen.has(u.occupationId)) seen.set(u.occupationId, { id: u.occupationId, name: u.occupationName })
      }
    })
    return Array.from(seen.values())
  }, [units, filterFieldId])

  const programs = useMemo(() => {
    const seen = new Map<string, NavOption>()
    units.forEach((u) => {
      if ((!filterFieldId || u.fieldId === filterFieldId) && (!filterOccupationId || u.occupationId === filterOccupationId)) {
        if (!seen.has(u.programId)) seen.set(u.programId, { id: u.programId, name: u.programName })
      }
    })
    return Array.from(seen.values())
  }, [units, filterFieldId, filterOccupationId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return units.filter((u) => {
      if (filterFieldId && u.fieldId !== filterFieldId) return false
      if (filterOccupationId && u.occupationId !== filterOccupationId) return false
      if (filterProgramId && u.programId !== filterProgramId) return false
      if (q) {
        const haystack = [u.title, u.programName, u.occupationName, u.fieldName].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [units, search, filterFieldId, filterOccupationId, filterProgramId])

  const thCls = 'px-3 py-2.5 text-xs font-medium text-gray-600 text-center bg-amber-50 border-b border-r border-gray-200 whitespace-nowrap'
  const td = 'px-3 py-2.5 text-xs text-gray-700 text-center border-b border-r border-gray-100'

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">준비물 관리</h1>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="분야 / 직종 / 프로그램 / 유닛명 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-gray-500 w-64"
        />

        <select
          value={filterFieldId}
          onChange={(e) => { setFilterFieldId(e.target.value); setFilterOccupationId(''); setFilterProgramId('') }}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500"
        >
          <option value="">분야 전체</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        <select
          value={filterOccupationId}
          onChange={(e) => { setFilterOccupationId(e.target.value); setFilterProgramId('') }}
          disabled={!filterFieldId}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">직종 전체</option>
          {occupations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <select
          value={filterProgramId}
          onChange={(e) => setFilterProgramId(e.target.value)}
          disabled={!filterOccupationId}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">프로그램 전체</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <span className="text-sm text-gray-500 ml-2">
          검색 결과 <span className="font-semibold text-gray-800">{filtered.length}</span>건
        </span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-xs border-collapse w-full" style={{ minWidth: '960px' }}>
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>NO</th>
              <th className={thCls} style={{ width: 72 }}>분야</th>
              <th className={thCls} style={{ width: 100 }}>직종</th>
              <th className={thCls} style={{ width: 120 }}>프로그램</th>
              <th className={thCls} style={{ width: 140 }}>프로그램 유닛</th>
              <th className={thCls} style={{ width: 72 }}>총 재고</th>
              <th className={thCls} style={{ width: 72 }}>여유 재고</th>
              <th className={thCls} style={{ width: 84 }}>키트 재고</th>
              <th className={thCls} style={{ width: 90 }}>키트 재고 상태</th>
              <th className={thCls} style={{ width: 96 }}>일 최대 수용</th>
              <th className={thCls} style={{ width: 96 }}>일 최대 수용 상태</th>
              <th className={thCls} style={{ width: 80 }}>재고 조정</th>
              <th className={thCls} style={{ width: 80 }}>수정하기</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-gray-400">
                  {search || filterFieldId ? '검색 결과가 없습니다.' : '등록된 프로그램 유닛이 없습니다.'}
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => {
                const freeStock = u.totalStock - u.kitStock
                const hasSup = !!u.supply
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className={td}>{i + 1}</td>
                    <td className={td}>{u.fieldName}</td>
                    <td className={td}>{u.occupationName}</td>
                    <td className={td}>{u.programName}</td>
                    <td className={`${td} text-left font-medium text-gray-800`}>{u.title}</td>

                    {hasSup ? (
                      <>
                        <td className={td}>{u.totalStock.toLocaleString()}</td>
                        <td className={td}>{freeStock.toLocaleString()}</td>
                        <td className={td}>{u.kitStock.toLocaleString()}</td>
                        <td className={td}>
                          <StockStatus current={u.kitStock} threshold={u.supply!.kit_threshold} dangerWhenBelow />
                        </td>
                        <td className={td}>
                          {u.supply!.max_daily_stock != null ? u.supply!.max_daily_stock.toLocaleString() : '-'}
                        </td>
                        <td className={td}>
                          <StockStatus current={u.totalStock} threshold={u.supply!.max_daily_stock} dangerWhenBelow />
                        </td>
                      </>
                    ) : (
                      <td colSpan={7} className={td}>
                        <span className="text-gray-400 text-xs">재고 미등록</span>
                      </td>
                    )}

                    {hasSup && (
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustPopup({
                              supplyId: u.supply!.id,
                              unitTitle: u.title,
                              totalStock: u.totalStock,
                              kitStock: u.kitStock,
                            })
                          }
                          className="px-2 py-0.5 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          재고 조정
                        </button>
                      </td>
                    )}

                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => setPopup({ unitId: u.id, unitTitle: u.title, supply: u.supply })}
                        className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                      >
                        {hasSup ? '수정' : '추가'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {popup && (
        <SupplyFormPopup
          unitId={popup.unitId}
          unitTitle={popup.unitTitle}
          initial={popup.supply}
          onClose={() => setPopup(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {adjustPopup && (
        <StockAdjustPopup
          supplyId={adjustPopup.supplyId}
          unitTitle={adjustPopup.unitTitle}
          totalStock={adjustPopup.totalStock}
          kitStock={adjustPopup.kitStock}
          onClose={() => setAdjustPopup(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}
