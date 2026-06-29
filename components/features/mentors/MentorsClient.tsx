'use client'

import { useState, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type {
  MentorWithPrograms,
  MentorOccupationProgramRow,
  AddProgramSelectData,
} from '@/app/(dashboard)/mentors/actions'
import {
  updateMentorAvailable,
  updateMentorAuthenticated,
  updateMentorFields,
  updateMentorAgreementUrl,
  updateMopPptUrl,
  updateMopProfileUrl,
  deleteMopById,
  addMentorOccupationProgram,
} from '@/app/(dashboard)/mentors/actions'
import { AreaSelector, MentorSearchSelect, FileCell, uploadFile } from './shared'
import { ProgramUnitPicker, type ProgramSelectionValue } from './ProgramUnitPicker'
import { LevelFileInputs } from './LevelFileInputs'

// ── 유틸 ─────────────────────────────────────────────────────────────

type OccupationGroup = {
  occupation_id: string
  occupation_name: string
  field_name: string | null
  programs: MentorOccupationProgramRow[]
}

function groupByOccupation(programs: MentorOccupationProgramRow[]): OccupationGroup[] {
  const map = new Map<string, OccupationGroup>()
  for (const p of programs) {
    const key = p.occupation_id || '__none__'
    if (!map.has(key)) {
      map.set(key, {
        occupation_id: p.occupation_id,
        occupation_name: p.occupation_name,
        field_name: p.field_name,
        programs: [],
      })
    }
    map.get(key)!.programs.push(p)
  }
  return Array.from(map.values())
}

// ── 공통 셀 스타일 ────────────────────────────────────────────────────

const td = 'px-2 py-1.5 text-center text-xs text-gray-700 border-b border-r border-gray-100 align-middle'
const tdL = 'px-2 py-1.5 text-xs text-gray-700 border-b border-r border-gray-100 align-middle'

// ── EditInput ─────────────────────────────────────────────────────────

function EditInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-center"
    />
  )
}

// ── AddProgramModal ───────────────────────────────────────────────────

