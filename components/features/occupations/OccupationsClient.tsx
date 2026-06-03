'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { OccupationProgramData, FieldData, OccupationData, ProgramCategoryData } from '@/app/(dashboard)/occupations/actions'

type Props = {
  programs: OccupationProgramData[]
  fields: FieldData[]
  occupations: OccupationData[]
  programCategories: ProgramCategoryData[]
}

export function OccupationsClient({ programs, fields, occupations, programCategories }: Props) {
  const router = useRouter()

  const [searchText, setSearchText] = useState('')
  const [filterFieldId, setFilterFieldId] = useState('')
  const [filterOccupation, setFilterOccupation] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // field_id → field name 빠른 조회용 맵
  const fieldMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of fields) map.set(f.id, f.name)
    return map
  }, [fields])

  // 분야 필터 선택 시 직업군 필터 초기화
  const handleFieldChange = (value: string) => {
    setFilterFieldId(value)
    setFilterOccupation('')
  }

  // 분야 필터 적용 후 직업군 드롭다운 목록
  const occupationOptions = useMemo(() => {
    if (!filterFieldId) return occupations
    return occupations.filter((o) => o.field_id === filterFieldId)
  }, [occupations, filterFieldId])

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const occupationName = p.occupations?.name ?? ''
      const categoryName = p.program_categories?.name ?? ''
      const programTitle = p.title ?? ''
      const fieldId = p.occupations?.field_id ?? ''

      if (filterFieldId && fieldId !== filterFieldId) return false
      if (filterOccupation && occupationName !== filterOccupation) return false
      if (filterCategory && categoryName !== filterCategory) return false
      if (searchText) {
        const q = searchText.toLowerCase()
        const fieldName = fieldId ? (fieldMap.get(fieldId) ?? '') : ''
        const match =
          fieldName.toLowerCase().includes(q) ||
          occupationName.toLowerCase().includes(q) ||
          programTitle.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [programs, filterFieldId, filterOccupation, filterCategory, searchText, fieldMap])

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">프로그램 관리</h1>
        <button
          type="button"
          className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          onClick={() => router.push('/occupations/new')}
        >
          프로그램추가
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="분야, 직업군, 프로그램, 카테고리 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 w-64"
        />

        {/* 분야 필터 */}
        <select
          value={filterFieldId}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">분야 전체</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {/* 직업군 필터 */}
        <select
          value={filterOccupation}
          onChange={(e) => setFilterOccupation(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">직업군 전체</option>
          {occupationOptions.map((o) => (
            <option key={o.id} value={o.name}>{o.name}</option>
          ))}
        </select>

        {/* 카테고리 필터 */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">카테고리 전체</option>
          {programCategories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 총 개수 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">총 개수</span>
        <span className="text-sm font-bold text-red-500">{filtered.length}</span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">no</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-32">분야</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-36">직업군</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">프로그램</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-40">카테고리</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((program, index) => {
                const fieldId = program.occupations?.field_id ?? ''
                const fieldName = fieldId ? (fieldMap.get(fieldId) ?? '-') : '-'
                return (
                  <tr
                    key={program.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">{fieldName}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">
                      {program.occupations?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">{program.title || program.name}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">
                      {program.program_categories?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/occupations/${program.id}`)}
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  등록된 직업 프로그램이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
