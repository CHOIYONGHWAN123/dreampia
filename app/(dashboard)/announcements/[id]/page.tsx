import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { AnnouncementForm } from '@/components/features/announcements/AnnouncementForm'

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('announcements')
    .select('id, title, content')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <div className="p-8">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 수정</h1>
      </div>
      <AnnouncementForm
        id={data.id}
        defaultValues={{ title: data.title, content: data.content }}
      />
    </div>
  )
}
