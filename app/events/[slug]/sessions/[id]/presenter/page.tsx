import PresenterClient from "./PresenterClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function PresenterPage(props: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await props.params

  return <PresenterClient slug={slug} id={id} />
}