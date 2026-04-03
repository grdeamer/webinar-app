import BackstageJoinClient from "@/components/live/backstage/BackstageJoinClient"

export const dynamic = "force-dynamic"

export default async function BackstagePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <BackstageJoinClient slug={slug} />
    </div>
  )
}