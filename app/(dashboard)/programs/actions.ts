'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface OccupationData {
  id: string
  name: string
  content: string | null
  created_at: string
}

export async function getOccupations(): Promise<OccupationData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, content, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getOccupationById(id: string): Promise<OccupationData | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('occupations')
    .select('id, name, content, created_at')
    .eq('id', id)
    .single()
  return data
}

export async function createOccupation(name: string, content: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupations')
    .insert({ name, content })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateOccupation(id: string, name: string, content: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupations')
    .update({ name, content })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function deleteOccupation(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupations')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}
