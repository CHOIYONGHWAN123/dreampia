'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type MentorOccupationProgramRow = {
  mop_id: string
  occupation_program_id: string
  ppt_file_url: string | null
  lecture_fee_payer_id: string | null
  lecture_fee_payer_name: string | null
  material_fee_payer_id: string | null
  material_fee_payer_name: string | null
  program_title: string
  school_level: string | null
  material_cost_per_person: number | null
  prep_by: string | null
  occupation_id: string
  occupation_name: string
  field_id: string | null
  field_name: string | null
}

export type MentorWithPrograms = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  available_areas: string[] | null
  is_available: boolean
  is_authenticated: boolean
  score: number | null
  created_at: string
  belongs_to: string | null
  id_number: string | null
  bank_account: string | null
  agreement_file_url: string | null
  profile_file_url: string | null
  terms_agreed_at: string | null
  mentor_type: '소속강사' | '소속대표' | '개인'
  belongs_to_name: string | null
  occupation_programs: MentorOccupationProgramRow[]
}

export async function getMentorsWithPrograms(): Promise<MentorWithPrograms[]> {
  const supabase = await createServerSupabaseClient()

  const { data: mentors, error: mentorError } = await supabase
    .from('mentors')
    .select(
      'id, name, phone, email, address, available_areas, is_available, is_authenticated, score, created_at, belongs_to, id_number, bank_account, agreement_file_url, profile_file_url, terms_agreed_at'
    )
    .order('created_at', { ascending: true })

  if (mentorError) throw new Error(mentorError.message)
  if (!mentors?.length) return []

  const mentorIds = mentors.map((m) => m.id)

  // 소속대표 여부 판별: 자신의 id를 belongs_to로 갖는 다른 멘토가 있는 경우
  const subordinateOwnerIds = new Set(
    mentors.filter((m) => m.belongs_to).map((m) => m.belongs_to as string)
  )

  const belongsToNameMap = new Map<string, string>()
  for (const m of mentors) {
    belongsToNameMap.set(m.id, m.name)
  }

  const { data: mopRows } = await supabase
    .from('mentor_occupation_programs')
    .select('id, mentor_id, occupation_program_id, ppt_file_url, lecture_fee_payer_id, material_fee_payer_id')
    .in('mentor_id', mentorIds)

  if (!mopRows?.length) {
    return mentors.map((m) => ({
      ...m,
      mentor_type: getMentorType(m.id, m.belongs_to, subordinateOwnerIds),
      belongs_to_name: m.belongs_to ? (belongsToNameMap.get(m.belongs_to) ?? null) : null,
      occupation_programs: [],
    }))
  }

  const programIds = [...new Set(mopRows.map((r) => r.occupation_program_id))] as string[]
  const feePayerIds = [
    ...new Set([
      ...mopRows.map((r) => r.lecture_fee_payer_id),
      ...mopRows.map((r) => r.material_fee_payer_id),
    ].filter(Boolean)),
  ] as string[]

  const [programsRes, feePayersRes] = await Promise.all([
    supabase
      .from('occupation_programs')
      .select('id, title, occupation_id, school_level, material_cost_per_person, prep_by')
      .in('id', programIds),
    feePayerIds.length
      ? supabase.from('mentors').select('id, name').in('id', feePayerIds)
      : Promise.resolve({ data: [] }),
  ])

  const programMap = new Map((programsRes.data ?? []).map((p) => [p.id, p]))
  const feePayerMap = new Map((feePayersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))

  const occupationIds = [
    ...new Set((programsRes.data ?? []).map((p) => p.occupation_id).filter(Boolean)),
  ] as string[]

  const { data: occupations } = await supabase
    .from('occupations')
    .select('id, name, field_id')
    .in('id', occupationIds)

  const occupationMap = new Map((occupations ?? []).map((o) => [o.id, o]))

  const fieldIds = [
    ...new Set((occupations ?? []).map((o: { field_id: string | null }) => o.field_id).filter(Boolean)),
  ] as string[]

  const fieldMap = new Map<string, string>()
  if (fieldIds.length) {
    const { data: fields } = await supabase
      .from('fields')
      .select('id, name')
      .in('id', fieldIds)
    for (const f of fields ?? []) fieldMap.set(f.id, f.name)
  }

  const mopByMentor = new Map<string, typeof mopRows>()
  for (const row of mopRows) {
    const arr = mopByMentor.get(row.mentor_id) ?? []
    arr.push(row)
    mopByMentor.set(row.mentor_id, arr)
  }

  return mentors.map((m) => {
    const rows = mopByMentor.get(m.id) ?? []
    const occupationPrograms: MentorOccupationProgramRow[] = rows.map((r) => {
      const prog = programMap.get(r.occupation_program_id)
      const occ = prog ? occupationMap.get(prog.occupation_id) : null
      return {
        mop_id: r.id,
        occupation_program_id: r.occupation_program_id,
        ppt_file_url: r.ppt_file_url,
        lecture_fee_payer_id: r.lecture_fee_payer_id,
        lecture_fee_payer_name: r.lecture_fee_payer_id ? (feePayerMap.get(r.lecture_fee_payer_id) ?? null) : null,
        material_fee_payer_id: r.material_fee_payer_id,
        material_fee_payer_name: r.material_fee_payer_id ? (feePayerMap.get(r.material_fee_payer_id) ?? null) : null,
        program_title: prog?.title ?? '-',
        school_level: prog?.school_level ?? null,
        material_cost_per_person: prog?.material_cost_per_person ?? null,
        prep_by: prog?.prep_by ?? null,
        occupation_id: prog?.occupation_id ?? '',
        occupation_name: occ?.name ?? '-',
        field_id: occ?.field_id ?? null,
        field_name: occ?.field_id ? (fieldMap.get(occ.field_id) ?? null) : null,
      }
    })

    return {
      ...m,
      mentor_type: getMentorType(m.id, m.belongs_to, subordinateOwnerIds),
      belongs_to_name: m.belongs_to ? (belongsToNameMap.get(m.belongs_to) ?? null) : null,
      occupation_programs: occupationPrograms,
    }
  })
}

