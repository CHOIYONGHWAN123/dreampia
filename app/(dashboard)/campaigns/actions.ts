'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface CampaignData {
  id: string
  name: string
  content: string | null
  created_at: string
}

export async function getCampaigns(): Promise<CampaignData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('campaign')
    .select('id, name, content, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getCampaignById(id: string): Promise<CampaignData | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('campaign')
    .select('id, name, content, created_at')
    .eq('id', id)
    .single()
  return data
}

export async function createCampaign(name: string, content: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('campaign')
    .insert({ name, content })
  if (error) throw new Error(error.message)
  revalidatePath('/campaigns')
}

export async function updateCampaign(id: string, name: string, content: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('campaign')
    .update({ name, content })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/campaigns')
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('campaign')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/campaigns')
}
