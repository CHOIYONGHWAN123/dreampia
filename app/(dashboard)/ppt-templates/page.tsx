import { PptTemplateManagement } from '@/components/features/ppt-templates/PptTemplateManagement'
import { getPptTemplates } from './actions'

export default async function PptTemplatesPage() {
  const templates = await getPptTemplates()
  return <PptTemplateManagement initialTemplates={templates} />
}