function getMentorType(
  id: string,
  belongsTo: string | null,
  subordinateOwnerIds: Set<string>
): '소속강사' | '소속대표' | '개인' {
  if (belongsTo) return '소속강사'
  if (subordinateOwnerIds.has(id)) return '소속대표'
  return '개인'
}

export async function updateMentorAvailable(
  mentorId: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ is_available: isAvailable })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorAuthenticated(
  mentorId: string,
  isAuthenticated: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ is_authenticated: isAuthenticated })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorFields(
  mentorId: string,
  payload: {
    address?: string | null
    score?: number | null
    id_number?: string | null
    bank_account?: string | null
    phone?: string | null
    available_areas?: string[] | null
    belongs_to?: string | null
  }
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('mentors').update(payload).eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorProfileUrl(mentorId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ profile_file_url: url })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorAgreementUrl(mentorId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ agreement_file_url: url })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMopPptUrl(mopId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ ppt_file_url: url })
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function deleteMopById(mopId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .delete()
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function addMentorOccupationProgram(
  mentorId: string,
  occupationProgramId: string,
  lectureFeePayerId?: string | null,
  materialFeePayerId?: string | null
): Promise<MentorOccupationProgramRow> {
  const supabase = await createServerSupabaseClient()

  const { data: mop, error } = await supabase
    .from('mentor_occupation_programs')
    .insert({
      mentor_id: mentorId,
      occupation_program_id: occupationProgramId,
      lecture_fee_payer_id: lectureFeePayerId ?? null,
      material_fee_payer_id: materialFeePayerId ?? null,
    })
    .select('id, mentor_id, occupation_program_id, ppt_file_url, lecture_fee_payer_id, material_fee_payer_id')
    .single()
  if (error) throw new Error(error.message)

  const payerIds = [lectureFeePayerId, materialFeePayerId].filter(Boolean) as string[]
  const [progRes, payersRes] = await Promise.all([
    supabase
      .from('occupation_programs')
      .select('id, title, occupation_id, school_level, material_cost_per_person, prep_by')
      .eq('id', occupationProgramId)
      .single(),
    payerIds.length
      ? supabase.from('mentors').select('id, name').in('id', payerIds)
      : Promise.resolve({ data: [] }),
  ])

  const prog = progRes.data
  const payerMap = new Map(
    (payersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name])
  )

  let occData: { id: string; name: string; field_id: string | null } | null = null
  if (prog?.occupation_id) {
    const { data } = await supabase
      .from('occupations')
      .select('id, name, field_id')
      .eq('id', prog.occupation_id)
      .single()
    occData = data
  }

  let fieldName: string | null = null
  if (occData?.field_id) {
    const { data: fieldData } = await supabase
      .from('fields')
      .select('name')
      .eq('id', occData.field_id)
      .single()
    fieldName = fieldData?.name ?? null
  }

  revalidatePath('/mentors')

  return {
    mop_id: mop.id,
    occupation_program_id: mop.occupation_program_id,
    ppt_file_url: mop.ppt_file_url,
    lecture_fee_payer_id: mop.lecture_fee_payer_id,
    lecture_fee_payer_name: mop.lecture_fee_payer_id
      ? (payerMap.get(mop.lecture_fee_payer_id) ?? null)
      : null,
    material_fee_payer_id: mop.material_fee_payer_id,
    material_fee_payer_name: mop.material_fee_payer_id
      ? (payerMap.get(mop.material_fee_payer_id) ?? null)
      : null,
    program_title: prog?.title ?? '-',
    school_level: prog?.school_level ?? null,
    material_cost_per_person: prog?.material_cost_per_person ?? null,
    prep_by: prog?.prep_by ?? null,
    occupation_id: prog?.occupation_id ?? '',
    occupation_name: occData?.name ?? '-',
    field_id: occData?.field_id ?? null,
    field_name: fieldName,
  }
}

export type AddProgramSelectData = {
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; title: string; occupation_id: string; school_level: string | null }[]
  mentors: { id: string; name: string }[]
}

export async function getAddProgramSelectData(): Promise<AddProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [fieldsRes, occsRes, progsRes, mentorsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, title, occupation_id, school_level').order('title'),
    supabase.from('mentors').select('id, name').order('name'),
  ])
  return {
    fields: fieldsRes.data ?? [],
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: progsRes.data ?? [],
    mentors: mentorsRes.data ?? [],
  }
}
