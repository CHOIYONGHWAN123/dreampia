'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getInstitutionEventCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', id)
  return count ?? 0
}

// 이 기관 소속으로 등록된 선생님 계정 정리 (Auth 계정 자체는 mentors 삭제와 동일하게
// 남겨둠 — teachers.user_id는 고아로 남지만 이 프로젝트의 기존 관례를 따름)
async function deleteTeachersByInstitution(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  institutionId: string
) {
  const { error } = await supabase.from('teachers').delete().eq('institution_id', institutionId)
  if (error) throw new Error(error.message)
}

export async function deleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  await deleteTeachersByInstitution(supabase, id)
  const { error } = await supabase.from('institutions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function deleteInstitutionWithEvents(institutionId: string) {
  const supabase = await createServerSupabaseClient()

  // event_rows/event_photos/supply_logs/event_sessions/event_schedules는 모두
  // events.id에 ON DELETE CASCADE(또는 SET NULL)로 연결되어 있어 events만 지우면
  // 자동으로 정리된다 (event_admins/tasks 테이블은 실제로 존재하지 않아 삭제 대상이 아니었음).
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('institution_id', institutionId)

  if (events && events.length > 0) {
    // events 테이블 삭제는 RLS상 슈퍼관리자만 가능하다. 일반 관리자가 시도하면
    // RLS가 조용히 0건을 지우고 넘어가서 institutions FK 에러로만 뒤늦게 드러나므로,
    // 여기서 미리 확인해 명확한 메시지로 막는다.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: admin } = user
      ? await supabase.from('admins').select('is_super').eq('id', user.id).single()
      : { data: null }
    if (!admin?.is_super) {
      throw new Error('행사가 등록된 기관은 슈퍼관리자만 삭제할 수 있습니다.')
    }

    const eventIds = events.map((e) => e.id)
    const { error: eventsError } = await supabase.from('events').delete().in('id', eventIds)
    if (eventsError) throw new Error(eventsError.message)
  }

  await deleteTeachersByInstitution(supabase, institutionId)

  const { error } = await supabase.from('institutions').delete().eq('id', institutionId)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

type InstitutionData = {
  region1: string
  region2?: string
  name: string
  address?: string
  institution_type?: string
  admin_contact?: string
  instructor_waiting_room?: string
  has_elevator?: boolean
  floor_map_url?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  laptop_wifi_note?: string
  crime_check_method?: string
  crime_check_info?: string
  indoor_shoes_note?: string
  parking_note?: string
}

function toPayload(data: InstitutionData) {
  return {
    region1: data.region1,
    region2: data.region2 || null,
    name: data.name,
    address: data.address || null,
    institution_type: data.institution_type || null,
    admin_contact: data.admin_contact || null,
    instructor_waiting_room: data.instructor_waiting_room || null,
    has_elevator: data.has_elevator ?? null,
    floor_map_url: data.floor_map_url || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
  }
}

export async function updateInstitution(id: string, data: InstitutionData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update(toPayload(data)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function createInstitution(data: InstitutionData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').insert(toPayload(data))
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}
