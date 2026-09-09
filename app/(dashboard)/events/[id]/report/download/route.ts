import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { numberToKoreanWon, formatThousands } from '@/lib/format-number'
import { getReportConfig } from '@/lib/report-templates/config'

const SECTION4_BLOCK_HEIGHT = 8
const SEAL_IMAGE_PATH = path.join(process.cwd(), 'public/report_templates/assets/dreampia-seal.png')

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
}
const SECTION_TITLE_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EFDD' } }
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }

function fmtTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtTimeRange(start: string | null, end: string | null) {
  const s = fmtTime(start)
  const e = fmtTime(end)
  if (!s && !e) return ''
  return `${s}~${e}`
}

function fmtDateCompact(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// event_rows에 실제로 등장한 날짜들을 "2025년 10월 23일 (목), 24일 (금), 28일(화)"처럼
// 원본 양식과 같은 형식으로 이어붙인다 — 같은 달이면 두 번째 날짜부터는 "일"만 표시.
// 같은 날짜에 시간대가 다른 event_row가 여러 개 있어도(예: 오전/오후반) 달력 날짜 기준으로
// 한 번만 표시해야 하므로, 정확한 타임스탬프가 아니라 연/월/일로 중복을 제거한다.
function formatEventDates(isoDates: (string | null)[]): string {
  const dateByKey = new Map<string, Date>()
  for (const iso of isoDates) {
    if (!iso) continue
    const d = new Date(iso)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!dateByKey.has(key)) dateByKey.set(key, d)
  }
  const dates = [...dateByKey.values()]
  if (dates.length === 0) return ''
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const year = sorted[0].getFullYear()
  const parts = sorted.map((d, i) => {
    const weekday = `(${WEEKDAYS[d.getDay()]})`
    if (i === 0 || d.getMonth() !== sorted[i - 1].getMonth()) {
      return `${d.getMonth() + 1}월 ${d.getDate()}일 ${weekday}`
    }
    return `${d.getDate()}일${weekday}`
  })
  return `${year}년 ${parts.join(', ')}`
}

// event_schedules(교시 라벨)과 시각이 일치하면 "1~4교시"처럼 표시하고, 매칭되는 교시가
// 없으면 실제 시각 범위("09:00~12:40")로 대체한다.
function periodRangeLabel(
  schedules: { label: string; start_time: string; end_time: string }[],
  start: string | null,
  end: string | null
): string {
  if (!start || !end) return ''
  const startTime = fmtTime(start)
  const endTime = fmtTime(end)
  const startSchedule = schedules.find((s) => fmtTime(s.start_time) === startTime)
  const endSchedule = schedules.find((s) => fmtTime(s.end_time) === endTime)
  if (startSchedule && endSchedule) {
    return startSchedule.label === endSchedule.label ? startSchedule.label : `${startSchedule.label}~${endSchedule.label}`
  }
  return fmtTimeRange(start, end)
}

function guessImageExtension(url: string): 'jpeg' | 'png' | 'gif' {
  const lower = url.toLowerCase()
  if (lower.includes('.png')) return 'png'
  if (lower.includes('.gif')) return 'gif'
  return 'jpeg'
}

async function fetchImage(url: string): Promise<{ buffer: Buffer; extension: 'jpeg' | 'png' | 'gif' } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), extension: guessImageExtension(url) }
  } catch (error) {
    console.error('[events/report/download] 사진 로드 실패', url, error)
    return null
  }
}

function setCell(
  sheet: ExcelJS.Worksheet,
  addr: string,
  value: ExcelJS.CellValue,
  opts?: { bold?: boolean; size?: number; center?: boolean; fill?: ExcelJS.Fill }
) {
  const cell = sheet.getCell(addr)
  cell.value = value
  cell.alignment = {
    vertical: 'middle',
    horizontal: opts?.center ? 'center' : 'left',
    wrapText: true,
  }
  cell.font = { bold: opts?.bold ?? false, size: opts?.size ?? 10 }
  cell.border = THIN_BORDER
  if (opts?.fill) cell.fill = opts.fill
  return cell
}

