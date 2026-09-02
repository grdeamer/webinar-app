import ProgramOutputClient from "./ProgramOutputClient"
import {
  getBroadcastOutputProfile,
  normalizeBroadcastOutputProfileId,
} from "@/lib/broadcast/outputProfiles"

export const dynamic = "force-dynamic"

export default async function ProgramOutputPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; url?: string; outputProfile?: string }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const outputProfile = getBroadcastOutputProfile(
    normalizeBroadcastOutputProfileId(query.outputProfile),
  )

  return (
    <ProgramOutputClient
      slug={slug}
      token={query.token ?? null}
      serverUrl={query.url ?? null}
      outputProfile={outputProfile}
    />
  )
}
