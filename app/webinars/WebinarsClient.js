'use client'

import { useSearchParams } from 'next/navigation'

export default function WebinarsClient() {
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic') || ''

  return (
    <div>
      {topic ? (
        <p>Filtering by topic: {topic}</p>
      ) : (
        <p>Showing all webinars</p>
      )}
    </div>
  )
}
