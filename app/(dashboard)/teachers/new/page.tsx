import { getTeacherSelectData } from '../actions'
import { TeacherForm } from '@/components/features/teachers/TeacherForm'

export default async function TeacherNewPage() {
  const selectData = await getTeacherSelectData()

  return (
    <div className="p-8 max-w-3xl bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">선생님 추가</h1>
      </div>
      <TeacherForm selectData={selectData} />
    </div>
  )
}
