'use client'

import { useState } from 'react'
import { SCHOOL_LEVEL_OPTIONS } from '@/app/(dashboard)/programs/constants'
import type {
  OccupationProgramUnitData,
  UnitFormPayload,
} from '@/app/(dashboard)/programs/actions'
import { FileDropZone, uploadFile } from '@/components/features/mentors/shared'

interface Props {
  initial: OccupationProgramUnitData | null
  occupationProgramId: string
  onClose: () => void
  onSubmit: (payload: UnitFormPayload) => Promise<void>
}

const emptyForm: UnitFormPayload = {
  title: '',
  schoolRequestNote: '',
  finalProductAvailable: false,
  description: '',
  isDeliveryAvailable: false,
  schoolLevel: null,
  syllabus: null,
}

// 팝업이 열릴 때마다 새로 마운트되므로(부모가 unitPopup.open으로 마운트/언마운트를 제어)
// effect 없이 초기값만으로 폼 상태를 구성한다.
function toFormState(initial: OccupationProgramUnitData | null): UnitFormPayload {
  if (!initial) return emptyForm
  return {
    title: initial.title,
    schoolRequestNote: initial.school_request_note ?? '',
    finalProductAvailable: initial.final_product_available ?? false,
    description: initial.description ?? '',
    isDeliveryAvailable: initial.is_delivery_available,
    schoolLevel: initial.school_level,
    syllabus: initial.syllabus,
  }
}

export function UnitFormPopup({ initial, occupationProgramId, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<UnitFormPayload>(() => toFormState(initial))
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('유닛 이름을 입력해주세요.')
      return
    }
    try {
      let syllabus = form.syllabus
      if (syllabusFile) {
        setIsUploading(true)
        syllabus = await uploadFile('lesson-plans', occupationProgramId, syllabusFile)
      }
      await onSubmit({ ...form, title: form.title.trim(), syllabus })
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,20,40,0.15)] p-6 w-120 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-extrabold text-gray-900 mb-4">
          {initial ? '프로그램 유닛 수정' : '프로그램 유닛 추가'}
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="유닛 이름을 입력해주세요."
            autoFocus
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />

          <div>
            <label className="text-xs text-gray-500 mb-1 block">교급</label>
            <select
              value={form.schoolLevel ?? ''}
              onChange={e => setForm(f => ({ ...f, schoolLevel: e.target.value || null }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            >
              <option value="">선택안함</option>
              {SCHOOL_LEVEL_OPTIONS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">강의계획서</label>
            {form.syllabus && !syllabusFile && (
              <a
                href={form.syllabus}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700 underline block mb-1"
              >
                기존 파일 보기
              </a>
            )}
            <FileDropZone file={syllabusFile} onChange={setSyllabusFile} accept=".hwp,.hwpx,.pdf,.doc,.docx" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">학교요청사항</label>
            <textarea
              value={form.schoolRequestNote ?? ''}
              onChange={e => setForm(f => ({ ...f, schoolRequestNote: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">프로그램 설명</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.finalProductAvailable ?? false}
                onChange={e => setForm(f => ({ ...f, finalProductAvailable: e.target.checked }))}
                className="accent-primary-600"
              />
              완성품제공가능
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isDeliveryAvailable}
                onChange={e => setForm(f => ({ ...f, isDeliveryAvailable: e.target.checked }))}
                className="accent-primary-600"
              />
              택배 가능
            </label>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="px-6 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 text-sm disabled:opacity-50"
          >
            {isUploading ? '업로드 중...' : '확인'}
          </button>
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
