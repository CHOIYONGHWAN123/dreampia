import { getOccupations, getProgramCategories } from '../actions'
import { OccupationNewForm } from '@/components/features/occupations/OccupationNewForm'

export default async function OccupationNewPage() {
  const [occupations, programCategories] = await Promise.all([
    getOccupations(),
    getProgramCategories(),
  ])

  return (
    <OccupationNewForm
      existingOccupations={occupations}
      programCategories={programCategories}
    />
  )
}
