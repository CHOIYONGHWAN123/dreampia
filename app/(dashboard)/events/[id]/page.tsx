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
    { data: salesAdmins },
    { data: commAdmins },
    { data: suppliesAdmins },
    { data: contractAdmins },
    { data: recruitAdmins },
    programSelectData,
    signedResult,
    transactionStatementSignedResult,
  ] = await Promise.all([
    detail.event.institution_id
      ? supabase.from('institutions').select('id, name, address, institution_type, contact_name, contact_email, contact_phone, instructor_waiting_room, admin_contact, has_elevator, floor_map_url, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, teacher_name, is_deleted').eq('id', detail.event.institution_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_supplies', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_contract', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_recruit', true).order('name'),
    getEventProgramSelectData(),
    detail.event.estimate_file_url
      ? supabase.storage.from('events').createSignedUrl(detail.event.estimate_file_url, 60 * 60)
      : Promise.resolve({ data: null }),
    detail.event.transaction_statement_file_url
      ? supabase.storage.from('events').createSignedUrl(detail.event.transaction_statement_file_url, 60 * 60)
      : Promise.resolve({ data: null }),
  ])

  return (
    <EventForm
      institution={institution ?? null}
      salesAdmins={salesAdmins || []}
      commAdmins={commAdmins || []}
      suppliesAdmins={suppliesAdmins || []}
      contractAdmins={contractAdmins || []}
      recruitAdmins={recruitAdmins || []}
      eventCategories={programSelectData.eventCategories}
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
      initialTransactionStatementFileUrl={transactionStatementSignedResult.data?.signedUrl ?? null}
      initialPhotosByRow={detail.photosByRow}
      initialNoticeFiles={detail.noticeFiles}
      initialDateGroups={detail.dateGroups}
    />
  )
}
