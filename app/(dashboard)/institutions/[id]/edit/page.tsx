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
        }}
      />
    </div>
  )
}
