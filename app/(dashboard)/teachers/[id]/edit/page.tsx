import { notFound } from 'next/navigation'
import { getTeacher, getTeacherSelectData } from '../../actions'
import { TeacherForm } from '@/components/features/teachers/TeacherForm'

export default async function TeacherEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [teacher, selectData] = await Promise.all([getTeacher(id), getTeacherSelectData()])

  if (!teacher) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">선생님 수정</h1>
      </div>
      <TeacherForm selectData={selectData} teacher={teacher} />
    </div>
  )
}
