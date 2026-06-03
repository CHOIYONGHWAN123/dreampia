import { getMentorsWithPrograms, getAddProgramSelectData } from './actions'
import { MentorsClient } from '@/components/features/mentors/MentorsClient'

export default async function MentorsPage() {
  const [mentors, selectData] = await Promise.all([
    getMentorsWithPrograms(),
    getAddProgramSelectData(),
  ])
  return <MentorsClient mentors={mentors} selectData={selectData} />
}
