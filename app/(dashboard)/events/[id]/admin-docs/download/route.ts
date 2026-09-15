import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { toCbcStoragePath } from '@/lib/criminal-background-check'
import { PRETENDARD_REGULAR_BASE64 } from '@/supabase/functions/generate-agreement-pdf/assets-data'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

function decodeBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

// 행정정보 공동이용 사전동의서 1페이지의 "이용기관 명칭" 빈칸 좌표 — 멘토가 서명할 때
// generate-agreement-pdf Edge Function이 흰 사각형으로 비워둔 바로 그 자리다(좌표 정의는
// supabase/functions/generate-agreement-pdf/index.ts의 ADMIN_INFO_INSTITUTION_BLANK와
// 반드시 같이 맞출 것). 같은 서명 파일이 여러 행사(기관)에 재사용되므로, 기관명은 서명
// 시점이 아니라 이렇게 행사별로 다운로드할 때마다 그 자리에 덧그린다.
//
// 이 흰 사각형 + 구분선을 매번 여기서도 다시 그리는 이유: Edge Function이 이 빈칸 처리를
// 반영하기 전에 이미 서명을 마친 멘토는 원본 PDF에 예시 문구 "ㅇㅇ학교"가 그대로 남아있다.
// 그 위에 기관명만 덧그리면 두 텍스트가 겹쳐 보이므로, 신규/구버전 문서 구분 없이 항상 먼저
// 흰 사각형으로 덮은 뒤에 기관명을 쓴다.
const ADMIN_INFO_INSTITUTION_BLANK = {
  box: { x: 172, y: 700, width: 60, height: 26 },
  divider: { x1: 57.6, x2: 537.6, y: 721.88, thickness: 0.75 },
  text: { x: 178, y: 709, size: 10 },
} as const

// 이미 서명 완료된 admin_info_consent PDF 바이트에 기관명만 덧그린다. 원본 스토리지 파일은
// 건드리지 않고, 이 요청의 zip에 담길 사본에만 반영한다.
async function overlayInstitutionName(pdfBytes: ArrayBuffer, institutionName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)
  const font = await pdfDoc.embedFont(decodeBase64(PRETENDARD_REGULAR_BASE64), { subset: false })
  const [page] = pdfDoc.getPages()
  const { box, divider, text } = ADMIN_INFO_INSTITUTION_BLANK
  page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(1, 1, 1) })
  page.drawLine({
    start: { x: divider.x1, y: divider.y },
    end: { x: divider.x2, y: divider.y },
    thickness: divider.thickness,
    color: rgb(0, 0, 0),
  })
  page.drawText(institutionName, { x: text.x, y: text.y, size: text.size, font, color: rgb(0, 0, 0) })
  return pdfDoc.save()
}

// 성범죄경력조회동의서 1페이지 "본인은 ㅇㅇ학교의 취업자등으로서 ..." 문장의 빈칸 좌표 —
// generate-agreement-pdf Edge Function의 CRIMINAL_RECORD_INSTITUTION_BLANK와 같이 맞출 것.
// 이 문장은 중간에 기관명이 끼어있어 여유 공간이 좁으므로("「아동・청소년의"가 바로 뒤에
// 이어짐), 기관명만 끼워넣지 않고 "{기관명}의 취업자등으로서" 전체를 다시 그리되, 옆
// 문구와 겹치지 않도록 글자 크기를 자동으로 줄인다.
const CRIMINAL_RECORD_INSTITUTION_BLANK = {
  box: { x: 120, y: 467, width: 130, height: 17 },
  text: { x: 122, y: 472, maxWidth: 123, startSize: 10, minSize: 7 },
} as const

// 주어진 텍스트가 maxWidth를 넘지 않는 가장 큰 폰트 크기를 찾는다(0.5pt 단위로 줄여가며 탐색).
// minSize까지 줄여도 안 들어가면(기관명이 극단적으로 긴 경우) minSize로 그대로 그린다 —
// 옆 문구를 침범할 수 있지만, 자를 경우 기관명이 잘려 보이는 것보다는 낫다고 판단했다.
function fitFontSize(font: import('pdf-lib').PDFFont, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5
  }
  return size
}

