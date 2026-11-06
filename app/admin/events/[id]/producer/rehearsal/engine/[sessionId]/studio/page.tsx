import {notFound} from 'next/navigation'
import {requireEventPageFeature} from '@/lib/eventTeamAccess'
import {supabaseAdmin} from '@/lib/supabase/admin'
import {hostedStudioConfig} from '@/lib/production/hosted/studioConfig'
import {canStartProducerEngine} from '@/lib/producer/engineOwner'
import Studio from '@/app/dev/producer-media/MediaLibraryLocalTest'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{id:string;sessionId:string}>}){
 const {id,sessionId}=await params,access=await requireEventPageFeature(id,'producer_room')
 const {data}=await supabaseAdmin.from('event_sessions').select('id,title').eq('id',sessionId).eq('event_id',access.eventId).maybeSingle()
 if(!data)notFound()
 const hosted=hostedStudioConfig(access.eventId,data.id,data.title||'Producer studio',access.user.id,canStartProducerEngine(access.user,access.isGlobalAdmin))
 if(!hosted)notFound()
 return <Studio hosted={hosted}/>
}
