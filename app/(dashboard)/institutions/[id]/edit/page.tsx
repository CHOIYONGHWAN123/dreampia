import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { InstitutionForm } from '@/components/features/institutions/InstitutionForm'

export default async function InstitutionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <div className="p-8">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학교 수정</h1>
      </div>
      <InstitutionForm
        id={data.id}
        defaultValues={{
          name: data.name,
          category: data.category ?? '',
          address: data.address ?? '',
          region1: data.region1,
          region2: data.region2 ?? '',
          institution_type: data.institution_type ?? '',
          teacher_name: data.teacher_name ?? '',
          admin_contact: data.admin_contact ?? '',
          instructor_waiting_room: data.instructor_waiting_room ?? '',
          has_elevator: data.has_elevator ?? false,
          floor_map_url: data.floor_map_url ?? '',
          contact_name: data.contact_name ?? '',
          contact_email: data.contact_email ?? '',
          contact_phone: data.contact_phone ?? '',
          laptop_wifi_note: data.laptop_wifi_note ?? '',
          crime_check_method: data.crime_check_method ?? '',
          crime_check_info: data.crime_check_info ?? '',
          indoor_shoes_note: data.indoor_shoes_note ?? '',
          parking_note: data.parking_note ?? '',
        }}
      />
    </div>
  )
}
