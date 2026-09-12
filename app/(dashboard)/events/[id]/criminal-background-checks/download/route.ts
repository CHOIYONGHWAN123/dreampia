import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { toCbcStoragePath } from '@/lib/criminal-background-check'

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

// 한 강사가 이 행사에서 여러 교시를 뛰며 회보서를 각각 올렸을 수 있어, 여러 건일 때만
// 시각으로 구분한다(하나뿐이면 굳이 안 붙여도 헷갈리지 않는다).
function timeSuffix(startTime: string | null, index: number) {
  if (!startTime) return `_${index + 1}`
  const d = new Date(startTime)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `_${mm}-${dd}_${hh}${mi}`
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

  if (crimeCheckMethod !== '회보서') {
    return NextResponse.json({ error: '이 행사는 회보서 방식이 아닙니다.' }, { status: 400 })
  }

  const { data: eventRows, error: rowsError } = await supabase
    .from('event_rows')
    .select('id, mentor_id, criminal_background_check, start_time')
    .eq('event_id', eventId)
    .not('criminal_background_check', 'is', null)
    .order('start_time', { ascending: true, nullsFirst: false })
  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }

  const rows = eventRows ?? []
  if (rows.length === 0) {
    return NextResponse.json({ error: '등록된 회보서가 없습니다.' }, { status: 400 })
  }

  const mentorIds = [...new Set(rows.map((r) => r.mentor_id).filter((v): v is string => !!v))]
  const { data: mentorsData, error: mentorsError } = mentorIds.length
    ? await supabase.from('mentors').select('id, name, mentor_unique_code').in('id', mentorIds)
    : { data: [] as { id: string; name: string; mentor_unique_code: string }[], error: null }
  if (mentorsError) {
    return NextResponse.json({ error: mentorsError.message }, { status: 500 })
  }

  // 강사별 폴더명(이름_고유코드). 배정 강사가 없는 행은 "미배정" 폴더로 모은다.
  const folderNameByMentor = new Map<string, string>()
  const usedFolderNames = new Set<string>()
  for (const mentor of mentorsData ?? []) {
    let folderName = sanitize(`${mentor.name}_${mentor.mentor_unique_code}`)
    while (usedFolderNames.has(folderName)) folderName += '_'
    usedFolderNames.add(folderName)
    folderNameByMentor.set(mentor.id, folderName)
  }

  const rowsByFolder = new Map<string, typeof rows>()
  for (const row of rows) {
    const folderName = (row.mentor_id && folderNameByMentor.get(row.mentor_id)) || '미배정'
    const list = rowsByFolder.get(folderName) ?? []
    list.push(row)
    rowsByFolder.set(folderName, list)
  }

  const tasks: { folderName: string; fileName: string; path: string }[] = []
  for (const [folderName, folderRows] of rowsByFolder) {
    folderRows.forEach((row, index) => {
      const path = toCbcStoragePath(row.criminal_background_check as string)
      const suffix = folderRows.length > 1 ? timeSuffix(row.start_time, index) : ''
      tasks.push({ folderName, fileName: `회보서${suffix}${extFromPath(path)}`, path })
    })
  }

  // 비공개 버킷 다운로드를 병렬로 처리한다 — 건수가 많아지면 순차 처리 시 느려진다.
  const results = await Promise.all(
    tasks.map(async (t) => {
      const { data, error } = await supabase.storage.from('criminal-background-check').download(t.path)
      if (error || !data) return { ...t, buffer: null }
      return { ...t, buffer: await data.arrayBuffer() }
    })
  )

  const zip = new JSZip()
  let missingCount = 0
  for (const result of results) {
    if (!result.buffer) {
      missingCount++
      continue
    }
    zip.folder(result.folderName)?.file(result.fileName, result.buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const fileName = `${event.name}_회보서.zip`

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="criminal-background-checks.zip"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Cbc-Missing-Count': String(missingCount),
    },
  })
}
