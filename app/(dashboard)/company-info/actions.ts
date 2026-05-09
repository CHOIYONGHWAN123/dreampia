'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function saveCompanyInfo(contentHtml: string) {
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('company_info')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('company_info')
      .update({ content_html: contentHtml, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('company_info')
      .insert({ content_html: contentHtml })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/company-info')
}
