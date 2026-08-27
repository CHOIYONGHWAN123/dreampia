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
    institutionResult,
    salesAdminsResult,
    commAdminsResult,
    suppliesAdminsResult,
    contractAdminsResult,
    recruitAdminsResult,
    programSelectData,
  ] = await Promise.all([
    institutionId
      ? supabase.from('institutions').select('id, name, address, institution_type, contact_name, contact_email, contact_phone, instructor_waiting_room, admin_contact, has_elevator, floor_map_url, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, teacher_name, is_deleted').eq('id', institutionId).single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_supplies', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_contract', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_recruit', true).order('name'),
    getEventProgramSelectData(),
  ])

  const { data: salesAdmins } = salesAdminsResult
  const { data: commAdmins } = commAdminsResult
  const { data: suppliesAdmins } = suppliesAdminsResult
  const { data: contractAdmins } = contractAdminsResult
  const { data: recruitAdmins } = recruitAdminsResult

  const queryError =
    institutionResult.error || salesAdminsResult.error || commAdminsResult.error ||
    suppliesAdminsResult.error || contractAdminsResult.error || recruitAdminsResult.error

  if (queryError) {
    console.error('[NewEventPage] 데이터 조회 오류:', queryError.message)
  }

  return (
    <>
      {queryError && (
        <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          데이터 조회 오류: {queryError.message}
        </div>
      )}
      <EventForm
        institution={institutionResult.data ?? null}
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
      />
    </>
  )
}
