import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ProgramEditor } from '@/components/features/programs/ProgramEditor'

export default async function ProgramEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('campaign')
    .select('id, name, content')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <ProgramEditor
      id={data.id}
      initialName={data.name}
      initialContent={data.content ?? ''}
    />
  )
}
