import { getTeacherSelectData } from '../actions'
import { TeacherForm } from '@/components/features/teachers/TeacherForm'

export default async function TeacherNewPage() {
  const selectData = await getTeacherSelectData()

  return (
    <div className="p-8 max-w-3xl">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">선생님 추가</h1>
      </div>
      <TeacherForm selectData={selectData} />
    </div>
  )
}
