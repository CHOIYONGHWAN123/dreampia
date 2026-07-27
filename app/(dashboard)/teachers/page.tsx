import { getTeachers } from './actions'
import { TeachersClient } from '@/components/features/teachers/TeachersClient'

export default async function TeachersPage() {
  const teachers = await getTeachers()

  return <TeachersClient teachers={teachers} />
}
