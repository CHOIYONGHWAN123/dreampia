import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMentorFeeLedger, type PayerLedgerGroup } from '@/app/(dashboard)/mentor-fees/actions'

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
}

const won = (n: number) => `₩${n.toLocaleString()}`

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? '') || now.getFullYear()
  const month = parseInt(searchParams.get('month') ?? '') || now.getMonth() + 1
  const mentorId = searchParams.get('mentorId') || undefined
  const search = searchParams.get('search') || undefined
  const descending = searchParams.get('descending') === '1'

  const groups = await getMentorFeeLedger({ year, month, mentorId, search })

  // 화면과 동일한 정렬(강사 그룹 순서 + 그룹 내 라인 순서)을 적용한다.
  const sortedGroups: PayerLedgerGroup[] = [...groups]
    .sort((a, b) => {
      const aDate = a.lines[0]?.date ?? ''
      const bDate = b.lines[0]?.date ?? ''
      return descending ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
    })
    .map((g) => ({
      ...g,
      lines: [...g.lines].sort((a, b) => (descending ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))),
    }))

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('강사료 대장')

  sheet.columns = [
    { width: 6 }, // NO
    { width: 12 }, // 날짜
    { width: 12 }, // 강사명
    { width: 24 }, // 학교명
    { width: 14 }, // 강의료
    { width: 14 }, // 재료비
    { width: 14 }, // 강연료
    { width: 14 }, // 총 강연료
    { width: 14 }, // 세후 금액
    { width: 20 }, // 계좌번호
    { width: 16 }, // 주민번호
    { width: 24 }, // 비고
  ]

  const HEADERS = [
    'NO', '날짜', '강사명', '학교명', '강의료', '재료비', '강연료', '총 강연료', '세후 금액', '계좌번호', '주민번호', '비고',
  ]
  const headerRow = sheet.getRow(1)
  HEADERS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = HEADER_FILL
  })

  const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' }

  let r = 2
  sortedGroups.forEach((group, groupIndex) => {
    const groupStartRow = r
    group.lines.forEach((line) => {
      const setLineCell = (col: number, value: string | number) => {
        const cell = sheet.getCell(r, col)
        cell.value = value
        cell.alignment = CENTER
      }
      setLineCell(2, line.date)
      setLineCell(4, line.institutionName)
      setLineCell(5, line.lectureFee !== null ? won(line.lectureFee) : '')
      setLineCell(6, line.materialFee !== null ? won(line.materialFee) : '')
      setLineCell(7, won(line.lineTotal))
      setLineCell(12, line.remarks ?? '')
      r++
    })
    const groupEndRow = r - 1

    // 강사별로 병합되는 컬럼(화면의 rowSpan과 동일): NO, 강사명, 총 강연료, 세후 금액, 계좌번호, 주민번호
    const mergeAndSet = (col: number, value: string | number) => {
      if (groupEndRow > groupStartRow) sheet.mergeCells(groupStartRow, col, groupEndRow, col)
      const cell = sheet.getCell(groupStartRow, col)
      cell.value = value
      cell.alignment = CENTER
    }
    mergeAndSet(1, groupIndex + 1)
    mergeAndSet(3, group.payerName)
    mergeAndSet(8, won(group.totalFee))
    mergeAndSet(9, won(group.afterTax))
    mergeAndSet(10, group.bankAccount ?? '-')
    mergeAndSet(11, group.idNumber ?? '-')
  })

  for (let row = 1; row < r; row++) {
    for (let col = 1; col <= HEADERS.length; col++) {
      sheet.getCell(row, col).border = THIN_BORDER
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `강사료대장_${year}년${String(month).padStart(2, '0')}월.xlsx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mentor-fees.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
