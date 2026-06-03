import { getOccupations, getProgramCategories, getFields } from '../actions'
import { OccupationNewForm } from '@/components/features/occupations/OccupationNewForm'

export default async function OccupationNewPage() {
  const [occupations, programCategories, fields] = await Promise.all([
    getOccupations(),
    getProgramCategories(),
    getFields(),
  ])

  return (
    <OccupationNewForm
      existingOccupations={occupations}
      programCategories={programCategories}
      existingFields={fields}
    />
  )
}
