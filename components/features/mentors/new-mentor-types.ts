import type { ProgramSelectionValue } from './ProgramUnitPicker'
import { generateId } from '@/lib/generate-id'

export interface ProgramEntryState {
  key: string
  selection: ProgramSelectionValue
  lectureFeePayerId: string
  materialFeePayerId: string
  pptFiles: Record<string, File | null>
  profileFiles: Record<string, File | null>
}

export interface FieldSectionState {
  key: string
  fieldId: string
  occupationId: string
  programEntries: ProgramEntryState[]
}

export function createProgramEntry(): ProgramEntryState {
  return {
    key: generateId(),
    selection: { occupationProgramId: '', levels: [] },
    lectureFeePayerId: '',
    materialFeePayerId: '',
    pptFiles: {},
    profileFiles: {},
  }
}

export function createFieldSection(): FieldSectionState {
  return {
    key: generateId(),
    fieldId: '',
    occupationId: '',
    programEntries: [createProgramEntry()],
  }
}
