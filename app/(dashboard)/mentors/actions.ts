'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type MentorOccupationProgramRow = {
  mop_id: string
  occupation_program_unit_id: string
  ppt_file_url: string | null
  profile_file_url: string | null
  lecture_fee_payer_id: string | null
  lecture_fee_payer_name: string | null
  material_fee_payer_id: string | null
  material_fee_payer_name: string | null
  program_score: number
  school_request_note: string | null
  program_title: string
  school_level: string | null
  mentor_material_cost: number | null
  prep_by: string | null
  occupation_id: string
  occupation_name: string
  field_id: string | null
  field_name: string | null
  // 자격증은 프로그램(mop) 단위가 아니라 직종 단위로 첨부되므로, 같은 occupation_id를 가진
  // 모든 행에 동일한 목록이 들어간다 (private 버킷 경로 목록).
  certificate_file_urls: string[]
}

export type MentorWithPrograms = {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  address: string | null
  available_areas: string[] | null
  is_available: boolean
  is_authenticated: boolean
  score: number | null
  created_at: string
  belongs_to: string | null
  id_number: string | null
  bank: string | null
  bank_account: string | null
  // 신분증 사진/통장사본/동의서 3종은 다른 파일과 달리 private 버킷(id-card/bankbook/
  // consent-file)에 저장되어, 여기엔 공개 URL이 아니라 버킷 내부 경로만 들어있다.
  // 화면에서 열람하려면 createSignedUrl()로 서명된 URL을 따로 받아야 한다.
  id_card_file_url: string | null
  bankbook_file_url: string | null
  criminal_record_consent_file_url: string | null
  admin_info_consent_file_url: string | null
  contract_file_url: string | null
  terms_agreed_at: string | null
  mentor_unique_code: string
  mentor_type: '소속강사' | '소속대표' | '개인'
  belongs_to_name: string | null
  occupation_programs: MentorOccupationProgramRow[]
}

