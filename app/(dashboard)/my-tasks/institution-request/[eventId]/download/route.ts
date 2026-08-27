import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } }
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
}

const COL_COUNT = 14 // A~N

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, name, institution_id, event_start_at, event_end_at, teacher_name, admin_contact, instructor_waiting_room, laptop_wifi_note, crime_check_method, crime_check_info, parking_note, has_elevator, indoor_shoes_note, floor_map_url, school_request_note'
    )
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: '행사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: institution } = event.institution_id
    ? await supabase
        .from('institutions')
        .select(
          'name, teacher_name, admin_contact, instructor_waiting_room, laptop_wifi_note, crime_check_method, crime_check_info, parking_note, has_elevator, indoor_shoes_note, floor_map_url'
        )
        .eq('id', event.institution_id)
        .single()
    : { data: null }

  const { data: eventRows } = await supabase
    .from('event_rows')
    .select('id, start_time, end_time, target, classroom, mentor_id, occupation_program_unit_id')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true, nullsFirst: false })

  const mentorIds = [...new Set((eventRows ?? []).map((r) => r.mentor_id).filter(Boolean))] as string[]
  const unitIds = [...new Set((eventRows ?? []).map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]

  const [mentorsRes, unitsRes, mopRes] = await Promise.all([
    mentorIds.length
      ? supabase.from('mentors').select('id, name').in('id', mentorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    unitIds.length
      ? supabase.from('occupation_program_unit').select('id, title, school_request_note').in('id', unitIds)
      : Promise.resolve({ data: [] as { id: string; title: string; school_request_note: string | null }[] }),
    mentorIds.length && unitIds.length
      ? supabase
          .from('mentor_occupation_programs')
          .select('mentor_id, occupation_program_unit_id, school_request_note')
          .in('mentor_id', mentorIds)
          .in('occupation_program_unit_id', unitIds)
      : Promise.resolve({
          data: [] as { mentor_id: string; occupation_program_unit_id: string; school_request_note: string | null }[],
        }),
  ])

  const mentorMap = new Map((mentorsRes.data ?? []).map((m) => [m.id, m.name]))
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const mopNoteMap = new Map(
    (mopRes.data ?? []).map((m) => [`${m.mentor_id}_${m.occupation_program_unit_id}`, m.school_request_note])
  )

  // 기관 값을 기본값으로 하고, 행사에 값이 있으면 오버라이드
  const pick = <T,>(eventValue: T | null | undefined, institutionValue: T | null | undefined): T | null =>
    eventValue ?? institutionValue ?? null

  const institutionName = institution?.name ?? '-'
  const teacherName = pick(event.teacher_name, institution?.teacher_name)
  const adminContact = pick(event.admin_contact, institution?.admin_contact)
  const waitingRoom = pick(event.instructor_waiting_room, institution?.instructor_waiting_room)
  const laptopWifiNote = pick(event.laptop_wifi_note, institution?.laptop_wifi_note)
  const crimeCheckMethod = pick(event.crime_check_method, institution?.crime_check_method)
  const crimeCheckInfo = pick(event.crime_check_info, institution?.crime_check_info)
  const parkingNote = pick(event.parking_note, institution?.parking_note)
  const hasElevator = pick(event.has_elevator, institution?.has_elevator)
  const indoorShoesNote = pick(event.indoor_shoes_note, institution?.indoor_shoes_note)
  const floorMapUrl = pick(event.floor_map_url, institution?.floor_map_url)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('요청사항')

  sheet.columns = [
    { width: 16 }, // A 라벨
    { width: 26 }, // B 값
    { width: 12 }, // C 일자
    { width: 14 }, // D 교시
    { width: 8 }, // E 학년
    { width: 10 }, // F 학반
    { width: 10 }, // G 강사명
    { width: 20 }, // H 프로그램명
    { width: 26 }, // I 드림피아→학교요청사항
    { width: 12 }, // J 답변
    { width: 12 }, // K 강의실
    { width: 16 }, // L 강의실위치
    { width: 12 }, // M 차시별인원수
    { width: 10 }, // N 총인원수
  ]

  let r = 1

  const mergeRow = (row: number, text: string, opts?: { bold?: boolean; size?: number }) => {
    sheet.mergeCells(row, 1, row, COL_COUNT)
    const cell = sheet.getCell(row, 1)
    cell.value = text
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.font = { bold: opts?.bold ?? false, size: opts?.size ?? 10 }
  }

  mergeRow(r++, '안녕하세요, 드림피아입니다.', { bold: true, size: 12 })
  mergeRow(r++, '원활한 행사 진행을 위하여 예시를 참고하시어 초록 칸을 작성해주시면 감사하겠습니다.')

  // 학교명 행 + 그리드 상단 헤더("직업군 별 요청사항")
  const schoolRow = r++
  sheet.getCell(schoolRow, 1).value = '학교명'
  sheet.getCell(schoolRow, 2).value = institutionName
  sheet.mergeCells(schoolRow, 3, schoolRow, COL_COUNT)
  const gridTitleCell = sheet.getCell(schoolRow, 3)
  gridTitleCell.value = '직업군 별 요청사항'
  gridTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  gridTitleCell.font = { bold: true }

  // 그리드 헤더 행
  const gridHeaderRow = r++
  sheet.getCell(gridHeaderRow, 1).value = '행사 일자'
  const gridHeaders = [
    '일자',
    '교시',
    '학년',
    '학반',
    '강사명',
    '프로그램명',
    '드림피아 → 학교 요청 사항',
    '답변',
    '강의실',
    '강의실 위치\n(배치도 제출시 생략 가능)',
    '차시별 인원수',
    '총 인원수',
  ]
  gridHeaders.forEach((label, i) => {
    const cell = sheet.getCell(gridHeaderRow, 3 + i)
    cell.value = label
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = i < 7 ? HEADER_FILL : GREEN_FILL
  })

  // 학교가 채워야 할 답변 영역에 대한 기입 예시 (첫 행에만 안내용으로 표시)
  const ANSWER_EXAMPLES = [
    'ex) 가능',
    'ex) 1~2교시 : 1학년 1반\n3~4교시 : 1학년 2반',
    'ex) 본관 1층',
    'ex) 1~2교시 : 25\n3~4교시 : 26',
    'ex) 51',
  ]

  // event_row별 데이터 행 (일자~드림피아 요청사항까지만 채우고, 답변 이후는 기관이 직접 작성)
  const gridDataStartRow = r
  ;(eventRows ?? []).forEach((row, idx) => {
    const unit = row.occupation_program_unit_id ? unitMap.get(row.occupation_program_unit_id) : undefined
    const mopNote =
      row.mentor_id && row.occupation_program_unit_id
        ? mopNoteMap.get(`${row.mentor_id}_${row.occupation_program_unit_id}`)
        : null
    const schoolRequestNote = [event.school_request_note, unit?.school_request_note, mopNote]
      .filter((v): v is string => !!v)
      .join('\n')
    const answerValues = idx === 0 ? ANSWER_EXAMPLES : ['', '', '', '', '']
    const values = [
      fmtDate(row.start_time),
      fmtTimeRange(row.start_time, row.end_time),
      row.target ?? '',
      row.classroom ?? '',
      row.mentor_id ? (mentorMap.get(row.mentor_id) ?? '') : '',
      unit?.title ?? '',
      schoolRequestNote,
      ...answerValues,
    ]
    values.forEach((v, i) => {
      const cell = sheet.getCell(r, 3 + i)
      cell.value = v
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      if (i >= 7) {
        cell.fill = GREEN_FILL
        if (idx === 0) cell.font = { italic: true, color: { argb: 'FF555555' } }
      }
    })
    r++
  })
  const gridDataEndRow = r - 1
  if (gridDataEndRow >= gridDataStartRow) {
    sheet.mergeCells(gridDataStartRow, 1, gridDataEndRow, 1)
    sheet.mergeCells(gridDataStartRow, 2, gridDataEndRow, 2)
  }
  sheet.getCell(gridDataStartRow, 1).value = '행사 시간'
  sheet.getCell(gridDataStartRow, 2).value = fmtTimeRange(event.event_start_at, event.event_end_at)

  // 기관/행사 정보 (초록 칸 - 기관에서 확인 후 필요시 수정)
  const infoRows: { label: string; value: string }[] = [
    { label: '담당 선생님 성함', value: teacherName ?? '' },
    { label: '계약담당 행정실 연락처', value: adminContact ?? '' },
    { label: '강사대기실', value: waitingRoom ?? '' },
    { label: '노트북 지참 여부 / 교내 Wi-Fi ID·PW', value: laptopWifiNote ?? '' },
    { label: '범죄경력조회방법', value: crimeCheckMethod ?? '' },
    { label: '범죄경력회보서 코드 (강사 직접조회 필요시)', value: crimeCheckInfo ?? '' },
    { label: '주차장 가능여부 및 주차장 위치', value: parkingNote ?? '' },
    { label: '엘레베이터 유무', value: hasElevator ?? '' },
    { label: '실내화 착용 유무', value: indoorShoesNote ?? '' },
    { label: '학교 배치도', value: floorMapUrl ? '파일 참조' : '' },
  ]

  for (const info of infoRows) {
    sheet.getCell(r, 1).value = info.label
    sheet.getCell(r, 1).alignment = { vertical: 'middle', wrapText: true }
    sheet.getCell(r, 1).font = { bold: true }
    const valueCell = sheet.getCell(r, 2)
    if (info.label === '학교 배치도' && floorMapUrl) {
      valueCell.value = { text: info.value, hyperlink: floorMapUrl }
      valueCell.font = { underline: true, color: { argb: 'FF0563C1' } }
    } else {
      valueCell.value = info.value
    }
    valueCell.alignment = { vertical: 'middle', wrapText: true }
    valueCell.fill = GREEN_FILL
    r++
  }

  // 시간표(시정표) — 각 교시의 정확한 시각을 학교에서 채워달라고 요청하는 영역
  sheet.mergeCells(r, 1, r, 2)
  const timetableHeaderCell = sheet.getCell(r, 1)
  timetableHeaderCell.value = '시간표(시정표)'
  timetableHeaderCell.font = { bold: true }
  timetableHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
  r++

  const PERIOD_LABELS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시']
  PERIOD_LABELS.forEach((label, i) => {
    sheet.getCell(r, 1).value = label
    sheet.getCell(r, 1).alignment = { vertical: 'middle', wrapText: true }
    sheet.getCell(r, 1).font = { bold: true }
    const valueCell = sheet.getCell(r, 2)
    if (i === 0) {
      valueCell.value = 'ex) 08:50 ~ 09:30'
      valueCell.font = { italic: true, color: { argb: 'FF555555' } }
    }
    valueCell.alignment = { vertical: 'middle', wrapText: true }
    valueCell.fill = GREEN_FILL
    r++
  })

  const footerNotes = [
    '* 요리체험 및 꽃만들기 체험은 당일 재료를 폐기하므로, 당일 인원 변동에 따른 금액 변동은 불가합니다.',
    '(결석생 완성품은 제공해드립니다.)',
    '* 꽃만들기 체험의 경우 꽃시장 상황에 따라 샘플사진과 꽃구성이 다를 수 있습니다.',
    '* 인원수를 다시 한번 꼭 확인 부탁드립니다.',
  ]
  r++
  for (const note of footerNotes) {
    mergeRow(r++, note, { bold: note.includes('인원수를 다시') })
  }

  // 전체 표에 테두리 적용
  for (let row = 3; row < r; row++) {
    for (let col = 1; col <= COL_COUNT; col++) {
      sheet.getCell(row, col).border = THIN_BORDER
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `기관요청사항_${event.name}.xlsx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="request.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
