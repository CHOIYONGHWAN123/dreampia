'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createOccupationProgram,
  createOccupation,
  createField,
  upsertLessonPlan,
  type OccupationData,
  type ProgramCategoryData,
  type FieldData,
} from '@/app/(dashboard)/occupations/actions'
import {
  SCHOOL_LEVELS,
  LESSON_CATEGORIES,
  LESSON_GRADES,
  LESSON_CATEGORY_STORAGE_KEY,
  LESSON_GRADE_STORAGE_KEY,
} from '@/app/(dashboard)/occupations/constants'
import { createClient } from '@/lib/supabase'

const PREP_BY_OPTIONS = ['강사', '드림피아', '모두가능'] as const

type Props = {
  existingOccupations: OccupationData[]
  programCategories: ProgramCategoryData[]
  existingFields: FieldData[]
}

export function OccupationNewForm({ existingOccupations, programCategories, existingFields }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── 분야 ────────────────────────────────────────────────────────────
  const [fieldMode, setFieldMode] = useState<'new' | 'existing'>('existing')
  const [fieldId, setFieldId] = useState('')
  const [fieldName, setFieldName] = useState('')

  // ── 직업군 ──────────────────────────────────────────────────────────
  const [occupationMode, setOccupationMode] = useState<'new' | 'existing'>('new')
  const [occupationId, setOccupationId] = useState('')
  const [occupationName, setOccupationName] = useState('')

  // ── 프로그램 공통 정보 ────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [prepBy, setPrepBy] = useState('')
  const [schoolRequestNote, setSchoolRequestNote] = useState('')
  const [finalProductAvailable, setFinalProductAvailable] = useState(false)
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false)
  const [schoolLevel, setSchoolLevel] = useState('')

  // ── PPT 카테고리 체크박스 (program_categories.id 기준) ────────────
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())

  // ── 강의계획안 파일 (key: `${category}__${grade}`) ───────────────
  const [lessonFiles, setLessonFiles] = useState<Map<string, File>>(new Map())
  const lessonFileInputRef = useRef<HTMLInputElement>(null)
  const pendingLessonKeyRef = useRef<string | null>(null)

  const handleLessonUploadClick = (key: string) => {
    pendingLessonKeyRef.current = key
    lessonFileInputRef.current?.click()
  }

  const handleLessonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const key = pendingLessonKeyRef.current
    if (!file || !key) return
    setLessonFiles((prev) => new Map(prev).set(key, file))
    pendingLessonKeyRef.current = null
    e.target.value = ''
  }

  const removeLessonFile = (key: string) => {
    setLessonFiles((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleModeChange = (mode: 'new' | 'existing') => {
    setOccupationMode(mode)
    setOccupationId('')
    setOccupationName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (occupationMode === 'new' && !occupationName.trim()) {
      setError('직업군 이름을 입력해주세요.')
      return
    }
    if (occupationMode === 'existing' && !occupationId) {
      setError('직업군을 선택해주세요.')
      return
    }
    if (!title.trim()) {
      setError('프로그램명을 입력해주세요.')
      return
    }
    if (selectedCategoryIds.size === 0) {
      setError('PPT 카테고리를 하나 이상 선택해주세요.')
      return
    }

    try {
      setIsSubmitting(true)

      // 신규 직업군일 때만 분야 처리
      let finalFieldId: string | null = null
      if (occupationMode === 'new') {
        if (fieldMode === 'new' && fieldName.trim()) {
          finalFieldId = await createField(fieldName.trim())
        } else if (fieldMode === 'existing' && fieldId) {
          finalFieldId = fieldId
        }
      }

      // 신규 직업군이면 먼저 생성
      let finalOccupationId = occupationId
      if (occupationMode === 'new') {
        finalOccupationId = await createOccupation(occupationName.trim(), finalFieldId)
      }

      // 선택된 카테고리 수만큼 occupation_programs 생성
      const common = {
        occupation_id: finalOccupationId,
        name: title.trim(),
        title: title.trim(),
        school_level: schoolLevel || null,
        description: description.trim() || null,
        material_cost_per_person: materialCost ? parseInt(materialCost, 10) : null,
        prep_by: prepBy || null,
        school_request_note: schoolRequestNote.trim() || null,
        final_product_available: finalProductAvailable,
        is_delivery_available: isDeliveryAvailable,
      }

      const createdIds = await Promise.all(
        [...selectedCategoryIds].map((catId) =>
          createOccupationProgram({ ...common, program_category_id: catId })
        )
      )

      // 강의계획안 파일 업로드
      if (lessonFiles.size > 0) {
        const supabase = createClient()
        for (const programId of createdIds) {
          for (const [key, file] of lessonFiles.entries()) {
            const [category, grade] = key.split('__')
            const ext = file.name.split('.').pop() ?? 'bin'
            const catKey = LESSON_CATEGORY_STORAGE_KEY[category as keyof typeof LESSON_CATEGORY_STORAGE_KEY] ?? category
            const gradeKey = LESSON_GRADE_STORAGE_KEY[grade as keyof typeof LESSON_GRADE_STORAGE_KEY] ?? grade
            const storagePath = `${programId}/${catKey}_${gradeKey}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('lesson-plans')
              .upload(storagePath, file, { upsert: true })
            if (uploadError) throw new Error(uploadError.message)
            const { data: { publicUrl } } = supabase.storage.from('lesson-plans').getPublicUrl(storagePath)
            await upsertLessonPlan({ occupation_program_id: programId, grade, lesson_category: category, file_url: publicUrl })
          }
        }
      }

      router.push('/occupations')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">프로그램 추가</h1>
        <button
          type="button"
          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          onClick={() => router.back()}
        >
          목록으로
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── 직업군 ──────────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">직업군</h2>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="occupationMode"
                value="new"
                checked={occupationMode === 'new'}
                onChange={() => handleModeChange('new')}
              />
              신규 직업군 등록
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="occupationMode"
                value="existing"
                checked={occupationMode === 'existing'}
                onChange={() => handleModeChange('existing')}
              />
              기존 직업군 선택
            </label>
          </div>

          {occupationMode === 'new' && (
            <>
              {/* 분야 */}
              <div className="bg-gray-50 rounded p-3 space-y-3">
                <p className="text-xs font-medium text-gray-600">분야 (Fields)</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="fieldMode"
                      value="existing"
                      checked={fieldMode === 'existing'}
                      onChange={() => { setFieldMode('existing'); setFieldId(''); setFieldName('') }}
                    />
                    기존 분야 선택
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="fieldMode"
                      value="new"
                      checked={fieldMode === 'new'}
                      onChange={() => { setFieldMode('new'); setFieldId(''); setFieldName('') }}
                    />
                    신규 분야 등록
                  </label>
                </div>
                {fieldMode === 'existing' && (
                  <select
                    value={fieldId}
                    onChange={(e) => setFieldId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">분야를 선택하세요 (선택 안 함)</option>
                    {existingFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
                {fieldMode === 'new' && (
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="예: 요리"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                )}
              </div>

              {/* 직업군 이름 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">직업군 이름 *</label>
                <input
                  type="text"
                  value={occupationName}
                  onChange={(e) => setOccupationName(e.target.value)}
                  placeholder="예: 아동요리전문가"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </>
          )}

          {occupationMode === 'existing' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">직업군 선택 *</label>
              <select
                value={occupationId}
                onChange={(e) => setOccupationId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">직업군을 선택하세요</option>
                {existingOccupations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 프로그램 정보 ─────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">프로그램 정보</h2>

          {/* 프로그램명 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">프로그램명 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 마카롱 만들기"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* 교급 선택 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">교급 선택</label>
            <select
              value={schoolLevel}
              onChange={(e) => setSchoolLevel(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">선택 안 함</option>
              {SCHOOL_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* PPT 카테고리 */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">PPT 카테고리 *</label>
            <p className="text-xs text-gray-400 mb-3">
              선택한 카테고리 수만큼 프로그램이 각각 등록됩니다.
            </p>
            {programCategories.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {programCategories.map((cat, idx) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.has(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-4 h-4 accent-gray-800"
                    />
                    <span className="text-gray-400 w-5 shrink-0 text-xs">{idx + 1}.</span>
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2">
                등록된 카테고리가 없습니다. DB에 program_categories 데이터를 추가해주세요.
              </p>
            )}
            {selectedCategoryIds.size > 0 && (
              <p className="mt-2 text-xs text-blue-600 font-medium">
                {selectedCategoryIds.size}개 선택됨 → {selectedCategoryIds.size}개 프로그램 생성 예정
              </p>
            )}
          </div>

          {/* 프로그램 설명 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">프로그램 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로그램에 대한 설명을 입력하세요"
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
          </div>

          {/* 1인당 재료비 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">1인당 재료비 (원)</label>
            <input
              type="number"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              placeholder="예: 3000"
              min={0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* 준비 주체 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">준비 주체</label>
            <select
              value={prepBy}
              onChange={(e) => setPrepBy(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">선택 안 함</option>
              {PREP_BY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 학교 요청사항 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">학교 요청사항</label>
            <textarea
              value={schoolRequestNote}
              onChange={(e) => setSchoolRequestNote(e.target.value)}
              placeholder="학교 측 요청사항을 입력하세요"
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
          </div>

          {/* 완성품 제공 가능 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="finalProductAvailable"
              checked={finalProductAvailable}
              onChange={(e) => setFinalProductAvailable(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="finalProductAvailable" className="text-sm text-gray-700 cursor-pointer">
              완성품 제공 가능
            </label>
          </div>

          {/* 택배 가능 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDelivery"
              checked={isDeliveryAvailable}
              onChange={(e) => setIsDeliveryAvailable(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isDelivery" className="text-sm text-gray-700 cursor-pointer">
              택배 가능
            </label>
          </div>
        </div>

        {/* ── 강의계획안 ──────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <input
            type="file"
            ref={lessonFileInputRef}
            className="hidden"
            accept=".pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx"
            onChange={handleLessonFileChange}
          />
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th colSpan={4} className="px-4 py-2.5 text-center font-medium text-gray-700">
                  강의계획안 <span className="text-xs font-normal text-gray-400">(선택 사항)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {LESSON_CATEGORIES.flatMap((category) =>
                LESSON_GRADES.map((grade, gradeIdx) => {
                  const key = `${category}__${grade}`
                  const file = lessonFiles.get(key)
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
                        {file ? (
                          <span className="text-xs text-gray-600 truncate block max-w-35 mx-auto" title={file.name}>
                            {file.name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLessonUploadClick(key)}
                            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          >
                            선택
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center w-20">
                        {file && (
                          <button
                            type="button"
                            onClick={() => removeLessonFile(key)}
                            className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                          >
                            취소
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

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            onClick={() => router.back()}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? '저장 중...'
              : selectedCategoryIds.size > 1
                ? `저장 (${selectedCategoryIds.size}개 생성)`
                : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
