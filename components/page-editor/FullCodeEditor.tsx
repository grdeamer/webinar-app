"use client"

import { useState } from "react"
import CustomCodePage from "@/components/page-renderer/CustomCodePage"

const STARTER_HTML = `<main class="event-page">
  <p class="eyebrow">Jupiter Experience</p>
  <h1>Your event, designed without limits.</h1>
  <p class="lede">Use complete HTML and CSS to create a fully custom attendee page.</p>
  <a class="button" href="#content">Explore the event</a>
</main>

<section id="content" class="content-card">
  <h2>Build your experience</h2>
  <p>This page is isolated from the Jupiter application for safe rendering.</p>
</section>`

const STARTER_CSS = `:root {
  color-scheme: dark;
  font-family: "Myriad Pro", Inter, Arial, sans-serif;
  background: #050816;
  color: #f8fafc;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  padding: 72px 8vw;
  background:
    radial-gradient(circle at 82% 12%, rgba(89, 123, 255, .22), transparent 30%),
    linear-gradient(150deg, #050816, #080b1d 60%, #120b26);
}

.event-page { max-width: 860px; padding: 8vh 0; }
.eyebrow { text-transform: uppercase; letter-spacing: .24em; color: #9cb7ff; }
h1 { max-width: 800px; margin: 20px 0; font-size: clamp(48px, 8vw, 92px); line-height: .95; }
.lede { max-width: 660px; font-size: 22px; line-height: 1.6; color: #b8c1d8; }
.button { display: inline-block; margin-top: 24px; padding: 15px 24px; border-radius: 999px; background: linear-gradient(90deg, #407cff, #8b4dff); color: white; text-decoration: none; }
.content-card { margin-top: 56px; padding: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 28px; background: rgba(255,255,255,.055); }`

export default function FullCodeEditor({
  initialHtml,
  initialCss,
  enabled,
  saveStatus,
  onApply,
  onUseVisualDesign,
}: {
  initialHtml: string
  initialCss: string
  enabled: boolean
  saveStatus: string
  onApply: (html: string, css: string) => void
  onUseVisualDesign: () => void
}) {
  const [html, setHtml] = useState(initialHtml || STARTER_HTML)
  const [css, setCss] = useState(initialCss || STARTER_CSS)
  const [appliedHtml, setAppliedHtml] = useState(initialHtml || STARTER_HTML)
  const [appliedCss, setAppliedCss] = useState(initialCss || STARTER_CSS)
  const hasDraftChanges = html !== appliedHtml || css !== appliedCss

  function applyCode() {
    setAppliedHtml(html)
    setAppliedCss(css)
    onApply(html, css)
  }

  return (
    <div className="min-w-0 flex-1 overflow-auto px-5 py-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-white/10 bg-white/[0.045] px-6 py-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200/60">
              Advanced page mode
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Full HTML + CSS</h2>
            <p className="mt-1 max-w-3xl text-sm text-white/55">
              Custom code replaces the visual layout for this page. Scripts, forms,
              and app access are blocked; Jupiter&apos;s visual design stays saved so you
              can switch back at any time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-white/45">
              {hasDraftChanges ? "Draft changes" : saveStatus}
            </span>
            {enabled ? (
              <button
                type="button"
                onClick={onUseVisualDesign}
                className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Use Visual Design
              </button>
            ) : null}
            <button
              type="button"
              onClick={applyCode}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(99,102,241,0.25)] transition hover:brightness-110"
            >
              {enabled ? "Apply Changes" : "Use Custom Code"}
            </button>
          </div>
        </section>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)]">
          <div className="grid min-h-[720px] gap-5 xl:grid-cols-2 2xl:grid-cols-1">
            <label className="flex min-h-[350px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#070a14]">
              <span className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/65">
                HTML
              </span>
              <textarea
                value={html}
                onChange={(event) => setHtml(event.target.value)}
                spellCheck={false}
                aria-label="Full page HTML"
                className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-sky-50/85 outline-none"
              />
            </label>

            <label className="flex min-h-[350px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#070a14]">
              <span className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-violet-200/65">
                CSS
              </span>
              <textarea
                value={css}
                onChange={(event) => setCss(event.target.value)}
                spellCheck={false}
                aria-label="Full page CSS"
                className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-violet-50/85 outline-none"
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  Isolated preview
                </div>
                <div className="mt-1 text-sm text-white/65">Live draft rendering</div>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
            </div>
            <CustomCodePage
              html={html}
              css={css}
              title="Custom code draft preview"
              preview
            />
          </section>
        </div>
      </div>
    </div>
  )
}
