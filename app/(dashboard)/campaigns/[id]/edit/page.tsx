import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CampaignEditor } from '@/components/features/campaigns/CampaignEditor'

export default async function CampaignEditPage({
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
    <CampaignEditor
      id={data.id}
      initialName={data.name}
      initialContent={data.content ?? ''}
    />
  )
}
