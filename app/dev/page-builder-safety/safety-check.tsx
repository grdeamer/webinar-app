'use client'
import { useCallback, useRef, useState } from 'react'
import FullCodeEditor from '@/components/page-editor/FullCodeEditor'
export default function SafetyCheck() {
 const dirty = useRef(false)
 const onDraftChange = useCallback((value: boolean) => { dirty.current=value },[])
 const [status,setStatus]=useState('Local test: no database, network save or publishing')
 return <main style={{background:'#0b111b',color:'white',minHeight:'100vh',padding:20}}><h1>Local page-builder code safety check</h1><button onClick={()=>setStatus(dirty.current ? 'Blocked: apply HTML/CSS first' : 'Local publish check passed — nothing published')}>Check publish guard</button><p role="status">{status}</p><FullCodeEditor initialHtml="<h1>Local fixture</h1>" initialCss="body { color: white; }" enabled={true} saveStatus={status} onDraftChange={onDraftChange} onApply={()=>setStatus('Applied locally')} onUseVisualDesign={()=>setStatus('Local visual mode')}/></main>
}
