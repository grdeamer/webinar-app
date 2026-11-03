import { notFound } from 'next/navigation'
import SafetyCheck from './safety-check'
export default function Page() { if (process.env.NODE_ENV !== 'development') notFound(); return <SafetyCheck/> }
