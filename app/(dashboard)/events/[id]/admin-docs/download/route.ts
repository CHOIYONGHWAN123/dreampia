import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { toCbcStoragePath } from '@/lib/criminal-background-check'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

function extFromPath(path: string | null) {
  if (!path) return ''
  const clean = path.split('?')[0]
  const dot = clean.lastIndexOf('.')
  return dot >= 0 ? clean.slice(dot) : ''
}

// zip 폴더/파일명에 못 쓰는 문자만 걷어낸다.
function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'unknown'
}

// 프로필/강의계획안은 공개 버킷이라 저장된 값이 그대로 fetch 가능한 공개 URL이다.
async function fetchPublicFile(url: string | null): Promise<ArrayBuffer | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// 동의서/회보서는 비공개 버킷이라 저장된 값이 버킷 내부 경로다. 관리자 세션은 이 버킷들에
// "for all" RLS 정책을 갖고 있어 signed URL 없이 바로 다운로드할 수 있다.
async function fetchPrivateFile(
  supabase: ServerSupabase,
  bucket: string,
  path: string | null
): Promise<ArrayBuffer | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) return null
  return await data.arrayBuffer()
}

type FileTask = {
  mentorId: string
  fileName: string
  missingLabel: string
  fetcher: () => Promise<ArrayBuffer | null>
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, institution_id, crime_check_method')
    .eq('id', eventId)
    .single()
  if (eventError || !event) {
    return NextResponse.json({ error: '행사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: institution } = event.institution_id
    ? await supabase.from('institutions').select('crime_check_method').eq('id', event.institution_id).maybeSingle()
    : { data: null }
  const crimeCheckMethod = event.crime_check_method ?? institution?.crime_check_method ?? null

  const { data: eventRows, error: rowsError } = await supabase
    .from('event_rows')
    .select('mentor_id, occupation_program_unit_id, criminal_background_check')
    .eq('event_id', eventId)
  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }

  const rows = eventRows ?? []
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id).filter((v): v is string => !!v))]
  if (mentorIds.length === 0) {
    return NextResponse.json({ error: '배정된 강사가 없습니다.' }, { status: 400 })
  }
  const unitIds = [...new Set(rows.map((r) => r.occupation_program_unit_id).filter((v): v is string => !!v))]

  const [mentorsRes, unitsRes, mopRes] = await Promise.all([
    supabase
      .from('mentors')
      .select('id, name, mentor_unique_code, criminal_record_consent_file_url, admin_info_consent_file_url')
      .in('id', mentorIds),
    unitIds.length
      ? supabase.from('occupation_program_unit').select('id, title, syllabus').in('id', unitIds)
      : Promise.resolve({ data: [] as { id: string; title: string; syllabus: string | null }[] }),
    unitIds.length
      ? supabase
          .from('mentor_occupation_programs')
          .select('mentor_id, occupation_program_unit_id, profile_file_url')
          .in('mentor_id', mentorIds)
          .in('occupation_program_unit_id', unitIds)
      : Promise.resolve({
          data: [] as { mentor_id: string; occupation_program_unit_id: string; profile_file_url: string | null }[],
        }),
  ])

  const mentors = mentorsRes.data ?? []
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const profileUrlByMentorUnit = new Map(
    (mopRes.data ?? []).map((m) => [`${m.mentor_id}_${m.occupation_program_unit_id}`, m.profile_file_url])
  )

  // 강사별로 이 행사에서 맡은 유닛들, 그리고 회보서(교시 여러 개면 처음 값 하나만)를 모은다.
  const unitIdsByMentor = new Map<string, Set<string>>()
  const crimeCheckPathByMentor = new Map<string, string>()
  for (const row of rows) {
    if (!row.mentor_id) continue
    if (row.occupation_program_unit_id) {
      const set = unitIdsByMentor.get(row.mentor_id) ?? new Set<string>()
      set.add(row.occupation_program_unit_id)
      unitIdsByMentor.set(row.mentor_id, set)
    }
    if (row.criminal_background_check && !crimeCheckPathByMentor.has(row.mentor_id)) {
      crimeCheckPathByMentor.set(row.mentor_id, toCbcStoragePath(row.criminal_background_check))
    }
  }

  const tasks: FileTask[] = []
  for (const mentor of mentors) {
    const mentorUnitIds = [...(unitIdsByMentor.get(mentor.id) ?? [])]

    for (const unitId of mentorUnitIds) {
      const unit = unitMap.get(unitId)
      const suffix = mentorUnitIds.length > 1 ? `_${sanitize(unit?.title ?? unitId)}` : ''

      const profileUrl = profileUrlByMentorUnit.get(`${mentor.id}_${unitId}`) ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `프로필${suffix}${extFromPath(profileUrl)}`,
        missingLabel: `${mentor.name} - 프로필${unit?.title ? `(${unit.title})` : ''}`,
        fetcher: () => fetchPublicFile(profileUrl),
      })

      const syllabusUrl = unit?.syllabus ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `강의계획안${suffix}${extFromPath(syllabusUrl)}`,
        missingLabel: `${mentor.name} - 강의계획안${unit?.title ? `(${unit.title})` : ''}`,
        fetcher: () => fetchPublicFile(syllabusUrl),
      })
    }

    if (crimeCheckMethod === '동의서') {
      tasks.push({
        mentorId: mentor.id,
        fileName: `성범죄경력조회동의서${extFromPath(mentor.criminal_record_consent_file_url)}`,
        missingLabel: `${mentor.name} - 성범죄경력조회동의서`,
        fetcher: () => fetchPrivateFile(supabase, 'consent-file', mentor.criminal_record_consent_file_url),
      })
    } else if (crimeCheckMethod === '회보서') {
      const path = crimeCheckPathByMentor.get(mentor.id) ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `회보서${extFromPath(path)}`,
        missingLabel: `${mentor.name} - 회보서`,
        fetcher: () => fetchPrivateFile(supabase, 'criminal-background-check', path),
      })
    }

    tasks.push({
      mentorId: mentor.id,
      fileName: `행정정보조회동의서${extFromPath(mentor.admin_info_consent_file_url)}`,
      missingLabel: `${mentor.name} - 행정정보조회동의서`,
      fetcher: () => fetchPrivateFile(supabase, 'consent-file', mentor.admin_info_consent_file_url),
    })
  }

  // 강사별 파일들을 병렬로 가져온다 — 강사 수 x 문서 수만큼 네트워크 왕복이 생겨 순차 처리하면 느리다.
  const results = await Promise.all(tasks.map(async (t) => ({ ...t, buffer: await t.fetcher() })))

  const folderNameByMentor = new Map<string, string>()
  const usedFolderNames = new Set<string>()
  for (const mentor of mentors) {
    let folderName = sanitize(`${mentor.name}_${mentor.mentor_unique_code}`)
    while (usedFolderNames.has(folderName)) folderName += '_'
    usedFolderNames.add(folderName)
    folderNameByMentor.set(mentor.id, folderName)
  }

  const zip = new JSZip()
  const missing: string[] = []
  for (const result of results) {
    if (!result.buffer) {
      missing.push(result.missingLabel)
      continue
    }
    const folderName = folderNameByMentor.get(result.mentorId)
    if (!folderName) continue
    zip.folder(folderName)?.file(result.fileName, result.buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const fileName = `${event.name}_행정서류.zip`

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="admin-docs.zip"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      // 누락된 서류 목록 — 한글이 섞여있어 헤더에 그대로 못 넣으므로 URI 인코딩해서 실어 보낸다.
      'X-Admin-Docs-Missing-Count': String(missing.length),
      'X-Admin-Docs-Missing': encodeURIComponent(missing.join('|')),
    },
  })
}
