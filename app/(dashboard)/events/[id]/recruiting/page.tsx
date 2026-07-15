import { notFound } from 'next/navigation'
import { getRecruitingData } from './actions'
import { EventRecruitingClient } from '@/components/features/events/EventRecruitingClient'

export default async function EventRecruitingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let data
  try {
    data = await getRecruitingData(id)
  } catch {
    notFound()
  }

  return <EventRecruitingClient eventId={id} {...data} />
}