function AddProgramModal({
  mentorId,
  linkedUnitIds,
  selectData,
  onClose,
  onAdded,
}: {
  mentorId: string
  linkedUnitIds: Set<string>
  selectData: AddProgramSelectData
  onClose: () => void
  onAdded: (progs: MentorOccupationProgramRow[]) => void
}) {
  const [fieldId, setFieldId] = useState('')
  const [occupationId, setOccupationId] = useState('')
  const [selection, setSelection] = useState<ProgramSelectionValue>({ occupationProgramId: '', levels: [] })
  const [lectureFeePayerId, setLectureFeePayerId] = useState('')
  const [materialFeePayerId, setMaterialFeePayerId] = useState('')
  const [pptFiles, setPptFiles] = useState<Record<string, File | null>>({})
  const [profileFiles, setProfileFiles] = useState<Record<string, File | null>>({})
  const [pending, startTransition] = useTransition()

  const filteredOccupations = useMemo(
    () => selectData.occupations.filter((o) => !fieldId || o.field_id === fieldId),
    [selectData.occupations, fieldId]
  )

  const filteredPrograms = useMemo(
    () => selectData.programs.filter((p) => p.occupation_id === occupationId),
    [selectData.programs, occupationId]
  )

  const levelSelections = selection.levels.filter((l) => l.unitId)

  const handleSubmit = () => {
    if (!levelSelections.length) return
    startTransition(async () => {
      const added = await Promise.all(
        levelSelections.map(async (l) => {
          const pptFile = pptFiles[l.schoolLevel]
          const profileFile = profileFiles[l.schoolLevel]
          const pptFileUrl = pptFile ? await uploadFile('ppt-file', `${mentorId}/${l.unitId}`, pptFile) : null
          const profileFileUrl = profileFile
            ? await uploadFile('profile-file', `${mentorId}/${l.unitId}`, profileFile)
            : null
          return addMentorOccupationProgram(
            mentorId,
            l.unitId,
            lectureFeePayerId || null,
            materialFeePayerId || null,
            pptFileUrl,
            profileFileUrl
          )
        })
      )
      onAdded(added)
      onClose()
    })
  }

  const selCls =
    'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400'

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-96 p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-gray-900 mb-4">프로그램 추가</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">① 분야</label>
            <select
              className={selCls}
              value={fieldId}
              onChange={(e) => {
                setFieldId(e.target.value)
                setOccupationId('')
                setSelection({ occupationProgramId: '', levels: [] })
              }}
            >
              <option value="">분야 선택</option>
              {selectData.fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">② 직종</label>
            <select
              className={selCls}
              value={occupationId}
              disabled={!fieldId}
              onChange={(e) => {
                setOccupationId(e.target.value)
                setSelection({ occupationProgramId: '', levels: [] })
              }}
            >
              <option value="">직종 선택</option>
              {filteredOccupations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">③ 프로그램 / 교급 / 유닛</label>
            <ProgramUnitPicker
              programs={filteredPrograms}
              units={selectData.units}
              programCategories={selectData.programCategories}
              excludedUnitIds={linkedUnitIds}
              value={selection}
              onChange={(next) => {
                setSelection(next)
                setPptFiles({})
                setProfileFiles({})
              }}
            />
          </div>

          <LevelFileInputs
            levels={levelSelections}
            onPptChange={(level, file) => setPptFiles((prev) => ({ ...prev, [level]: file }))}
            onProfileChange={(level, file) => setProfileFiles((prev) => ({ ...prev, [level]: file }))}
          />

          <hr className="border-gray-100" />

          <div>
            <label className="text-xs text-gray-500 mb-1 block">강사료 입금자 (선택)</label>
            <MentorSearchSelect
              mentors={selectData.mentors}
              value={lectureFeePayerId}
              onChange={setLectureFeePayerId}
              placeholder="강사료 입금자 검색"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">재료비 입금자 (선택)</label>
            <MentorSearchSelect
              mentors={selectData.mentors}
              value={materialFeePayerId}
              onChange={setMaterialFeePayerId}
              placeholder="재료비 입금자 검색"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!levelSelections.length || pending}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? '추가 중…' : '추가'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── MentorRows ────────────────────────────────────────────────────────

function MentorRows({
  mentor,
  index,
  selectData,
  onAuthChange,
}: {
  mentor: MentorWithPrograms
  index: number
  selectData: AddProgramSelectData
  onAuthChange: (id: string, val: boolean) => void
}) {
  const [authPending, startAuthTransition] = useTransition()
  const [availablePending, startAvailableTransition] = useTransition()
  const [savePending, startSaveTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  const [localAuth, setLocalAuth] = useState(mentor.is_authenticated)
  const [localAvailable, setLocalAvailable] = useState(mentor.is_available)
  const [editFields, setEditFields] = useState({
    address: mentor.address ?? '',
    score: mentor.score != null ? String(mentor.score) : '',
    id_number: mentor.id_number ?? '',
    bank_account: mentor.bank_account ?? '',
    phone: mentor.phone ?? '',
    available_areas: mentor.available_areas ?? [] as string[],
    belongs_to: mentor.belongs_to ?? '',
  })

  const [localPrograms, setLocalPrograms] = useState(mentor.occupation_programs)
  const [pptUrls, setPptUrls] = useState<Record<string, string | null>>(
    Object.fromEntries(mentor.occupation_programs.map((p) => [p.mop_id, p.ppt_file_url]))
  )
  const [profileUrls, setProfileUrls] = useState<Record<string, string | null>>(
    Object.fromEntries(mentor.occupation_programs.map((p) => [p.mop_id, p.profile_file_url]))
  )

  const [agreementUrl, setAgreementUrl] = useState(mentor.agreement_file_url)
  const [uploadingAgreement, setUploadingAgreement] = useState(false)
  const [uploadingPpt, setUploadingPpt] = useState<Record<string, boolean>>({})
  const [uploadingProfile, setUploadingProfile] = useState<Record<string, boolean>>({})
  const [showAddModal, setShowAddModal] = useState(false)

  const groups = useMemo(() => groupByOccupation(localPrograms), [localPrograms])
  const programCount = localPrograms.length
  // totalRows: 프로그램 행 수 + 1(추가 버튼 행). 프로그램 없을 땐 빈 행(1) + 추가 행(1) = 2
  const totalRows = Math.max(programCount, 1) + 1

  const linkedUnitIds = useMemo(
    () => new Set(localPrograms.map((p) => p.occupation_program_unit_id)),
    [localPrograms]
  )

  // ── 핸들러 ──────────────────────────────────────────────────────────

  const handleAvailableToggle = (checked: boolean) => {
    setLocalAvailable(checked)
    startAvailableTransition(async () => {
      await updateMentorAvailable(mentor.id, checked)
    })
  }

  const handleAuthToggle = (checked: boolean) => {
    setLocalAuth(checked)
    startAuthTransition(async () => {
      await updateMentorAuthenticated(mentor.id, checked)
      onAuthChange(mentor.id, checked)
    })
  }

  const handleSave = () => {
    startSaveTransition(async () => {
      await updateMentorFields(mentor.id, {
        address: editFields.address || null,
        score: editFields.score !== '' ? Number(editFields.score) : null,
        id_number: editFields.id_number || null,
        bank_account: editFields.bank_account || null,
        phone: editFields.phone || null,
        available_areas: editFields.available_areas.length > 0 ? editFields.available_areas : null,
        belongs_to: editFields.belongs_to || null,
      })
    })
  }

  const handleDeleteProgram = (mopId: string) => {
    if (!confirm('이 프로그램을 삭제하시겠습니까?')) return
    startDeleteTransition(async () => {
      await deleteMopById(mopId)
      setLocalPrograms((prev) => prev.filter((p) => p.mop_id !== mopId))
      setPptUrls((prev) => {
        const next = { ...prev }
        delete next[mopId]
        return next
      })
      setProfileUrls((prev) => {
        const next = { ...prev }
        delete next[mopId]
        return next
      })
    })
  }

  const handleProgramsAdded = (newProgs: MentorOccupationProgramRow[]) => {
    setLocalPrograms((prev) => [...prev, ...newProgs])
    setPptUrls((prev) => ({
      ...prev,
      ...Object.fromEntries(newProgs.map((p) => [p.mop_id, p.ppt_file_url])),
    }))
    setProfileUrls((prev) => ({
      ...prev,
      ...Object.fromEntries(newProgs.map((p) => [p.mop_id, p.profile_file_url])),
    }))
  }

  const handleProfileUpload = async (mopId: string, file: File) => {
    setUploadingProfile((prev) => ({ ...prev, [mopId]: true }))
    try {
      const url = await uploadFile('profile-file', `${mentor.id}/${mopId}`, file)
      await updateMopProfileUrl(mopId, url)
      setProfileUrls((prev) => ({ ...prev, [mopId]: url }))
    } finally {
      setUploadingProfile((prev) => ({ ...prev, [mopId]: false }))
    }
  }

  const handleAgreementUpload = async (file: File) => {
    setUploadingAgreement(true)
    try {
      const url = await uploadFile('agreement-file', mentor.id, file)
      await updateMentorAgreementUrl(mentor.id, url)
      setAgreementUrl(url)
    } finally {
      setUploadingAgreement(false)
    }
  }

  const handlePptUpload = async (mopId: string, file: File) => {
    setUploadingPpt((prev) => ({ ...prev, [mopId]: true }))
    try {
      const url = await uploadFile('ppt-file', `${mentor.id}/${mopId}`, file)
      await updateMopPptUrl(mopId, url)
      setPptUrls((prev) => ({ ...prev, [mopId]: url }))
    } finally {
      setUploadingPpt((prev) => ({ ...prev, [mopId]: false }))
    }
  }

  // ── 멘토 단일 정보 셀 (rowSpan=totalRows) ───────────────────────────

  const mentorInfoCells = (
    <>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 100 }}>
        <AreaSelector
          value={editFields.available_areas}
          onChange={(v) => setEditFields((p) => ({ ...p, available_areas: v }))}
        />
      </td>
      <td className={tdL} rowSpan={totalRows} style={{ minWidth: 120 }}>
        <EditInput
          value={editFields.address}
          onChange={(v) => setEditFields((p) => ({ ...p, address: v }))}
          placeholder="주소"
        />
      </td>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 60 }}>
        <EditInput
          value={editFields.score}
          type="number"
          onChange={(v) => setEditFields((p) => ({ ...p, score: v }))}
          placeholder="등급"
        />
      </td>
      <td className={td} rowSpan={totalRows}>{mentor.mentor_type}</td>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 110 }}>
        <MentorSearchSelect
          mentors={selectData.mentors.filter((m) => m.id !== mentor.id)}
          value={editFields.belongs_to}
          onChange={(v) => setEditFields((p) => ({ ...p, belongs_to: v }))}
          placeholder="소속 멘토 검색"
        />
      </td>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 110 }}>
        <EditInput
          value={editFields.id_number}
          onChange={(v) => setEditFields((p) => ({ ...p, id_number: v }))}
          placeholder="주민번호"
        />
      </td>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 130 }}>
        <EditInput
          value={editFields.bank_account}
          onChange={(v) => setEditFields((p) => ({ ...p, bank_account: v }))}
          placeholder="계좌번호"
        />
      </td>
      <td className={td} rowSpan={totalRows} style={{ minWidth: 110 }}>
        <EditInput
          value={editFields.phone}
          onChange={(v) => setEditFields((p) => ({ ...p, phone: v }))}
          placeholder="핸드폰번호"
        />
      </td>
      <td className={td} rowSpan={totalRows}>
        {mentor.created_at ? mentor.created_at.slice(0, 10) : '-'}
      </td>
      <td className={td} rowSpan={totalRows}>
        <FileCell url={agreementUrl} uploading={uploadingAgreement} onUpload={handleAgreementUpload} />
      </td>
      <td className={td} rowSpan={totalRows}>
        <input
          type="checkbox"
          checked={localAvailable}
          disabled={availablePending}
          onChange={(e) => handleAvailableToggle(e.target.checked)}
          className="w-4 h-4 accent-green-600 cursor-pointer"
          title="강의 가능 여부"
        />
      </td>
      <td className={td} rowSpan={totalRows}>
        <input
          type="checkbox"
          checked={localAuth}
          disabled={authPending}
          onChange={(e) => handleAuthToggle(e.target.checked)}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      </td>
      <td className={td} rowSpan={totalRows}>
        <button
          type="button"
          disabled={savePending}
          onClick={handleSave}
          className="px-2 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
        >
          {savePending ? '저장중…' : '수정하기'}
        </button>
      </td>
    </>
  )

  // ── 프로그램 추가 버튼 행 (10개 program 컬럼에만 셀 필요) ─────────────

  const addRow = (
    <tr key={`${mentor.id}-add`}>
      <td
        colSpan={10}
        className="px-2 py-1 text-center border-b border-r border-dashed border-gray-200"
      >
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="text-xs text-blue-600 hover:text-blue-800 py-0.5"
        >
          + 프로그램 추가
        </button>
      </td>
    </tr>
  )

  // ── 렌더링 ───────────────────────────────────────────────────────────

  // 프로그램 없는 경우
  if (programCount === 0) {
    return (
      <>
        <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
          <td className={`${td} font-semibold`} rowSpan={2}>{index + 1}</td>
          <td className={`${td} font-medium text-gray-800`} rowSpan={2}>{mentor.name}</td>
          <td colSpan={10} className="px-2 py-1.5 text-center text-xs text-gray-300 border-b border-r border-gray-100">
            등록된 프로그램 없음
          </td>
          {mentorInfoCells}
        </tr>
        {addRow}
        {showAddModal && (
          <AddProgramModal
            mentorId={mentor.id}
            linkedUnitIds={linkedUnitIds}
            selectData={selectData}
            onClose={() => setShowAddModal(false)}
            onAdded={handleProgramsAdded}
          />
        )}
      </>
    )
  }

  // 프로그램 있는 경우
  const rows: React.ReactNode[] = []
  let isFirstInMentor = true

  for (const group of groups) {
    for (let gi = 0; gi < group.programs.length; gi++) {
      const prog = group.programs[gi]
      const isFirstInGroup = gi === 0

      rows.push(
        <tr
          key={`${mentor.id}-${prog.mop_id}`}
          className={`hover:bg-gray-50 ${isFirstInMentor ? 'border-t-2 border-gray-300' : ''}`}
        >
          {/* NO & 이름 */}
          {isFirstInMentor && (
            <>
              <td className={`${td} font-semibold`} rowSpan={totalRows}>{index + 1}</td>
              <td className={`${td} font-medium text-gray-800`} rowSpan={totalRows}>{mentor.name}</td>
            </>
          )}
          {/* 분야 & 직종 */}
          {isFirstInGroup && (
            <>
              <td className={td} rowSpan={group.programs.length}>{group.field_name ?? '-'}</td>
              <td className={td} rowSpan={group.programs.length}>{group.occupation_name}</td>
            </>
          )}
          {/* 교급 */}
          <td className={td}>{prog.school_level ?? '-'}</td>
          {/* 프로그램명 + 삭제 버튼 */}
          <td className={tdL}>
            <div className="flex items-center justify-between gap-1">
              <span className="flex-1">{prog.program_title}</span>
              <button
                type="button"
                disabled={deletePending}
                onClick={() => handleDeleteProgram(prog.mop_id)}
                className="text-red-400 hover:text-red-600 disabled:opacity-40 text-xs leading-none px-0.5 shrink-0"
                title="삭제"
              >
                ✕
              </button>
            </div>
          </td>
          {/* 재료비 */}
          <td className={td}>
            {prog.mentor_material_cost != null
              ? prog.mentor_material_cost.toLocaleString()
              : '-'}
          </td>
          {/* 준비물 준비 */}
          <td className={td}>{prog.prep_by ?? '-'}</td>
          {/* 강사료 입금자 */}
          <td className={td}>{prog.lecture_fee_payer_name ?? '-'}</td>
          {/* 재료비 입금자 */}
          <td className={td}>{prog.material_fee_payer_name ?? '-'}</td>
          {/* PPT */}
          <td className={td}>
            <FileCell
              url={pptUrls[prog.mop_id] ?? null}
              uploading={uploadingPpt[prog.mop_id] ?? false}
              onUpload={(file) => handlePptUpload(prog.mop_id, file)}
            />
          </td>
          {/* 프로필 */}
          <td className={td}>
            <FileCell
              url={profileUrls[prog.mop_id] ?? null}
              uploading={uploadingProfile[prog.mop_id] ?? false}
              onUpload={(file) => handleProfileUpload(prog.mop_id, file)}
            />
          </td>
          {/* 멘토 단일 정보 */}
          {isFirstInMentor && mentorInfoCells}
        </tr>
      )

      isFirstInMentor = false
    }
  }

  rows.push(addRow)

  return (
    <>
      {rows}
      {showAddModal && (
        <AddProgramModal
          mentorId={mentor.id}
          linkedUnitIds={linkedUnitIds}
          selectData={selectData}
          onClose={() => setShowAddModal(false)}
          onAdded={handleProgramsAdded}
        />
      )}
    </>
  )
}

