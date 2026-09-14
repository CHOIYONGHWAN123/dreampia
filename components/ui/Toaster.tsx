'use client'

import { useEffect } from 'react'
import { useToastStore, type ToastItem } from '@/lib/store/toast-store'

const AUTO_DISMISS_MS: Record<ToastItem['type'], number> = {
  success: 3000,
  error: 6000,
  warning: 6000,
}

const styleByType: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-red-50 text-red-600 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
}

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS[item.type])
    return () => clearTimeout(timer)
  }, [item.id, item.type, dismiss])

  return (
    <div
      className={`flex items-center gap-3 min-w-64 max-w-sm px-4 py-3 rounded-2xl border shadow-[0_10px_28px_rgba(20,20,40,0.12)] text-sm font-medium ${styleByType[item.type]}`}
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="text-current opacity-50 hover:opacity-100 leading-none"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </div>
  )
}
