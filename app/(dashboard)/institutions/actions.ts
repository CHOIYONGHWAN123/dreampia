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

export async function deleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function deleteInstitutionWithEvents(institutionId: string) {
  const supabase = await createServerSupabaseClient()

  // 행사 ID 목록 조회
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('institution_id', institutionId)

  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id)

    // event_rows 조회 후 하위 데이터 순서대로 삭제
    const { data: rows } = await supabase
      .from('event_rows')
      .select('id')
      .in('event_id', eventIds)

    if (rows && rows.length > 0) {
      const rowIds = rows.map((r) => r.id)
      await supabase.from('event_photos').delete().in('event_rows_id', rowIds)
      await supabase.from('supply_logs').delete().in('event_row_id', rowIds)
      await supabase.from('event_rows').delete().in('event_id', eventIds)
    }

    await supabase.from('event_sessions').delete().in('event_id', eventIds)
    await supabase.from('event_admins').delete().in('event_id', eventIds)
    await supabase.from('tasks').delete().in('event_id', eventIds)
    await supabase.from('events').delete().in('id', eventIds)
  }

  const { error } = await supabase.from('institutions').delete().eq('id', institutionId)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

type InstitutionData = {
  region1: string
  region2?: string
  name: string
  address?: string
  category?: string
  institution_type?: string
  teacher_name?: string
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
    category: data.category || null,
    institution_type: data.institution_type || null,
    teacher_name: data.teacher_name || null,
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
