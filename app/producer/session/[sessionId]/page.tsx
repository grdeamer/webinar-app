import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

// This route previously minted an unauthenticated LiveKit producer token
// (canPublish/canSubscribe) for any visitor who knew a session id, with no
// login or event-role check. It has no remaining callers in the app (the
// current producer workspace lives under /admin/events/[id]/producer, which
// is gated). Disabled rather than removed pending a file-deletion pass.
export default function ProducerSessionPage() {
  notFound()
}