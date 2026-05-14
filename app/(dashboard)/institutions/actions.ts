'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function deleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function updateInstitution(id: string, data: {
  region1: string
  region2?: string
  name: string
  address?: string
  category?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update({
    region1: data.region1,
    region2: data.region2 || null,
    name: data.name,
    address: data.address || null,
    category: data.category || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function createInstitution(data: {
  region1: string
  region2?: string
  name: string
  address?: string
  category?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').insert({
    region1: data.region1,
    region2: data.region2 || null,
    name: data.name,
    address: data.address || null,
    category: data.category || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}
