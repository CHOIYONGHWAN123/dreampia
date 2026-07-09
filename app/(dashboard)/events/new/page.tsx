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
    campaignsResult,
    salesAdminsResult,
    commAdminsResult,
    programSelectData,
  ] = await Promise.all([
    institutionId
      ? supabase.from('institutions').select('id, name, address, institution_type, contact_name, contact_email, contact_phone, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, teacher_name').eq('id', institutionId).single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('campaign').select('id, name').order('name'),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
    getEventProgramSelectData(),
  ])

  const { data: campaigns } = campaignsResult
  const { data: salesAdmins } = salesAdminsResult
  const { data: commAdmins } = commAdminsResult

  const queryError =
    institutionResult.error || campaignsResult.error || salesAdminsResult.error || commAdminsResult.error

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
        campaigns={campaigns || []}
        salesAdmins={salesAdmins || []}
        commAdmins={commAdmins || []}
        fields={programSelectData.fields}
        occupations={programSelectData.occupations}
        programs={programSelectData.programs}
        units={programSelectData.units}
        mentorsByUnit={programSelectData.mentorsByUnit}
      />
    </>
  )
}
