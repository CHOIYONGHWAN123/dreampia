'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { announcementSchema, type AnnouncementFormData } from '@/lib/validations/announcement'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/app/(dashboard)/announcements/actions'

interface Props {
  id?: string
  defaultValues?: AnnouncementFormData
}

export function AnnouncementForm({ id, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const isEdit = !!id

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: defaultValues ?? { title: '', content: '' },
  })

  const onSubmit = (data: AnnouncementFormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateAnnouncement(id, data.title, data.content)
      } else {
        await createAnnouncement(data.title, data.content)
      }
      router.push('/announcements')
    })
  }

  const handleDelete = () => {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    startDeleting(async () => {
      await deleteAnnouncement(id!)
      router.push('/announcements')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
        <input
          {...register('title')}
          type="text"
          placeholder="공지사항 제목을 입력하세요."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* 내용 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">내용</label>
        <textarea
          {...register('content')}
          rows={16}
          placeholder="공지사항 내용을 입력하세요."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors resize-none leading-relaxed"
        />
        {errors.content && (
          <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex items-center justify-between pt-2">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/announcements')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
