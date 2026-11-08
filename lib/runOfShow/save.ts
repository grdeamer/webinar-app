import 'server-only'
import {supabaseAdmin} from '@/lib/supabase/admin'
import {jsonEqual} from '../data/jsonEqual.ts'
/** Do not feed a mount/callback-only autosave back into RSC revalidation. */
export async function saveRunOfShowIfChanged(eventId:string,cues:unknown[]):Promise<boolean> {
  const {data,error}=await supabaseAdmin.from('event_run_of_show').select('cues').eq('event_id',eventId).maybeSingle()
  if(error)throw new Error(error.message)
  const existing=Array.isArray(data?.cues)?data.cues:[]
  if(jsonEqual(existing,cues))return false
  const {error:failure}=await supabaseAdmin.from('event_run_of_show').upsert({event_id:eventId,cues,updated_at:new Date().toISOString()},{onConflict:'event_id'})
  if(failure)throw new Error(failure.message)
  return true
}
