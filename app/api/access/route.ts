// Legacy entry uses the same verified-email flow; email alone never issues a session.
export { POST } from "@/app/api/events/login/route"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
