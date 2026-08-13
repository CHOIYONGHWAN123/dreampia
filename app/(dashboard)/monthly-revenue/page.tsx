import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getAvailableMonths, getMonthlyRevenue } from './actions'
import { MonthlyRevenueClient } from '@/components/features/monthly-revenue/MonthlyRevenueClient'

export default async function MonthlyRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('admins').select('is_super').eq('id', user.id).single()
  if (!me?.is_super) redirect('/dashboard')

  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const [availableMonths, data] = await Promise.all([getAvailableMonths(), getMonthlyRevenue(year, month)])

  return (
    <MonthlyRevenueClient
      rows={data.rows}
      totals={data.totals}
      availableMonths={availableMonths}
      currentYear={year}
      currentMonth={month}
    />
  )
}
