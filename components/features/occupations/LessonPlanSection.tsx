'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  getLessonPlansByProgramId,
  upsertLessonPlan,
  deleteLessonPlan,
  type LessonPlanData,
} from '@/app/(dashboard)/occupations/actions'
import {
  LESSON_CATEGORIES,
  LESSON_GRADES,
  LESSON_CATEGORY_STORAGE_KEY,
  LESSON_GRADE_STORAGE_KEY,
} from '@/app/(dashboard)/occupations/constants'

type Props = {
  programId: string
}

export function LessonPlanSection({ programId }: Props) {
  const [plans, setPlans] = useState<LessonPlanData[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingKeyRef = useRef<string | null>(null)

  useEffect(() => {
    getLessonPlansByProgramId(programId).then(setPlans).catch(() => {})
  }, [programId])

  const getPlan = (category: string, grade: string) =>
    plans.find((p) => p.lesson_category === category && p.grade === grade)

  const handleUploadClick = (key: string) => {
    pendingKeyRef.current = key
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const key = pendingKeyRef.current
    if (!file || !key) return

    const [category, grade] = key.split('__')
    setError(null)
    setUploading(key)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const catKey = LESSON_CATEGORY_STORAGE_KEY[category as keyof typeof LESSON_CATEGORY_STORAGE_KEY] ?? category
      const gradeKey = LESSON_GRADE_STORAGE_KEY[grade as keyof typeof LESSON_GRADE_STORAGE_KEY] ?? grade
      const storagePath = `${programId}/${catKey}_${gradeKey}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('lesson-plans')
        .upload(storagePath, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('lesson-plans').getPublicUrl(storagePath)

      await upsertLessonPlan({
        occupation_program_id: programId,
        grade,
        lesson_category: category,
        file_url: publicUrl,
      })

      const updated = await getLessonPlansByProgramId(programId)
      setPlans(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(null)
      pendingKeyRef.current = null
      e.target.value = ''
    }
  }

  const handleDelete = async (plan: LessonPlanData) => {
    setError(null)
    setDeleting(plan.id)
    try {
      await deleteLessonPlan(plan.id)
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th colSpan={4} className="px-4 py-2.5 text-center font-medium text-gray-700">
                강의계획안
              </th>
            </tr>
          </thead>
          <tbody>
            {LESSON_CATEGORIES.flatMap((category) =>
              LESSON_GRADES.map((grade, gradeIdx) => {
                const key = `${category}__${grade}`
                const plan = getPlan(category, grade)
                const isUploading = uploading === key
                const isDeleting = plan ? deleting === plan.id : false

                return (
                  <tr key={key} className="border-b border-gray-100 last:border-0">
                    {gradeIdx === 0 && (
                      <td
                        rowSpan={LESSON_GRADES.length}
                        className="px-4 py-2.5 text-center text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-100 w-28"
                      >
                        {category}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-center text-gray-600 w-28">{grade}</td>
                    <td className="px-4 py-2.5 text-center w-44">
                      {plan?.file_url ? (
                        <a
                          href={plan.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 text-xs underline"
                        >
                          파일 보기
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => handleUploadClick(key)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? '업로드 중...' : '등록하기'}
                        </button>
                      )}
                      {plan?.file_url && (
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => handleUploadClick(key)}
                          className="ml-2 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-500"
                        >
                          {isUploading ? '...' : '재등록'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center w-20">
                      {plan && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(plan)}
                          className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? '...' : '삭제'}
                        </button>
                      )}
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