export async function getMentorsWithPrograms(): Promise<MentorWithPrograms[]> {
  const supabase = await createServerSupabaseClient()

  const { data: mentors, error: mentorError } = await supabase
    .from('mentors')
    .select(
      'id, user_id, name, phone, address, available_areas, is_available, is_authenticated, score, created_at, belongs_to, id_number, bank, bank_account, id_card_file_url, bankbook_file_url, criminal_record_consent_file_url, admin_info_consent_file_url, contract_file_url, terms_agreed_at, mentor_unique_code'
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

  const [{ data: mopRows }, { data: certRows }] = await Promise.all([
    supabase
      .from('mentor_occupation_programs')
      .select('id, mentor_id, occupation_program_unit_id, ppt_file_url, profile_file_url, lecture_fee_payer_id, material_fee_payer_id, program_score, school_request_note')
      .in('mentor_id', mentorIds),
    supabase
      .from('mentor_occupation_certificates')
      .select('mentor_id, occupation_id, file_url')
      .in('mentor_id', mentorIds),
  ])

  const certMap = new Map<string, string[]>()
  for (const c of certRows ?? []) {
    const key = `${c.mentor_id}:${c.occupation_id}`
    const arr = certMap.get(key) ?? []
    arr.push(c.file_url)
    certMap.set(key, arr)
  }
  // 자격증만 올려두고 아직 프로그램은 하나도 등록하지 않은 직종도, 관리자 페이지에서
  // 자격증을 확인할 수 있어야 하므로 별도로 챙긴다.
  const certOnlyOccupationIdsByMentor = new Map<string, Set<string>>()
  for (const c of certRows ?? []) {
    const set = certOnlyOccupationIdsByMentor.get(c.mentor_id) ?? new Set<string>()
    set.add(c.occupation_id)
    certOnlyOccupationIdsByMentor.set(c.mentor_id, set)
  }

  if (!mopRows?.length && !certRows?.length) {
    return mentors.map((m) => ({
      ...m,
      mentor_type: getMentorType(m.id, m.belongs_to, subordinateOwnerIds),
      belongs_to_name: m.belongs_to ? (belongsToNameMap.get(m.belongs_to) ?? null) : null,
      occupation_programs: [],
    }))
  }

  const unitIds = [...new Set((mopRows ?? []).map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]
  const feePayerIds = [
    ...new Set([
      ...(mopRows ?? []).map((r) => r.lecture_fee_payer_id),
      ...(mopRows ?? []).map((r) => r.material_fee_payer_id),
    ].filter(Boolean)),
  ] as string[]

  const [unitsRes, feePayersRes] = await Promise.all([
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, school_level')
      .in('id', unitIds),
    feePayerIds.length
      ? supabase.from('mentors').select('id, name').in('id', feePayerIds)
      : Promise.resolve({ data: [] }),
  ])

  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const feePayerMap = new Map((feePayersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))

  const programIds = [
    ...new Set((unitsRes.data ?? []).map((u) => u.occupation_programs_id).filter(Boolean)),
  ] as string[]
  const { data: programs } = programIds.length
    ? await supabase
        .from('occupation_programs')
        .select('id, name, occupation_id, mentor_material_cost, prep_by')
        .in('id', programIds)
    : { data: [] }
  const programMap = new Map((programs ?? []).map((p) => [p.id, p]))

  const occupationIds = [
    ...new Set([
      ...(programs ?? []).map((p) => p.occupation_id).filter(Boolean),
      ...(certRows ?? []).map((c) => c.occupation_id),
    ]),
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

  const mopByMentor = new Map<string, NonNullable<typeof mopRows>>()
  for (const row of mopRows ?? []) {
    const arr = mopByMentor.get(row.mentor_id) ?? []
    arr.push(row)
    mopByMentor.set(row.mentor_id, arr)
  }

  return mentors.map((m) => {
    const rows = mopByMentor.get(m.id) ?? []
    const occupationPrograms: MentorOccupationProgramRow[] = rows.map((r) => {
      const unit = unitMap.get(r.occupation_program_unit_id)
      const prog = unit?.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : null
      const occ = prog?.occupation_id ? occupationMap.get(prog.occupation_id) : null
      return {
        mop_id: r.id,
        occupation_program_unit_id: r.occupation_program_unit_id,
        ppt_file_url: r.ppt_file_url,
        profile_file_url: r.profile_file_url,
        lecture_fee_payer_id: r.lecture_fee_payer_id,
        lecture_fee_payer_name: r.lecture_fee_payer_id ? (feePayerMap.get(r.lecture_fee_payer_id) ?? null) : null,
        material_fee_payer_id: r.material_fee_payer_id,
        material_fee_payer_name: r.material_fee_payer_id ? (feePayerMap.get(r.material_fee_payer_id) ?? null) : null,
        program_score: r.program_score,
        school_request_note: r.school_request_note,
        program_title: unit?.title ?? '-',
        school_level: unit?.school_level ?? null,
        mentor_material_cost: prog?.mentor_material_cost ?? null,
        prep_by: prog?.prep_by ?? null,
        occupation_id: prog?.occupation_id ?? '',
        occupation_name: occ?.name ?? '-',
        field_id: occ?.field_id ?? null,
        field_name: occ?.field_id ? (fieldMap.get(occ.field_id) ?? null) : null,
        certificate_file_urls: prog?.occupation_id ? (certMap.get(`${m.id}:${prog.occupation_id}`) ?? []) : [],
      }
    })

    // 자격증만 올려두고 프로그램은 아직 하나도 등록하지 않은 직종을, 프로그램 0개짜리
    // 가짜 행으로 추가한다 (mop_id가 없어서 화면에서 삭제 버튼은 뜨지 않는다).
    const coveredOccupationIds = new Set(occupationPrograms.map((p) => p.occupation_id))
    for (const occupationId of certOnlyOccupationIdsByMentor.get(m.id) ?? []) {
      if (coveredOccupationIds.has(occupationId)) continue
      const occ = occupationMap.get(occupationId)
      occupationPrograms.push({
        mop_id: '',
        occupation_program_unit_id: '',
        ppt_file_url: null,
        profile_file_url: null,
        lecture_fee_payer_id: null,
        lecture_fee_payer_name: null,
        material_fee_payer_id: null,
        material_fee_payer_name: null,
        program_score: 0,
        school_request_note: null,
        program_title: '(등록된 프로그램 없음)',
        school_level: null,
        mentor_material_cost: null,
        prep_by: null,
        occupation_id: occupationId,
        occupation_name: occ?.name ?? '-',
        field_id: occ?.field_id ?? null,
        field_name: occ?.field_id ? (fieldMap.get(occ.field_id) ?? null) : null,
        certificate_file_urls: certMap.get(`${m.id}:${occupationId}`) ?? [],
      })
    }

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
    bank?: string | null
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

const CONSENT_FILE_COLUMNS = [
  'criminal_record_consent_file_url',
  'admin_info_consent_file_url',
  'contract_file_url',
] as const
export type ConsentFileColumn = (typeof CONSENT_FILE_COLUMNS)[number]

export async function updateMentorConsentFileUrl(
  mentorId: string,
  column: ConsentFileColumn,
  path: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ [column]: path })
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

export async function updateMopProgramScore(mopId: string, score: number): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ program_score: score })
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMopSchoolRequestNote(mopId: string, note: string | null): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ school_request_note: note })
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMopProfileUrl(mopId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ profile_file_url: url })
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
  occupationProgramUnitId: string,
  lectureFeePayerId?: string | null,
  materialFeePayerId?: string | null,
  pptFileUrl?: string | null,
  profileFileUrl?: string | null
): Promise<MentorOccupationProgramRow> {
  const supabase = await createServerSupabaseClient()

  const { data: mop, error } = await supabase
    .from('mentor_occupation_programs')
    .insert({
      mentor_id: mentorId,
      occupation_program_unit_id: occupationProgramUnitId,
      lecture_fee_payer_id: lectureFeePayerId ?? null,
      material_fee_payer_id: materialFeePayerId ?? null,
      ppt_file_url: pptFileUrl ?? null,
      profile_file_url: profileFileUrl ?? null,
    })
    .select('id, mentor_id, occupation_program_unit_id, ppt_file_url, profile_file_url, lecture_fee_payer_id, material_fee_payer_id, program_score, school_request_note')
    .single()
  if (error) throw new Error(error.message)

  const payerIds = [lectureFeePayerId, materialFeePayerId].filter(Boolean) as string[]
  const [unitRes, payersRes] = await Promise.all([
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, school_level')
      .eq('id', occupationProgramUnitId)
      .single(),
    payerIds.length
      ? supabase.from('mentors').select('id, name').in('id', payerIds)
      : Promise.resolve({ data: [] }),
  ])

  const unit = unitRes.data
  const payerMap = new Map(
    (payersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name])
  )

  let prog: {
    id: string
    name: string
    occupation_id: string | null
    mentor_material_cost: number | null
    prep_by: string | null
  } | null = null
  if (unit?.occupation_programs_id) {
    const { data } = await supabase
      .from('occupation_programs')
      .select('id, name, occupation_id, mentor_material_cost, prep_by')
      .eq('id', unit.occupation_programs_id)
      .single()
    prog = data
  }

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

  let certificateFileUrls: string[] = []
  if (occData?.id) {
    const { data: certRows } = await supabase
      .from('mentor_occupation_certificates')
      .select('file_url')
      .eq('mentor_id', mentorId)
      .eq('occupation_id', occData.id)
    certificateFileUrls = (certRows ?? []).map((c) => c.file_url)
  }

  revalidatePath('/mentors')

  return {
    mop_id: mop.id,
    occupation_program_unit_id: mop.occupation_program_unit_id,
    ppt_file_url: mop.ppt_file_url,
    profile_file_url: mop.profile_file_url,
    lecture_fee_payer_id: mop.lecture_fee_payer_id,
    lecture_fee_payer_name: mop.lecture_fee_payer_id
      ? (payerMap.get(mop.lecture_fee_payer_id) ?? null)
      : null,
    material_fee_payer_id: mop.material_fee_payer_id,
    material_fee_payer_name: mop.material_fee_payer_id
      ? (payerMap.get(mop.material_fee_payer_id) ?? null)
      : null,
    program_score: mop.program_score,
    school_request_note: mop.school_request_note,
    program_title: unit?.title ?? '-',
    school_level: unit?.school_level ?? null,
    mentor_material_cost: prog?.mentor_material_cost ?? null,
    prep_by: prog?.prep_by ?? null,
    occupation_id: prog?.occupation_id ?? '',
    occupation_name: occData?.name ?? '-',
    field_id: occData?.field_id ?? null,
    field_name: fieldName,
    certificate_file_urls: certificateFileUrls,
  }
}

