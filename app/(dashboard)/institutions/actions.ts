'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// 기관을 실제로 지우지 않고 is_deleted만 true로 표시한다(소프트 삭제).
// 행사/재고로그 등 기존 기록을 그대로 보존하기 위함 — 목록/선택 화면에서는
// 제외하고, 이미 연결된 행사 등 과거 기록에는 "(삭제됨)"으로 표시한다.
export async function softDeleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update({ is_deleted: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function restoreInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update({ is_deleted: false }).eq('id', id)
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
