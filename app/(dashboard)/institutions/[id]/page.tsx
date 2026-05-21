import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { InstitutionDetailClient } from '@/components/features/institutions/InstitutionDetailClient'

export default async function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: institution }, eventsResult] = await Promise.all([
    supabase.from('institutions').select('id, name, address').eq('id', id).single(),
    supabase
      .from('events')
      .select('id, name, memo, teacher_name, recruit_status, event_start_at, event_end_at, start_recruit_at, recruit_delivered, institution_request_status, estimate_file_url, admin_docs_delivered, contract_status')
      .eq('institution_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!institution) notFound()

  if (eventsResult.error) {
    console.error('[InstitutionDetail] events 조회 오류:', eventsResult.error.message)
  }

  const events = eventsResult.data

  return (
    <>
      {eventsResult.error && (
        <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          행사 데이터 조회 오류: {eventsResult.error.message}
          <br />
          <span className="text-xs text-red-400">DB 마이그레이션(start_recruit_at, institution_request_status 컬럼 추가)이 필요할 수 있습니다.</span>
        </div>
      )}
      <InstitutionDetailClient institution={institution} events={events || []} />
    </>
  )
}
