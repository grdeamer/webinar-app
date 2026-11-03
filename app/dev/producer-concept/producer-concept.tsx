'use client';
import { useState } from 'react';
import { ArrowRight, ChevronDown, Grid01, LayersTwo01, VolumeX, VolumeMax, Settings01 } from '@untitledui/icons';
import styles from './producer-concept.module.css';
const sources = [
  { name: 'Opening slate', kind: 'GRAPHIC', color: '#d9e4d3', title: 'A better way\nto come together.', sub: 'JUPITER / ANNUAL FORUM 2026' },
  { name: 'Presentation', kind: 'POWERPOINT · 24 SLIDES', color: '#e8d9c4', title: 'Ideas into\naction.', sub: '01 / THE NEXT CHAPTER' },
  { name: 'Welcome film', kind: 'VIDEO · 02:18', color: '#cbd9e3', title: 'Perspective\nchanges everything.', sub: 'JUPITER ORIGINALS' },
  { name: 'Holding screen', kind: 'HOLDING', color: '#e3dfd5', title: 'We’ll be\nright with you.', sub: 'THE PROGRAM WILL RESUME SHORTLY' },
];
export default function Concept() {
  const [preview, setPreview] = useState(1);
  const [program, setProgram] = useState(0);
  const [muted, setMuted] = useState([false, false, true]);
  const [tab, setTab] = useState('All sources');
  const [notice, setNotice] = useState('Select a source to cue it in Preview.');
  function take() { setProgram(preview); setNotice(`${sources[preview].name} is now in the simulated Program.`); }
  function picture(index: number, small = false) { const source = sources[index]; return <div className={`${styles.picture} ${small ? styles.small : ''}`} style={{ background: source.color }}><div className={styles.wordmark}>jupiter<span>®</span></div><div className={styles.slideTitle}>{source.title}</div><div className={styles.slideSub}>{source.sub}</div><span className={styles.slideNumber}>2026 — 01</span></div>; }
  return <main className={styles.room}>
    <div className={styles.concept}>VISUAL CONCEPT 01 <span>Local simulation · no transmission or recording</span><a href="/dev/producer-media">Back to functional media test <ArrowRight size={13}/></a></div>
    <header className={styles.header}><div className={styles.brand}>jupiter<span> / studio</span></div><div className={styles.show}><strong>Annual Forum 2026</strong><ChevronDown size={15}/><span>Rehearsal</span></div><button onClick={() => setNotice('Design concept only. No engine is connected.')}><Settings01 size={16}/> Show settings</button><div className={styles.avatar}>GD</div></header>
    <div className={styles.workspace}>
      <aside className={styles.rail}><div className={styles.active}><Grid01 size={21}/><span>Produce</span></div><div><LayersTwo01 size={21}/><span>Sources</span></div><div><Settings01 size={21}/><span>Setup</span></div><div className={styles.railBottom}>J<br/><small>01</small></div></aside>
      <section className={styles.center}>
        <div className={styles.pageHeading}><div><p>PRODUCTION DESK</p><h1>Good afternoon, Gary.</h1></div><div className={styles.status}><i/> Offline rehearsal <span>00:00:00</span></div></div>
        <div className={styles.monitors}>{(['PREVIEW', 'PROGRAM'] as const).map((name, i) => <section key={name} className={styles.monitor}><div className={styles.monitorHead}><strong className={i ? styles.program : styles.preview}><i/>{name}</strong><span>{sources[i ? program : preview].name}</span><span>16:9</span></div>{picture(i ? program : preview)}<div className={styles.monitorFoot}><span>{i ? 'SIMULATED OUTPUT' : 'READY TO TAKE'}</span><span>1920 × 1080 <b>30p</b></span></div></section>)}</div>
        <div className={styles.transition}><span>Transition</span><select aria-label="Transition"><option>Cut</option><option>Mix · 300 ms</option></select><span className={styles.notice} role="status">{notice}</span><button className={styles.take} onClick={take}>TAKE <ArrowRight size={17}/></button></div>
        <div className={styles.lower}>
          <section className={styles.library}><div className={styles.panelHead}><h2>Source library <span>4</span></h2><button onClick={() => setNotice('Use the functional media test to import real files. This page is a visual mockup.')}>+ Add source</button></div><div className={styles.tabs}>{['All sources', 'Graphics', 'Video', 'Holding'].map(t => <button key={t} aria-pressed={tab === t} className={tab === t ? styles.selectedTab : ''} onClick={() => setTab(t)}>{t}</button>)}</div><div className={styles.sourceGrid}>{sources.map((s, i) => (tab === 'All sources' || (tab === 'Graphics' && i < 2) || (tab === 'Video' && i === 2) || (tab === 'Holding' && i === 3)) && <button key={s.name} className={`${styles.source} ${preview === i ? styles.cued : ''}`} onClick={() => { setPreview(i); setNotice(`${s.name} cued in Preview.`); }}>{picture(i, true)}<div><strong>{s.name}</strong><span>{s.kind}</span></div><em>{program === i ? 'PGM' : preview === i ? 'PVW' : `0${i + 1}`}</em></button>)}</div></section>
          <section className={styles.mixer}><div className={styles.panelHead}><h2>Program audio</h2><span>SIMULATED</span></div>{['Film audio', 'Presenter', 'Music bed'].map((label, i) => <div className={styles.channel} key={label}><div><strong>{label}</strong><span>{muted[i] ? 'Muted' : i === 2 ? '−18 dB' : '0.0 dB'}</span></div><div className={styles.fader}><input type="range" aria-label={`${label} level`} defaultValue={i === 2 ? 30 : 75}/><button aria-label={`${muted[i] ? 'Unmute' : 'Mute'} ${label}`} aria-pressed={muted[i]} onClick={() => setMuted(mut => mut.map((m, n) => n === i ? !m : m))}>{muted[i] ? <VolumeX size={16}/> : <VolumeMax size={16}/>}</button></div><div className={styles.meter}><span style={{ width: muted[i] ? 0 : `${63 - i * 12}%` }}/></div></div>)}</section>
        </div>
      </section>
      <aside className={styles.rundown}><div className={styles.panelHead}><h2>Run of show</h2><span>6 CUES</span></div><div className={styles.rundownIntro}>Annual Forum <span>Tuesday, November 3</span></div>{['Doors open', 'Welcome & opening', 'The next chapter', 'Leadership conversation', 'Audience Q&A', 'Closing remarks'].map((title, i) => <button key={title} className={i === 1 ? styles.currentCue : ''} onClick={() => { setPreview(i === 0 ? 0 : i === 1 ? 2 : 1); setNotice(`Cue ${i + 1} selected for rehearsal.`); }}><span className={styles.cueIndex}>{String(i + 1).padStart(2, '0')}</span><div><strong>{title}</strong><span>{i === 0 ? '13:45' : `14:${String(i * 10 - 10).padStart(2, '0')}`} <b>· {i === 1 ? '02:18' : '10:00'}</b></span></div></button>)}<div className={styles.notes}><p>OPERATOR NOTES</p><strong>Welcome & opening</strong><p>Roll welcome film on show caller’s cue. Hold the final frame before taking the presentation.</p></div><div className={styles.signal}><i/> Design review only<span>No engine connected</span></div></aside>
    </div><footer className={styles.footer}><span>JUPITER PRODUCTION SYSTEM</span><span>Concept / Jupiter dark · Untitled UI-inspired controls</span><span>All signals simulated</span></footer>
  </main>;
}
