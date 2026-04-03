import type { ViewerContext } from "@/lib/domain/access"
import type { AppSession } from "@/lib/domain/sessions"
import { canViewerAccessSession } from "@/lib/domain/access"

export function getViewerSessionAccess(session: AppSession, viewer: ViewerContext) {
  return canViewerAccessSession(session, viewer)
}