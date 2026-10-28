import Link from 'next/link'
import PrepareHostedRehearsal from './PrepareHostedRehearsal'
import { requireEventPageFeature } from '@/lib/eventTeamAccess'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hostedEngineConfigured } from '@/lib/production/hosted/client'
export const dynamic = 'force-dynamic'
export default async function HostedProducerRehearsal(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const access = await requireEventPageFeature(id, 'producer_room')
  const { data: session } = await supabaseAdmin.from('event_sessions').select('id,title').eq('event_id', access.eventId).or('is_general_session.eq.true,session_kind.eq.general').order('is_general_session', { ascending: false }).order('sort_order', { ascending: true, nullsFirst: false }).limit(1).maybeSingle()
  const allowed = access.isGlobalAdmin || ['producer', 'event_admin'].includes(access.role)
  const configured = hostedEngineConfigured()
  return <main className="mx-auto max-w-3xl space-y-6 p-8">
    <Link href={`/admin/events/${id}/producer/room`}>← Producer room</Link>
    <h1 className="text-3xl font-semibold">Hosted producer rehearsal</h1>
    <p>Preview, TAKE, audio and scene controls use the qualified compositor and fenced Program gateway. This is one producer room, with primary and standby compositors.</p>
    <p>Sessions expire within 30 minutes. Media is not recorded or persistently stored. Files stay in your browser and are transmitted as live inputs. Capture starts only when you choose a camera, microphone or screen.</p>
    <p>This rehearsal does not publish to attendees or join Zoom rooms. Real Internet delivery and physical device compatibility still need verification.</p>
    {configured && session && access.isGlobalAdmin && process.env.PRODUCER_ENGINE_TRIAL_NAME ? <PrepareHostedRehearsal root={`/admin/events/${id}/producer/rehearsal/engine/${session.id}`} /> : null}
    {configured && session && allowed ? <Link className="inline-block rounded bg-blue-600 px-5 py-3 text-white" href={`/admin/events/${id}/producer/rehearsal/engine/${session.id}/studio`}>Open prepared rehearsal</Link> : <p role="status">{!allowed ? 'An event administrator or producer role is required.' : !session ? 'Create a general session first.' : 'The temporary media worker has not been configured. No compute is started by opening this page.'}</p>}
  </main>
}
