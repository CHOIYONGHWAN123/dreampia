import { getOccupationPrograms, getFields, getOccupations, getProgramCategories } from './actions'
import { OccupationsClient } from '@/components/features/occupations/OccupationsClient'

export default async function OccupationsPage() {
  const [programs, fields, occupations, programCategories] = await Promise.all([
    getOccupationPrograms(),
    getFields(),
    getOccupations(),
    getProgramCategories(),
  ])

  return (
    <OccupationsClient
      programs={programs}
      fields={fields}
      occupations={occupations}
      programCategories={programCategories}
    />
  )
}
