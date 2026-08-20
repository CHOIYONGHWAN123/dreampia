'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface PptTemplateData {
  id: string
  name: string
  file_url: string
  created_at: string
}

export async function getPptTemplates(): Promise<PptTemplateData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('ppt_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as PptTemplateData[]
}

export async function createPptTemplate(name: string, fileUrl: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('ppt_templates').insert({ name, file_url: fileUrl })
  if (error) throw new Error(error.message)
  revalidatePath('/ppt-templates')
  revalidatePath('/programs')
}

export async function updatePptTemplate(id: string, name: string, fileUrl: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('ppt_templates')
    .update({ name, file_url: fileUrl })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ppt-templates')
  revalidatePath('/programs')
}

export async function deletePptTemplateById(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('ppt_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ppt-templates')
  revalidatePath('/programs')
}
