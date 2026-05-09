import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CompanyInfoView } from '@/components/features/company-info/CompanyInfoView'

export default async function CompanyInfoPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('company_info')
    .select('content_html')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="p-8">
      <CompanyInfoView initialContent={data?.content_html ?? ''} />
    </div>
  )
}
