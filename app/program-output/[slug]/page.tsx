import ProgramOutputClient from "./ProgramOutputClient"

export const dynamic = "force-dynamic"

export default async function ProgramOutputPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; url?: string }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])

  return (
    <ProgramOutputClient
      slug={slug}
      token={query.token ?? null}
      serverUrl={query.url ?? null}
    />
  )
}
