"use client"

import { useEffect, useState } from "react"

export default function FeaturedQuestion() {
  const [question, setQuestion] = useState<any>(null)

  async function load() {
    const res = await fetch("/api/qa/featured")
    const data = await res.json()
    setQuestion(data.featured)
  }

  useEffect(() => {
    load()
    const i = setInterval(load, 3000)
    return () => clearInterval(i)
  }, [])

  if (!question) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 bg-black/70 p-4 rounded-xl border border-white/10">
      <div className="text-sm text-white/60">
        {question.name || "Attendee"}
      </div>

      <div className="text-lg font-semibold">
        {question.question}
      </div>
    </div>
  )
}