'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function deleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').delete().eq('id', id)
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
