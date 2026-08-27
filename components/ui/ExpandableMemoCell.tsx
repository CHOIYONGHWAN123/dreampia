'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 셀 안 텍스트를 클릭하면 엑셀 메모(코멘트)처럼 그 셀 위치에서 떠 있는(float) 확대 박스가
// 열리고, 박스 안의 +/- 버튼으로 박스 크기만 조절한다. 컬럼 자체의 폭은 바뀌지 않으며,
// 박스는 다른 셀 위에 겹쳐서 표시된다.
const MEMO_BOX_MIN = { width: 200, height: 100 }
const MEMO_BOX_MAX = { width: 480, height: 320 }
const MEMO_BOX_STEP = { width: 60, height: 40 }
const VIEWPORT_MARGIN = 6

// 셀을 기준으로 박스를 배치하되, 뷰포트 밖으로 넘치면(주로 화면 오른쪽 끝 컬럼) 반대쪽/안쪽으로
// 붙여 항상 화면 안에 온전히 보이게 한다.
function computeBoxPos(rect: DOMRect, size: { width: number; height: number }) {
  const spaceRight = window.innerWidth - rect.right
  let left =
    spaceRight >= size.width + VIEWPORT_MARGIN
      ? rect.right + VIEWPORT_MARGIN
      : rect.left - size.width - VIEWPORT_MARGIN
  left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - size.width - VIEWPORT_MARGIN)

  const top = Math.min(Math.max(rect.top, VIEWPORT_MARGIN), window.innerHeight - size.height - VIEWPORT_MARGIN)

  return { top, left }
}

export function ExpandableMemoCell({
  value,
  onSave,
  label = '메모',
  placeholder = '메모 입력',
  defaultSize = { width: 260, height: 140 },
}: {
  value: string | null
  onSave: (v: string | null) => Promise<void>
  /** 확대 박스 상단에 표시되는 제목 */
  label?: string
  placeholder?: string
  /** 확대 박스가 처음 열릴 때의 크기 */
  defaultSize?: { width: number; height: number }
}) {
  const [expanded, setExpanded] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [size, setSize] = useState(defaultSize)
  const [text, setText] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (
        boxRef.current && !boxRef.current.contains(e.target as Node) &&
        cellRef.current && !cellRef.current.contains(e.target as Node)
      ) setExpanded(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  const openExpand = () => {
    if (cellRef.current) {
      setPos(computeBoxPos(cellRef.current.getBoundingClientRect(), defaultSize))
    }
    setText(value ?? '')
    setSize(defaultSize)
    setExpanded(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(text.trim() || null)
      setExpanded(false)
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const resize = (next: { width: number; height: number }) => {
    setSize(next)
    if (cellRef.current) setPos(computeBoxPos(cellRef.current.getBoundingClientRect(), next))
  }
  const grow = () =>
    resize({
      width: Math.min(MEMO_BOX_MAX.width, size.width + MEMO_BOX_STEP.width),
      height: Math.min(MEMO_BOX_MAX.height, size.height + MEMO_BOX_STEP.height),
    })
  const shrink = () =>
    resize({
      width: Math.max(MEMO_BOX_MIN.width, size.width - MEMO_BOX_STEP.width),
      height: Math.max(MEMO_BOX_MIN.height, size.height - MEMO_BOX_STEP.height),
    })

  return (
    <div ref={cellRef}>
      <div
        onClick={openExpand}
        className="cursor-pointer rounded px-1 min-h-5 flex items-center justify-between gap-1 hover:bg-gray-50"
      >
        {value ? (
          <span className="text-[11px] text-gray-700 truncate">{value}</span>
        ) : (
          <span className="text-[10px] text-gray-300">{placeholder}</span>
        )}
        <span className="text-[9px] text-primary-400 shrink-0" title="확대 보기">⤢</span>
      </div>
      {expanded && createPortal(
        <div
          ref={boxRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: size.width, height: size.height, zIndex: 9999 }}
          className="bg-yellow-50 border border-gray-400 shadow-xl rounded-sm p-2 flex flex-col"
        >
          <div className="flex items-center justify-between mb-1 shrink-0">
            <span className="text-[10px] font-bold text-gray-500">{label}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={shrink}
                disabled={size.width <= MEMO_BOX_MIN.width}
                title="박스 축소"
                className="w-3.5 h-3.5 leading-none flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                −
              </button>
              <button
                type="button"
                onClick={grow}
                disabled={size.width >= MEMO_BOX_MAX.width}
                title="박스 확대"
                className="w-3.5 h-3.5 leading-none flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                title="닫기"
                className="w-3.5 h-3.5 leading-none flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 w-full text-[11px] border border-gray-300 rounded px-1.5 py-1 resize-none focus:outline-none focus:border-primary-400 bg-white"
            placeholder={placeholder}
          />
          <div className="flex gap-1.5 mt-1.5 shrink-0">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 py-1 text-[10px] text-white bg-primary-500 rounded disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex-1 py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
