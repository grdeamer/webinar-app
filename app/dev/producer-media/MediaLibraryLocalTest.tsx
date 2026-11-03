"use client"
import LibrarySoakControls from "./LibrarySoakControls"
import useLibraryProgram from "./useLibraryProgram"
import LocalMonitor from "./LocalMonitor"
import styles from "./studio.module.css"
import { ArrowRight, Grid01, LayersTwo01, VolumeMax } from "@untitledui/icons"
import ProgramAudioMixer from "@/app/admin/events/[id]/producer/ProgramAudioMixer"
import useLocalProgramMixer from "./useLocalProgramMixer"
import { useState } from "react"
import BottomAssetDock from "@/app/admin/events/[id]/producer/BottomAssetDock"
import type { PreviewBlock } from "@/app/admin/events/[id]/producer/useProducerBlocks"
import { renderPlacedBlocks } from "@/app/admin/events/[id]/producer/producerRoomBlockHelpers"
import { DEFAULT_BROADCAST_OUTPUT_PROFILE_ID } from "@/lib/broadcast/outputProfiles"
export default function MediaLibraryLocalTest() {
  const audioEngine = useLocalProgramMixer()
  const [preview, setPreview] = useState<PreviewBlock[]>([]), [program, setProgram] = useState<PreviewBlock[]>([])
  const programEngine = useLibraryProgram(preview)
  const [muted, setMuted] = useState(true), [gain, setGain] = useState(1)
  const [takeFailed, setTakeFailed] = useState(false), [message, setMessage] = useState("Choose a source, send to Preview, then TAKE.")
  function add(block: PreviewBlock) { setPreview([block]) }
  async function take(): Promise<boolean> {
    if (takeFailed) { setMessage("Simulated TAKE failure; Program was preserved."); return false }
    if (!await programEngine.take()) return false
    setProgram(structuredClone(preview)); setMessage("TAKE committed to the local engine. Preview remains muted."); return true
  }
  function canvas(blocks: PreviewBlock[], isProgram: boolean) {
    return <div className="relative h-[360px] w-[640px] overflow-hidden bg-black" data-testid={isProgram ? "local-program" : "local-preview"}>{renderPlacedBlocks({ blocks: blocks.map(block => ({ ...block, ...(isProgram ? { mediaMuted: muted, mediaGain: gain } : {}) })), opts: { liveRemove: isProgram, showChrome: false }, selectedBlockId: null, setSelectedBlockId: () => {}, startDraggingBlock: () => {}, startResizingBlock: () => {} })}</div>
  }
  const different = JSON.stringify(preview) !== JSON.stringify(program)
  return <main className={styles.studio}>
    <div className={styles.safety}>LOCAL REHEARSAL <span>Local Program engine · recording off · no cloud workers</span><a href="/dev/producer-concept">Design reference ↗</a></div>
    <header className={styles.header}><div className={styles.brand}>jupiter <span>/ studio</span></div><div className={styles.show}><strong>Producer room</strong><span>Local workspace</span></div><span className={styles.offline}><i/> Local only</span><div className={styles.avatar}>GD</div></header>
    <div className={styles.workspace}>
      <nav className={styles.rail} aria-label="Studio panels"><a href="#production-desk" className={styles.active}><Grid01 size={20}/><span>Produce</span></a><a href="#source-library"><LayersTwo01 size={20}/><span>Sources</span></a><a href="#program-audio"><VolumeMax size={20}/><span>Audio</span></a></nav>
      <div className={styles.main}>
        <div className={styles.heading} id="production-desk"><div><p>PRODUCTION DESK</p><h1>Your show. Under control.</h1></div><span>Engine rehearsal <b>16:9</b></span></div>
        <div className={styles.monitors}>{[false,true].map(isProgram=><section key={String(isProgram)} className={styles.monitor} aria-label={isProgram ? 'Program' : 'Preview'}><div className={styles.monitorTitle}><strong className={isProgram ? styles.pgm : styles.pvw}>● {isProgram ? 'PROGRAM' : 'PREVIEW'}</strong><span>{(isProgram ? program : preview).length ? `${(isProgram ? program : preview).length} source ${(isProgram ? program : preview).length === 1 ? "layer" : "layers"}` : 'No source selected'}</span></div><div style={{display:isProgram ? "block" : "none",aspectRatio:"16/9",background:"black"}}>{isProgram ? <video ref={programEngine.video} autoPlay muted={muted} playsInline controls aria-label="Actual outgoing Program" style={{width:"100%",height:"100%",objectFit:"contain"}}/> : null}</div>{!isProgram ? <LocalMonitor>{canvas(preview,false)}</LocalMonitor> : null}<div className={styles.monitorFooter}><span>{isProgram ? 'ACTUAL OUTGOING FEED' : 'MUTED MONITORING'}</span><span>{isProgram ? "1920 × 1080 target" : "640 × 360 preview"}</span></div></section>)}</div>
        <div className={styles.transport}><div className={styles.transition}>Transition <span>Cut</span></div><p role="status">{takeFailed ? message : programEngine.message}</p><button className={styles.take} onClick={()=>void take()} disabled={!preview.length || !programEngine.connected || programEngine.busy}>{programEngine.busy ? "CUEING" : "TAKE"} <ArrowRight size={17}/></button></div>
        <div className={styles.playback}><button disabled={programEngine.busy} onClick={()=>void (programEngine.connected ? programEngine.stop() : programEngine.connect())}>{programEngine.connected ? "Disconnect engine inputs" : "Connect local engine"}</button><button onClick={()=>{setProgram([]);setPreview([]);setMessage('Local playback stopped.')}}>Stop playback</button><label><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/> Mute local monitor</label><label>Monitor volume <input aria-label="Library monitor volume" type="range" min="0" max="1" step="0.05" value={gain} onChange={e=>{const value=Number(e.target.value);setGain(value);programEngine.setMonitorVolume(value)}}/></label></div>
            <div className={styles.dock} id="source-library"><BottomAssetDock programAudioEngine={audioEngine} localMediaOnly workspaceMode="prepare" standardToolsOpen={false} onToggleStandardTools={() => {}} scenes={[]} selectedSceneId={null} programSceneId={null} programSlideLabel={null} hotkeySceneId={null} previewBlocks={preview} eventId="isolated-local-test" outputProfileId={DEFAULT_BROADCAST_OUTPUT_PROFILE_ID} recordingRoomName="" onAddMediaAssetToPreview={add} previewProgramDifferent={JSON.stringify(preview) !== JSON.stringify(program)} takeBusy={programEngine.busy} onTakeProgram={take} /></div>
        <LibrarySoakControls engine={programEngine} onCue={setPreview} onTaken={setProgram}/>
        <section id="program-audio" className={styles.audio}><div className={styles.sectionTitle}><h2>Encoded Program audio</h2><span>Separate localhost engine</span></div><ProgramAudioMixer engine={audioEngine}/><a href="http://127.0.0.1:4311/producer" target="_blank" rel="noreferrer">Open outgoing Program and engine inputs ↗</a><p>Preview publishes a private input; TAKE commits that input to the encoded Program. One full-frame library source at a time. Local listening mute does not mute outgoing audio.</p></section>
      </div>
      <aside className={styles.inspector}><p className={styles.eyebrow}>SESSION STATUS</p><h2>Rehearsal desk</h2><div className={styles.fact}><span>Preview</span><strong>{preview.length ? 'Source cued' : 'Empty'}</strong></div><div className={styles.fact}><span>Program</span><strong>{program.length ? 'Taken to engine' : 'Stopped'}</strong></div><div className={styles.fact}><span>Pending changes</span><strong>{different ? 'Ready to TAKE' : 'In sync'}</strong></div><div className={styles.fact}><span>Recording</span><strong>Off</strong></div><div className={styles.note}><h3>Start here</h3><ol><li>Import a file or create a color source.</li><li>Send the selected source to Preview.</li><li>Check the picture, then TAKE.</li></ol><p>PowerPoint slide changes stay in Preview until you TAKE.</p></div><details className={styles.diagnostics}><summary>Rehearsal diagnostics</summary><label><input type="checkbox" checked={takeFailed} onChange={e=>setTakeFailed(e.target.checked)}/> Simulate failed TAKE</label><p>A failed TAKE preserves the current Program.</p></details><div className={styles.localNote}>Files stay in this browser.<br/>No upload to Supabase. No deployment.</div></aside>
    </div><footer className={styles.footer}><span>JUPITER PRODUCTION SYSTEM</span><span>Local development · own components · no paid UI library</span></footer>
  </main>
}