export type AddProgramSelectData = {
  eventCategories: { id: string; name: string }[]
  fields: { id: string; name: string; event_category_ids: string[] }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: { id: string; title: string; occupation_programs_id: string | null; school_level: string | null }[]
  mentors: { id: string; name: string }[]
}

export async function getAddProgramSelectData(): Promise<AddProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [eventCategoriesRes, fieldsRes, fieldEcRes, occsRes, progsRes, unitsRes, mentorsRes] = await Promise.all([
    supabase.from('event_categories').select('id, name').order('sort_order'),
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('field_event_categories').select('field_id, event_category_id'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, school_level')
      .order('title'),
    supabase.from('mentors').select('id, name').order('name'),
  ])
  const eventCategoryIdsByField = new Map<string, string[]>()
  for (const l of fieldEcRes.data ?? []) {
    const list = eventCategoryIdsByField.get(l.field_id) ?? []
    list.push(l.event_category_id)
    eventCategoryIdsByField.set(l.field_id, list)
  }
  return {
    eventCategories: eventCategoriesRes.data ?? [],
    fields: (fieldsRes.data ?? []).map((f) => ({ ...f, event_category_ids: eventCategoryIdsByField.get(f.id) ?? [] })),
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: (progsRes.data ?? []) as { id: string; name: string; occupation_id: string | null }[],
    units: unitsRes.data ?? [],
    mentors: mentorsRes.data ?? [],
  }
}

