'use client'

import { useState, useTransition } from 'react'
import { createSupply, updateSupply } from '@/app/(dashboard)/supplies/actions'

type SupplyData = {
  id: string
  qty_per_person: number
  kit_threshold: number | null
  max_daily_stock: number | null
  is_consumable: boolean
  memo: string | null
}

interface Props {
  unitId: string
  unitTitle: string
  initial: SupplyData | null
  onClose: () => void
  onSaved: () => void
}

export function SupplyFormPopup({ unitId, unitTitle, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    qty_per_person: initial?.qty_per_person ?? 1,
    kit_threshold: initial?.kit_threshold ?? '',
    max_daily_stock: initial?.max_daily_stock ?? '',
    is_consumable: initial?.is_consumable ?? false,
    memo: initial?.memo ?? '',
    initial_total_stock: '',
    initial_kit_stock: '',
  })

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const toInt = (v: string | number) => (v === '' || v === null || v === undefined ? null : Number(v))
        if (isEdit) {
          await updateSupply(initial!.id, {
            qty_per_person: Number(form.qty_per_person) || 1,
            kit_threshold: toInt(form.kit_threshold),
            max_daily_stock: toInt(form.max_daily_stock),
            is_consumable: form.is_consumable,
            memo: form.memo || null,
          })
        } else {
          await createSupply({
            occupation_program_unit_id: unitId,
            qty_per_person: Number(form.qty_per_person) || 1,
            kit_threshold: toInt(form.kit_threshold),
            max_daily_stock: toInt(form.max_daily_stock),
            is_consumable: form.is_consumable,
            memo: form.memo || null,
            initial_total_stock: Number(form.initial_total_stock) || 0,
            initial_kit_stock: Number(form.initial_kit_stock) || 0,
          })
        }
        onSaved()
        onClose()
      } catch (e) {
        alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
      }
    })
  }

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-gray-500'
  const labelCls = 'text-xs text-gray-500 mb-0.5 block'

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-[480px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          {isEdit ? '준비물 수정' : '준비물 추가'}
        </h2>
        <p className="text-xs text-gray-400 mb-5">{unitTitle}</p>

        <div className="space-y-4">
          {/* 기본 설정 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>1인당 수량</label>
              <input
                type="number"
                min={1}
                value={form.qty_per_person}
                onChange={(e) => set('qty_per_person', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_consumable}
                  onChange={(e) => set('is_consumable', e.target.checked)}
                  className="w-4 h-4"
                />
                소모성 재료
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>키트 재고 경고 기준값</label>
              <input
                type="number"
                min={0}
                value={form.kit_threshold}
                onChange={(e) => set('kit_threshold', e.target.value)}
                placeholder="미설정"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>일 최대 수용 재고</label>
              <input
                type="number"
                min={0}
                value={form.max_daily_stock}
                onChange={(e) => set('max_daily_stock', e.target.value)}
                placeholder="미설정"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>메모</label>
            <textarea
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* 신규 등록 시 초기 재고 입력 */}
          {!isEdit && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-600 mb-3">초기 재고 등록 (선택)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>총 재고 초기값</label>
                  <input
                    type="number"
                    min={0}
                    value={form.initial_total_stock}
                    onChange={(e) => set('initial_total_stock', e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>키트 재고 초기값</label>
                  <input
                    type="number"
                    min={0}
                    value={form.initial_kit_stock}
                    onChange={(e) => set('initial_kit_stock', e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                여유 재고 = 총 재고 − 키트 재고로 자동 계산됩니다.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
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
