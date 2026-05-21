import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EventForm } from '@/components/features/events/EventForm'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ institutionId?: string }>
}) {
  const { institutionId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const [
    { data: institutions },
    { data: programs },
    { data: salesAdmins },
    { data: commAdmins },
  ] = await Promise.all([
    supabase.from('institutions').select('id, name, address, region1, region2, category, teacher_name, admin_contact, institution_type, contact_name, contact_email, contact_phone, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note').order('name'),
    supabase.from('occupation_programs').select('id, title').order('title'),
    supabase.from('admins').select('id, name').eq('is_sales', true).order('name'),
    supabase.from('admins').select('id, name').eq('is_comm', true).order('name'),
  ])

  return (
    <EventForm
      institutions={institutions || []}
      programs={programs || []}
      salesAdmins={salesAdmins || []}
      commAdmins={commAdmins || []}
      defaultInstitutionId={institutionId}
    />
  )
}