// ── 강사 신규 등록 ───────────────────────────────────────────────────

export interface CreateMentorProgramInput {
  occupationProgramUnitId: string
  lectureFeePayerId: string | null
  materialFeePayerId: string | null
  pptFileUrl: string | null
  profileFileUrl: string | null
}

export interface CreateMentorInput {
  id: string
  userId: string | null
  email: string | null
  password: string | null
  name: string
  phone: string | null
  address: string | null
  detailAddress: string | null
  idNumber: string | null
  bank: string | null
  bankAccount: string | null
  belongsTo: string | null
  availableAreas: string[] | null
  criminalRecordConsentFileUrl: string | null
  adminInfoConsentFileUrl: string | null
  contractFileUrl: string | null
  programs: CreateMentorProgramInput[]
}

export async function getMentorEventCount(mentorId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('event_rows')
    .select('id', { count: 'exact', head: true })
    .eq('mentor_id', mentorId)
  return count ?? 0
}

export async function deleteMentor(mentorId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // event_rows의 mentor 참조 null 처리 (행사 이력은 유지)
  await supabase.from('event_rows').update({ mentor_id: null }).eq('mentor_id', mentorId)
  await supabase.from('event_rows').update({ lecture_fee_payer_id: null }).eq('lecture_fee_payer_id', mentorId)
  await supabase.from('event_rows').update({ material_fee_payer_id: null }).eq('material_fee_payer_id', mentorId)

  // mentor_occupation_programs의 입금자 참조 null 처리
  await supabase.from('mentor_occupation_programs').update({ lecture_fee_payer_id: null }).eq('lecture_fee_payer_id', mentorId)
  await supabase.from('mentor_occupation_programs').update({ material_fee_payer_id: null }).eq('material_fee_payer_id', mentorId)

  // 소속 강사들의 belongs_to null 처리
  await supabase.from('mentors').update({ belongs_to: null }).eq('belongs_to', mentorId)

  // mentor_occupation_programs 삭제
  await supabase.from('mentor_occupation_programs').delete().eq('mentor_id', mentorId)

  // mentor_requests 삭제
  await supabase.from('mentor_requests').delete().eq('instructor_id', mentorId)

  // 강사 삭제
  const { error } = await supabase.from('mentors').delete().eq('id', mentorId)
  if (error) throw new Error(error.message)

  revalidatePath('/mentors')
}

export async function createMentor(input: CreateMentorInput): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // 이메일/비밀번호가 있으면 Supabase Auth 계정 먼저 생성
  let authUserId: string | null = input.userId
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

  const { error } = await supabase.from('mentors').insert({
    id: input.id,
    user_id: authUserId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    detail_address: input.detailAddress,
    id_number: input.idNumber,
    bank: input.bank,
    bank_account: input.bankAccount,
    belongs_to: input.belongsTo,
    available_areas: input.availableAreas,
    criminal_record_consent_file_url: input.criminalRecordConsentFileUrl,
    admin_info_consent_file_url: input.adminInfoConsentFileUrl,
    contract_file_url: input.contractFileUrl,
  })
  if (error) throw new Error(error.message)

  if (input.programs.length > 0) {
    const { error: mopError } = await supabase.from('mentor_occupation_programs').insert(
      input.programs.map((p) => ({
        mentor_id: input.id,
        occupation_program_unit_id: p.occupationProgramUnitId,
        lecture_fee_payer_id: p.lectureFeePayerId,
        material_fee_payer_id: p.materialFeePayerId,
        ppt_file_url: p.pptFileUrl,
        profile_file_url: p.profileFileUrl,
      }))
    )
    if (mopError) throw new Error(mopError.message)
  }

  revalidatePath('/mentors')
}
