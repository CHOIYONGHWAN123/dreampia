import { create } from 'zustand'
import type { Admin } from '@/types/admin'

type AuthState = {
  admin: Admin | null
  setAdmin: (admin: Admin | null) => void
  clearAdmin: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  setAdmin: (admin) => set({ admin }),
  clearAdmin: () => set({ admin: null }),
}))
