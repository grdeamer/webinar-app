import { notFound } from "next/navigation"
import EventDesignWorkbench from "./EventDesignWorkbench"

export default function EventDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <EventDesignWorkbench />
}
