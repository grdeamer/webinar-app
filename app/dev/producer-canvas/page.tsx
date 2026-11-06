import { notFound } from 'next/navigation'
import ProducerCanvasCheck from './ProducerCanvasCheck'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <ProducerCanvasCheck />
}
