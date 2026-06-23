import { getAddProgramSelectData } from '../actions'
import { MentorNewClient } from '@/components/features/mentors/MentorNewClient'

export default async function MentorNewPage() {
  const selectData = await getAddProgramSelectData()
  return <MentorNewClient selectData={selectData} />
}
