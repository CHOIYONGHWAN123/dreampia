import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EventForm } from '@/components/features/events/EventForm'
import { getEventProgramSelectData } from '@/app/(dashboard)/events/actions'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ institutionId?: string }>
}) {
  const { institutionId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const [
    { data: institution },
    { data: campaigns },
    { data: salesAdmins },
    { data: commAdmins },
    programSelectData,
  ] = await Promise.all([
    institutionId
      ? supabase.from('institutions').select('id, name, address, institution_type, contact_name, contact_email, contact_phone, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, teacher_name').eq('id', institutionId).single()
      : Promise.resolve({ data: null }),
    supabase.from('campaign').select('id, name').order('name'),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    getEventProgramSelectData(),
  ])

  return (
    <EventForm
      institution={institution ?? null}
      campaigns={campaigns || []}
      salesAdmins={salesAdmins || []}
      commAdmins={commAdmins || []}
      fields={programSelectData.fields}
      occupations={programSelectData.occupations}
      programs={programSelectData.programs}
      units={programSelectData.units}
      mentorsByUnit={programSelectData.mentorsByUnit}
    />
  )
}
