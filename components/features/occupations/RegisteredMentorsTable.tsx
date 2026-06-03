'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getRegisteredMentorsByProgramId,
  type RegisteredMentorData,
} from '@/app/(dashboard)/occupations/actions'

type Props = {
  programId: string
}

export function RegisteredMentorsTable({ programId }: Props) {
  const router = useRouter()
  const [mentors, setMentors] = useState<RegisteredMentorData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getRegisteredMentorsByProgramId(programId)
      .then(setMentors)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [programId])

  return (
    <div className="mt-6 space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">등록된 멘토</h2>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">NO</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">이름</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">연락처</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-32">강의가능 여부</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : mentors.length > 0 ? (
              mentors.map((mentor, index) => (
                <tr key={mentor.mentor_occupation_program_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{mentor.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{mentor.phone ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-sm font-medium ${mentor.is_available ? 'text-green-600' : 'text-red-400'}`}>
                      {mentor.is_available ? '가능' : '불가'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/mentors/${mentor.mentor_id}`)}
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  등록된 멘토가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
