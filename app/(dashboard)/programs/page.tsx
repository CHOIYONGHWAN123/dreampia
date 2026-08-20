import { getEventCategories, getFields } from './actions'
import { getPptTemplates } from '@/app/(dashboard)/ppt-templates/actions'
import { ProgramsClient } from '@/components/features/programs/ProgramsClient'

export default async function ProgramsPage() {
  const [eventCategories, fields, pptTemplates] = await Promise.all([
    getEventCategories(),
    getFields(),
    getPptTemplates(),
  ])

  return (
    <ProgramsClient
      initialEventCategories={eventCategories}
      initialFields={fields}
      pptTemplates={pptTemplates}
    />
  )
}
