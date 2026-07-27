import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAvailableMonths, getMentorFeeLedger } from './actions'
import { MentorFeesClient } from '@/components/features/mentor-fees/MentorFeesClient'

export default async function MentorFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const supabase = await createServerSupabaseClient()

  const [availableMonths, groups, mentorsRes] = await Promise.all([
    getAvailableMonths(),
    getMentorFeeLedger({ year, month }),
    supabase.from('mentors').select('id, name').order('name'),
  ])

  return (
    <MentorFeesClient
      groups={groups}
      availableMonths={availableMonths}
      currentYear={year}
      currentMonth={month}
      mentors={mentorsRes.data ?? []}
    />
  )
}