// ── 헤더 컬럼 ─────────────────────────────────────────────────────────

const THEAD = [
  { label: 'NO', w: 40 },
  { label: '이름', w: 64 },
  { label: '분야', w: 64 },
  { label: '직종', w: 96 },
  { label: '교급', w: 56 },
  { label: '프로그램명', w: 128 },
  { label: '강사 재료비', w: 80 },
  { label: '준비물 준비', w: 72 },
  { label: '강사료 입금자', w: 96 },
  { label: '재료비 입금자', w: 96 },
  { label: 'PPT', w: 80 },
  { label: '프로필', w: 80 },
  { label: '출강가능지역', w: 100 },
  { label: '주소', w: 130 },
  { label: '강사등급', w: 64 },
  { label: '강사분류', w: 64 },
  { label: '소속', w: 80 },
  { label: '주민번호', w: 120 },
  { label: '계좌번호', w: 140 },
  { label: '핸드폰번호', w: 120 },
  { label: '멘토등록일', w: 80 },
  { label: '동의서', w: 80 },
  { label: '강의가능', w: 60 },
  { label: '멘토등록', w: 60 },
  { label: '수정', w: 64 },
]

// ── MentorsClient ─────────────────────────────────────────────────────

export function MentorsClient({
  mentors: initialMentors,
  selectData,
}: {
  mentors: MentorWithPrograms[]
  selectData: AddProgramSelectData
}) {
  const router = useRouter()
  const [mentors, setMentors] = useState(initialMentors)
  const [searchText, setSearchText] = useState('')
  const [filterAvailable, setFilterAvailable] = useState('')
  const [filterAuthenticated, setFilterAuthenticated] = useState('')

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (filterAvailable === 'true' && !m.is_available) return false
      if (filterAvailable === 'false' && m.is_available) return false
      if (filterAuthenticated === 'true' && !m.is_authenticated) return false
      if (filterAuthenticated === 'false' && m.is_authenticated) return false
      if (searchText && !m.name.includes(searchText)) return false
      return true
    })
  }, [mentors, filterAvailable, filterAuthenticated, searchText])

  const handleAuthChange = (id: string, val: boolean) => {
    setMentors((prev) => prev.map((m) => (m.id === id ? { ...m, is_authenticated: val } : m)))
  }

  const thCls =
    'px-2 py-2 text-center text-xs font-medium text-gray-700 border-b border-r border-gray-200 whitespace-nowrap bg-amber-50'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">강사 관리</h1>
        <button
          type="button"
          className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          onClick={() => router.push('/mentors/new')}
        >
          강사 추가
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterAvailable}
          onChange={(e) => setFilterAvailable(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">강의가능 전체</option>
          <option value="true">가능</option>
          <option value="false">불가</option>
        </select>
        <select
          value={filterAuthenticated}
          onChange={(e) => setFilterAuthenticated(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">인증 전체</option>
          <option value="true">인증</option>
          <option value="false">미인증</option>
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="강사명 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 w-48"
        />
        <span className="text-sm text-gray-600 ml-2">
          등록된 강사 수 <span className="font-bold text-red-500">{filtered.length}</span>
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table
          className="text-xs border-collapse"
          style={{ minWidth: `${THEAD.reduce((s, c) => s + c.w, 0)}px` }}
        >
          <thead>
            <tr>
              {THEAD.map((col) => (
                <th
                  key={col.label}
                  className={thCls}
                  style={{ width: col.w, minWidth: col.w }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((mentor, i) => (
                <MentorRows
                  key={mentor.id}
                  mentor={mentor}
                  index={i}
                  selectData={selectData}
                  onAuthChange={handleAuthChange}
                />
              ))
            ) : (
              <tr>
                <td colSpan={THEAD.length} className="py-16 text-center text-gray-400">
                  등록된 강사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
