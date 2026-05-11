'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOccupation } from '@/app/(dashboard)/programs/actions'

export function ProgramDeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('정말로 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteOccupation(id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      삭제
    </button>
  )
}
