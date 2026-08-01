import { getEventCategories, getFields } from './actions'
import { ProgramsClient } from '@/components/features/programs/ProgramsClient'

export default async function ProgramsPage() {
  const [eventCategories, fields] = await Promise.all([
    getEventCategories(),
    getFields(),
  ])

  return (
    <ProgramsClient
      initialEventCategories={eventCategories}
      initialFields={fields}
    />
  )
}
