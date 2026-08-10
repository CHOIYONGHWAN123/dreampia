import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CounterDashboard } from '@/components/features/counter/CounterDashboard'

export default async function CounterPage() {
  const supabase = await createServerSupabaseClient()

  // 기간 필터는 클라이언트에서 즉시(재요청 없이) 적용하기 위해 원시 데이터를
  // 한 번에 모두 불러온다 — 강사/기관/행사 규모가 크지 않은 전제.
  const [
    { data: mentors },
    { data: institutions },
    { data: events },
    { data: eventRows },
    { data: units },
    { data: programs },
    { data: occupations },
    { data: fields },
    { data: eventCategories },
  ] = await Promise.all([
    supabase.from('mentors').select('id, created_at'),
    supabase.from('institutions').select('id, name, created_at').eq('is_deleted', false),
    supabase.from('events').select('id, name, event_category_id, event_start_at'),
    supabase.from('event_rows').select('id, event_id, occupation_program_unit_id'),
    supabase.from('occupation_program_unit').select('id, title, occupation_programs_id'),
    supabase.from('occupation_programs').select('id, name, occupation_id'),
    supabase.from('occupations').select('id, name, field_id'),
    supabase.from('fields').select('id, name, event_category_id'),
    supabase.from('event_categories').select('id, name').order('sort_order', { ascending: true }),
  ])

  return (
    <CounterDashboard
      mentors={mentors ?? []}
      institutions={institutions ?? []}
      events={events ?? []}
      eventRows={eventRows ?? []}
      units={units ?? []}
      programs={programs ?? []}
      occupations={occupations ?? []}
      fields={fields ?? []}
      eventCategories={eventCategories ?? []}
    />
  )
}
