import { getFields, getProgramCategories } from './actions'
import { ProgramsClient } from '@/components/features/programs/ProgramsClient'

export default async function ProgramsPage() {
  const [fields, programCategories] = await Promise.all([getFields(), getProgramCategories()])

  return <ProgramsClient initialFields={fields} programCategories={programCategories} />
}
