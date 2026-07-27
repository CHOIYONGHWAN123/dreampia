'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface TeacherRow {
  id: string
  name: string
  email: string | null
  userId: string | null
  institutionId: string
  institutionName: string
  region1: string
  region2: string | null
  address: string | null
}

export async function getTeachers(): Promise<TeacherRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, name, email, user_id, institution_id, created_at')
    .order('created_at', { ascending: true })

  const rows = teachers ?? []
  const institutionIds = [...new Set(rows.map((r) => r.institution_id))]

  const { data: institutions } = institutionIds.length > 0
    ? await supabase.from('institutions').select('id, name, region1, region2, address').in('id', institutionIds)
    : { data: [] as { id: string; name: string; region1: string; region2: string | null; address: string | null }[] }

  const institutionMap = new Map((institutions ?? []).map((i) => [i.id, i]))

  return rows.map((t) => {
    const inst = institutionMap.get(t.institution_id)
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      userId: t.user_id,
      institutionId: t.institution_id,
      institutionName: inst?.name ?? '-',
      region1: inst?.region1 ?? '-',
      region2: inst?.region2 ?? null,
      address: inst?.address ?? null,
    }
  })
}

export interface InstitutionOption {
  id: string
  name: string
  region1: string
  region2: string | null
}

export async function getTeacherSelectData(): Promise<{ institutions: InstitutionOption[] }> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('institutions')
    .select('id, name, region1, region2')
    .order('name')
  return { institutions: data ?? [] }
}

export async function getTeacher(id: string): Promise<TeacherRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, name, email, user_id, institution_id')
    .eq('id', id)
    .single()

  if (!teacher) return null

  const { data: institution } = await supabase
    .from('institutions')
    .select('name, region1, region2, address')
    .eq('id', teacher.institution_id)
    .single()

  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    userId: teacher.user_id,
    institutionId: teacher.institution_id,
    institutionName: institution?.name ?? '-',
    region1: institution?.region1 ?? '-',
    region2: institution?.region2 ?? null,
    address: institution?.address ?? null,
  }
}

export interface CreateTeacherInput {
  institutionId: string
  name: string
  email: string | null
  password: string | null
}

export async function createTeacher(input: CreateTeacherInput): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // 이메일/비밀번호가 있으면 Supabase Auth 계정 먼저 생성 (createMentor와 동일한 방식)
  let authUserId: string | null = null
  if (input.email && input.password) {
    const { createAdminSupabaseClient } = await import('@/lib/supabase-admin')
    const admin = createAdminSupabaseClient()
    const { data, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    })
    if (authError) throw new Error(`계정 생성 실패: ${authError.message}`)
    authUserId = data.user.id
  }

  const { error } = await supabase.from('teachers').insert({
    institution_id: input.institutionId,
    user_id: authUserId,
    name: input.name,
    email: input.email,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/teachers')
}

export interface UpdateTeacherInput {
  institutionId: string
  name: string
}

export async function updateTeacher(id: string, input: UpdateTeacherInput): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('teachers')
    .update({ institution_id: input.institutionId, name: input.name })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/teachers')
}

export async function resetTeacherPassword(userId: string, newPassword: string): Promise<void> {
  const { createAdminSupabaseClient } = await import('@/lib/supabase-admin')
  const admin = createAdminSupabaseClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) throw new Error(`비밀번호 재설정 실패: ${error.message}`)
}

// 계정 없이 등록된 선생님에게 나중에 로그인 계정을 만들어주는 액션
export async function createTeacherAccount(teacherId: string, email: string, password: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { createAdminSupabaseClient } = await import('@/lib/supabase-admin')
  const admin = createAdminSupabaseClient()
  const { data, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) throw new Error(`계정 생성 실패: ${authError.message}`)

  const { error } = await supabase
    .from('teachers')
    .update({ user_id: data.user.id, email })
    .eq('id', teacherId)
  if (error) throw new Error(error.message)

  revalidatePath('/teachers')
}

export async function deleteTeacher(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('teachers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/teachers')
}
