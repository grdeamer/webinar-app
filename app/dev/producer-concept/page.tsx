import { notFound } from 'next/navigation';
import Concept from './producer-concept';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Concept />;
}
