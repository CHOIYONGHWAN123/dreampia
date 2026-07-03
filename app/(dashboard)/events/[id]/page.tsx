import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/features/events/EventForm'
import { getEventDetail, getEventProgramSelectData } from '@/app/(dashboard)/events/actions'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [
    detail,
    { data: institutions },
    { data: campaigns },
    { data: salesAdmins },
    { data: commAdmins },
    programSelectData,
  ] = await Promise.all([
    getEventDetail(id),
    supabase.from('institutions').select('id, name, address, region1, region2, category, teacher_name, admin_contact, institution_type, contact_name, contact_email, contact_phone, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note').order('name'),
    supabase.from('campaign').select('id, name').order('name'),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    getEventProgramSelectData(),
  ])

  if (!detail) notFound()

  let estimateFileUrl: string | null = null
  if (detail.event.estimate_file_url) {
    const { data: signed } = await supabase.storage
      .from('events')
      .createSignedUrl(detail.event.estimate_file_url, 60 * 60)
    estimateFileUrl = signed?.signedUrl ?? null
  }

  return (
    <EventForm
      institutions={institutions || []}
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
      initialEstimateFileUrl={estimateFileUrl}
    />
  )
}
