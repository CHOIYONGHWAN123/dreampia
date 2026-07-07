import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/features/events/EventForm'
import { getEventDetail, getEventProgramSelectData } from '@/app/(dashboard)/events/actions'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const detail = await getEventDetail(id)
  if (!detail) notFound()

  const [
    { data: institution },
    { data: campaigns },
    { data: salesAdmins },
    { data: commAdmins },
    programSelectData,
    signedResult,
  ] = await Promise.all([
    detail.event.institution_id
      ? supabase.from('institutions').select('id, name, address, institution_type, contact_name, contact_email, contact_phone, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, teacher_name').eq('id', detail.event.institution_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('campaign').select('id, name').order('name'),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    getEventProgramSelectData(),
    detail.event.estimate_file_url
      ? supabase.storage.from('events').createSignedUrl(detail.event.estimate_file_url, 60 * 60)
      : Promise.resolve({ data: null }),
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
      eventId={id}
      initialEvent={detail.event}
      initialSchedules={detail.schedules}
      initialEventRows={detail.eventRows}
      initialEstimateFileUrl={signedResult.data?.signedUrl ?? null}
    />
  )
}
