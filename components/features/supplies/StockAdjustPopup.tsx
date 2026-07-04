'use client'

import { useState, useTransition, useMemo } from 'react'
import { adjustStock } from '@/app/(dashboard)/supplies/actions'

interface Props {
  supplyId: string
  unitTitle: string
  totalStock: number
  kitStock: number
  onClose: () => void
  onSaved: () => void
}

type Target = 'free' | 'kit'
type Direction = 'add' | 'sub'

export function StockAdjustPopup({
  supplyId,
  unitTitle,
  totalStock,
  kitStock,
  onClose,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState<Target>('free')
  const [direction, setDirection] = useState<Direction>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const freeStock = totalStock - kitStock
  const amt = Math.max(0, Number(amount) || 0)

  // 조정 후 재고 미리보기 계산
  const preview = useMemo(() => {
    const delta = direction === 'add' ? amt : -amt
    if (target === 'free') {
      // 여유 재고 조정 = total 변경 (kit 유지)
      return { total: totalStock + delta, kit: kitStock }
    } else {
      // 키트 재고 조정 = kit 변경 (total 유지)
      return { total: totalStock, kit: kitStock + delta }
    }
  }, [target, direction, amt, totalStock, kitStock])

  const previewFree = preview.total - preview.kit

  // 유효성 검사
  const error = useMemo(() => {
    if (amt <= 0) return null // 수량 미입력은 폼 에러가 아님
    if (preview.total < 0) return '총 재고가 0 미만이 됩니다.'
    if (preview.kit < 0) return '키트 재고가 0 미만이 됩니다.'
    if (previewFree < 0) return '여유 재고가 0 미만이 됩니다. (총 재고 < 키트 재고)'
    return null
  }, [amt, preview, previewFree])

  const canSubmit = amt > 0 && !error

  const handleSubmit = () => {
    if (!canSubmit) return
    startTransition(async () => {
      try {
        const stockType = target === 'free' ? 'total' : 'kit'
        const delta = direction === 'add' ? amt : -amt
        await adjustStock({ supplyId, stockType, delta, reason: reason || null })
        onSaved()
        onClose()
      } catch (e) {
        alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
      }
    })
  }

  const segBtn = (active: boolean) =>
    `flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
      active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
    }`

  const stockRow = (
    label: string,
    before: number,
    after: number,
    highlight: boolean
  ) => (
    <div className={`flex items-center justify-between px-3 py-2 rounded ${highlight ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-gray-500">{before.toLocaleString()}</span>
        <span className="text-gray-400">→</span>
        <span className={after !== before ? (direction === 'add' ? 'text-blue-600 font-semibold' : 'text-red-500 font-semibold') : 'text-gray-500'}>
          {after.toLocaleString()}
          {after !== before && (
            <span className="ml-1 text-[10px]">
              ({direction === 'add' ? '+' : ''}{(after - before).toLocaleString()})
            </span>
          )}
        </span>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-[440px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-gray-900 mb-1">재고 조정</h2>
        <p className="text-xs text-gray-400 mb-5">{unitTitle}</p>

        <div className="space-y-4">
          {/* 조정 대상 */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">조정 대상</label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded">
              <button type="button" className={segBtn(target === 'free')} onClick={() => setTarget('free')}>
                여유 재고
              </button>
              <button type="button" className={segBtn(target === 'kit')} onClick={() => setTarget('kit')}>
                키트 재고
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              {target === 'free'
                ? '총 재고를 변경합니다. 키트 재고는 그대로 유지됩니다.'
                : '키트 재고를 변경합니다. 총 재고는 그대로 유지됩니다.'}
            </p>
          </div>

          {/* 추가 / 감소 */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">조정 방향</label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded">
              <button type="button" className={segBtn(direction === 'add')} onClick={() => setDirection('add')}>
                + 추가
              </button>
              <button type="button" className={segBtn(direction === 'sub')} onClick={() => setDirection('sub')}>
                − 감소
              </button>
            </div>
          </div>

          {/* 수량 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수량</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="조정할 수량을 입력하세요"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-gray-500"
              autoFocus
            />
          </div>

          {/* 사유 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">사유 <span className="text-gray-300">(선택)</span></label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 신규 입고, 파손 폐기, 키트 패킹"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-gray-500"
            />
          </div>

          {/* 미리보기 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">변경 후 재고 미리보기</p>
            <div className="space-y-1.5">
              {stockRow('총 재고', totalStock, preview.total, target === 'free')}
              {stockRow('여유 재고', freeStock, previewFree, target === 'free')}
              {stockRow('키트 재고', kitStock, preview.kit, target === 'kit')}
            </div>
            {error && amt > 0 && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="px-6 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
