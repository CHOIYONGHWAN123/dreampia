import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning'
export type ToastItem = { id: number; type: ToastType; message: string }

let nextId = 0

type ToastState = {
  toasts: ToastItem[]
  dismiss: (id: number) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// 이벤트 핸들러/catch 블록 어디서든 훅 없이 바로 부를 수 있도록 getState/setState를 감싼
// 헬퍼만 노출한다. alert()를 대체하는 용도라, 다른 화면 흐름을 바꾸지 않고 이 호출 한 줄만
// 추가/치환하면 되게 하는 것이 목적이다.
function push(type: ToastType, message: string) {
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id: nextId++, type, message }] }))
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  // 완전한 성공도 실패도 아닌 부분 성공/주의 메시지용(예: "일부 서류가 없어 제외되었습니다").
  warning: (message: string) => push('warning', message),
}
