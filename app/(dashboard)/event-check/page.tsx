import { getEventCheckFormData } from './actions'
import { EventCheckClient } from '@/components/features/event-check/EventCheckClient'

export default async function EventCheckPage() {
  const formData = await getEventCheckFormData()

  return <EventCheckClient formData={formData} />
}
