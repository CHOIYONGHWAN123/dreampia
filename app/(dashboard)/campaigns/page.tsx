import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { CampaignDeleteButton } from '@/components/features/campaigns/CampaignDeleteButton'

export default async function CampaignsPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('campaign')
    .select('id, name')
    .order('created_at', { ascending: true })

  const campaigns = data || []

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">행사 관리</h1>
        <Link
          href="/campaigns/new"
          className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        >
          추가
        </Link>
      </div>

      {/* 목록 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {campaigns.length > 0 ? (
          campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm text-gray-500 w-24 shrink-0">
                행사명{index + 1}
              </span>
              <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 bg-gray-50">
                {campaign.name}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/campaigns/${campaign.id}/edit`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  수정
                </Link>
                <CampaignDeleteButton id={campaign.id} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-gray-400 text-sm">
            등록된 행사가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
