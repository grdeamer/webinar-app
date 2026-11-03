import { notFound } from "next/navigation"
import MediaLibraryLocalTest from "./MediaLibraryLocalTest"
export const dynamic = "force-dynamic"
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <MediaLibraryLocalTest />
}