async function overlayCriminalRecordInstitution(pdfBytes: ArrayBuffer, institutionName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)
  const font = await pdfDoc.embedFont(decodeBase64(PRETENDARD_REGULAR_BASE64), { subset: false })
  const [page] = pdfDoc.getPages()
  const { box, text } = CRIMINAL_RECORD_INSTITUTION_BLANK
  page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(1, 1, 1) })
  const phrase = `${institutionName}의 취업자등으로서`
  const size = fitFontSize(font, phrase, text.maxWidth, text.startSize, text.minSize)
  page.drawText(phrase, { x: text.x, y: text.y, size, font, color: rgb(0, 0, 0) })
  return pdfDoc.save()
}

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
    ? await supabase.from('institutions').select('name, crime_check_method').eq('id', event.institution_id).maybeSingle()
    : { data: null }
  const crimeCheckMethod = event.crime_check_method ?? institution?.crime_check_method ?? null
  const institutionName = institution?.name ?? event.name

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

  const [mentorsRes, unitsRes, mopRes, programsRes] = await Promise.all([
    supabase
      .from('mentors')
      .select('id, name, mentor_unique_code, criminal_record_consent_file_url, admin_info_consent_file_url')
      .in('id', mentorIds),
    unitIds.length
      ? supabase.from('occupation_program_unit').select('id, title, syllabus, occupation_programs_id').in('id', unitIds)
      : Promise.resolve({
          data: [] as { id: string; title: string; syllabus: string | null; occupation_programs_id: string | null }[],
        }),
    unitIds.length
      ? supabase
          .from('mentor_occupation_programs')
          .select('mentor_id, occupation_program_unit_id, profile_file_url')
          .in('mentor_id', mentorIds)
          .in('occupation_program_unit_id', unitIds)
      : Promise.resolve({
          data: [] as { mentor_id: string; occupation_program_unit_id: string; profile_file_url: string | null }[],
        }),
    // 파일명에 넣을 "요청 직업군"(occupations.name)은 유닛 -> 프로그램 -> 직업군으로
    // 두 단계 거쳐야 해서, recruiting/actions.ts와 같은 방식으로 전체를 가져와 매핑한다.
    unitIds.length
      ? supabase.from('occupation_programs').select('id, occupation_id')
      : Promise.resolve({ data: [] as { id: string; occupation_id: string | null }[] }),
  ])

  const mentors = mentorsRes.data ?? []
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const profileUrlByMentorUnit = new Map(
    (mopRes.data ?? []).map((m) => [`${m.mentor_id}_${m.occupation_program_unit_id}`, m.profile_file_url])
  )

  const programMap = new Map((programsRes.data ?? []).map((p) => [p.id, p]))
  const occupationIds = [
    ...new Set((programsRes.data ?? []).map((p) => p.occupation_id).filter((v): v is string => !!v)),
  ]
  const { data: occupationsData } =
    occupationIds.length > 0
      ? await supabase.from('occupations').select('id, name').in('id', occupationIds)
      : { data: [] as { id: string; name: string }[] }
  const occupationMap = new Map((occupationsData ?? []).map((o) => [o.id, o]))

  function occupationNameForUnit(unitId: string): string {
    const unit = unitMap.get(unitId)
    const program = unit?.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : undefined
    const occupation = program?.occupation_id ? occupationMap.get(program.occupation_id) : undefined
    return occupation?.name ?? '기타'
  }

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
    const mentorNamePart = sanitize(mentor.name)

    // 같은 요청 직업군 안에 유닛이 여러 개면 직업군명 하나로는 구분이 안 되므로,
    // 그 경우엔 직업군명 대신 겹치는 유닛명을 전부 이어붙여 구분한다.
    const unitIdsByOccupation = new Map<string, string[]>()
    for (const unitId of mentorUnitIds) {
      const occName = occupationNameForUnit(unitId)
      const list = unitIdsByOccupation.get(occName) ?? []
      list.push(unitId)
      unitIdsByOccupation.set(occName, list)
    }

    for (const unitId of mentorUnitIds) {
      const unit = unitMap.get(unitId)
      const occName = occupationNameForUnit(unitId)
      const siblingUnitIds = unitIdsByOccupation.get(occName) ?? [unitId]
      const occupationPart =
        siblingUnitIds.length > 1
          ? sanitize(siblingUnitIds.map((id) => unitMap.get(id)?.title ?? id).join('+'))
          : sanitize(occName)
      const namePrefix = `${mentorNamePart}_${occupationPart}`

      const profileUrl = profileUrlByMentorUnit.get(`${mentor.id}_${unitId}`) ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `${namePrefix}_프로필${extFromPath(profileUrl)}`,
        missingLabel: `${mentor.name} - 프로필${unit?.title ? `(${unit.title})` : ''}`,
        fetcher: () => fetchPublicFile(profileUrl),
      })

      const syllabusUrl = unit?.syllabus ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `${namePrefix}_강의계획안${extFromPath(syllabusUrl)}`,
        missingLabel: `${mentor.name} - 강의계획안${unit?.title ? `(${unit.title})` : ''}`,
        fetcher: () => fetchPublicFile(syllabusUrl),
      })
    }

    // 성범죄경력조회동의서는 멘토가 가입 시 일반적으로 서명해두는 동의서라, 이 행사의
    // 범죄경력 진행방식이 "회보서"이거나 미설정이어도 회사 자체 자료로 항상 내려받을 수
    // 있어야 한다(진행방식과 무관하게 포함).
    tasks.push({
      mentorId: mentor.id,
      fileName: `${mentorNamePart}_성범죄경력조회동의서${extFromPath(mentor.criminal_record_consent_file_url)}`,
      missingLabel: `${mentor.name} - 성범죄경력조회동의서`,
      fetcher: async () => {
        const buffer = await fetchPrivateFile(supabase, 'consent-file', mentor.criminal_record_consent_file_url)
        if (!buffer) return null
        try {
          const overlaid = await overlayCriminalRecordInstitution(buffer, institutionName)
          return overlaid.buffer.slice(overlaid.byteOffset, overlaid.byteOffset + overlaid.byteLength) as ArrayBuffer
        } catch (e) {
          console.error('criminal record consent institution overlay failed', mentor.id, e)
          return buffer
        }
      },
    })

    if (crimeCheckMethod === '회보서') {
      const path = crimeCheckPathByMentor.get(mentor.id) ?? null
      tasks.push({
        mentorId: mentor.id,
        fileName: `${mentorNamePart}_회보서${extFromPath(path)}`,
        missingLabel: `${mentor.name} - 회보서`,
        fetcher: () => fetchPrivateFile(supabase, 'criminal-background-check', path),
      })
    }

    tasks.push({
      mentorId: mentor.id,
      fileName: `${mentorNamePart}_행정정보조회동의서${extFromPath(mentor.admin_info_consent_file_url)}`,
      missingLabel: `${mentor.name} - 행정정보조회동의서`,
      fetcher: async () => {
        const buffer = await fetchPrivateFile(supabase, 'consent-file', mentor.admin_info_consent_file_url)
        if (!buffer) return null
        // PDF 오버레이가 실패해도(예: 손상된 파일) 서명 원본은 내려받을 수 있어야 하므로
        // 실패 시 기관명 없는 원본 버퍼로 조용히 대체한다.
        try {
          const overlaid = await overlayInstitutionName(buffer, institutionName)
          return overlaid.buffer.slice(overlaid.byteOffset, overlaid.byteOffset + overlaid.byteLength) as ArrayBuffer
        } catch (e) {
          console.error('admin info consent institution overlay failed', mentor.id, e)
          return buffer
        }
      },
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
