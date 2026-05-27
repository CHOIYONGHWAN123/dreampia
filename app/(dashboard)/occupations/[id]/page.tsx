'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getOccupationProgramById,
  updateOccupationProgram,
  deleteOccupationProgram,
  getOccupations,
  getProgramCategories,
} from '../actions'
import type { OccupationProgramData, OccupationData, ProgramCategoryData } from '../actions'
import { SCHOOL_LEVELS } from '../constants'

const PREP_BY_OPTIONS = ['강사', '드림피아', '모두가능'] as const

export default function OccupationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [program, setProgram] = useState<OccupationProgramData | null>(null)
  const [occupations, setOccupations] = useState<OccupationData[]>([])
  const [programCategories, setProgramCategories] = useState<ProgramCategoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 편집 폼 상태
  const [occupationId, setOccupationId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [prepBy, setPrepBy] = useState('')
  const [schoolRequestNote, setSchoolRequestNote] = useState('')
  const [finalProductAvailable, setFinalProductAvailable] = useState('')
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false)
  const [schoolLevel, setSchoolLevel] = useState('')
  const [programCategoryId, setProgramCategoryId] = useState('')

  // 데이터 로드
  useEffect(() => {
    const load = async () => {
      try {
        const [data, occs, cats] = await Promise.all([
          getOccupationProgramById(id),
          getOccupations(),
          getProgramCategories(),
        ])
        if (!data) {
          router.replace('/occupations')
          return
        }
        setProgram(data)
        setOccupations(occs)
        setProgramCategories(cats)
        // 폼 초기값
        setOccupationId(data.occupation_id)
        setTitle(data.title ?? '')
        setDescription(data.description ?? '')
        setMaterialCost(data.material_cost_per_person != null ? String(data.material_cost_per_person) : '')
        setPrepBy(data.prep_by ?? '')
        setSchoolRequestNote(data.school_request_note ?? '')
        setFinalProductAvailable(data.final_product_available ?? '')
        setIsDeliveryAvailable(data.is_delivery_available)
        setSchoolLevel(data.school_level ?? '')
        setProgramCategoryId(data.program_category_id ?? '')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, router])

  // 편집 취소 — 원래 값으로 복구
  const handleCancelEdit = () => {
    if (!program) return
    setOccupationId(program.occupation_id)
    setTitle(program.title ?? '')
    setDescription(program.description ?? '')
    setMaterialCost(program.material_cost_per_person != null ? String(program.material_cost_per_person) : '')
    setPrepBy(program.prep_by ?? '')
    setSchoolRequestNote(program.school_request_note ?? '')
    setFinalProductAvailable(program.final_product_available ?? '')
    setIsDeliveryAvailable(program.is_delivery_available)
    setSchoolLevel(program.school_level ?? '')
    setProgramCategoryId(program.program_category_id ?? '')
    setIsEditing(false)
    setError(null)
  }

  // 저장
  const handleSave = async () => {
    if (!title.trim()) { setError('프로그램명을 입력해주세요.'); return }
    if (!occupationId) { setError('직업군을 선택해주세요.'); return }

    try {
      setIsSubmitting(true)
      setError(null)
      await updateOccupationProgram(id, {
        occupation_id: occupationId,
        name: title.trim(),
        title: title.trim(),
        program_category_id: programCategoryId || null,
        school_level: schoolLevel || null,
        description: description.trim() || null,
        material_cost_per_person: materialCost ? parseInt(materialCost, 10) : null,
        prep_by: prepBy || null,
        school_request_note: schoolRequestNote.trim() || null,
        final_product_available: finalProductAvailable.trim() || null,
        is_delivery_available: isDeliveryAvailable,
      })
      const updated = await getOccupationProgramById(id)
      setProgram(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 삭제
  const handleDelete = async () => {
    try {
      setIsSubmitting(true)
      await deleteOccupationProgram(id)
      router.push('/occupations')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
      setShowDeleteConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
  }
  if (!program) return null

  const fieldName = program.occupations?.name ?? '-'
  const categoryName = program.program_categories?.name ?? '-'

  return (
    <div className="p-8 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">직업 상세</h1>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                type="button"
                className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/occupations')}
              >
                목록
              </button>
              <button
                type="button"
                className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                수정
              </button>
              <button
                type="button"
                className="px-4 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-80">
            <p className="text-sm text-gray-800 mb-4 font-medium">
              &quot;{program.title}&quot; 프로그램을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-gray-500 mb-5">삭제 후 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                className="px-4 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 읽기 모드 */}
      {!isEditing ? (
        <div className="space-y-4">
          <DetailRow label="직업군" value={fieldName} />
          <DetailRow label="프로그램명" value={program.title} />
          <DetailRow label="PPT 카테고리" value={categoryName} />
          <DetailRow label="교급" value={program.school_level ?? '-'} />
          <DetailRow label="프로그램 설명" value={program.description ?? '-'} multiline />
          <DetailRow
            label="1인당 재료비"
            value={program.material_cost_per_person != null
              ? `${program.material_cost_per_person.toLocaleString()}원`
              : '-'}
          />
          <DetailRow label="준비 주체" value={program.prep_by ?? '-'} />
          <DetailRow label="학교 요청사항" value={program.school_request_note ?? '-'} multiline />
          <DetailRow label="완성품 제공 가능" value={program.final_product_available ?? '-'} />
          <DetailRow label="택배 가능" value={program.is_delivery_available ? '가능' : '불가능'} />
        </div>
      ) : (
        /* 편집 모드 */
        <div className="space-y-4">
          {/* 직업군 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">직업군 *</label>
            <select
              value={occupationId}
              onChange={(e) => setOccupationId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">직업군을 선택하세요</option>
              {occupations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <EditField label="프로그램명 *" value={title} onChange={setTitle} placeholder="예: 마카롱 만들기" />

          {/* PPT 카테고리 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">PPT 카테고리</label>
            <select
              value={programCategoryId}
              onChange={(e) => setProgramCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">선택 안 함</option>
              {programCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 교급 선택 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">교급</label>
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

          <EditTextarea label="프로그램 설명" value={description} onChange={setDescription} placeholder="프로그램 설명" />

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

          <EditTextarea label="학교 요청사항" value={schoolRequestNote} onChange={setSchoolRequestNote} placeholder="학교 요청사항" />
          <EditField label="완성품 제공 가능 여부" value={finalProductAvailable} onChange={setFinalProductAvailable} placeholder="예: 가능 / 불가능" />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editDelivery"
              checked={isDeliveryAvailable}
              onChange={(e) => setIsDeliveryAvailable(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="editDelivery" className="text-sm text-gray-700 cursor-pointer">
              택배 가능
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="button"
              className="px-5 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 공통 서브 컴포넌트 ──────────────────────────────────────────────

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 pb-3 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      {multiline
        ? <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{value}</p>
        : <span className="text-sm text-gray-800 flex-1">{value}</span>
      }
    </div>
  )
}

function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </div>
  )
}

function EditTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
      />
    </div>
  )
}