function mergeSet(
  sheet: ExcelJS.Worksheet,
  range: string,
  value: ExcelJS.CellValue,
  opts?: { bold?: boolean; size?: number; center?: boolean; fill?: ExcelJS.Fill }
) {
  sheet.mergeCells(range)
  return setCell(sheet, range.split(':')[0], value, opts)
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
    .select('id, name, institution_id, event_category_id, event_start_at, event_end_at, target_grade, budget, final_budget')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: '행사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: category } = event.event_category_id
    ? await supabase.from('event_categories').select('name').eq('id', event.event_category_id).single()
    : { data: null }

  const config = getReportConfig(category?.name)
  if (!config) {
    return NextResponse.json(
      { error: `"${category?.name ?? '미지정'}" 행사구분은 아직 결과보고서 자동 생성을 지원하지 않습니다.` },
      { status: 400 }
    )
  }

  const [{ data: institution }, { data: eventRows }, { data: schedules }] = await Promise.all([
    event.institution_id
      ? supabase.from('institutions').select('name').eq('id', event.institution_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('event_rows')
      .select('id, start_time, end_time, classroom, headcount, remarks, mentor_id, occupation_program_unit_id')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true, nullsFirst: false }),
    supabase.from('event_schedules').select('label, start_time, end_time').eq('event_id', eventId).order('sort_order'),
  ])

  const rows = eventRows ?? []
  const mentorIds = [...new Set(rows.map((r) => r.mentor_id).filter(Boolean))] as string[]
  const unitIds = [...new Set(rows.map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]
  const rowIds = rows.map((r) => r.id)

  const [mentorsRes, unitsRes, photosRes] = await Promise.all([
    mentorIds.length
      ? supabase.from('mentors').select('id, name').in('id', mentorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    unitIds.length
      ? supabase.from('occupation_program_unit').select('id, title, description').in('id', unitIds)
      : Promise.resolve({ data: [] as { id: string; title: string; description: string | null }[] }),
    rowIds.length
      ? supabase.from('event_photos').select('id, event_rows_id, url').in('event_rows_id', rowIds)
      : Promise.resolve({ data: [] as { id: string; event_rows_id: string; url: string }[] }),
  ])

  const mentorMap = new Map((mentorsRes.data ?? []).map((m) => [m.id, m.name]))
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const photosByRow = new Map<string, string[]>()
  for (const p of photosRes.data ?? []) {
    const list = photosByRow.get(p.event_rows_id) ?? []
    list.push(p.url)
    photosByRow.set(p.event_rows_id, list)
  }

  // 섹션4는 프로그램(occupation_program_unit) 단위로 중복 제거 — 여러 반/시간대에 나눠
  // 진행됐어도 활동 소개는 한 번만 나가고, 사진은 그 유닛에 달린 모든 photo 중 앞의 2장만 쓴다.
  const unitGroups = new Map<string, { title: string; description: string | null; photoUrls: string[] }>()
  for (const row of rows) {
    if (!row.occupation_program_unit_id) continue
    const unit = unitMap.get(row.occupation_program_unit_id)
    if (!unit) continue
    let group = unitGroups.get(row.occupation_program_unit_id)
    if (!group) {
      group = { title: unit.title, description: unit.description, photoUrls: [] }
      unitGroups.set(row.occupation_program_unit_id, group)
    }
    for (const url of photosByRow.get(row.id) ?? []) {
      if (group.photoUrls.length < 2) group.photoUrls.push(url)
    }
  }

  const institutionName = institution?.name ?? ''
  const datesLabel = formatEventDates(rows.map((r) => r.start_time))
  const periodLabel = periodRangeLabel(
    schedules ?? [],
    rows[0]?.start_time ?? null,
    rows[rows.length - 1]?.end_time ?? null
  )
  const mentorCount = new Set(rows.map((r) => r.mentor_id).filter(Boolean)).size
  const year = event.event_start_at ? new Date(event.event_start_at).getFullYear() : new Date().getFullYear()
  const amount = event.final_budget ?? event.budget ?? null

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('결과보고서')
  sheet.columns = [
    { width: 9.25 },
    { width: 37.75 },
    { width: 15 },
    { width: 13.125 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
    { width: 15.5 },
  ]

  let r = 1

  // 제목
  mergeSet(sheet, `A${r}:H${r + 1}`, `드림피아\n『${year}년 ${institutionName} ${config.displayName}』 운영 위탁교육 결과보고서`, {
    bold: true,
    size: 14,
    center: true,
  })
  r += 2

  // 1. 운영 기본정보
  mergeSet(sheet, `A${r}:H${r}`, '1. 운영 기본정보', { bold: true, fill: SECTION_TITLE_FILL })
  r++
  setCell(sheet, `A${r}`, '학교명', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `B${r}:C${r}`, institutionName)
  setCell(sheet, `D${r}`, '계약명', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `E${r}:H${r}`, event.name)
  r++
  setCell(sheet, `A${r}`, '계약일자', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `B${r}:C${r}`, datesLabel)
  setCell(sheet, `D${r}`, '실시일자', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `E${r}:H${r}`, datesLabel)
  r++
  setCell(sheet, `A${r}`, '계약금액', { bold: true, fill: HEADER_FILL })
  mergeSet(
    sheet,
    `B${r}:C${r}`,
    amount ? `금 ${formatThousands(amount)} 원(금 ${numberToKoreanWon(amount)} 원)` : ''
  )
  setCell(sheet, `D${r}`, '운영장소', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `E${r}:H${r}`, config.venueTemplate(institutionName))
  r++
  setCell(sheet, `A${r}`, '대상', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `B${r}:C${r}`, event.target_grade ?? '')
  setCell(sheet, `D${r}`, '강사', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `E${r}:H${r}`, `현직 전문직업인 ${mentorCount}인`)
  r++
  setCell(sheet, `A${r}`, '운영일시', { bold: true, fill: HEADER_FILL })
  mergeSet(sheet, `B${r}:H${r}`, [datesLabel, periodLabel].filter(Boolean).join(' / '))
  r++

  // 2. 프로그램 운영 내용
  mergeSet(sheet, `A${r}:H${r}`, `2. ${config.displayName} 프로그램 운영 내용`, { bold: true, fill: SECTION_TITLE_FILL })
  r++
  setCell(sheet, `A${r}`, '일자', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `B${r}`, '대상', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `C${r}`, '시간', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `D${r}`, '프로그램', { bold: true, center: true, fill: HEADER_FILL })
  mergeSet(sheet, `E${r}:H${r}`, '세부내용', { bold: true, center: true, fill: HEADER_FILL })
  r++
  setCell(sheet, `A${r}`, datesLabel, { center: true })
  setCell(sheet, `B${r}`, event.target_grade ?? '', { center: true })
  setCell(sheet, `C${r}`, periodLabel, { center: true })
  setCell(sheet, `D${r}`, config.programLabel, { center: true })
  mergeSet(sheet, `E${r}:H${r}`, config.section2Description)
  r++
  r++ // 여백 행

  // 3. 프로그램 세부 운영 내용
  mergeSet(sheet, `A${r}:H${r}`, '3. 프로그램 세부 운영 내용', { bold: true, fill: SECTION_TITLE_FILL })
  r++
  setCell(sheet, `A${r}`, '일시', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `B${r}`, '프로그램명', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `C${r}`, '장소', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `D${r}`, '인원(명)', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `E${r}`, '강사명', { bold: true, center: true, fill: HEADER_FILL })
  mergeSet(sheet, `F${r}:H${r}`, '비고', { bold: true, center: true, fill: HEADER_FILL })
  r++
  for (const row of rows) {
    const unit = row.occupation_program_unit_id ? unitMap.get(row.occupation_program_unit_id) : undefined
    setCell(sheet, `A${r}`, fmtDateCompact(row.start_time), { center: true })
    setCell(sheet, `B${r}`, unit?.title ?? '', { center: true })
    setCell(sheet, `C${r}`, row.classroom ?? '', { center: true })
    setCell(sheet, `D${r}`, row.headcount ?? '', { center: true })
    setCell(sheet, `E${r}`, row.mentor_id ? (mentorMap.get(row.mentor_id) ?? '') : '', { center: true })
    mergeSet(sheet, `F${r}:H${r}`, row.remarks ?? '')
    r++
  }

  // 4. 활동 내용
  mergeSet(sheet, `A${r}:H${r}`, `4. ${config.displayName} 활동 내용`, { bold: true, fill: SECTION_TITLE_FILL })
  r++
  setCell(sheet, `A${r}`, 'NO', { bold: true, center: true, fill: HEADER_FILL })
  setCell(sheet, `B${r}`, config.activityGroupLabel, { bold: true, center: true, fill: HEADER_FILL })
  mergeSet(sheet, `C${r}:H${r}`, '활동 내용', { bold: true, center: true, fill: HEADER_FILL })
  r++

  const groups = [...unitGroups.values()]
  const photoRanges: { url: string; range: string }[] = []
  for (const [index, group] of groups.entries()) {
    const blockStart = r + index * SECTION4_BLOCK_HEIGHT
    const blockEnd = blockStart + SECTION4_BLOCK_HEIGHT - 1
    mergeSet(sheet, `A${blockStart}:A${blockEnd}`, index + 1, { center: true })
    mergeSet(sheet, `B${blockStart}:B${blockEnd}`, group.title, { center: true })
    sheet.mergeCells(`C${blockStart}:E${blockStart + 5}`)
    setCell(sheet, `C${blockStart}`, group.photoUrls[0] ? '' : '사진 없음', { center: true })
    sheet.mergeCells(`F${blockStart}:H${blockStart + 5}`)
    setCell(sheet, `F${blockStart}`, group.photoUrls[1] ? '' : '', { center: true })
    mergeSet(sheet, `C${blockStart + 6}:C${blockStart + 7}`, config.experienceLabel, { center: true, fill: HEADER_FILL })
    mergeSet(sheet, `D${blockStart + 6}:H${blockStart + 7}`, group.description ?? '')

    if (group.photoUrls[0]) photoRanges.push({ url: group.photoUrls[0], range: `C${blockStart}:E${blockStart + 5}` })
    if (group.photoUrls[1]) photoRanges.push({ url: group.photoUrls[1], range: `F${blockStart}:H${blockStart + 5}` })
  }
  r += groups.length * SECTION4_BLOCK_HEIGHT

  // 사진 삽입 (실패해도 나머지 응답은 계속 진행)
  const fetchedPhotos = await Promise.all(photoRanges.map((p) => fetchImage(p.url)))
  fetchedPhotos.forEach((image, index) => {
    if (!image) return
    // exceljs 타입 정의(전역 Buffer를 ArrayBuffer로 잘못 병합)가 @types/node의 Buffer와
    // 충돌해 어떤 실제 Buffer 값도 구조적으로 만족시킬 수 없어, 인자 전체를 캐스팅해 우회함
    const imageId = workbook.addImage({ buffer: image.buffer, extension: image.extension } as unknown as ExcelJS.Image)
    sheet.addImage(imageId, photoRanges[index].range)
  })

  // 5. 완료 확인
  mergeSet(sheet, `A${r}:H${r}`, '5. 완료 확인', { bold: true, fill: SECTION_TITLE_FILL })
  r++
  const signatureStart = r
  mergeSet(
    sheet,
    `A${r}:H${r + 2}`,
    `상기 계약에 대하여 위와 같이 실시 완료하였음을 확인합니다.\n\n${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}\n\n드림피아 대표 최 용 환    (인)`,
    { center: true }
  )
  r += 3

  try {
    const sealBuffer = await readFile(SEAL_IMAGE_PATH)
    const sealImageId = workbook.addImage({ buffer: sealBuffer, extension: 'png' } as unknown as ExcelJS.Image)
    sheet.addImage(sealImageId, {
      tl: { col: 5, row: signatureStart + 0.5 },
      ext: { width: 50, height: 50 },
    })
  } catch (error) {
    console.error('[events/report/download] 직인 이미지 로드 실패', error)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const dateRange = fmtDateCompact(event.event_start_at)
  const fileName = [dateRange, event.name, `${config.displayName} 결과보고서`, '드림피아'].filter(Boolean).join('_') + '.xlsx'

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
